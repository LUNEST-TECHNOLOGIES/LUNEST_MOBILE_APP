import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import ProgressDots from '../../components/ProgressDots';

/**
 * Onboarding Screen
 * Welcome slides with images, text, and swipeable navigation
 * Responsive design for all screen sizes
 * Auto-slides every 4 seconds
 */

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to LUNEST',
    description: 'Your new home is just a tap away. Book Home In Style, Stay with Confidence',
    image: require('../../assets/images/Frame 1618873475.png'),
  },
  {
    id: '2',
    title: 'Verified Listings Only',
    description: 'No agents. No scams. Just peace of mind. Every space on LUNEST is verified, secure, and hassle-free.',
    image: require('../../assets/images/We just moved in!.png'),
  },
  {
    id: '3',
    title: 'Manage Everything, Effortlessly',
    description: 'Bookings, Payments, Reviews. All in one app. Take full control of your rental journey.',
    image: require('../../assets/images/Frame 1618873415.png'),
  },
  {
    id: '4',
    title: 'Virtual Tours, Real Comfort',
    description: 'Explore homes from your screen before you book. What you see is exactly what you get.',
    image: require('../../assets/images/Frame 52.png'),
  },
];

const AUTO_SLIDE_INTERVAL = 4000; // 4 seconds

const OnboardingScreen = ({ onComplete, onSignup, onLogin }) => {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoSlideTimer = useRef(null);

  // Responsive calculations
  const imageHeight = height * 0.55; // 55% of screen height for image
  const contentPadding = width * 0.08; // 8% padding on each side
  const buttonWidth = (width - contentPadding * 2 - 20) / 2; // Two buttons with gap

  // Auto-slide to next screen (stops at last slide)
  const startAutoSlide = useCallback(() => {
    // Clear any existing timer
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
    }
    
    autoSlideTimer.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // Stop at last slide - don't loop or close
        if (prevIndex >= SLIDES.length - 1) {
          clearInterval(autoSlideTimer.current);
          return prevIndex;
        }
        
        const nextIndex = prevIndex + 1;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, []);

  // Start auto-slide on mount, cleanup on unmount
  useEffect(() => {
    startAutoSlide();
    
    return () => {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
      }
    };
  }, [startAutoSlide]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      // Reset auto-slide timer when user manually scrolls
      startAutoSlide();
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Last slide - complete onboarding
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const renderSlide = ({ item, index }) => (
    <View style={[styles.slide, { width }]}>
      {/* Image Placeholder - Replace with actual images */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {item.image ? (
          <Image
            source={item.image}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Image {index + 1}</Text>
          </View>
        )}
      </View>

      {/* Text Content */}
      <View style={[styles.content, { paddingHorizontal: contentPadding }]}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          <ProgressDots total={SLIDES.length} current={index} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Logo at top - overlays the image */}
      <View style={styles.logoContainer}>
        <BlurView intensity={20} tint="light" style={styles.logoBlur}>
          <View style={styles.logoBox}>
            <Image 
              source={require('../../assets/images/LUNEST PNG 1 1.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
        </BlurView>
      </View>

      {/* Slides */}
      <View style={styles.slidesContainer}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />
      </View>

      {/* Signup & Login Buttons */}
      <View style={[styles.buttonContainer, { paddingHorizontal: contentPadding }]}>
        <View style={styles.authButtonsRow}>
          <TouchableOpacity
            style={[styles.signupButton, { width: buttonWidth }]}
            onPress={onSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.signupButtonText}>Signup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.loginButton, { width: buttonWidth }]}
            onPress={onLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slidesContainer: {
    flex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  logoBlur: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  logoBox: {
    borderWidth: 2,
    borderColor: '#192DFF',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 109,
    height: 13,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    
    color: '#192DFF',
    letterSpacing: 2,
  },
  slide: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#9E9E9E',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    
    color: '#656565',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  dotsContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  buttonContainer: {
    paddingBottom: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  authButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signupButton: {
    backgroundColor: '#010135',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
    lineHeight: 16,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#010135',
    marginLeft: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
    lineHeight: 16,
  },
});

export default OnboardingScreen;
