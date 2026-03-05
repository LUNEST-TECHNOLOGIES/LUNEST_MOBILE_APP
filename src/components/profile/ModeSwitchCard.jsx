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
const ModeSwitchCard = ({ isHostMode, onSwitch }) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {/* Header with current mode indicator */}
      <View style={styles.header}>
        <View style={styles.modeIndicator}>
          {isHostMode ? (
            <HostIcon size={24} color="#FFFFFF" />
          ) : (
            <GuestIcon size={24} color="#FFFFFF" />
          )}
          <View style={styles.modeTextContainer}>
            <Text style={styles.currentModeLabel}>Current Mode</Text>
            <Text style={styles.currentModeValue}>
              {isHostMode ? 'Host Mode' : 'Guest Mode'}
            </Text>
          </View>
        </View>
      </View>

      {/* Switch Button */}
      <TouchableOpacity
        style={[styles.switchButton, isHostMode ? styles.hostButton : styles.guestButton]}
        onPress={onSwitch}
        activeOpacity={0.9}
      >
        <Text style={styles.switchButtonText}>
          Switch to {isHostMode ? 'Guest' : 'Host'} Mode
        </Text>
        <ArrowRightIcon size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#010135',
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#010135',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modeTextContainer: {
    flex: 1,
  },
  currentModeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D0E1FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentModeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  hostButton: {
    backgroundColor: '#10B981', // Green for switching to guest
  },
  guestButton: {
    backgroundColor: '#F59E0B', // Orange for switching to host
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default ModeSwitchCard;