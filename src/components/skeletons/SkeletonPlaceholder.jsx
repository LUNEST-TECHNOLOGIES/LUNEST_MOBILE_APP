import React from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * SkeletonPlaceholder - Shimmer loading effect for React Native
 * Provides a smooth animated band that sweeps across placeholder elements
 * Uses native Animated API - no extra dependencies required
 */
class SkeletonPlaceholder extends React.Component {
  constructor(props) {
    super(props);
    this.shimmerAnimatedValue = new Animated.Value(0);
  }

  componentDidMount() {
    this.startShimmerAnimation();
  }

  componentWillUnmount() {
    this.shimmerAnimatedValue.stopAnimation();
  }

  startShimmerAnimation = () => {
    const { shimmerSpeed = 1500 } = this.props;
    
    Animated.loop(
      Animated.timing(this.shimmerAnimatedValue, {
        toValue: 1,
        duration: shimmerSpeed,
        useNativeDriver: true,
      })
    ).start();
  };

  render() {
    const { 
      children, 
      backgroundColor = '#E1E9EE',
      shimmerColor = '#F2F8FC'
    } = this.props;

    // Calculate the shimmer position
    const shimmerTranslateX = this.shimmerAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width * 2],
    });

    return (
      <View style={[styles.container, { backgroundColor }]}>
        {children}
        
        {/* Shimmer overlay - animated band effect */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        >
          <View style={[styles.shimmerBand, { backgroundColor: shimmerColor }]} />
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: width * 2,
  },
  shimmerBand: {
    width: 100,
    height: '100%',
    opacity: 0.6,
    transform: [{ skewX: '-20deg' }],
  },
});

export default SkeletonPlaceholder;
