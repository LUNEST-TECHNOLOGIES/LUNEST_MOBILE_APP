/**
 * Host Profile Modal Component
 * Displays host/landlord profile information for guests
 * Used when guest clicks message icon on confirmed bookings
 */

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import ShieldTickIcon from '../../assets/icons/shield-tick.svg';
import StarIcon from '../../assets/icons/star.svg';

import authService from '../../services/authService';

// Close Icon
const CloseIcon = ({ size = 18, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Path
      d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Default avatar placeholder
const DefaultAvatar = () => (
  <View style={styles.defaultAvatar}>
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="16" r="8" fill="#CCCCCC" />
      <Path
        d="M6 36C6 28.268 12.268 22 20 22C27.732 22 34 28.268 34 36"
        stroke="#CCCCCC"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  </View>
);

const HostProfileModal = ({
  visible,
  onClose,
  onMessageHost,
  hostId,
  host: initialHost = {},
  isConfirmed = false,
  status = "",
}) => {
  const [loading, setLoading] = useState(false);
  const [hostData, setHostData] = useState(initialHost);

  const statusLower = (status || "").toLowerCase();
  const isOngoingOrConfirmed = isConfirmed || statusLower === "ongoing" || statusLower === "confirmed";

  useEffect(() => {
    const fetchHostData = async () => {
      if (visible && hostId) {
        setLoading(true);
        try {
          const result = await authService.fetchUserById(hostId);
          if (result.success) {
            const user = result.user;
            setHostData({
              name: user.fullName || user.firstName + ' ' + user.lastName,
              email: user.emailAddress || user.email,
              phone: user.phoneNumber || user.phone,
              rating: user.hostRating || null,
              isVerified: user.isVerified || user.verified,
              avatar: user.avatar || user.profilePicture,
            });
          }
        } catch (error) {
          console.error("[HostProfileModal] Error fetching host:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchHostData();
  }, [visible, hostId]);

  const {
    name = 'Host Name',
    email = 'host•••••••••@email.com',
    phone = '+234800••••••0',
    rating = null,
    isVerified = true,
    avatar = null,
  } = hostData;

  // For confirmed bookings, we unmask the phone
  // Email stays masked according to user request
  const displayEmail = (email.includes('@') 
        ? `${email.substring(0, 4)}•••••••••@${email.split('@')[1]}`
        : email);

  const displayPhone = isOngoingOrConfirmed 
    ? phone 
    : (phone.length > 6 
        ? `${phone.substring(0, 7)}••••••${phone.slice(-1)}`
        : phone);

  const handleDialHost = () => {
    if (isOngoingOrConfirmed && phone && phone !== '-') {
      Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <CloseIcon size={18} color="#292929" />
            </Pressable>

            {/* Profile Content */}
            <View style={styles.profileContainer}>
              {/* Avatar */}
              {avatar ? (
                <Image 
                  source={{ uri: avatar }} 
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              ) : (
                <DefaultAvatar />
              )}

              {/* Host Info */}
              <View style={styles.infoContainer}>
                {/* Name, Email, Phone */}
                <View style={styles.contactInfo}>
                  <Text style={styles.hostName}>{name}</Text>
                  <Text style={styles.contactText}>{displayEmail}</Text>
                  <TouchableOpacity 
                    onPress={handleDialHost} 
                    disabled={!isOngoingOrConfirmed}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.contactText, 
                      isOngoingOrConfirmed && { 
                        color: '#6371F1', 
                        textDecorationLine: 'underline',
                        fontWeight: '600'
                      }
                    ]}>
                      {displayPhone}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Rating */}
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>
                      {rating ? rating.toFixed(1) : "N/A"}
                    </Text>
                    <StarIcon width={15} height={15} />
                  </View>
                </View>

                {/* Verified Badge */}
                {isVerified && (
                  <View style={styles.verifiedContainer}>
                    <View style={styles.verifiedRow}>
                      <ShieldTickIcon width={16} height={16} />
                      <Text style={styles.verifiedText}>VERIFIED</Text>
                    </View>
                  </View>
                )}

                {loading && (
                   <ActivityIndicator size="small" color="#010135" style={{ marginTop: 5 }} />
                )}
              </View>

              {/* Disclaimer */}
              <Text style={styles.disclaimerText}>
                Contact displayed solely for booking alone
              </Text>

              {/* Message Host Button */}
              <Pressable 
                style={[styles.messageButton, !isConfirmed && styles.disabledButton]} 
                onPress={onMessageHost}
                disabled={!isConfirmed}
              >
                <Text style={styles.messageButtonText}>Message Host</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    paddingTop: 30,
    shadowColor: 'rgba(190, 187, 187, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: '#F5F5F5',
  },
  defaultAvatar: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoContainer: {
    alignItems: 'center',
    gap: 10,
    width: 188,
  },
  contactInfo: {
    alignItems: 'center',
    gap: 6,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
    textAlign: 'left',
  },
  contactText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#292929',
  },
  ratingContainer: {
    justifyContent: 'center',
    width: 91,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 5,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    
    color: '#000000',
  },
  verifiedContainer: {
    justifyContent: 'center',
    width: 91,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    
    color: '#000000',
  },
  messageButton: {
    width: 96,
    backgroundColor: '#010135',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666666',
    opacity: 0.7,
  },
  messageButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EFEFEF',
  },
  disclaimerText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5,
    fontStyle: 'italic',
  },
});

export default HostProfileModal;
