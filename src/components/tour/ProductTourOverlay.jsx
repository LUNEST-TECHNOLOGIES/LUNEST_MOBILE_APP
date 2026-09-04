import React from "react";
import {
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useProductTour } from "../../context/ProductTourContext";
import PostTourKycModal from "./PostTourKycModal";
import TourBubble from "./TourBubble";

/**
 * ProductTourOverlay Component
 * Renders the semi-transparent backdrop with a spotlight focus cutout around
 * the target UI element, and mounts the interactive TourBubble and PostTourKycModal.
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

  // If post-tour KYC notice is triggered, render it directly
  if (showPostTourKycModal && !isForbiddenRoute) {
    return <PostTourKycModal />;
  }

  // Core Rule: NEVER show during forbidden routes (registration, KYC, auth)
  if (isForbiddenRoute || tourState !== "in_progress" || !currentStep) {
    return null;
  }

  // For welcome modal step, TourBubble handles its own centered presentation
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
      {/* 4 Backdrop segments creating the clean spotlight window */}
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

      {/* Spotlight Ring Highlight */}
      <View
        style={[
          styles.spotlightRing,
          {
            top: spotY,
            left: spotX,
            width: spotW,
            height: spotH,
            borderColor: currentStep.isKycOnly ? "#008751" : "#192DFF",
          },
        ]}
        pointerEvents="none"
      />

      {/* Contextual Tour Bubble */}
      <TourBubble />
    </View>
    <PostTourKycModal />
    </>
  );
};


const styles = StyleSheet.create({
  fullscreenBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 5, 25, 0.65)",
    zIndex: 9999,
  },
  backdropSegment: {
    position: "absolute",
    backgroundColor: "rgba(0, 5, 25, 0.65)",
    zIndex: 9998,
  },
  spotlightRing: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 2,
    zIndex: 9999,
    shadowColor: "#192DFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default ProductTourOverlay;
