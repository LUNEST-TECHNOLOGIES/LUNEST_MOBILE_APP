/**
 * Centralized Styling System
 * All reusable styles, colors, spacing, and typography
 */

import { Platform, StyleSheet } from "react-native";
import { COLORS, FONTS } from "./theme";

/**
 * Common/Base Styles
 */
export const baseStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flexRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexRowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  flexColumn: {
    flexDirection: "column",
  },
  flexColumnCenter: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },

  // Spacing
  p16: { padding: 16 },
  p20: { padding: 20 },
  p12: { padding: 12 },
  p8: { padding: 8 },
  px16: { paddingHorizontal: 16 },
  px20: { paddingHorizontal: 20 },
  py16: { paddingVertical: 16 },
  py20: { paddingVertical: 20 },

  m16: { margin: 16 },
  m20: { margin: 20 },
  m12: { margin: 12 },
  m8: { margin: 8 },
  mx16: { marginHorizontal: 16 },
  mx20: { marginHorizontal: 20 },
  my16: { marginVertical: 16 },
  my20: { marginVertical: 20 },

  // Border Radius
  rounded8: { borderRadius: 8 },
  rounded12: { borderRadius: 12 },
  rounded16: { borderRadius: 16 },
  rounded20: { borderRadius: 20 },
  roundedFull: { borderRadius: 999 },

  // Borders
  border1Gray200: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  border1Gray300: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  border1Primary: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // Shadows
  shadow: {
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3,
  },
  shadowMd: {
    boxShadow: "0px 4px 8px rgba(0,0,0,0.15)",
    elevation: 5,
  },

  // Backgrounds
  bgGray50: { backgroundColor: "#FAFAFA" },
  bgGray100: { backgroundColor: COLORS.gray[100] },
  bgGray200: { backgroundColor: COLORS.gray[200] },
  bgWhite: { backgroundColor: COLORS.white },
  bgPrimary: { backgroundColor: COLORS.primary },
  bgSecondary: { backgroundColor: COLORS.secondary },
  bgWarning: { backgroundColor: "#FFF9E6" },

  // General
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
});

/**
 * Typography Styles
 */
export const textStyles = StyleSheet.create({
  // Headers
  h1: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
    lineHeight: 30,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
    lineHeight: 26,
  },
  h4: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
    lineHeight: 24,
  },

  // Body
  bodyLg: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.medium,
    color: COLORS.black,
    lineHeight: 24,
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: FONTS.medium,
    color: COLORS.black,
    lineHeight: 22,
  },
  bodySm: {
    fontSize: 13,
    fontWeight: "400",
    fontFamily: FONTS.regular,
    color: COLORS.black,
    lineHeight: 20,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: FONTS.medium,
    color: "#292929",
  },

  // Caption/Helper text
  caption: {
    fontSize: 12,
    fontWeight: "400",
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
  captionXs: {
    fontSize: 11,
    fontWeight: "400",
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },

  // Error/Success
  error: {
    color: COLORS.error,
  },
  success: {
    color: COLORS.success,
  },
  warning: {
    color: "#856404",
  },
});

/**
 * Input/Form Styles
 */
export const inputStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    ...textStyles.label,
  },
  hint: {
    ...textStyles.caption,
    marginBottom: 4,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    backgroundColor: "#FAFAFA",
  },
  inputFocused: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.error,
  },
});

/**
 * Button Styles
 */
export const buttonStyles = StyleSheet.create({
  // Primary Button
  primary: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },

  // Secondary Button
  secondary: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // Tertiary/Ghost Button
  tertiary: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  tertiaryText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },

  // Small Button
  small: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Large Button
  large: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  active: {
    opacity: 0.8,
  },
});

/**
 * Card/Container Styles
 */
export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 16,
  },
  baseLarge: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 20,
  },
  elevated: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.12)",
    elevation: 4,
  },
});

/**
 * Header/Top Navigation Styles
 */
export const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: "relative",
  },
  title: {
    ...textStyles.h4,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    zIndex: 1,
  },
});

/**
 * Progress/Status Styles
 */
export const progressStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  barsContainer: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    marginRight: 15,
  },
  segment: {
    height: 5,
    flex: 1,
    borderRadius: 2,
  },
  segmentFilled: {
    backgroundColor: "#0E2F5D",
  },
  segmentEmpty: {
    backgroundColor: "#20A4FF",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
});

/**
 * Toggle/Switch Styles
 */
export const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
  },
  infoContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.medium,
    color: COLORS.black,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray[500],
  },
});

/**
 * Scroll View Styles
 */
export const scrollStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 25,
  },
});

/**
 * Info/Alert Box Styles
 */
export const infoBoxStyles = StyleSheet.create({
  warning: {
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  warningText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#856404",
    lineHeight: 20,
  },
  error: {
    backgroundColor: "#FEE8E8",
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#C33C3C",
    lineHeight: 20,
  },
  success: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
  },
  successText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#2E7D32",
    lineHeight: 20,
  },
});

/**
 * Footer/Button Row Styles
 */
export const footerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 48 : 20,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  buttonContainer: {
    flex: 1,
  },
  twoButtonRow: {
    gap: 20,
  },
});

/**
 * Helper function to combine styles
 */
export const combineStyles = (...styles) => {
  return StyleSheet.compose(...styles.filter(Boolean));
};

/**
 * Helper function to create dynamic styles
 */
export const createDynamicStyle = (baseStyle, dynamicProps = {}) => {
  return { ...baseStyle, ...dynamicProps };
};
