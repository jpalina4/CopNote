/**
 * Design tokens. Black, red and gold from the PNG flag, matching the logo,
 * with high contrast for reading outdoors in bright sun. Minimum touch target
 * is 48 dp, which is large enough for use while standing or wearing gloves.
 *
 * Black is the primary colour (headers, buttons) rather than red, so brand red
 * is never mistaken for `danger` red on delete buttons and errors.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  primary: '#1A1A1A',
  primaryDark: '#000000',
  brandRed: '#CE1126',
  accent: '#E0B000',
  background: '#F4F4F5',
  surface: '#FFFFFF',
  text: '#111111',
  textMuted: '#52525B',
  border: '#D4D4D8',
  danger: '#B42318',
  dangerBg: '#FEECEB',
  success: '#1E7B34',
  successBg: '#E6F4EA',
  warning: '#8A5A00',
  warningBg: '#FFF4D6',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 6, md: 10, lg: 16 };

export const MIN_TOUCH = 48;

export const type: Record<'title' | 'heading' | 'body' | 'label' | 'small', TextStyle> = {
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
};
