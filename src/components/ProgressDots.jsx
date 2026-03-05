import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * ProgressDots Component
 * Shows progress indicators for onboarding slides
 * 
 * @param {number} total - Total number of dots
 * @param {number} current - Current active dot (0-indexed)
 */
const ProgressDots = ({ total = 4, current = 0 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === current ? styles.activeDot : styles.inactiveDot,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 43,
    backgroundColor: '#192DFF',
  },
  inactiveDot: {
    width: 9,
    backgroundColor: '#E5EFFF',
  },
});

export default ProgressDots;
