import { SYSTEM_PROMPT, buildUserPrompt } from '../../../lib/prompt';

// Tried in order. If the primary model is overloaded even after retries,
// fall back to the lighter model, which usually has spare capacity.
const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash-lite'];

// Gemini returns these for temporary capacity problems ("model is
// experiencing high demand", rate limits, transient server errors).
// They usually clear within seconds, so they're worth retrying.
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAYS_MS = [1000, 2000];

// Retries plus a fallback model can take longer than Vercel's default
// function timeout, so allow up to 60s.
export const maxDuration = 60;

// A 404 means the model was retired or isn't offered to this API key
// (Google periodically retires older models), so skip straight to the next.
const MODEL_UNAVAILABLE_STATUS = 404;

// The model occasionally returns output that isn't valid JSON (cut off,
// wrapped in prose, or split across parts). Asking again almost always
// fixes it, so allow one extra attempt before showing an error.
const GENERATION_ATTEMPTS = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pulls the workout object out of a Gemini response. Newer models can split
// the answer across several parts (and include "thought" parts), so join
// every non-thought text part rather than trusting parts[0], then take the
// outermost {...} to drop any stray fences or prose around it.
function parseWorkout(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error(text ? 'No JSON object in response' : 'Empty response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callGemini(model, apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body,
  });
}

// Tries each model in turn, retrying temporary failures with a short
// backoff. Returns the first OK response; otherwise the most meaningful
// failure (a "busy" error beats a later "model unavailable" 404, so the
// user sees the friendly busy message rather than a confusing 404).
async function callGeminiWithRetry(apiKey, body) {
  let busyRes = null;
  let res;
  for (const model of MODELS) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      res = await callGemini(model, apiKey, body);
      if (res.ok) return res;
      if (res.status === MODEL_UNAVAILABLE_STATUS) break;
      if (!RETRYABLE_STATUSES.has(res.status)) return res;
      busyRes = res;
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return busyRes || res;
}

// The model sometimes echoes a shared, workout-wide value (e.g. every
// exercise getting the same "restAfter") instead of leaving it out and
// relying on the top-level field. When that happens, the per-exercise value
// always wins over the interactive Ready-screen controls, making the
// rounds/rest steppers appear to do nothing. If every exercise carries the
// identical value, treat it as the shared default (hoisting it to the
// top-level field when that's still unset) instead of a real override, and
// only keep per-exercise values that are genuinely distinct.
function reconcileSharedField(workout, exerciseField, sharedField) {
  const exercises = workout.exercises;
  if (exercises.length === 0) return;

  const values = exercises.map((ex) => ex[exerciseField]);
  const allShareSameValue =
    values.every((v) => typeof v === 'number' && v > 0) &&
    values.every((v) => v === values[0]);

  if (allShareSameValue && !workout[sharedField]) {
    workout[sharedField] = values[0];
  }

  workout.exercises = exercises.map((ex) => {
    const v = ex[exerciseField];
    const isRealOverride = typeof v === 'number' && v > 0 && v !== workout[sharedField];
    return { ...ex, [exerciseField]: isRealOverride ? v : null };
  });
}

export async function POST(req) {
  try {
    const { mode, text } = await req.json();

    if (!text || !text.trim()) {
      return Response.json({ error: 'No workout text provided.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Server is missing GEMINI_API_KEY. Add it in your Vercel project settings.' },
        { status: 500 }
      );
    }

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { role: 'user', parts: [{ text: buildUserPrompt(mode, text) }] },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    let workout;
    for (let attempt = 1; attempt <= GENERATION_ATTEMPTS; attempt++) {
      const geminiRes = await callGeminiWithRetry(apiKey, body);

      if (!geminiRes.ok) {
        if (RETRYABLE_STATUSES.has(geminiRes.status)) {
          return Response.json(
            { error: 'Gemini is busy right now. Please try again in a minute.' },
            { status: 503 }
          );
        }
        const errText = await geminiRes.text();
        return Response.json(
          { error: `Gemini API error (${geminiRes.status}): ${errText.slice(0, 300)}` },
          { status: 502 }
        );
      }

      const data = await geminiRes.json();
      try {
        workout = parseWorkout(data);
        break;
      } catch (e) {
        // Logged so the bad output can be inspected in the server / Vercel logs.
        console.error(
          `Unparseable Gemini response (attempt ${attempt}, finishReason: ${data?.candidates?.[0]?.finishReason}):`,
          e.message,
          JSON.stringify(data?.candidates?.[0]?.content?.parts)?.slice(0, 1000)
        );
      }
    }

    if (!workout || typeof workout !== 'object') {
      return Response.json(
        { error: 'Could not parse the model response as JSON. Please try again.' },
        { status: 502 }
      );
    }

    // Minimal sanity defaults so the app never crashes on odd output.
    workout.rounds = workout.rounds || 1;
    workout.style = workout.style === 'sets' ? 'sets' : 'circuit';
    workout.exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

    reconcileSharedField(workout, 'sets', 'rounds');
    reconcileSharedField(workout, 'restAfter', 'restBetweenRounds');

    return Response.json({ workout });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}
