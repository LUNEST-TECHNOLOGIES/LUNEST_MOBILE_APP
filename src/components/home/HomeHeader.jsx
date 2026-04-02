import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import LocationIcon from "../../assets/icons/home/LocationIcon.svg";
import NotificationIcon from "../../assets/icons/home/NotificationIcon.svg";

const HomeHeader = ({ 
  location = "Abuja, Nigeria.", 
  notificationCount = 5, 
  onNotificationPress,
  onLocationPress 
}) => {
  return (
    <View style={styles.container}>
      {/* Location - Left Side */}
      <Pressable style={styles.locationContainer} onPress={onLocationPress}>
        <LocationIcon width={22} height={22} color="#192DFF" />
        <Text style={styles.locationText}>{location}</Text>
      </Pressable>

      {/* Notification - Right Side */}
      <Pressable 
        style={styles.notificationButton}
        onPress={onNotificationPress}
      >
        <NotificationIcon width={24} height={24} color="#292929" />
        {notificationCount > 0 && (
          <View style={styles.badgeWrapper}>
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? "99" : notificationCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 12,
    backgroundColor: '#FFFFFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  notificationButton: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  badgeWrapper: {
    position: 'absolute',
    top: 2,
    left: 12,
    borderRadius: 7,
    backgroundColor: '#0308ac',
    width: 12,
    height: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 6,
    fontWeight: '700',
    color: '#e5efff',
    textAlign: 'center',
  },
});

export default HomeHeader;
