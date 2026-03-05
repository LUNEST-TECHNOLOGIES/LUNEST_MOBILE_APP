import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ToggleSwitch from '../ToggleSwitch';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% minimum
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% maximum
const DEFAULT_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85; // 85% default
const SWIPE_THRESHOLD = 100; // Minimum swipe distance to close/expand

/**
 * NotificationAlert Component
 * Shows on first app launch to request notification permission
 * Swipeable bottom sheet with close button and drag gesture (up and down)
 */

const NotificationAlert = ({ 
  visible = false, 
  onEnable, 
  onSkip,
  onClose,
}) => {
  const translateY = useRef(new Animated.Value(DEFAULT_SHEET_HEIGHT)).current;
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_SHEET_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate in when visible changes
  useEffect(() => {
    if (visible && !isAnimating) {
      setIsAnimating(true);
      // Reset position first to ensure clean animation
      translateY.setValue(DEFAULT_SHEET_HEIGHT);
      
      // Small delay to ensure Modal is mounted before animating
      const timer = setTimeout(() => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }).start(() => setIsAnimating(false));
      }, 100);
      
      return () => clearTimeout(timer);
    } else if (!visible) {
      translateY.setValue(DEFAULT_SHEET_HEIGHT);
      setIsAnimating(false);
    }
  }, [visible]);

  // Close animation
  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: DEFAULT_SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };

  // Expand sheet to max height
  const expandSheet = () => {
    setIsExpanded(true);
    setSheetHeight(MAX_SHEET_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
    }).start();
  };

  // Collapse sheet to default height
  const collapseSheet = () => {
    setIsExpanded(false);
    setSheetHeight(DEFAULT_SHEET_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
    }).start();
  };

  // Pan responder for swipe gesture (bidirectional)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow both upward (negative dy) and downward (positive dy) swipe
        if (gestureState.dy > 0) {
          // Downward swipe - allow to close
          translateY.setValue(gestureState.dy);
        } else if (gestureState.dy < 0 && !isExpanded) {
          // Upward swipe - show resistance effect
          translateY.setValue(gestureState.dy * 0.3);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5) {
          // Close if swiped down far enough or fast enough
          closeSheet();
        } else if (gestureState.dy < -SWIPE_THRESHOLD || gestureState.vy < -0.5) {
          // Expand if swiped up far enough or fast enough
          if (!isExpanded) {
            expandSheet();
          } else {
            // Snap back
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 90,
            }).start();
          }
        } else {
          // Snap back to open position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 90,
          }).start();
        }
      },
    })
  ).current;

  const handleEnable = () => {
    closeSheet();
    setTimeout(() => {
      if (onEnable) onEnable();
    }, 300);
  };

  const handleSkip = () => {
    closeSheet();
    setTimeout(() => {
      if (onSkip) onSkip();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={closeSheet}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.container,
                {
                  maxHeight: sheetHeight,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
                <View style={styles.dragHandle} />
              </View>

              {/* Close Button */}
              <Pressable style={styles.closeButton} onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#000000" />
              </Pressable>

              {/* Scrollable Content */}
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                {/* Title */}
                <Text style={styles.title}>Turn on Notification</Text>

                {/* Description */}
                <Text style={styles.description}>
                  Don't miss important messages like booking confirmation, coupon alerts and new listings
                </Text>

                {/* Illustration - Email marketing image */}
                <View style={styles.imageContainer}>
                  <Image
                    source={require('../../assets/icons/Email marketing and newsletter content.png')}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                  {/* Toggle Switch - Small Size */}
                  <ToggleSwitch 
                    value={notifyEnabled}
                    onValueChange={setNotifyEnabled}
                    size="small"
                  />
                  <Text style={styles.infoText}>
                    Don't miss important messages like booking confirmation.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleEnable}
                  >
                    <Text style={styles.primaryButtonText}>Yes, notify me</Text>
                  </Pressable>

                  <Pressable 
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSkip}
                  >
                    <Text style={styles.secondaryButtonText}>Skip</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D9D9D9',
    borderRadius: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    width: 235,
    fontSize: 40,
    fontWeight: '700',
    color: '#010135',
    lineHeight: 56,
    marginTop: 40,
  },
  description: {
    width: '100%',
    fontSize: 18,
    fontWeight: '400',
    color: '#7C7C7C',
    lineHeight: 32,
    marginTop: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  image: {
    width: 233,
    height: 208,
  },
  infoCard: {
    width: '100%',
    height: 86,
    backgroundColor: '#F6F6F6',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    marginTop: 30,
    gap: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#525252',
    lineHeight: 26,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    gap: 20,
  },
  primaryButton: {
    flex: 1,
    height: 54,
    backgroundColor: '#010135',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});

export default NotificationAlert;
