import React from 'react';
import {Composition, staticFile} from 'remotion';
import {ICShort, ShortContent, TimedLine} from './ICShort';
import calendar from '../content/shorts.json';

const days = calendar.days as unknown as ShortContent[];

// Fixed fallback timing when no TTS timings exist (local preview with silent track)
function fallbackLines(pointCount: number): TimedLine[] {
  const lines: TimedLine[] = [{text: '', start: 0, duration: 75}];
  for (let i = 0; i < pointCount; i++) {
    lines.push({text: '', start: 75 + i * 100, duration: 100});
  }
  lines.push({text: '', start: 75 + pointCount * 100, duration: 100});
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
    </>
  );
};
