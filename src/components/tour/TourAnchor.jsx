import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useProductTour } from "../../context/ProductTourContext";

/**
 * TourAnchor Component
 * Wraps UI elements that need to be spotlighted by the product tour.
 * Measures element bounds in screen coordinates and registers with ProductTourContext.
 */
export const TourAnchor = ({ id, children, style, padding = 6 }) => {
  const { registerAnchor, unregisterAnchor, tourState } = useProductTour();
  const elementRef = useRef(null);
  const { width, height } = useWindowDimensions();

  const measureAndRegister = () => {
    if (!elementRef.current || !id) return;

    if (Platform.OS === "web") {
      try {
        const node = elementRef.current;
        if (node && typeof node.getBoundingClientRect === "function") {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            registerAnchor(id, {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
              padding,
            });
            return;
          }
        }
      } catch (e) {
        // Fallback to measureInWindow
      }
    }

    if (
      elementRef.current &&
      typeof elementRef.current.measureInWindow === "function"
    ) {
      elementRef.current.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          registerAnchor(id, {
            x,
            y,
            width: w,
            height: h,
            padding,
          });
        }
      });
    }
  };

  useEffect(() => {
    // Measure on mount or when window size changes
    const timer = setTimeout(measureAndRegister, 150);
    return () => clearTimeout(timer);
  }, [width, height, tourState]);

  useEffect(() => {
    return () => {
      if (id) unregisterAnchor(id);
    };
  }, [id, unregisterAnchor]);

  return (
    <View
      ref={elementRef}
      onLayout={() => {
        setTimeout(measureAndRegister, 50);
      }}
      collapsable={false}
      style={style}
    >
      {children}
    </View>
  );
};

export default TourAnchor;
