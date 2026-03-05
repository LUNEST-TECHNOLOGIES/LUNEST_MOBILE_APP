import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";

const ActionButtons = ({
  status,
  onShare,
  onGoHome,
  onContinuePayment,
  onCancelReservation,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 375;
  const isReserved = status?.toLowerCase() === "reserved";
  const isExpired = status?.toLowerCase() === "expired";

  if (isReserved && !isExpired) {
    return (
      <View style={styles.buttonContainer}>
        {/* Continue to Payment Button */}
        <Pressable
          style={[
            styles.continueButton,
            isSmallScreen && styles.smallScreenButton,
          ]}
          onPress={onContinuePayment}
        >
          <Text
            style={[
              styles.continueButtonText,
              isSmallScreen && styles.smallScreenText,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Continue to Payment
          </Text>
        </Pressable>

        {/* Cancel Reservation Button */}
        <Pressable
          style={[
            styles.cancelButton,
            isSmallScreen && styles.smallScreenButton,
          ]}
          onPress={onCancelReservation}
        >
          <Text
            style={[
              styles.cancelButtonText,
              isSmallScreen && styles.smallScreenText,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Cancel Reservation
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.buttonContainer}>
      {/* Share Button */}
      <Pressable
        style={[styles.shareButton, isSmallScreen && styles.smallScreenButton]}
        onPress={onShare}
      >
        <Text
          style={[
            styles.shareButtonText,
            isSmallScreen && styles.smallScreenText,
          ]}
        >
          Share
        </Text>
      </Pressable>

      {/* Go Home Button */}
      <Pressable
        style={[styles.goHomeButton, isSmallScreen && styles.smallScreenButton]}
        onPress={onGoHome}
      >
        <Text
          style={[
            styles.goHomeButtonText,
            isSmallScreen && styles.smallScreenText,
          ]}
        >
          Go Home
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 30,
    paddingHorizontal: 16,
    width: "100%",
  },
  // Share Button
  shareButton: {
    flex: 1,
    height: 50,
    minWidth: 100,
    maxWidth: 170,
    backgroundColor: "#010135",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  // Go Home Button
  goHomeButton: {
    flex: 1,
    height: 50,
    minWidth: 100,
    maxWidth: 170,
    borderWidth: 1,
    borderColor: "#010135",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  goHomeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  // Continue to Payment Button
  continueButton: {
    flex: 1,
    height: 50,
    minWidth: 140,
    backgroundColor: "#010135",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  // Cancel Reservation Button
  cancelButton: {
    flex: 1,
    height: 50,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#b70808",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b70808",
    textAlign: "center",
  },
  // Small Screen Adjustments
  smallScreenButton: {
    height: 48,
    minWidth: 120,
    paddingHorizontal: 8,
  },
  smallScreenText: {
    fontSize: 13,
  },
});

export default ActionButtons;
