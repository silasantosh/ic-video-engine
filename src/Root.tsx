import React from 'react';
import {Composition, staticFile} from 'remotion';
import {ICShort, ShortContent, TimedLine} from './ICShort';
import {ICLong, LongContent} from './ICLong';
import calendar from '../content/shorts.json';
import longCalendar from '../content/longs.json';

const days = calendar.days as unknown as ShortContent[];
const longDays = longCalendar.days as unknown as LongContent[];

// Fixed fallback timing when no TTS timings exist (local preview with silent track)
function fallbackLines(pointCount: number): TimedLine[] {
  const lines: TimedLine[] = [{text: '', start: 0, duration: 75}];
  for (let i = 0; i < pointCount; i++) {
    lines.push({text: '', start: 75 + i * 100, duration: 100});
  }
  lines.push({text: '', start: 75 + pointCount * 100, duration: 100});
  return lines;
}

function fallbackLongLines(sectionCount: number): TimedLine[] {
  const lines: TimedLine[] = [{text: '', start: 0, duration: 90}];
  for (let i = 0; i < sectionCount; i++) {
    lines.push({text: '', start: 90 + i * 150, duration: 150});
  }
  lines.push({text: '', start: 90 + sectionCount * 150, duration: 120});
  return lines;
}

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ICShort"
        component={ICShort}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={475}
        defaultProps={{
          content: days[0],
          voiceoverFile: 'voice/silence.mp3',
          lines: fallbackLines(3),
        }}
        calculateMetadata={async ({props}) => {
          const day = ((props as Record<string, unknown>).day as number) ?? 1;
          const content =
            days.find((d) => d.day === day) ?? days[(day - 1) % days.length];
          let lines = fallbackLines(content.points.length);
          let voiceoverFile = 'voice/silence.mp3';
          let durationInFrames = 75 + content.points.length * 100 + 100;
          try {
            const res = await fetch(staticFile('voice/timings.json'));
            if (res.ok) {
              const t = await res.json();
              lines = t.lines;
              voiceoverFile = t.audioFile;
              durationInFrames = t.totalFrames;
            }
          } catch {
            // no TTS timings - silent fallback
          }
          return {props: {content, voiceoverFile, lines}, durationInFrames};
        }}
      />

      <Composition
        id="ICLong"
        component={ICLong}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={2700}
        defaultProps={{
          content: longDays[0],
          voiceoverFile: 'voice/silence.mp3',
          lines: fallbackLongLines(longDays[0].sections.length),
        }}
        calculateMetadata={async ({props}) => {
          const day = ((props as Record<string, unknown>).day as number) ?? 1;
          const content =
            longDays.find((d) => d.day === day) ?? longDays[(day - 1) % longDays.length];
          let lines = fallbackLongLines(content.sections.length);
          let voiceoverFile = 'voice/silence.mp3';
          let durationInFrames = 90 + content.sections.length * 150 + 120;
          try {
            const res = await fetch(staticFile('voice/timings.json'));
            if (res.ok) {
              const t = await res.json();
              lines = t.lines;
              voiceoverFile = t.audioFile;
              durationInFrames = t.totalFrames;
            }
          } catch {
            // no TTS timings - silent fallback
          }
          return {props: {content, voiceoverFile, lines}, durationInFrames};
        }}
      />
    </>
  );
};
