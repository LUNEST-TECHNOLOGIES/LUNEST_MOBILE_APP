// Lunest Theme Constants

export const COLORS = {
  primary: '#010135',
  secondary: '#010135',
  accent: '#6366F1',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#656565',
    600: '#4B5563',
  },
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const FONTS = {
  regular: 'Aeonik-Regular',
  medium: 'Aeonik-Medium',
  bold: 'Aeonik-Bold',
  // Fallback to system fonts if custom fonts not loaded
  regularFallback: 'System',
  mediumFallback: 'System',
  boldFallback: 'System',
};

export const SIZES = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  
  // Spacing
  padding: 16,
  margin: 16,
  radius: 12,
};

export default { COLORS, FONTS, SIZES };
