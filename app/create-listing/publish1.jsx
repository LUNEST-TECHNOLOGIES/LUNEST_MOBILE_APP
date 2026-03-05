/**
 * Publish Screen 1 - Submission Confirmation
 * Shows after user submits listing - listing under review
 */

import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// Status Bar Icons
const CellularIcon = ({ size = 19, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <View style={{ width: size, height: size }}>
      <View style={[styles.level1, styles.levelBg]} />
      <View style={[styles.level2, styles.levelBg]} />
      <View style={[styles.level3, styles.levelLayout]} />
      <View style={[styles.level4, styles.childPosition]} />
    </View>
  </Svg>
);

const WifiIcon = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
      fill="#000"
    />
  </Svg>
);

const BatteryIcon = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 4H9v2H7v12h10V6h-2V4z" fill="#000" />
  </Svg>
);

// Success Check Icon
const CheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Circle
      cx="32"
      cy="32"
      r="30"
      fill="#FFF3CD"
      stroke="#FF9800"
      strokeWidth="2"
    />
    <Path
      d="M28 40L20 32M28 40L44 24"
      stroke="#FF9800"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PUBLISH1 = ({ route }) => {
  const router = useRouter();
  const listingId = route?.params?.listingId || null;

  // Auto-navigate to publish2 after 2 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      router.replace({
        pathname: "/create-listing/publish2",
        params: { listingId },
      });
    }, 2000);

    return () => clearTimeout(timer);
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
          status: "PENDING",
        },
      });
    } else {
      router.replace("/(host-tabs)/listings");
    }
  };

  return (
    <SafeAreaView style={styles.publish1}>
      <View style={styles.view}>
        {/* Main Content */}
        <View style={styles.frameParent}>
          {/* Success Icon */}
          <View style={styles.component26Wrapper}>
            <CheckIcon size={60} />
          </View>

          {/* Text Content */}
          <Text style={[styles.yourListingHas, styles.yourTypo]}>
            Your Listing has been Submitted for Review!
          </Text>
          <Text style={[styles.wereReviewingYour, styles.yourTypo]}>
            We're reviewing your listing to ensure it meets our quality and
            safety standards. You'll be notified once it's approved.
          </Text>
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
  publish1: {
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
    position: "absolute",
  },
  childPosition: {
    bottom: "0%",
    top: "0%",
    height: "100%",
  },
  batteryChildBorder: {
    borderWidth: 1,
    borderStyle: "solid",
  },
  yourTypo: {
    textAlign: "center",
    color: "#010135",

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
    height: "100%",
    overflow: "hidden",
    width: "100%",
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
  },
  level4: {
    right: "-0.19%",
    left: "82.54%",
    backgroundColor: "#c1c1c5",
    borderRadius: 1,
    width: "17.65%",
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
    left: "0%",
    position: "absolute",
    borderWidth: 1,
    borderStyle: "solid",
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
  component26Wrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  yourListingHas: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#010135",

    lineHeight: 28,
    marginHorizontal: 20,
  },
  wereReviewingYour: {
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

export default PUBLISH1;
