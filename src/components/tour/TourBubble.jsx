import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useProductTour } from "../../context/ProductTourContext";

const BUBBLE_WIDTH = 340;
const ARROW_SIZE = 10;

/**
 * TourBubble Component
 * High-end modern glassmorphism floating bubble for first-login guidance.
 * Provides smooth animations, dynamic positioning, glass depth, and minimal progress indicators.
 */
export const TourBubble = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    activeSteps,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    closeTour,
    setShowPostTourKycModal,
    tourRole,
    anchors,
  } = useProductTour();

  // Animation values for smooth step transitions (fade, lift, scale)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(8);
    scaleAnim.setValue(0.96);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStepIndex, fadeAnim, translateYAnim, scaleAnim]);

  if (!currentStep) return null;

  // Handle direct KYC redirect from bubble
  const handleVerifyNow = () => {
    setShowPostTourKycModal(false);
    finishTour();
    router.push("/kyc-verification");
  };

  // ── 1. MODAL STEPS (WELCOME & FINISH) ──
  if (currentStep.type === "modal") {
    const isFinish = currentStep.isFinish === true;

    return (
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.welcomeGlassCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Close Icon */}
          <Pressable
            style={({ pressed }) => [
              styles.closeIconButton,
              pressed && styles.iconButtonPressed,
            ]}
            onPress={closeTour}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close tour"
            accessibilityRole="button"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6L18 18"
                stroke="#6B7280"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          {/* Role / Context Pill */}
          <View style={styles.welcomeBadgeRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {isFinish
                  ? "ALL SET"
                  : tourRole === "host"
                  ? "HOST TOUR"
                  : "LUNEST TOUR"}
              </Text>
            </View>
          </View>

          {/* Heading & Subtitle */}
          <Text style={styles.welcomeTitle}>{currentStep.title}</Text>
          <Text style={styles.welcomeSubtitle}>{currentStep.description}</Text>

          {/* Action Buttons */}
          <View style={styles.welcomeActionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={isFinish ? finishTour : nextStep}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {currentStep.primaryButtonText || (isFinish ? "Start Exploring" : "Take the Tour")}
              </Text>
            </Pressable>

            {!isFinish && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryGlassButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={skipTour}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryGlassButtonText}>
                  {currentStep.secondaryButtonText || "Skip Tour"}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── 2. CONTEXTUAL POINTER BUBBLE ──
  const targetAnchor = currentStep.anchorId ? anchors[currentStep.anchorId] : null;
  const bubbleWidth = Math.min(screenWidth - 32, BUBBLE_WIDTH);

  let bubbleTop = insets.top + 80;
  let bubbleLeft = (screenWidth - bubbleWidth) / 2;
  let arrowPosition = "top"; // 'top' = bubble sits below target; 'bottom' = bubble sits above target
  let arrowLeft = bubbleWidth / 2 - ARROW_SIZE;

  if (targetAnchor) {
    const { x, y, width, height } = targetAnchor;
    const targetCenterX = x + width / 2;
    const targetCenterY = y + height / 2;

    // Center bubble horizontally relative to target, clamped safely within screen bounds
    const idealLeft = targetCenterX - bubbleWidth / 2;
    bubbleLeft = Math.max(16, Math.min(idealLeft, screenWidth - bubbleWidth - 16));

    // Align arrow with target center X
    arrowLeft = Math.max(
      20,
      Math.min(targetCenterX - bubbleLeft - ARROW_SIZE, bubbleWidth - 40)
    );

    // Vertical placement logic:
    // If target is in bottom half of screen or preferred position is top, place above target
    const spaceBelow = screenHeight - (y + height);
    if (currentStep.preferredPosition === "top" || spaceBelow < 220) {
      bubbleTop = Math.max(insets.top + 16, y - 180);
      arrowPosition = "bottom";
    } else {
      bubbleTop = y + height + 12;
      arrowPosition = "top";
    }
  }

  // Calculate contextual step indexing (ignoring welcome/finish modal steps for clean count)
  const contextualSteps = activeSteps.filter((s) => s.type !== "modal");
  const contextualIndex = contextualSteps.findIndex((s) => s.id === currentStep.id);
  const displayStepNumber = contextualIndex !== -1 ? contextualIndex + 1 : currentStepIndex;
  const totalDisplaySteps = contextualSteps.length;

  const isKycStep = currentStep.isKycOnly === true;
  const isLastContextualStep = contextualIndex === contextualSteps.length - 1;

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        {
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Pointer Notch pointing UP towards target above */}
      {arrowPosition === "top" && (
        <View style={[styles.arrowUp, { left: arrowLeft }]} />
      )}

      <View style={styles.glassCard}>
        {/* Header: Progress pill, minimal dots, and Close X */}
        <View style={styles.cardHeader}>
          <View style={styles.progressRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {displayStepNumber} of {totalDisplaySteps}
              </Text>
            </View>

            {/* Subtle Progress Dots */}
            <View style={styles.dotsRow}>
              {contextualSteps.map((step, idx) => {
                const isActive = idx === contextualIndex;
                const isPast = idx < contextualIndex;
                return (
                  <View
                    key={step.id}
                    style={[
                      styles.dot,
                      isActive && styles.activeDot,
                      isPast && styles.pastDot,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Close X */}
          <Pressable
            style={({ pressed }) => [
              styles.closeIconButtonSmall,
              pressed && styles.iconButtonPressed,
            ]}
            onPress={closeTour}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close tour"
            accessibilityRole="button"
          >
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6L18 18"
                stroke="#6B7280"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Title & Description */}
        <Text style={styles.bubbleTitle}>{currentStep.title}</Text>
        <Text style={styles.bubbleDesc}>{currentStep.description}</Text>

        {/* Footer Navigation Actions */}
        <View style={styles.footerRow}>
          {currentStepIndex > 1 ? (
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={prevStep}
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.skipLink,
                pressed && styles.buttonPressed,
              ]}
              onPress={skipTour}
              accessibilityRole="button"
            >
              <Text style={styles.skipLinkText}>Skip Tour</Text>
            </Pressable>
          )}

          <View style={styles.rightButtonsRow}>
            {isKycStep ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryGlassSmallButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={nextStep}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryGlassSmallButtonText}>Later</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.primarySmallButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleVerifyNow}
                  accessibilityRole="button"
                >
                  <Text style={styles.primarySmallButtonText}>Verify Now</Text>
                </Pressable>
              </>
            ) : isLastContextualStep ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primarySmallButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={nextStep}
                accessibilityRole="button"
              >
                <Text style={styles.primarySmallButtonText}>
                  {currentStep.primaryButtonText || "Next →"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.primarySmallButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={nextStep}
                accessibilityRole="button"
              >
                <Text style={styles.primarySmallButtonText}>
                  {currentStep.primaryButtonText || "Next →"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Pointer Notch pointing DOWN towards target below */}
      {arrowPosition === "bottom" && (
        <View style={[styles.arrowDown, { left: arrowLeft }]} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 1, 53, 0.44)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10000,
  },
  welcomeGlassCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.75)",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 16,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }
      : {}),
  },
  closeIconButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(1, 1, 53, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeIconButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(1, 1, 53, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  welcomeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rolePill: {
    backgroundColor: "rgba(1, 1, 53, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 1, 53, 0.12)",
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#010135",
    letterSpacing: 0.8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#010135",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  welcomeActionRow: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#010135",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryGlassButton: {
    width: "100%",
    height: 44,
    backgroundColor: "rgba(1, 1, 53, 0.04)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(1, 1, 53, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryGlassButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Contextual Bubble Styles (Glassmorphism) ──
  bubbleContainer: {
    position: "absolute",
    zIndex: 10001,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.75)",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }
      : {}),
  },
  arrowUp: {
    position: "absolute",
    top: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255, 255, 255, 0.90)",
    zIndex: 10002,
  },
  arrowDown: {
    position: "absolute",
    bottom: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255, 255, 255, 0.90)",
    zIndex: 10002,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBadge: {
    backgroundColor: "rgba(1, 1, 53, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(1, 1, 53, 0.12)",
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#010135",
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(1, 1, 53, 0.16)",
  },
  activeDot: {
    width: 12,
    borderRadius: 3,
    backgroundColor: "#010135",
  },
  pastDot: {
    backgroundColor: "rgba(1, 1, 53, 0.35)",
  },
  bubbleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 5,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  bubbleDesc: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(1, 1, 53, 0.06)",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  skipLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  rightButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primarySmallButton: {
    height: 38,
    paddingHorizontal: 16,
    backgroundColor: "#010135",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  primarySmallButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryGlassSmallButton: {
    height: 38,
    paddingHorizontal: 14,
    backgroundColor: "rgba(1, 1, 53, 0.04)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(1, 1, 53, 0.1)",
  },
  secondaryGlassSmallButtonText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});

export default TourBubble;
