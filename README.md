# Reps — a minimal workout timer

Paste a workout (from an AI, a trainer, wherever) or describe one in plain English,
and this app turns it into a runnable timer: countdowns, rep-based moves, timed
holds, and adjustable rest — all driven by whatever the workout calls for.

## What's inside

- **Paste or Describe** — paste raw workout text, or type something like
  "20 min upper body with dumbbells, 3 rounds, 45 sec rest between rounds."
- **AI structuring** — a Vercel serverless function (`app/api/generate/route.js`)
  sends your text to Google's Gemini API (free tier) and gets back structured
  JSON: exercise name, reps or timed duration, weight, rest, rounds.
- **Adaptive timer** — each move automatically runs as rep-based (tap "Done"),
  timed (auto countdown), or followed by rest — whatever the workout specifies.
  A 5-second "get ready" countdown plays before every move after the first.
- **No tracking, no accounts, no database.** Everything lives in memory for
  the length of one session, on purpose.

## 1. Get a free Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with
   a Google account.
2. Click **Get API key** → **Create API key** → create it in a new project.
3. Copy the key. No credit card needed for the free tier.

This app calls `gemini-2.5-flash`, which is on Google's free tier as of mid-2026.
Google does occasionally retire model names — if you ever get an error
mentioning the model, open `app/api/generate/route.js` and swap the `MODEL`
constant for whatever Google AI Studio currently lists as free-tier Flash.

## 2. Run it locally (optional)

```bash
npm install
cp .env.example .env.local
# paste your key into .env.local
npm run dev
```

Visit `http://localhost:3000`.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Before the first deploy, add an environment variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your key from step 1
4. Deploy. That's it — no other config needed.

## Notes on the workout JSON shape

If you ever want to hand-edit or debug what the AI is producing, the shape is:

```json
{
  "title": "Upper Body — Light Dumbbells",
  "style": "circuit",
  "rounds": 3,
  "restBetweenRounds": 45,
  "exercises": [
    {
      "name": "Supported Dumbbell Rows",
      "reps": 10,
      "perSide": true,
      "weight": "5 lb",
      "exerciseSeconds": null,
      "restAfter": null,
      "cue": "Keep shoulder blade tucked down"
    }
  ]
}
```

`exerciseSeconds` set instead of `reps` turns that move into a timed hold.
`restAfter` adds rest after that specific move; `restBetweenRounds` adds rest
after a full circuit before the next round starts. `style: "sets"` runs all
rounds of one exercise before moving to the next, instead of circuit-style.
