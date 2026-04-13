/**
 * Guest Profile Modal Component
 * Displays guest profile information for hosts
 * Used when host clicks message icon on confirmed/completed bookings
 */

import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import authService from "../../services/authService";
import { resolveImageUrl } from "../../utils/imageUtils";

// Import icons from assets (same as host-information page)
import ShieldTickIcon from "../../assets/icons/shield-tick.svg";
import StarIcon from "../../assets/icons/star.svg";

// Close Icon
const CloseIcon = ({ size = 18, color = "#292929" }) => (
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

const GuestProfileModal = ({
  visible,
  onClose,
  onMessageGuest,
  guest = {},
  guestInfoUnavailable = false,
  guestId = null, // Optional: pass guestId to fetch latest rating
}) => {
  // Debug: Log the guest prop to verify what is received
  if (__DEV__) {
    console.log("[GuestProfileModal] guest prop:", guest);
    console.log(
      "[GuestProfileModal] extracted rating:",
      guest?.rating,
      "| status:",
      guest?.status,
      "| phone:",
      guest?.phone
    );
  }

  const {
    name = "Guest Name",
    email = "guest•••••••••@email.com",
    phoneNumber = "",
    phone = "", // Legacy field
    rating: initialRating = null,
    isVerified: initialIsVerified = true,
    avatar: initialAvatar = null,
    status = "PENDING", // booking status passed in guest prop
  } = guest;

  const actualPhone = phoneNumber || phone || "";
  const actualEmail = email || "";

  const [avatar, setAvatar] = useState(initialAvatar);
  const [rating, setRating] = useState(initialRating);
  const [isVerified, setIsVerified] = useState(initialIsVerified);

  // Update rating and isVerified when guest prop changes
  useEffect(() => {
    setRating(initialRating);
    setIsVerified(initialIsVerified);
  }, [initialRating, initialIsVerified]);

  // Resolve avatar
  useEffect(() => {
    const resolve = async () => {
      if (initialAvatar && typeof initialAvatar === 'string' && !initialAvatar.startsWith('http') && !initialAvatar.startsWith('file')) {
        const resolved = await resolveImageUrl(initialAvatar);
        setAvatar(resolved);
      } else {
        setAvatar(initialAvatar);
      }
    };
    resolve();
  }, [initialAvatar]);

  // Fetch latest guest profile data when modal becomes visible
  useEffect(() => {
    if (__DEV__) {
      console.log("[GuestProfileModal] useEffect triggered: visible=", visible, "guestId=", guestId);
    }
    
    if (visible && guestId) {
      const fetchLatestGuestData = async () => {
        try {
          if (__DEV__) {
            console.log("[GuestProfileModal] Fetching guest data with guestId:", guestId);
          }
          
          const profileResult = await authService.fetchUserById(guestId);
          
          if (__DEV__) {
            console.log("[GuestProfileModal] Fetch result:", profileResult);
            console.log("[GuestProfileModal] User guestRating:", profileResult?.user?.guestRating);
          }
          
          if (profileResult.success && profileResult.user) {
            // Update with latest rating and verification status from database
            const latestRating = profileResult.user.guestRating || 0;
            setRating(latestRating);
            setIsVerified(profileResult.user.isVerified ?? initialIsVerified);
            
            if (__DEV__) {
              console.log("[GuestProfileModal] Updated rating to:", latestRating);
            }
            
            // Also update avatar if available
            if (profileResult.user.avatar) {
              const resolvedAvatar = await resolveImageUrl(profileResult.user.avatar);
              setAvatar(resolvedAvatar);
            }
          }
        } catch (error) {
          console.log("Error fetching latest guest profile:", error);
          // Keep using the passed-in values if fetch fails
        }
      };
      fetchLatestGuestData();
    }
  }, [visible, guestId, initialIsVerified]);

  // Mask email for privacy (always masked, shown only in full for confirmed/ongoing/completed)
  const showFullEmail = ["CONFIRMED", "COMPLETED", "ONGOING"].includes(
    status?.toUpperCase?.(),
  );
  const maskedEmail = showFullEmail
    ? email
    : email.includes("@")
      ? `${email.substring(0, 4)}•••••••••@${email.split("@")[1]}`
      : email;

  // Show full phone if status is CONFIRMED or ONGOING (as per instructions)
  const showFullPhone = ["CONFIRMED", "ONGOING"].includes(
    status?.toUpperCase?.(),
  );

  // Status-based formatting
  const displayPhone = showFullPhone
    ? actualPhone || "No phone provided"
    : actualPhone.length > 7
      ? `${actualPhone.substring(0, 4)}••••••${actualPhone.slice(-3)}`
      : "•••••••••••";

  const displayEmail = showFullPhone
    ? actualEmail
    : "•••••••••@email.com";

  // Handle phone click - initiate call
  const handlePhonePress = async () => {
    if (showFullPhone && actualPhone) {
      try {
        const telUrl = `tel:${actualPhone.replace(/\s+/g, '')}`;
        if (Platform.OS === 'web') {
           window.open(telUrl, '_self');
        } else {
           await Linking.openURL(telUrl);
        }
      } catch (error) {
        console.log("Error initiating call:", error);
      }
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
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <CloseIcon size={18} color="#292929" />
            </Pressable>

            {/* Profile Content */}
            <View style={styles.profileContainer}>
              {guestInfoUnavailable ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  <DefaultAvatar />
                  <Text
                    style={{
                      marginTop: 16,
                      fontWeight: "bold",
                      fontSize: 16,
                      color: "#292929",
                    }}
                  >
                    Guest info unavailable
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      color: "#888",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    We could not retrieve guest details for this booking.
                  </Text>
                </View>
              ) : (
                <>
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

                  {/* Guest Info */}
                  <View style={styles.infoContainer}>
                    {/* Name, Email, Phone */}
                    <View style={styles.contactInfo}>
                      <Text style={styles.guestName}>{name}</Text>
                      <Text style={styles.contactText}>{displayEmail}</Text>
                      {showFullPhone ? (
                        <TouchableOpacity onPress={handlePhonePress}>
                          <Text style={[styles.contactText, { color: "#6371F1", textDecorationLine: "underline" }]}>
                            {displayPhone}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.contactText}>{displayPhone}</Text>
                      )}
                      {showFullPhone && (
                        <Text
                          style={{
                            color: "#888",
                            fontSize: 11,
                            marginTop: 2,
                            textAlign: "center",
                          }}
                        >
                          <Svg
                            width={12}
                            height={12}
                            style={{ marginRight: 2 }}
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <Path
                              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                              fill="#888"
                            />
                          </Svg>
                          Click to call. This number is visible only to you.
                        </Text>
                      )}
                    </View>

                    {/* Rating */}
                    <View style={styles.ratingContainer}>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>
                          {rating > 0 ? rating.toFixed(1) : '—'}
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
                  </View>

                  {/* Message Guest Button - Currently disabled */}
                  <Pressable
                    style={[styles.messageButton, { opacity: 0.5 }]}
                    onPress={() =>
                      console.log(
                        "Message guest functionality is currently disabled",
                      )
                    }
                    disabled={true}
                  >
                    <Text style={styles.messageButtonText}>Message Guest</Text>
                  </Pressable>
                </>
              )}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "100%",
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    paddingTop: 30,
    shadowColor: "rgba(190, 187, 187, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  profileContainer: {
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: "#F5F5F5",
  },
  defaultAvatar: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  infoContainer: {
    alignItems: "center",
    gap: 10,
    width: 188,
  },
  contactInfo: {
    alignItems: "center",
    gap: 6,
  },
  guestName: {
    fontSize: 14,
    fontWeight: "500",

    color: "#000000",
    textAlign: "left",
  },
  contactText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#292929",
  },
  ratingContainer: {
    justifyContent: "center",
    width: 91,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 5,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  verifiedContainer: {
    justifyContent: "center",
    width: 91,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  messageButton: {
    width: 96,
    backgroundColor: "#010135",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  messageButtonText: {
    fontSize: 10,
    fontWeight: "700",

    color: "#EFEFEF",
  },
});

export default GuestProfileModal;
