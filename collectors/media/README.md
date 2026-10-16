# in-media media queue - format

`queue/media-queue.jsonl` - one JSON object per line, append-only. Consumers read line by line.

Fields per entry:
- id            string  stable id: <site>-<slug> (dedupe key together with source_page)
- source        string  site domain, e.g. "isorepublic.com"
- source_page   string  page URL the entry was collected from (credit/link back)
- file_url      string  direct downloadable file URL on the source site
- media_type    string  "photo" | "video"
- title         string  item title as shown on the source page
- author        string|null  contributor name when the site shows one
- licence       string  licence short name, always "CC0" for current sources
- licence_url   string  the site's licence page (verified 16 Oct 2026)
- tags          array   category labels from the source site, may be empty
- collected_at  string  UTC timestamp of collection

Rules baked into the collector (collect.py):
- Approved sources only (SITES dict): isorepublic.com, negativespace.co.
- robots-blessed sitemap routes; 3-6s pause between requests; stops a site
  for the run on 403/429/bot-challenge; never bypasses bot walls.
- stocksnap.io is NOT collected: it serves a Cloudflare challenge to plain
  fetches (bot wall - per rules we stop, not bypass).
- MixPhotos (photos.mixcommerce.co) is NEVER collected: its terms ban scraping.
- State in state/ (seen URLs + sitemap cursor per site); safe to re-run any
  time - already-seen pages are skipped.
- Logs in logs/collect-YYYYMMDD.log.

## Runtime and safety

Primary exchange file: `queue/media-queue.json`, a plain JSON object:
`{"schema_version":1,"entries":[...]}`. JSONL is its append log.
A file lock prevents overlapping runs. Queue URLs provide deduplication
if a process stopped after append but before its checkpoint. The next
run resumes from per-page state. Site blocks (403/429/challenge) persist
as `state/paused-<site>.json`; no automated bypass or resume.
No files are downloaded automatically. file_url is a source-hosted link;
consumers must recheck licence and rights (models, trademarks, property)
for the intended use. CC0 alone is not a model release.
ISO photo and video extraction both tested. A video test downloaded a real 11-second, 3840x2160 H.264 MP4 and visually checked a decoded frame.

`run.sh` bounds a pass to 10 minutes and retries a failed process at most
three times, with a 60-second pause. It uses only Python's standard library.
Suggested cadence: every 6 hours, at most 12 new item pages per site/pass.
No scheduler or durable hosting is installed in this environment. Parent
must assign the existing free runner/backup destination before claiming
unattended operation or survival of workspace replacement. No new account
or service was created. Restart support is prepared, not deployed.

## Proposed existing GitHub runner

`.github/workflows/media-collect.yml` is independent of the video renderer.
It checks out the separate `media-queue` branch for public CC0 source-only
queue/checkpoints. The scratch-branch push trigger enables an explicit test
before merge; scheduled execution starts only after repository-owner merge
into the default branch. No render, voice, or publication secrets are used.
Current workflow cap is 2 new item pages per lane per run (6 total).
Artifacts expire after 7 days, but queue/state commits persist on media-queue.
This is code awaiting repository-owner review, not a merged/live deployment.
