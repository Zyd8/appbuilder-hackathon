import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useTheme } from '@/theme/use-theme';

export type BuddyMood = 'happy' | 'thinking' | 'celebrating' | 'sleepy';

type BuddyMascotProps = {
  mood?: BuddyMood;
  size?: number;
};

/** Placeholder Buddy mascot: an original round blob with simple expressions. Final art TBD. */
export function BuddyMascot({ mood = 'happy', size = 64 }: BuddyMascotProps) {
  const { colors } = useTheme();
  const ink = '#1B1630';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`Buddy looks ${mood}`}>
      <Ellipse cx="50" cy="56" rx="40" ry="36" fill={colors.primary} />
      <Ellipse cx="50" cy="60" rx="30" ry="24" fill="#FFFFFF" opacity={0.92} />
      {/* antenna */}
      <Path d="M50 20 Q54 10 60 8" stroke={colors.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Circle cx="61" cy="8" r="5" fill={colors.accent} />
      {/* eyes */}
      {mood === 'sleepy' ? (
        <>
          <Path d="M34 56 Q39 60 44 56" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M56 56 Q61 60 66 56" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : mood === 'celebrating' ? (
        <>
          <Path d="M34 58 Q39 51 44 58" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M56 58 Q61 51 66 58" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx="39" cy={mood === 'thinking' ? 54 : 56} r="4" fill={ink} />
          <Circle cx="61" cy={mood === 'thinking' ? 54 : 56} r="4" fill={ink} />
        </>
      )}
      {/* mouth */}
      {mood === 'thinking' ? (
        <Path d="M44 70 L56 68" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      ) : mood === 'sleepy' ? (
        <Circle cx="50" cy="70" r="3" fill={ink} />
      ) : (
        <Path
          d={mood === 'celebrating' ? 'M40 66 Q50 80 60 66 Z' : 'M42 67 Q50 75 58 67'}
          stroke={ink}
          strokeWidth={3}
          fill={mood === 'celebrating' ? ink : 'none'}
          strokeLinecap="round"
        />
      )}
      {/* cheeks */}
      <Circle cx="30" cy="66" r="4" fill="#F7A1C4" opacity={0.7} />
      <Circle cx="70" cy="66" r="4" fill="#F7A1C4" opacity={0.7} />
    </Svg>
  );
}
