/**
 * Font utility functions
 * Provides helper functions to get font family names with fallbacks
 */

import { FONTS } from '../constants/theme';
import { Platform } from 'react-native';

/**
 * Get font family name with fallback
 * @param {string} weight - 'regular', 'medium', or 'bold'
 * @returns {string} Font family name
 */
export const getFontFamily = (weight = 'regular') => {
  const fontMap = {
    regular: FONTS.regular,
    medium: FONTS.medium,
    bold: FONTS.bold,
  };

  const fontName = fontMap[weight] || FONTS.regular;
  
  // Check if font is loaded (you can enhance this with font loading state)
  // For now, return the font name - React Native will fallback to system font if not found
  return fontName;
};

/**
 * Get font style object for Text components
 * @param {string} weight - 'regular', 'medium', or 'bold'
 * @returns {object} Style object with fontFamily
 */
export const getFontStyle = (weight = 'regular') => {
  return {
    fontFamily: getFontFamily(weight),
  };
};

/**
 * Default font family for the app
 */
export const DEFAULT_FONT = FONTS.regular;
