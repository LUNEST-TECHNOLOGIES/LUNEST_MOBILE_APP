import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import profileService from '../../services/profileService';

/**
 * Profile Avatar Icon - Same style as bottom nav profile icon
 */
const ProfileAvatarIcon = ({ size = 69, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <Circle cx="15" cy="15" r="14" stroke={color} strokeWidth={1.5} />
    <Circle cx="15" cy="11" r="4.5" stroke={color} strokeWidth={1.5} />
    <Path 
      d="M7 24.5C7 20.358 10.358 17 14.5 17H15.5C19.642 17 23 20.358 23 24.5" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * Verified Badge Icon
 */
const VerifiedIcon = ({ size = 18, color = '#4CAF50' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L14.09 4.26L17 3.52L17.74 6.43L20.65 7.17L19.91 10.08L22.17 12L19.91 13.92L20.65 16.83L17.74 17.57L17 20.48L14.09 19.74L12 22L9.91 19.74L7 20.48L6.26 17.57L3.35 16.83L4.09 13.92L1.83 12L4.09 10.08L3.35 7.17L6.26 6.43L7 3.52L9.91 4.26L12 2Z"
      fill={color}
    />
    <Path
      d="M10 14.5L7.5 12L8.91 10.59L10 11.67L14.09 7.59L15.5 9L10 14.5Z"
      fill="white"
    />
  </Svg>
);

/**
 * Edit Icon
 */
const EditIcon = ({ size = 20, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Profile Header Component
 * Displays user avatar, name, email, phone, and verification status
 * User is verified only when both phone AND NIN are provided
 */
const ProfileHeader = ({ 
  name = '',
  email = '',
  phone = '',
  nin = '',
  isHostMode = false,
  avatarUri: externalAvatarUri,
  onEditPress,
}) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);
  
  // Calculate verification status - both phone AND NIN must be provided
  const isPhoneVerified = !!phone && phone.trim().length > 0;
  const isNinVerified = !!nin && nin.trim().length > 0;
  const isFullyVerified = isPhoneVerified && isNinVerified;
  
  // Profile avatar state - use passed prop or load from service
  const [avatarUri, setAvatarUri] = useState(externalAvatarUri);

  // Load profile avatar on mount and listen for changes
  useEffect(() => {
    loadProfileAvatar();
    
    // Subscribe to profile changes
    const unsubscribe = profileService.addListener((profileData) => {
      if (profileData?.avatarUri !== undefined) {
        setAvatarUri(profileData.avatarUri);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update avatar when external prop changes
  useEffect(() => {
    if (externalAvatarUri !== undefined) {
      setAvatarUri(externalAvatarUri);
    }
  }, [externalAvatarUri]);

  const loadProfileAvatar = async () => {
    try {
      const savedAvatarUri = await profileService.getAvatarUri();
      if (savedAvatarUri) {
        setAvatarUri(savedAvatarUri);
      }
    } catch (error) {
      console.error('Error loading profile avatar:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { width: containerWidth }]}
      onPress={onEditPress}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUri ? (
          <Image 
            source={{ uri: avatarUri }} 
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ProfileAvatarIcon size={50} color="#192DFF" />
          </View>
        )}
        {/* Host Tag Badge */}
        {isHostMode && (
          <View style={styles.hostTagBadge}>
            <Text style={styles.hostTagText}>HOST</Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.nameRowSpacer} />
          {isFullyVerified ? (
            <View style={styles.verifiedBadge}>
              <VerifiedIcon size={16} />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Text style={styles.unverifiedText}>UNVERIFIED</Text>
            </View>
          )}
        </View>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        
        {/* Phone Status */}
        {isPhoneVerified ? (
          <View style={styles.verifiedItemRow}>
            <Text style={styles.phone}>{phone}</Text>
            <Text style={styles.verifiedSmallText}>✓ Verified</Text>
          </View>
        ) : (
          <View style={styles.phoneWarningContainer}>
            <Text style={styles.phoneWarningText}>⚠️ Add phone number</Text>
          </View>
        )}
        
        {/* NIN Status */}
        {isNinVerified ? (
          <View style={styles.verifiedItemRow}>
            <Text style={styles.ninText}>NIN: {nin.slice(0, 4)}****{nin.slice(-3)}</Text>
            <Text style={styles.verifiedSmallText}>✓ Verified</Text>
          </View>
        ) : (
          <View style={styles.phoneWarningContainer}>
            <Text style={styles.phoneWarningText}>⚠️ Add NIN for verification</Text>
          </View>
        )}
      </View>

      {/* Edit Button */}
      <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.7}>
        <EditIcon size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#BEBBB7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 69,
    height: 69,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 69,
    height: 69,
    borderRadius: 35,
    backgroundColor: '#E5EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hostTagBadge: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: '#192DFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hostTagText: {
    fontSize: 8,
    fontWeight: '700',
    
    color: '#FFFFFF',
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameRowSpacer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    
    color: '#000000',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    
    color: '#000000',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3CD',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unverifiedText: {
    fontSize: 10,
    fontWeight: '700',
    
    color: '#856404',
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
  },
  phone: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
  },
  verifiedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedSmallText: {
    fontSize: 11,
    fontWeight: '600',
    
    color: '#4CAF50',
  },
  ninText: {
    fontSize: 13,
    fontWeight: '500',
    
    color: '#292929',
  },
  phoneWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneWarningText: {
    fontSize: 12,
    
    color: '#F59E0B',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
});

export default ProfileHeader;
