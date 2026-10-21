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
import {TimedLine} from './ICShort';

loadFont();

export type LongSection = {heading: string; points: string[]};

export type LongContent = {
  day: number;
  module: string;
  title: string;
  hook: string;
  sections: LongSection[];
};

const TitleCard: React.FC<{title: string; moduleName: string}> = ({title, moduleName}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const opacity = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', padding: 120, opacity}}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 26,
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
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.2,
            color: BRAND.deepGreen,
            maxWidth: 1500,
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SectionCard: React.FC<{section: LongSection; index: number}> = ({section, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16, stiffness: 130}});
  const translateY = interpolate(enter, [0, 1], [120, 0]);
  const opacity = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', padding: 110, opacity}}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          background: BRAND.white,
          borderRadius: 36,
          padding: '56px 64px',
          width: '100%',
          boxShadow: '0 18px 50px rgba(9,107,84,0.18)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 48,
        }}
      >
        <div
          style={{
            minWidth: 96,
            height: 96,
            borderRadius: 48,
            background: BRAND.signalGreen,
            color: BRAND.white,
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {index + 1}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.2,
              color: BRAND.deepGreen,
            }}
          >
            {section.heading}
          </div>
          {section.points.map((p, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.35,
                color: BRAND.textSoft,
              }}
            >
              {'• ' + p}
            </div>
          ))}
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
          gap: 40,
        }}
      >
        <Img
          src={staticFile('logo.png')}
          style={{width: 240, height: 240, borderRadius: 56}}
        />
        <div style={{fontFamily: FONT, fontSize: 60, fontWeight: 800, color: BRAND.white}}>
          impact-connect.in
        </div>
        <div style={{fontFamily: FONT, fontSize: 32, fontWeight: 600, color: BRAND.mint}}>
          connecting social sector
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ICLong: React.FC<{
  content: LongContent;
  voiceoverFile: string | null;
  lines: TimedLine[];
}> = ({content, voiceoverFile, lines}) => {
  // lines[0] = title card, lines[1..n-2] = section cards, lines[n-1] = end line over the end card
  const title = lines[0];
  const sectionLines = lines.slice(1, 1 + content.sections.length);
  const end = lines[lines.length - 1];
  return (
    <AbsoluteFill
      style={{background: `linear-gradient(180deg, ${BRAND.mint} 0%, ${BRAND.offWhite} 80%)`}}
    >
      {voiceoverFile ? <Audio src={staticFile(voiceoverFile)} /> : null}
      <Sequence from={title.start} durationInFrames={title.duration}>
        <TitleCard title={content.title} moduleName={content.module} />
      </Sequence>
      {sectionLines.map((l, i) => (
        <Sequence key={i} from={l.start} durationInFrames={l.duration}>
          <SectionCard section={content.sections[i]} index={i} />
        </Sequence>
      ))}
      <Sequence from={end.start}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
