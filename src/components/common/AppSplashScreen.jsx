import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const AppSplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed text fade-in
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Image
          source={require('../../../assets/images/app-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Animated.View style={{ opacity: textFadeAnim, alignItems: 'center' }}>
          <Text style={styles.brandName}>LUNEST</Text>
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Redefining Urban Living</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={styles.footer}>
        <Animated.View style={{ opacity: textFadeAnim }}>
          <Text style={styles.footerText}>Secure • Reliable • Seamless</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  taglineContainer: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '500',
  },
});

export default AppSplashScreen;
