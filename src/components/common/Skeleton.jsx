import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

/**
 * Premium Skeleton Component
 * Features:
 * - Smooth pulse animation (OLED friendly)
 * - Support for 'circle' and 'rectangle' variants
 * - Customizable dimensions and borderRadius
 */
const Skeleton = ({
  width,
  height,
  variant = "rectangle",
  style,
  borderRadius,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.7,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  const skeletonStyle = {
    width: width || "100%",
    height: height || 20,
    borderRadius: variant === "circle" ? (width || height) / 2 : borderRadius || 4,
    opacity: pulseAnim,
  };

  return <Animated.View style={[styles.skeleton, skeletonStyle, style]} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E1E9EE",
  },
});

export default Skeleton;
