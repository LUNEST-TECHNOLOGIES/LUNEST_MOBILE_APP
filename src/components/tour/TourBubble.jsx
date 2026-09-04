import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useProductTour } from "../../context/ProductTourContext";

const BUBBLE_WIDTH = 340;
const ARROW_SIZE = 12;

export const TourBubble = () => {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    closeTour,
    setShowPostTourKycModal,
    tourRole,
    anchors,
  } = useProductTour();


  if (!currentStep) return null;

  // ── WELCOME MODAL BUBBLE (STEP 0) ──
  if (currentStep.type === "modal") {
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.welcomeCard}>
          <TouchableOpacity
            style={styles.closeIconButton}
            onPress={closeTour}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6L18 18"
                stroke="#6B7280"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          <View style={styles.welcomeBadgeRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {tourRole === "host" ? "HOST TOUR" : "LUNEST TOUR"}
              </Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>{currentStep.title}</Text>
          <Text style={styles.welcomeSubtitle}>{currentStep.description}</Text>

          <View style={styles.welcomeActionRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={nextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {currentStep.primaryButtonText || "Take a quick tour"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={skipTour}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                {currentStep.secondaryButtonText || "Skip"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── CONTEXTUAL POINTER BUBBLE (STEPS 1+) ──
  const targetAnchor = currentStep.anchorId ? anchors[currentStep.anchorId] : null;

  // Dynamic bubble positioning
  const bubbleWidth = Math.min(screenWidth - 32, BUBBLE_WIDTH);

  let bubbleTop = 120;
  let bubbleLeft = (screenWidth - bubbleWidth) / 2;
  let arrowPosition = "top"; // arrow points up (bubble is below target) or arrow points down (bubble is above target)
  let arrowLeft = bubbleWidth / 2 - ARROW_SIZE;

  if (targetAnchor) {
    const { x, y, width, height } = targetAnchor;
    const targetCenterX = x + width / 2;
    const targetCenterY = y + height / 2;

    // Center bubble horizontally relative to target, clamped to screen edges
    const idealLeft = targetCenterX - bubbleWidth / 2;
    bubbleLeft = Math.max(16, Math.min(idealLeft, screenWidth - bubbleWidth - 16));

    // Arrow X relative to bubble
    arrowLeft = Math.max(
      16,
      Math.min(targetCenterX - bubbleLeft - ARROW_SIZE, bubbleWidth - 32)
    );

    // Place above or below based on target position
    const spaceBelow = screenHeight - (y + height);
    const spaceAbove = y;

    if (currentStep.preferredPosition === "top" || spaceBelow < 220) {
      // Place above target
      bubbleTop = Math.max(40, y - 200);
      arrowPosition = "bottom";
    } else {
      // Place below target
      bubbleTop = y + height + 14;
      arrowPosition = "top";
    }
  }

  // Handle KYC specific action
  const handleVerifyNow = () => {
    setShowPostTourKycModal(false);
    finishTour();
    router.push("/kyc-verification");
  };


  const isKycStep = currentStep.isKycOnly === true;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <View
      style={[
        styles.bubbleContainer,
        {
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
        },
      ]}
    >
      {/* Pointer Notch pointing UP */}
      {arrowPosition === "top" && (
        <View style={[styles.arrowUp, { left: arrowLeft }]} />
      )}

      <View style={styles.bubbleCard}>
        {/* Header with step counter, role pill, and close button */}
        <View style={styles.cardHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              Step {currentStepIndex} of {totalSteps - 1}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeTour}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6L18 18"
                stroke="#9CA3AF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.bubbleTitle}>{currentStep.title}</Text>
        <Text style={styles.bubbleDesc}>{currentStep.description}</Text>

        {/* Footer actions */}
        <View style={styles.footerRow}>
          {currentStepIndex > 1 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={prevStep}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.skipLink}
              onPress={skipTour}
              activeOpacity={0.7}
            >
              <Text style={styles.skipLinkText}>Skip Tour</Text>
            </TouchableOpacity>
          )}

          <View style={styles.rightButtonsRow}>
            {isKycStep ? (
              <>
                <TouchableOpacity
                  style={styles.secondarySmallButton}
                  onPress={finishTour}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondarySmallButtonText}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primarySmallButton, { backgroundColor: "#008751" }]}
                  onPress={handleVerifyNow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primarySmallButtonText}>Verify now</Text>
                </TouchableOpacity>
              </>
            ) : isLastStep ? (
              <TouchableOpacity
                style={styles.primarySmallButton}
                onPress={finishTour}
                activeOpacity={0.8}
              >
                <Text style={styles.primarySmallButtonText}>Finish 🎉</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primarySmallButton}
                onPress={nextStep}
                activeOpacity={0.8}
              >
                <Text style={styles.primarySmallButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Pointer Notch pointing DOWN */}
      {arrowPosition === "bottom" && (
        <View style={[styles.arrowDown, { left: arrowLeft }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 5, 25, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10000,
  },
  welcomeCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  closeIconButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  welcomeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rolePill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#192DFF",
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
  },
  welcomeActionRow: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#010135",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    height: 46,
    backgroundColor: "#F3F4F6",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Contextual Bubble Styles ──
  bubbleContainer: {
    position: "absolute",
    zIndex: 10001,
  },
  bubbleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
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
    borderBottomColor: "#FFFFFF",
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
    borderTopColor: "#FFFFFF",
    zIndex: 10002,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#192DFF",
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 4,
  },
  bubbleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 6,
    letterSpacing: -0.2,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  skipLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipLinkText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  rightButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primarySmallButton: {
    height: 38,
    paddingHorizontal: 18,
    backgroundColor: "#010135",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  primarySmallButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondarySmallButton: {
    height: 38,
    paddingHorizontal: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondarySmallButtonText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default TourBubble;
