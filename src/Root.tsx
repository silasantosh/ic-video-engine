import React from 'react';
import {Composition} from 'remotion';
import {ICShort, ShortContent} from './ICShort';
import calendar from '../content/shorts.json';

const days = calendar.days as ShortContent[];

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
          voiceoverFile: 'voice/voiceover.mp3',
        }}
        calculateMetadata={({props}) => {
          const day = (props.day as number) ?? 1;
          const content =
            days.find((d) => d.day === day) ?? days[(day - 1) % days.length];
          return {
            props: {content, voiceoverFile: 'voice/voiceover.mp3'},
            durationInFrames: 75 + content.points.length * 100 + 100,
          };
        }}
      />
    </>
  );
};
