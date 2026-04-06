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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ToggleSwitch from '../ToggleSwitch';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

/**
 * NotificationAlert Component
 * Sleek bottom sheet for notification permission request
 * Reimplemented for premium look and feel on Android and iOS
 */
const NotificationAlert = ({ 
  visible = false, 
  onEnable, 
  onSkip,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Close animation helper
  const closeSheet = (callback) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (callback) {
        callback();
      } else if (onClose) {
        onClose();
      }
    });
  };

  // Pan responder for downward swipe to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
            stiffness: 120,
          }).start();
        }
      },
    })
  ).current;

  const handleEnable = () => {
    closeSheet(onEnable);
  };

  const handleSkip = () => {
    closeSheet(onSkip);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View 
          style={[
            styles.container,
            { 
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom, 30) 
            },
          ]}
        >
          {/* Handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Close Icon - Subtle */}
          <Pressable style={styles.closeIconButton} onPress={closeSheet}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="notifications" size={32} color="#010135" />
              </View>
              <Text style={styles.title}>Stay Updated</Text>
            </View>

            <Text style={styles.description}>
              Enable notifications to get real-time alerts for booking confirmations, messages, and exclusive offers.
            </Text>

            {/* Illustration */}
            <View style={styles.imageWrapper}>
              <Image
                source={require('../../assets/icons/Email marketing and newsletter content.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            {/* Toggle Preview (Interactive Feedback) */}
            <View style={styles.previewBox}>
              <View style={styles.previewTextWrapper}>
                <Text style={styles.previewTitle}>Push Notifications</Text>
                <Text style={styles.previewSubtitle}>Important booking alerts</Text>
              </View>
              <ToggleSwitch 
                value={notifyEnabled}
                onValueChange={setNotifyEnabled}
                size="small"
              />
            </View>

            {/* Primary Actions */}
            <View style={styles.actionRow}>
              <Pressable 
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleEnable}
              >
                <Text style={styles.primaryButtonText}>Yes, Notify Me</Text>
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
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandleContainer: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  closeIconButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(1, 1, 53, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#010135',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  illustration: {
    width: 200,
    height: 160,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  previewTextWrapper: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionRow: {
    marginTop: 10,
    gap: 12,
  },
  primaryButton: {
    height: 56,
    backgroundColor: '#010135',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default NotificationAlert;
