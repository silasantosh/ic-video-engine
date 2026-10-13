# Impact Connect video engine

Daily Impact Connect videos rendered with [Remotion](https://remotion.dev) on GitHub Actions. Rs 0: the repo is public, so Actions minutes are free, and there are no secrets in this repo.

- **12:30 PM IST** - daily Short (YouTube Shorts + Instagram)
- **6:30 PM IST** - daily lesson slot

The live video engine is untouched. This pipeline goes live only after Santosh approves the switch.

## How it works

1. `content/shorts.json` holds the 90-day calendar (started 2026-10-06): days 1-30 one app module a day, 31-60 guides (80G/12A, CSR-1, FCRA, registration), 61-90 how-to and recaps. Each day has a hook, 2-3 points and the module name.
2. `src/ICShort.tsx` is the branded template: hook scene, numbered point cards, end card with the real IC logo (`public/logo.png`, pulled from impact-connect.in) and `impact-connect.in`. Brand greens only, per Brand Kit v1.3 (`#0E6B45`, `#123B2E`, Signal Green `#49752B`, mint `#E3F3EA`), Noto Sans.
3. `.github/workflows/daily-render.yml` renders the day's video on cron and stores it as a build artifact (kept 30 days). Run it by hand any time with Actions -> Daily video render -> Run workflow (optionally pass a day number).

## Render locally

```
npm ci
npx remotion render src/index.ts ICShort out/short.mp4 --props '{"day": 1}'
```

Preview while editing: `npm run dev` (Remotion Studio).

## Voice - Sarvam Bulbul v3 (his pick, Oct 13 2026)

`scripts/tts.mjs` generates the day's Hindi narration in one request per video: speaker **shreya** for the 12:30 short, **shubh** for the 6:30 lesson, hi-IN, 24000 Hz, default pace/pitch. Scene timing follows the real audio: each scene's length is its line's character share of the actual mp3 duration, so text and narration stay matched. The API key lives only in the `SARVAM_API_KEY` Actions secret - never in the repo, never printed. If the key or credits fail, the workflow fails before render: no silent or placeholder video ever ships.

Cost guardrail: characters are counted in `usage/usage.json` (committed back by the workflow). Rs 100 free credits is roughly 33k characters (Rs 30 per 10k). Report when about 20% remains; no top-up without his explicit yes on the amount.

## Not wired yet (on purpose)

- **Upload**: the existing YouTube upload pipeline stays with the current engine. After he approves the switch, add an upload step here (YouTube Shorts + Instagram via the existing tokens) - nothing posts from this repo today.
- **Lesson (6:30 PM) format**: the cron slot exists; the longer lesson template reuses this system and gets its own composition next.

## License

Remotion is free for this use (individual + nonprofit, fewer than 3 people) - verified before adoption.
