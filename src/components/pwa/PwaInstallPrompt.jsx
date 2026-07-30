import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Image
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Share Icon (iOS)
 */
const ShareIcon = ({ size = 20, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 6L12 2L8 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2V15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Plus / Add Icon
 */
const PlusIcon = ({ size = 18, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Close Icon
 */
const CloseIcon = ({ size = 18, color = "#888888" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Already installed as PWA Home Screen app
    }

    // Check if user dismissed prompt recently (within last 3 days)
    const lastDismissed = localStorage.getItem('lunest_pwa_prompt_dismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // Detect iOS User Agent
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Delay showing iOS prompt slightly so user sees the app first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Listen for Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt user outcome: ${outcome}`);

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lunest_pwa_prompt_dismissed', Date.now().toString());
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isVisible}
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.bannerContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.appInfo}>
              <Image
                source={require("../../../assets/images/app-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.appTitle}>Install LUNEST</Text>
                <Text style={styles.appSubtitle}>Add to Home Screen • Fast & No App Store</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {/* Platform Specific Guidance */}
          {isIOS ? (
            <View style={styles.iosInstructionContainer}>
              <Text style={styles.instructionText}>
                Install this app on your iPhone:
              </Text>
              <View style={styles.stepRow}>
                <Text style={styles.stepNum}>1.</Text>
                <Text style={styles.stepText}>Tap the <Text style={styles.boldText}>Share</Text> button in Safari below</Text>
                <View style={styles.iconInline}><ShareIcon size={18} /></View>
              </View>
              <View style={styles.stepRow}>
                <Text style={styles.stepNum}>2.</Text>
                <Text style={styles.stepText}>Scroll down and select <Text style={styles.boldText}>Add to Home Screen</Text></Text>
                <View style={styles.iconInline}><PlusIcon size={16} /></View>
              </View>
            </View>
          ) : (
            <View style={styles.androidContainer}>
              <Text style={styles.instructionText}>
                Get the full native app experience directly on your device.
              </Text>
              <TouchableOpacity style={styles.installBtn} onPress={handleInstallClick}>
                <Text style={styles.installBtnText}>Install App Shortcut</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.notNowBtn} onPress={handleDismiss}>
            <Text style={styles.notNowText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bannerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  iosInstructionContainer: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#333333',
    marginBottom: 10,
    fontWeight: '500',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#010135',
    marginRight: 8,
  },
  stepText: {
    fontSize: 13,
    color: '#444444',
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#010135',
  },
  iconInline: {
    marginLeft: 6,
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  androidContainer: {
    marginVertical: 8,
  },
  installBtn: {
    backgroundColor: '#010135',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  installBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  notNowBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  notNowText: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
});
