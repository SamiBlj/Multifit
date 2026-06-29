export const Colors = {
  // Brand
  primary: '#FF6B35',       // energetic orange — CTAs, highlights
  primaryDark: '#CC4E1A',
  accent: '#00E5FF',        // electric cyan — secondary highlights
  accentDark: '#00B0CC',

  // Backgrounds
  background: '#0D0D0D',    // near-black base
  surface: '#1A1A1A',       // card / sheet surface
  surfaceElevated: '#242424',

  // Goal palette
  cut: '#FF4D4D',           // red — fat loss
  bulk: '#FFB800',          // gold — mass gain
  muscleGrowth: '#7C4DFF',  // purple — muscle
  maintain: '#00C853',      // green — maintenance

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#5A5A5A',

  // Utility
  border: '#2A2A2A',
  success: '#00C853',
  warning: '#FFB800',
  error: '#FF4D4D',
  white: '#FFFFFF',
  black: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;
