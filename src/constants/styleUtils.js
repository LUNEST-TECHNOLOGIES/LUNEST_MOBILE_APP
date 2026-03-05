/**
 * Style Utility Helpers
 * Common functions for creating and combining styles
 */

import { StyleSheet } from "react-native";
import { COLORS } from "./theme";

/**
 * Create color utility classes
 */
export const colorUtils = {
  text: (color = COLORS.black) => ({ color }),
  bg: (color) => ({ backgroundColor: color }),
  border: (color) => ({ borderColor: color }),
};

/**
 * Create spacing utilities
 */
export const spacingUtils = {
  p: (size) => ({ padding: size }),
  px: (size) => ({ paddingHorizontal: size }),
  py: (size) => ({ paddingVertical: size }),
  m: (size) => ({ margin: size }),
  mx: (size) => ({ marginHorizontal: size }),
  my: (size) => ({ marginVertical: size }),
  gap: (size) => ({ gap: size }),
};

/**
 * Create typography utilities
 */
export const typographyUtils = {
  size: (size) => ({ fontSize: size }),
  weight: (weight) => ({ fontWeight: weight }),
  font: (font) => ({ fontFamily: font }),
  lineHeight: (height) => ({ lineHeight: height }),
  letterSpacing: (spacing) => ({ letterSpacing: spacing }),
};

/**
 * Create border utilities
 */
export const borderUtils = {
  radius: (radius) => ({ borderRadius: radius }),
  width: (width) => ({ borderWidth: width }),
  color: (color) => ({ borderColor: color }),
  all: (width, color, radius) => ({
    borderWidth: width,
    borderColor: color,
    borderRadius: radius,
  }),
};

/**
 * Create shadow utilities
 */
export const shadowUtils = {
  sm: {
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  md: {
    boxShadow: "0px 4px 8px rgba(0,0,0,0.12)",
    elevation: 4,
  },
  lg: {
    boxShadow: "0px 8px 16px rgba(0,0,0,0.16)",
    elevation: 8,
  },
};

/**
 * Flexbox utilities
 */
export const flexUtils = {
  row: { flexDirection: "row" },
  col: { flexDirection: "column" },
  center: { justifyContent: "center", alignItems: "center" },
  between: { justifyContent: "space-between" },
  around: { justifyContent: "space-around" },
  evenly: { justifyContent: "space-evenly" },
  end: { justifyContent: "flex-end" },
  start: { justifyContent: "flex-start" },
};

/**
 * Create responsive text styles
 */
export const responsiveText = (mobile, tablet = null, desktop = null) => {
  // For React Native, return mobile styles
  // In web implementations, this could handle breakpoints
  return mobile;
};

/**
 * Create conditional styles
 */
export const conditional = (condition, trueStyle, falseStyle = {}) => {
  return condition ? trueStyle : falseStyle;
};

/**
 * Combine multiple style objects
 */
export const combineStyles = (...styles) => {
  return StyleSheet.compose(...styles.filter(Boolean));
};

/**
 * Create a style variant system
 */
export const createVariants = (baseStyle, variants) => {
  return Object.entries(variants).reduce((acc, [key, value]) => {
    acc[key] = StyleSheet.compose(baseStyle, value);
    return acc;
  }, {});
};

/**
 * Dynamic style creation with fallback
 */
export const createDynamicStyle = (baseStyle, overrides = {}) => {
  return StyleSheet.compose(baseStyle, overrides);
};

/**
 * Text truncation utilities
 */
export const textTruncate = {
  ellipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  lines: (count) => ({
    numberOfLines: count,
  }),
};

/**
 * Opacity utilities
 */
export const opacityUtils = {
  full: { opacity: 1 },
  high: { opacity: 0.8 },
  medium: { opacity: 0.6 },
  low: { opacity: 0.4 },
  disabled: { opacity: 0.5 },
};

/**
 * Position utilities
 */
export const positionUtils = {
  absolute: { position: "absolute" },
  relative: { position: "relative" },
  sticky: { position: "sticky" },
};

/**
 * Size utilities
 */
export const sizeUtils = {
  full: { width: "100%", height: "100%" },
  screen: { width: "100%", height: "100%" },
  w: (width) => ({ width }),
  h: (height) => ({ height }),
  wh: (size) => ({ width: size, height: size }),
};

export default {
  colorUtils,
  spacingUtils,
  typographyUtils,
  borderUtils,
  shadowUtils,
  flexUtils,
  opacityUtils,
  positionUtils,
  sizeUtils,
  responsive: responsiveText,
  conditional,
  combineStyles,
  createVariants,
  createDynamicStyle,
};
