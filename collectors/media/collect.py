#!/usr/bin/env python3
"""in-media open-media collector - standalone, Rs 0, human-paced.
Collects CC0 media entries from approved sites into a plain JSON queue.
Rules: robots-blessed sitemap routes only, 3-6s jittered pause between
requests, stops a site on 403/429/challenge, never bypasses bot walls.
Queue: ~/media-collector/queue/media-queue.jsonl (one JSON object per line).
State: ~/media-collector/state/ (seen URLs + per-site sitemap cursor)."""
import json, os, random, re, sys, time, html as htmlmod, fcntl, hashlib, urllib.request, urllib.error, urllib.robotparser, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timezone

BASE = os.environ.get('MEDIA_COLLECTOR_HOME', os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(BASE, 'queue', 'media-queue.jsonl')
STATE = os.path.join(BASE, 'state')
LOG = os.path.join(BASE, 'logs', 'collect-' + datetime.now().strftime('%Y%m%d') + '.log')
UA = {'User-Agent': 'in-media-collector/1.0 (open-licence media catalogue; human-paced; contact via in-media.in)'}
MAX_FETCH_PER_SITE = min(12, max(1, int(os.environ.get('COLLECT_MAX_PER_SITE', '12'))))
PAUSE = (3.0, 6.0)

def log(msg):
    line = datetime.now().strftime('%H:%M:%S') + ' ' + msg
    print(line)
    with open(LOG, 'a') as f: f.write(line + '\n')

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read().decode('utf-8', 'replace')
            if 'Just a moment' in body and 'challenge' in body:
                raise RuntimeError('bot-challenge')
            return body
    except urllib.error.HTTPError as e:
        raise RuntimeError('http-%d' % e.code)

def pace(): time.sleep(random.uniform(*PAUSE))

def load_json(path, default):
    try:
        with open(path) as f: return json.load(f)
    except Exception: return default

def save_json(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f: json.dump(obj, f)
    os.replace(tmp, path)

def sitemap_urls(xml_text):
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return [], []
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    subs = [e.text for e in root.findall('.//s:sitemap/s:loc', ns)]
    urls = [e.text for e in root.findall('.//s:url/s:loc', ns)]
    return subs, urls

def clean(t): return htmlmod.unescape(re.sub(r'\s+', ' ', t or '').strip())

SITES = {
    'isorepublic-video': {
        'source': 'isorepublic.com',
        'index': 'https://isorepublic.com/sitemap_index.xml',
        'sub_re': r'video_post-sitemap\d*\.xml$',
        'licence': 'CC0',
        'licence_url': 'https://isorepublic.com/license/',
        'parse': 'iso',
    },
    'isorepublic': {
        'source': 'isorepublic.com',
        'index': 'https://isorepublic.com/sitemap_index.xml',
        'sub_re': r'photo_post-sitemap\d*\.xml$',
        'licence': 'CC0',
        'licence_url': 'https://isorepublic.com/license/',
        'parse': 'iso',
    },
    'negativespace': {
        'source': 'negativespace.co',
        'index': 'https://negativespace.co/sitemap_index.xml',
        'sub_re': r'post-sitemap\d*\.xml$',
        'licence': 'CC0',
        'licence_url': 'https://negativespace.co/license/',
        'parse': 'ns',
    },
}

def parse_iso(html, page_url):
    m = re.search(r'<a href="(https://isorepublic\.com/wp-content/uploads/[^"]+)"[^>]*class="btn btn-lg btn-download"', html)
    if not m: return None
    file_url = m.group(1)
    t = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    title = clean(re.sub('<[^>]+>', '', t.group(1))) if t else None
    a = re.search(r'class="media-author"[^>]*>\s*<strong>(.*?)</strong>', html, re.S) or re.search(r'class="media-author"[^>]*>(.*?)</a>', html, re.S)
    author = clean(re.sub('<[^>]+>', '', a.group(1))) if a else None
    c = re.search(r'"position":2,"name":"(.*?)","item":"https:\\/\\/isorepublic\.com\\/media-category', html)
    cat = c.group(1) if c else None
    mtype = 'video' if file_url.lower().endswith(('.mp4', '.mov', '.webm')) else 'photo'
    return dict(title=title, author=author, file_url=file_url, media_type=mtype, tags=[cat] if cat else [])

def parse_ns(html, page_url):
    m = re.search(r'<a href="(https://negativespace\.co/wp-content/uploads/[^"]+)"[^>]*class="buttons download-button"', html)
    if not m: return None
    file_url = m.group(1)
    t = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    title = clean(re.sub('<[^>]+>', '', t.group(1))) if t else None
    title = re.sub(r'\s*Free Stock Photo\s*$', '', title or '') or title
    a = re.search(r'<span[^>]*itemprop="author"[^>]*>(.*?)</span>', html, re.S)
    author = clean(re.sub('<[^>]+>', '', a.group(1))) if a else None
    return dict(title=title, author=author, file_url=file_url, media_type='photo', tags=[])

PARSERS = {'iso': parse_iso, 'ns': parse_ns}

def _run_site(key, cfg):
    pause_path = os.path.join(STATE, 'paused-%s.json' % key)
    if os.path.exists(pause_path):
        log('%s: paused pending manual review' % key); return 0
    seen_path = os.path.join(STATE, 'seen-%s.json' % key)
    cur_path = os.path.join(STATE, 'cursor-%s.json' % key)
    seen = set(load_json(seen_path, []))
    cursor = load_json(cur_path, {'sub_idx': 0, 'offset': 0})
    try:
        robots_url = 'https://' + cfg['source'] + '/robots.txt'
        robots_text = fetch(robots_url); pace()
        rp = urllib.robotparser.RobotFileParser(robots_url)
        rp.parse(robots_text.splitlines())
        cfg['robots'] = rp
        if not rp.can_fetch(UA['User-Agent'], cfg['index']):
            raise RuntimeError('robots-disallow-index')
        idx_xml = fetch(cfg['index']); pace()
    except RuntimeError as e:
        if str(e) in ('http-403','http-429','bot-challenge'):
            save_json(pause_path, {'reason':str(e), 'at':datetime.now(timezone.utc).isoformat()})
        log('%s: index fetch failed (%s) - site skipped this run' % (key, e)); return 0
    subs, _ = sitemap_urls(idx_xml)
    subs = [s for s in subs if re.search(cfg['sub_re'], s)]
    if not subs:
        log('%s: no matching sub-sitemaps' % key); return 0
    new_count = 0
    fetches = 0
    si = cursor['sub_idx'] % len(subs)
    done_all = True
    while fetches < MAX_FETCH_PER_SITE:
        sub = subs[si]
        try:
            if not rp.can_fetch(UA['User-Agent'], sub):
                raise RuntimeError('robots-disallow-sitemap')
            sub_xml = fetch(sub); pace()
        except RuntimeError as e:
            if str(e) in ('http-403','http-429','bot-challenge'):
                save_json(pause_path, {'reason':str(e), 'at':datetime.now(timezone.utc).isoformat()})
            log('%s: sub-sitemap %s failed (%s) - stopping site this run' % (key, sub, e)); done_all = False; break
        _, urls = sitemap_urls(sub_xml)
        urls = [u for u in urls if re.search(r'\.(xml|html?)$', u) is None]
        off = cursor['offset'] if si == cursor.get('sub_idx', 0) % len(subs) and cursor.get('sub_sitemap') == sub else 0
        stop_site = False
        finished_sub = True
        for i in range(off, len(urls)):
            if fetches >= MAX_FETCH_PER_SITE:
                finished_sub = False
                break
            u = urls[i]
            if u in seen:
                cursor = {'sub_idx': si, 'sub_sitemap': sub, 'offset': i + 1}
                continue
            try:
                if urllib.parse.urlparse(u).hostname != cfg['source'] or not rp.can_fetch(UA['User-Agent'], u):
                    raise RuntimeError('robots-or-host-disallow-page')
                html = fetch(u); pace()
            except RuntimeError as e:
                log('%s: page %s failed (%s) - stopping site this run' % (key, u, e))
                if str(e) in ('http-403','http-429','bot-challenge'):
                    save_json(pause_path, {'reason':str(e), 'at':datetime.now(timezone.utc).isoformat()})
                stop_site = True
                finished_sub = False
                break
            fetches += 1
            rec = PARSERS[cfg['parse']](html, u)
            if rec and rec.get('file_url') and u not in QUEUED:
                entry = {
                    'id': '%s-%s' % (key, re.sub(r'[^a-z0-9]+', '-', u.rstrip('/').split('/')[-1].lower())[:60]),
                    'source': cfg['source'],
                    'source_page': u,
                    'file_url': rec['file_url'],
                    'media_type': rec['media_type'],
                    'title': rec['title'],
                    'author': rec['author'],
                    'licence': cfg['licence'],
                    'licence_url': cfg['licence_url'],
                    'tags': rec['tags'],
                    'collected_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                }
                with open(QUEUE, 'a') as f: f.write(json.dumps(entry, ensure_ascii=False) + '\n')
                QUEUED.add(u)
                new_count += 1
                export_queue()
            seen.add(u)
            cursor = {'sub_idx': si, 'sub_sitemap': sub, 'offset': i + 1}
            save_json(seen_path, sorted(seen))
            save_json(cur_path, cursor)
        if stop_site:
            break
        if finished_sub:
            si += 1
            cursor = {'sub_idx': si, 'sub_sitemap': None, 'offset': 0}
            if si >= len(subs):
                log('%s: all sub-sitemaps walked; wrapping to start for future new items' % key)
                cursor = {'sub_idx': 0, 'sub_sitemap': None, 'offset': 0}
                break
        if fetches >= MAX_FETCH_PER_SITE:
            break
    save_json(seen_path, sorted(seen))
    save_json(cur_path, cursor)
    log('%s: %d new entries (fetched %d pages)' % (key, new_count, fetches))
    return new_count

OUTCOMES = []
def run_site(key, cfg):
    messages = []
    original_log = globals()['log']
    def site_log(msg):
        messages.append(msg)
        original_log(msg)
    globals()['log'] = site_log
    started = datetime.now(timezone.utc).isoformat()
    try:
        count = _run_site(key, cfg)
        errors = [m for m in messages if any(x in m for x in ('failed (', 'paused pending', 'no matching sub-sitemaps'))]
        fetched = 0
        for m in messages:
            hit = re.search(r'fetched (\d+) pages', m)
            if hit: fetched = int(hit.group(1))
        OUTCOMES.append({'site':key,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'new_entries':count,'fetched_pages':fetched,'status':'attention' if errors else 'ok','errors':errors})
        return count
    except Exception as exc:
        OUTCOMES.append({'site':key,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'new_entries':0,'status':'failed','errors':[str(exc)[:300]]})
        raise
    finally:
        globals()['log'] = original_log

QUEUED = set()
def export_queue():
    records = []
    if os.path.exists(QUEUE):
        with open(QUEUE) as f:
            for line in f:
                if line.strip(): records.append(json.loads(line))
    save_json(os.path.join(BASE, 'queue', 'media-queue.json'), {'schema_version': 1, 'entries': records})

def main():
    os.makedirs(os.path.join(BASE, 'queue'), exist_ok=True)
    os.makedirs(STATE, exist_ok=True)
    os.makedirs(os.path.join(BASE, 'logs'), exist_ok=True)
    lock = open(os.path.join(STATE, 'collect.lock'), 'w')
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log('another run is active; skipped'); return 0
    if os.path.exists(QUEUE):
        with open(QUEUE) as f:
            for line in f:
                if line.strip(): QUEUED.add(json.loads(line)['source_page'])
    export_queue()
    OUTCOMES.clear()
    save_json(os.path.join(STATE, 'heartbeat.json'), {'status':'running','started_at':datetime.now(timezone.utc).isoformat(),'run_url':os.environ.get('MEDIA_RUN_URL')})
    total = 0
    for key, cfg in SITES.items():
        try:
            total += run_site(key, cfg)
        except Exception as e:
            log('%s: unexpected error %r - continuing' % (key, e))
    status = 'attention' if any(x['status'] != 'ok' for x in OUTCOMES) else 'ok'
    records = load_json(os.path.join(BASE,'queue','media-queue.json'),{'entries':[]})['entries']
    summary = {'schema_version':1,'status':status,'completed_at':datetime.now(timezone.utc).isoformat(),'new_entries':total,'queue_count':len(records),'sites':OUTCOMES,'run_url':os.environ.get('MEDIA_RUN_URL')}
    save_json(os.path.join(STATE,'heartbeat.json'),summary)
    log('run complete: %d new entries; status=%s' % (total,status))
    return 0 if status == 'ok' else 2

if __name__ == '__main__':
    sys.exit(main())
