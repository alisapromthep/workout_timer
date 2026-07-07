import { SYSTEM_PROMPT, buildUserPrompt } from '../../../lib/prompt';

const MODEL = 'gemini-2.5-flash';

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: 'user', parts: [{ text: buildUserPrompt(mode, text) }] },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return Response.json(
        { error: `Gemini API error (${geminiRes.status}): ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      return Response.json({ error: 'Gemini returned no content.' }, { status: 502 });
    }

    let workout;
    try {
      workout = JSON.parse(raw);
    } catch (e) {
      return Response.json(
        { error: 'Could not parse the model response as JSON.' },
        { status: 502 }
      );
    }

    // Minimal sanity defaults so the app never crashes on odd output.
    workout.rounds = workout.rounds || 1;
    workout.style = workout.style === 'sets' ? 'sets' : 'circuit';
    workout.exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

    return Response.json({ workout });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}
