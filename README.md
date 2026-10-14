# Impact Connect video engine

Remotion renders on free GitHub Actions in this public repository. Credentials are encrypted Actions secrets, never source files.

## Current state (2026-10-14)

- 12:30 PM IST Short: render plus Instagram publishing code is wired. First unattended publishing trial is pending, not proven complete.
- Recovery cron: 12:47 PM IST. A committed publishing ledger stops duplicate sends. GitHub schedules can be delayed.
- YouTube publishing: not wired. Direct Google authorization is awaiting owner approval. Buffer's connected channel is personal, not the IC brand channel; it must not receive these uploads.
- 6:30 PM IST lesson: held. A separate longer lesson composition and YouTube publisher are still needed. Dispatching type=lesson currently changes the voice only, not the short composition.

## Review and publication safety

Each calendar entry must have a source review before rendering. Publishing also requires visual QA of its actual voiced artifact. Day 9 (People) was corrected to match the live page and inspected; other days have not yet passed review. Missing review stops the workflow rather than publishing guessed features.

`scripts/publish-instagram.mjs` verifies @impactconnect.india, stages the MP4 through the existing IG Worker, waits for Instagram processing, commits a publishing intent, publishes once, and commits the returned media ID. An uncertain publish is never auto-retried. Staged bytes are deleted after the attempt. Successful ledger records live in `usage/publishing.json`.

Workflow failures open a repository issue containing the run link. Notification delivery to the owner is not yet tested. An issue is not proof an alert landed.

## Voice and free budget

Sarvam Bulbul v3 uses Shreya for shorts and Shubh for lessons, Hindi. `SARVAM_API_KEY` and `IG_ADMIN_KEY` live in Actions secrets. The usage counter is committed after each render. Generation stops at 26,000 tracked characters to preserve a reserve within the original free credits. No paid top-up is authorized. This counter does not prove the live Sarvam balance if the account is used elsewhere.

## Evidence

Manual render-only rehearsal: https://github.com/silasantosh/ic-video-engine/actions/runs/38517118421

This is a successful render, not an unattended publishing proof. The actual 1080x1920, 16-second voiced People artifact was visually inspected and its Hindi transcript checked.

## Local preview

```
npm ci
npx remotion render src/index.ts ICShort out/short.mp4 --props '{"day":9}'
```

The 90-day calendar is in `content/shorts.json`. Template source is in `src/ICShort.tsx`. Remotion licensing was checked for this individual/nonprofit use before adoption.
