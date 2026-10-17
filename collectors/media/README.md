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
Live cadence: the existing separate GitHub workflow runs every 6 hours, with
2 new item pages per lane (6 total). It persists public source-only queue and
cursors on the separate media-queue branch. It uses no renderer secrets and
has its own concurrency lock. A broken source is not proof the whole collector
needs a restart. Do not replace remote state with a stale local queue.

## Outcome repair status

The outcome/heartbeat repair in this working copy is tested locally but not
deployed. Applying it requires the scoped repository credential approval.
Do not claim the repaired heartbeat exists until a new real workflow run
persists state/heartbeat.json and its immutable state/runs receipt.
The repair records per-site fetched/new/error outcomes, exits 2 on a blocked
source without retrying it, and writes the linked run result to the Actions
summary. Only process failures receive at most3attempts with60second backoff.

Private Drive backups are separate from public Actions. A private checkpoint
has been uploaded to the existing Website backup/in-media folder. Independent
nightly Drive automation is not yet confirmed; no Drive credentials belong
in this public repository. All collection is source links only, no downloads
or publishing.
