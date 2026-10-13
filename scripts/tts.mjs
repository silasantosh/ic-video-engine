// Sarvam Bulbul v3 TTS step for the daily video engine.
// One request per video (his picked config), whole script at once.
// Writes public/voice/voiceover.mp3 + public/voice/timings.json, tracks usage in usage/usage.json.
// NEVER logs the API key.
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FPS = 30;
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean));
const day = parseInt(args.day || '1', 10);
const type = args.type === 'lesson' ? 'lesson' : 'short';

const key = process.env.SARVAM_API_KEY;
if (!key) {
  console.error('SARVAM_API_KEY missing - refusing silent/placeholder audio for a scheduled video.');
  process.exit(1);
}

const cal = JSON.parse(fs.readFileSync('content/shorts.json', 'utf8'));
const entry = cal.days.find((d) => d.day === day) ?? cal.days[(day - 1) % cal.days.length];
const voice = cal.tts[type];
const lines = entry.lines_hi;
const text = lines.join('\n');

console.log(`day ${day} (${entry.module}) type=${type} speaker=${voice.speaker} lang=${voice.language} chars=${text.length}`);

const res = await fetch('https://api.sarvam.ai/text-to-speech', {
  method: 'POST',
  headers: {'api-subscription-key': key, 'content-type': 'application/json'},
  body: JSON.stringify({
    text,
    target_language_code: voice.language,
    speaker: voice.speaker,
    model: cal.tts.model,
    speech_sample_rate: cal.tts.sampleRate,
    enable_preprocessing: true,
  }),
});
if (!res.ok) {
  console.error(`Sarvam API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const body = await res.json();
const b64 = body.audios?.[0];
if (!b64) {
  console.error('Sarvam returned no audio');
  process.exit(1);
}
fs.mkdirSync('public/voice', {recursive: true});
fs.writeFileSync('public/voice/voiceover.mp3', Buffer.from(b64, 'base64'));

const dur = parseFloat(execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 public/voice/voiceover.mp3').toString().trim());
const totalFrames = Math.ceil(dur * FPS) + 45; // 1.5s end-card hold after voice ends

// Per-line timing: share of characters, min 2s per line so text is readable.
const counts = lines.map((l) => Math.max(l.length, 10));
const totalChars = counts.reduce((a, b) => a + b, 0);
const audioFrames = Math.ceil(dur * FPS);
let start = 0;
const timed = lines.map((l, i) => {
  const frames = Math.max(60, Math.round((counts[i] / totalChars) * audioFrames));
  const line = {text: l, start, duration: frames};
  start += frames;
  return line;
});
// scale drift away so lines exactly fill the audio
const drift = audioFrames - start;
timed[timed.length - 1].duration += drift;

fs.writeFileSync('public/voice/timings.json', JSON.stringify({audioFile: 'voice/voiceover.mp3', fps: FPS, durationSec: dur, totalFrames, lines: timed}, null, 2));

// usage tracking (Rs 100 free credits ~= 33k chars at Rs 30/10k)
fs.mkdirSync('usage', {recursive: true});
const usagePath = 'usage/usage.json';
const usage = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : {total_chars: 0, total_requests: 0, log: []};
usage.total_chars += text.length;
usage.total_requests += 1;
usage.log.push({ts: new Date().toISOString(), day, type, chars: text.length});
fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));
console.log(`audio ${dur.toFixed(1)}s, totalFrames ${totalFrames}; usage total ${usage.total_chars} chars across ${usage.total_requests} requests`);
