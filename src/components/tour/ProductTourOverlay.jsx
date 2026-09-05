import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useProductTour } from "../../context/ProductTourContext";
import PostTourKycModal from "./PostTourKycModal";
import TourBubble from "./TourBubble";

/**
 * ProductTourOverlay Component
 * Renders the subtle glassmorphism backdrop with a soft focus spotlight cutout
 * around the target UI element, and mounts the interactive TourBubble and PostTourKycModal.
 */
export const ProductTourOverlay = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    tourState,
    currentStep,
    anchors,
    isForbiddenRoute,
    showPostTourKycModal,
  } = useProductTour();

  // Subtle breathing pulse for the spotlight ring
  const pulseAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.65,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // If post-tour KYC notice is triggered, render it directly
  if (showPostTourKycModal && !isForbiddenRoute) {
    return <PostTourKycModal />;
  }

  // Core Rule: NEVER show during forbidden routes (registration, KYC, auth)
  if (isForbiddenRoute || tourState !== "in_progress" || !currentStep) {
    return null;
  }

  // For modal steps (welcome and finish), TourBubble handles its centered glass presentation
  if (currentStep.type === "modal") {
    return (
      <>
        <TourBubble />
        <PostTourKycModal />
      </>
    );
  }

  const targetAnchor = currentStep.anchorId ? anchors[currentStep.anchorId] : null;

  // If no anchor measured yet for this step, render subtle backdrop while measuring
  if (!targetAnchor) {
    return (
      <View style={styles.fullscreenBackdrop}>
        <TourBubble />
        <PostTourKycModal />
      </View>
    );
  }

  const pad = targetAnchor.padding ?? 6;
  const spotX = Math.max(0, targetAnchor.x - pad);
  const spotY = Math.max(0, targetAnchor.y - pad);
  const spotW = Math.min(screenWidth, targetAnchor.width + pad * 2);
  const spotH = Math.min(screenHeight, targetAnchor.height + pad * 2);

  return (
    <>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* 4 Subtle Backdrop segments keeping the real LUNEST app visible */}
        {/* Top segment */}
        <View
          style={[
            styles.backdropSegment,
            { top: 0, left: 0, width: screenWidth, height: spotY },
          ]}
        />
        {/* Bottom segment */}
        <View
          style={[
            styles.backdropSegment,
            {
              top: spotY + spotH,
              left: 0,
              width: screenWidth,
              height: Math.max(0, screenHeight - (spotY + spotH)),
            },
          ]}
        />
        {/* Left segment */}
        <View
          style={[
            styles.backdropSegment,
            {
              top: spotY,
              left: 0,
              width: spotX,
              height: spotH,
            },
          ]}
        />
        {/* Right segment */}
        <View
          style={[
            styles.backdropSegment,
            {
              top: spotY,
              left: spotX + spotW,
              width: Math.max(0, screenWidth - (spotX + spotW)),
              height: spotH,
            },
          ]}
        />

        {/* Soft Spotlight Halo Ring */}
        <Animated.View
          style={[
            styles.spotlightRing,
            {
              top: spotY,
              left: spotX,
              width: spotW,
              height: spotH,
              opacity: pulseAnim,
              borderColor: currentStep.isKycOnly
                ? "rgba(16, 185, 129, 0.85)"
                : "rgba(255, 255, 255, 0.75)",
            },
          ]}
          pointerEvents="none"
        />

        {/* Contextual Floating Glass Tour Bubble */}
        <TourBubble />
      </View>
      <PostTourKycModal />
    </>
  );
};

const styles = StyleSheet.create({
  fullscreenBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 1, 53, 0.44)",
    zIndex: 9999,
  },
  backdropSegment: {
    position: "absolute",
    backgroundColor: "rgba(1, 1, 53, 0.44)",
    zIndex: 9998,
  },
  spotlightRing: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: 1.5,
    zIndex: 9999,
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
});

export default ProductTourOverlay;
