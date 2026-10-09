import { Text, type TextProps } from 'react-native';

import { typography, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export type TextVariant = keyof typeof typography;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: keyof ThemeColors;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return <Text style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
