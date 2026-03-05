import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import ProgressDots from '../ProgressDots';

/**
 * OnboardingSlide Component
 * Individual slide for the onboarding screen
 * Responsive design that adapts to screen size
 */
const OnboardingSlide = ({ 
  title, 
  description, 
  image, 
  currentIndex, 
  totalSlides 
}) => {
  const { width, height } = useWindowDimensions();

  // Responsive calculations
  const imageHeight = height * 0.55;
  const contentPadding = width * 0.08;
  const isSmallScreen = width < 380;

  return (
    <View style={[styles.slide, { width }]}>
      {/* Image */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {image ? (
          <Image
            source={image}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Slide {currentIndex + 1}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingHorizontal: contentPadding }]}>
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.title, 
              isSmallScreen && styles.titleSmall
            ]}
          >
            {title}
          </Text>
          <Text 
            style={[
              styles.description,
              isSmallScreen && styles.descriptionSmall,
              { maxWidth: width * 0.85 }
            ]}
          >
            {description}
          </Text>
        </View>

        {/* Progress Dots */}
        <ProgressDots total={totalSlides} current={currentIndex} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#192DFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
  },
  textContainer: {
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    
    color: '#000000',
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 20,
  },
  description: {
    fontSize: 16,
    
    color: '#656565',
    textAlign: 'center',
    lineHeight: 24,
  },
  descriptionSmall: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default OnboardingSlide;
