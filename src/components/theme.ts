/**
 * Design tokens. Red and blue, with high contrast for reading outdoors in
 * bright sun. Minimum touch target is 48 dp, which is large enough for use
 * while standing or wearing gloves.
 *
 * Blue is the primary colour (headers, charts, links). Brand red is for
 * buttons and small brand details.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  primary: '#1A4FA0',
  primaryDark: '#123A78',
  brandRed: '#CE1126',
  accent: '#E0B000',
  background: '#F1F4F9',
  surface: '#FFFFFF',
  text: '#111111',
  textMuted: '#4A5568',
  border: '#CCD4E0',
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

/** Content stops growing at these widths, so lines stay readable in a wide window. */
export const CONTENT_MAX_WIDTH = 760;
export const FORM_MAX_WIDTH = 480;

/** From this window width the tab bar moves to the left side of the screen. */
export const WIDE_SCREEN = 900;

/** The header on every screen: blue with white text. */
export const headerBar = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
} as const;

export const type: Record<'title' | 'heading' | 'body' | 'label' | 'small', TextStyle> = {
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
};
