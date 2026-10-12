import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/NotoSans';
import {BRAND, FONT} from './Brand';

loadFont();

export type ShortContent = {
  day: number;
  module: string;
  hook: string;
  points: string[];
};

const Hook: React.FC<{text: string; moduleName: string}> = ({text, moduleName}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const opacity = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 90,
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 6,
            color: BRAND.signalGreen,
            textTransform: 'uppercase',
          }}
        >
          Impact Connect - {moduleName}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.15,
            color: BRAND.deepGreen,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PointCard: React.FC<{point: string; index: number}> = ({point, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16, stiffness: 130}});
  const translateY = interpolate(enter, [0, 1], [120, 0]);
  const opacity = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', padding: 90, opacity}}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          background: BRAND.white,
          borderRadius: 36,
          padding: '64px 56px',
          width: '100%',
          boxShadow: '0 18px 50px rgba(9,107,84,0.18)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 44,
        }}
      >
        <div
          style={{
            minWidth: 110,
            height: 110,
            borderRadius: 55,
            background: BRAND.signalGreen,
            color: BRAND.white,
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {index + 1}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.3,
            color: BRAND.deepGreen,
          }}
        >
          {point}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 13, stiffness: 110}});
  const opacity = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${BRAND.green} 0%, ${BRAND.deepGreen} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 48,
        }}
      >
        <Img
          src={staticFile('logo.png')}
          style={{width: 300, height: 300, borderRadius: 72}}
        />
        <div
          style={{
            fontFamily: FONT,
            fontSize: 68,
            fontWeight: 800,
            color: BRAND.white,
          }}
        >
          impact-connect.in
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 38,
            fontWeight: 600,
            color: BRAND.mint,
          }}
        >
          connecting social sector
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ICShort: React.FC<{content: ShortContent; voiceoverFile: string | null}> = ({
  content,
  voiceoverFile,
}) => {
  const hookFrames = 75;
  const cardFrames = 100;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${BRAND.mint} 0%, ${BRAND.offWhite} 80%)`,
      }}
    >
      {/* Voice slot: silent placeholder until the TTS audition winner
          (Indic Parler / Kokoro) is wired in. Replace the file at
          public/voice/voiceover.mp3 per day, or point voiceoverFile at a URL. */}
      {voiceoverFile ? <Audio src={staticFile(voiceoverFile)} /> : null}
      <Sequence durationInFrames={hookFrames}>
        <Hook text={content.hook} moduleName={content.module} />
      </Sequence>
      {content.points.map((p, i) => (
        <Sequence key={i} from={hookFrames + i * cardFrames} durationInFrames={cardFrames}>
          <PointCard point={p} index={i} />
        </Sequence>
      ))}
      <Sequence from={hookFrames + content.points.length * cardFrames}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
