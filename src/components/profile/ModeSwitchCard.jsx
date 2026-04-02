import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Arrow Right Icon
 */
const ArrowRightIcon = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19M19 12L12 5M19 12L12 19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Host Mode Icon
 */
const HostIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5304 5.21071 21.0391 5.58579 21.4142C5.96086 21.7893 6.46957 22 7 22H17C17.5304 22 18.0391 21.7893 18.4142 21.4142C18.7893 21.0391 19 20.5304 19 20V10M9 12H15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Guest Mode Icon
 */
const GuestIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Mode Switch Card Component
 * Stylish card for switching between Guest and Host modes
 * Only shown when user is approved as host
 */
const ModeSwitchCard = ({ isHostMode, onSwitch, disabled }) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {/* Premium Gradient-like Background Effect */}
      <View style={styles.backgroundAccent} />
      
      {/* Header with current mode indicator */}
      <View style={styles.header}>
        <View style={styles.modeIndicator}>
          <View style={[styles.iconContainer, isHostMode ? styles.hostIconBg : styles.guestIconBg]}>
            {isHostMode ? (
              <HostIcon size={24} color="#FFFFFF" />
            ) : (
              <GuestIcon size={24} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.modeTextContainer}>
            <Text style={styles.currentModeLabel}>Account Access</Text>
            <Text style={styles.currentModeValue}>
              {isHostMode ? 'Host/Landlord Dashboard' : 'Guest/Renter Profile'}
            </Text>
          </View>
        </View>
      </View>

      {/* Switch Button */}
      <TouchableOpacity
        style={[
          styles.switchButton,
          isHostMode ? styles.hostButton : styles.guestButton,
          disabled && { opacity: 0.5 },
        ]}
        onPress={onSwitch}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={styles.switchButtonText}>
          {isHostMode ? 'Switch to Guest Mode' : 'Switch to Host Mode'}
        </Text>
        <View style={styles.arrowContainer}>
          <ArrowRightIcon size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Decorative premium elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#010135',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#010135',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backgroundAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(25, 45, 255, 0.1)', // Subtle blue tint
  },
  header: {
    marginBottom: 24,
    zIndex: 1,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  hostIconBg: {
    backgroundColor: '#ee7409',
  },
  guestIconBg: {
    backgroundColor: '#0277ed',
  },
  modeTextContainer: {
    flex: 1,
  },
  currentModeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D0E1FF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  currentModeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    zIndex: 1,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  hostButton: {
    backgroundColor: '#FFFFFF', // Clean white button for host mode
  },
  guestButton: {
    backgroundColor: '#FFFFFF', // Clean white button for guest mode
  },
  switchButtonText: {
    color: '#010135',
    fontSize: 16,
    fontWeight: '700',
  },
  arrowContainer: {
    backgroundColor: '#010135',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(25, 45, 255, 0.1)',
  },
  decorativeLine: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 100,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '45deg' }],
  },
});

export default ModeSwitchCard;