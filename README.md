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

## Voice - dependency, not yet wired

The voice track is a slot, not a finished wire. `public/voice/voiceover.mp3` is a **silent placeholder** so renders succeed today. The TTS audition (Indic Parler / Kokoro) is running separately; when the winner lands:

1. Generate that day's voiceover mp3 (eventually inside the workflow as a step before render).
2. Drop it at `public/voice/voiceover.mp3` (or pass a URL through props) - `<Audio>` in `src/ICShort.tsx` already plays it.
3. Adjust scene timing so narration and text stay line-by-line matched (his standing rule).

## Not wired yet (on purpose)

- **Upload**: the existing YouTube upload pipeline stays with the current engine. After he approves the switch, add an upload step here (YouTube Shorts + Instagram via the existing tokens) - nothing posts from this repo today.
- **Lesson (6:30 PM) format**: the cron slot exists; the longer lesson template reuses this system and gets its own composition next.

## License

Remotion is free for this use (individual + nonprofit, fewer than 3 people) - verified before adoption.
