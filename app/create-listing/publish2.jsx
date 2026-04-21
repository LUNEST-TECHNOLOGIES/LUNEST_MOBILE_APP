/**
 * Publish Screen 2 - Listing Approved
 * Shows when listing is approved and live
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2 } from "lucide-react-native";
import listingService from "../../src/services/listingService";

// Success Check Icon migrated to Lucide

const PUBLISH2 = ({ route }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listingId = params.listingId || route?.params?.listingId || null;

  // Update listing status to ACTIVE when component mounts
  React.useEffect(() => {
    const activateListing = async () => {
      if (listingId) {
        console.log("🔄 [Publish2] Activating listing:", listingId);
        try {
          const result = await listingService.updateListing(listingId, {
            status: "ACTIVE",
          });
          if (result.success) {
            console.log("✅ [Publish2] Listing activated successfully");
          } else {
            console.error(
              "❌ [Publish2] Failed to activate listing:",
              result.message,
            );
          }
        } catch (error) {
          console.error("❌ [Publish2] Error activating listing:", error);
        }
      }
    };

    activateListing();
  }, [listingId]);

  const handleGoToDashboard = () => {
    router.dismissAll();
    router.replace("/(host-tabs)");
  };

  const handleViewInRealTime = () => {
    router.dismissAll();
    if (listingId) {
      router.push({
        pathname: "/listing-preview",
        params: {
          listingId,
          isHost: "true",
          status: "LIVE",
        },
      });
    } else {
      router.replace("/(host-tabs)/listings");
    }
  };

  return (
    <SafeAreaView style={styles.publish2}>
      <View style={styles.view}>
        {/* Status bar removed for publish screen */}

        {/* Main Content */}
        <View style={styles.frameParent}>
          {/* Success Icon */}
          <View style={styles.frameChild}>
            <CheckCircle2 size={60} color="#22C55E" />
          </View>

          {/* Text Content */}
          <View style={styles.yourListingIsNowLiveParent}>
            <Text style={[styles.yourListingIs, styles.yourListingIsTypo]}>
              Your Listing is Now Live!
            </Text>
            <Text style={[styles.tenantsCanNow, styles.yourListingIsTypo]}>
              Tenants can now discover your property on LUNEST and request
              booking.
            </Text>
          </View>
        </View>

        {/* Footer Buttons */}
        <View style={styles.buttonStyle3Parent}>
          <Pressable
            style={[styles.buttonStyle3, styles.buttonLayout]}
            onPress={handleGoToDashboard}
            activeOpacity={0.6}
          >
            <Text style={[styles.button, styles.buttonTypo]}>
              Go to Dashboard
            </Text>
          </Pressable>
          <Pressable
            style={[styles.buttonStyle2, styles.buttonLayout]}
            onPress={handleViewInRealTime}
            activeOpacity={0.6}
          >
            <Text style={[styles.button2, styles.buttonTypo]}>
              View Listing
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  publish2: {
    flex: 1,
    backgroundColor: "#fff",
  },
  levelBg: {
    backgroundColor: "#000",
    position: "absolute",
  },
  levelLayout: {
    backgroundColor: "#c1c1c5",
    borderRadius: 1,
    width: "17.65%",
  },
  level4Position: {
    bottom: "0%",
    top: "0%",
    height: "100%",
    position: "absolute",
  },
  batteryChildBorder: {
    borderWidth: 1,
    borderStyle: "solid",
  },
  yourListingIsTypo: {
    textAlign: "center",
    color: "#2e7d32",

    fontWeight: "500",
    lineHeight: 24,
  },
  buttonLayout: {
    paddingVertical: 12,
    width: 180,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    height: 50,
  },
  buttonTypo: {
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 16,

    fontSize: 16,
  },
  view: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  statusBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  text: {
    letterSpacing: -0.1,
    fontWeight: "600",
    textAlign: "right",
    color: "#000",

    fontSize: 16,
  },
  cellularParent: {
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  cellular: {
    height: 11,
    width: 19,
    flexDirection: "row",
    gap: 1,
  },
  level1: {
    height: "35.4%",
    top: "64.9%",
    right: "82.35%",
    borderRadius: 1,
    bottom: "-0.29%",
    width: "17.65%",
  },
  level2: {
    height: "53.1%",
    top: "47.2%",
    right: "54.84%",
    left: "27.51%",
    borderRadius: 1,
    bottom: "-0.29%",
    width: "17.65%",
  },
  level3: {
    height: "76.99%",
    top: "23.6%",
    right: "27.32%",
    bottom: "-0.59%",
    left: "55.03%",
    position: "absolute",
  },
  level4: {
    right: "-0.19%",
    left: "82.54%",
    backgroundColor: "#c1c1c5",
    borderRadius: 1,
    width: "17.65%",
  },
  wifiIcon: {
    width: 18,
    height: 12,
  },
  battery: {
    width: 28,
    height: 12,
    flexDirection: "row",
    gap: 1,
  },
  batteryChild: {
    width: "90.58%",
    right: "9.42%",
    borderRadius: 3,
    borderColor: "#919194",
    bottom: "0%",
    top: "0%",
    height: "100%",
    position: "absolute",
    left: "0%",
  },
  batteryItem: {
    height: "66.67%",
    width: "45.29%",
    top: "16.67%",
    right: "46.72%",
    bottom: "16.67%",
    left: "7.99%",
    borderRadius: 2,
    position: "absolute",
  },
  frameParent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
  },
  frameChild: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  yourListingIsNowLiveParent: {
    gap: 10,
    alignItems: "center",
  },
  yourListingIs: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#2e7d32",

    lineHeight: 28,
    marginHorizontal: 20,
  },
  tenantsCanNow: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    color: "#666666",

    lineHeight: 20,
    marginHorizontal: 20,
  },
  buttonStyle3Parent: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  buttonStyle3: {
    borderColor: "#010135",
    borderWidth: 1,
    borderStyle: "solid",
  },
  button: {
    color: "#000",
  },
  buttonStyle2: {
    backgroundColor: "#010135",
  },
  button2: {
    color: "#fff",
  },
});

export default PUBLISH2;
