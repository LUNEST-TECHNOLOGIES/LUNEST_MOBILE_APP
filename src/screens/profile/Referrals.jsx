import * as Clipboard from 'expo-clipboard';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import ListItem from "../../components/ListItem";
import OrderedList from "../../components/OrderedList";
import authService from "../../services/authService";
import referralService from "../../services/referralService";
import ReferralSuccessModal from "../../components/common/ReferralSuccessModal";

/**
 * Back Arrow Icon - Same style as Payment Settings
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);


// Removed broken image requires
// const MEGAPHONE_IMAGE ...
// const VECTOR_ICON ...
// const PROP_IMAGE ...

// Fallback for missing ReferralBackground component
const ReferralBackground = ({ width, height, style }) => (
  <View style={[{ width, height, backgroundColor: '#010135' }, style]} />
);

const Referrals = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    invited: 0,
    points: 0,
    records: []
  });
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Try to fetch fresh profile data first
      const profileResult = await authService.fetchProfile();
      const userData = profileResult.success ? profileResult.data : await authService.getCurrentUser();
      
      setUser(userData);
      
      if (userData) {
        // If user already has a referral code, set state to show it immediately
        if (userData.referralCode) {
            setReferralCode(userData.referralCode);
            setLinkGenerated(true);
        } else {
             setReferralCode("");
             setLinkGenerated(false); 
        }
        
        const [statsResult, referralsResult] = await Promise.all([
          referralService.fetchReferralStats(userData.id || userData._id),
          referralService.getReferrals()
        ]);

        const newStats = {
          invited: 0,
          points: 0,
          records: []
        };

        // Ensure total points is updated if stats are fetched
        if (statsResult.success) {
          newStats.points = statsResult.totalPoints || 0;
        }

        // Set the actual user objects into the records list
        if (referralsResult.success && Array.isArray(referralsResult.referrals)) {
          newStats.records = referralsResult.referrals;
          newStats.invited = referralsResult.referrals.length;
        }

        console.log("[Referrals] Setting stats:", newStats);
        setStats(newStats);
      }
    } catch (e) {
      console.warn("[Referrals] Load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleGenerateLink = async () => {
    try {
        setGeneratingLink(true);
        
        // Call backend to generate code
        const result = await referralService.generateReferralCode();
        
        if (result.success) {
            setReferralCode(result.referralCode);
            setLinkGenerated(true);
            setIsSuccessModalVisible(true);
            
            // Refresh user profile in background to sync local storage
            authService.fetchProfile();
        } else {
            Alert.alert("Error", result.message || "Failed to generate link.");
        }
    } catch (e) {
        Alert.alert("Error", "Failed to generate link. Please try again.");
    } finally {
        setGeneratingLink(false);
    }
  };

  const handleCopyCode = async () => {
    // Copy the referral code itself, not the link
    try {
        await Clipboard.setStringAsync(referralCode);
        Alert.alert("Success", "Referral code copied to clipboard!");
    } catch (error) {
        Alert.alert("Notice", "Referral code: " + referralCode);
    }
  };

  const handleShareLink = async () => {
      const link = referralService.generateReferralLink(referralCode);
      try {
        await Share.share({
          message: `Join me on Lunest and find amazing places to stay! Use my referral link: ${link}`,
          url: link,
        });
      } catch (error) {
        Alert.alert("Error", "Could not share referral link.");
      }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Background Pattern */}
      <View style={styles.backgroundContainer}>
         <ReferralBackground width={width} height={height} style={styles.backgroundImage} />
      </View>

      <ReferralSuccessModal
        visible={isSuccessModalVisible}
        onClose={() => setIsSuccessModalVisible(false)}
        onCopy={handleCopyCode}
        onShare={handleShareLink}
        referralCode={referralCode}
      />

      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Referrals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.pointsCard}>
            <View style={styles.pointsContent}>
              <Text style={styles.pointsLabel}>Total Referral Points</Text>
              <Text style={styles.pointsValue}>{stats.points}</Text>
              <Text style={styles.pointsSubtext}>
                Your referral points are added to your Loyalty Points
              </Text>
            </View>
            <View style={styles.pointsIconContainer}>
               {/* Placeholder or actual icon */}
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.howItWorksSection}>
            <Text style={styles.sectionTitle}>How it Works?</Text>
            
            <View style={styles.stepsContainer}>
              <View style={styles.stepItem}>
                <OrderedList>
                  <ListItem index={1}>Share your referral link with friends.</ListItem>
                </OrderedList>
                <Text style={styles.stepDescription}>
                  Invite your friends to join the platform by sending them your unique referral link. It's quick and easy — just copy, share, and spread the word.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <OrderedList>
                  <ListItem index={2}>You both earn rewards — it's a win-win!</ListItem>
                </OrderedList>
                <Text style={styles.stepDescription}>
                  When your referral is successful, both you and your friend receive exciting rewards. Whether you're hosting or traveling, everyone benefits.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <OrderedList>
                  <ListItem index={3}>They sign up and book a stay or list a property.</ListItem>
                </OrderedList>
                <Text style={styles.stepDescription}>
                  Once your friend joins, they can either book a place as a guest or list their property as a host. As long as they complete one of these actions, your referral point counts! (10 point per Guest/Landlord).
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionSection}>
            {!linkGenerated ? (
                <TouchableOpacity 
                    style={styles.generateButton} 
                    onPress={handleGenerateLink}
                    disabled={generatingLink}
                >
                {generatingLink ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.generateButtonText}>Generate Referral Link</Text>
                )}
                </TouchableOpacity>
            ) : (
                <View style={styles.generatedContainer}>
                    <Text style={styles.generatedLabel}>Your Referral Code</Text>
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeText}>{referralCode || "Loading..."}</Text>
                        <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                            <Text style={styles.copyButtonText}>Copy</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
                        <Text style={styles.shareButtonText}>Share Link</Text>
                    </TouchableOpacity>
                </View>
            )}
          </View>

          <View style={styles.trackSection}>
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle}>See who you've invited and your earned rewards</Text>
              <View style={styles.trackBadge}>
                <Text style={styles.trackBadgeText}>Track Referrals</Text>
              </View>
            </View>

            <View style={styles.referralList}>
              {stats.records.length > 0 ? (
                stats.records.map((record, index) => (
                  <View key={index} style={styles.referralItem}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {(record.fullName ? record.fullName.substring(0, 2) : (record.type || "RE")).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.referralInfo}>
                      <View style={styles.referralDetails}>
                        <Text style={styles.referralName}>
                           {record.fullName || `User ${record.id?.substring(0, 6) || "Pending"}`}
                        </Text>
                        <Text style={styles.referralEmail}>
                          {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Pending'}
                        </Text>
                      </View>
                      
                      {/* Status Badges Logic */}
                      {record.referralRewardPaid ? (
                        <View style={[styles.statusBadge, styles.statusPoints]}>
                           <Text style={styles.statusTextPoints}>Awarded (+10)</Text>
                        </View>
                      ) : record.verified ? (
                         <View style={[styles.statusBadge, styles.statusVerified]}>
                           <Text style={styles.statusTextVerified}>Verified</Text>
                        </View>
                      ) : (
                         <View style={[styles.statusBadge, styles.statusPending]}>
                           <Text style={styles.statusTextPending}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No referrals yet. Share your link to earn points!</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    opacity: 0.05, // Subtle background
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  backgroundImage: {
    transform: [{ scale: 1.5 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  pointsCard: {
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  pointsContent: {
    flex: 1,
  },
  pointsLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  pointsValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  pointsSubtext: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.7,
  },
  pointsIconContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  howItWorksSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  stepsContainer: {
    backgroundColor: "rgba(236, 242, 255, 0.6)",
    borderRadius: 16,
    padding: 20,
  },
  stepItem: {
    marginBottom: 20,
  },
  stepDescription: {
    fontSize: 13,
    color: "#4A4A4A",
    lineHeight: 20,
    marginTop: 8,
    paddingLeft: 16,
  },
  actionSection: {
    marginTop: 24,
  },
  generateButton: {
    backgroundColor: "#010135",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  trackSection: {
    marginTop: 32,
  },
  trackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    flex: 1,
    marginRight: 10,
  },
  trackBadge: {
    backgroundColor: "rgba(147, 147, 147, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trackBadgeText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
  referralList: {
    gap: 16,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  referralInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referralDetails: {
    flex: 1,
  },
  referralName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  referralEmail: {
    fontSize: 12,
    color: "#666666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusInvited: {
    backgroundColor: "rgba(195, 223, 255, 0.45)",
  },
  statusTextInvited: {
    color: "#010135",
    fontWeight: "500",
  },
  statusPending: {
    backgroundColor: "#F3F4F6", // Light gray
  },
  statusTextPending: {
      fontSize: 12,
      color: "#6B7280", // Gray text
      fontWeight: "500",
  },
  statusVerified: {
    backgroundColor: "#010135",
  },
  statusTextVerified: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  statusPoints: {
    backgroundColor: "#E8F5E9",
  },
  statusTextPoints: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  generatedContainer: {
      gap: 12,
  },
  generatedLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: "#666",
      marginBottom: 4,
  },
  codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 16,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#E5E7EB',
  },
  codeText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111827",
      letterSpacing: 1,
  },
  copyButton: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
  },
  copyButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#010135",
  },
  shareButton: {
      backgroundColor: '#010135',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
  },
  shareButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: "600",
  },
});

export default Referrals;
