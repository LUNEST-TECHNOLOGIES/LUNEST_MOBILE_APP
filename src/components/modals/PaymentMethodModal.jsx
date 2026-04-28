/**
 * PaymentMethodModal - Payment method selection overlay
 * Displayed after clicking "Proceed to Payment" on booking summary
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Payment method options
const PAYMENT_METHODS = [
  {
    id: "card",
    name: "Card",
    description: "Visa, Mastercard, Verve",
    icon: "card-outline",
  },
  {
    id: "paystack",
    name: "Paystack",
    description: "Pay with Paystack",
    icon: "wallet-outline",
  },
  {
    id: "wallet",
    name: "Wallet",
    description: "Pay from your Lunest wallet",
    icon: "wallet",
  },
];

const PaymentMethodModal = ({
  visible,
  onClose,
  onSelect,
  onWalletSelect,
  loading = false,
  totalAmount = 0,
  hideReserveOption = false,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [reserveAndPayLater, setReserveAndPayLater] = useState(false);

  const handleMethodSelect = (methodId) => {
    // If reserve and pay later is selected, deselect it when selecting a payment method
    if (reserveAndPayLater) {
      setReserveAndPayLater(false);
    }
    setSelectedMethod(methodId);
  };

  const handleReserveToggle = (value) => {
    setReserveAndPayLater(value);
    // Reserve and pay later is a separate option - deselect payment method when enabled
    if (value) {
      setSelectedMethod(null);
    }
  };

  const handleProceed = useCallback(() => {
    if (!selectedMethod && !reserveAndPayLater) {
      return;
    }

    // If wallet is selected, call onWalletSelect to navigate to wallet screen
    if (selectedMethod === "wallet" && onWalletSelect) {
      onWalletSelect({
        paymentMethod: selectedMethod,
        amount: totalAmount,
      });
      return;
    }

    if (onSelect) {
        onSelect({
            paymentMethod: selectedMethod,
            reserveAndPayLater,
            amount: totalAmount,
        });
    }
  }, [selectedMethod, reserveAndPayLater, totalAmount, onSelect, onWalletSelect]);

  const formatAmount = (amt) => {
    if (!amt) return "₦0.00";
    return `₦${Number(amt).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Payment Method</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          {/* Amount Display */}
          {totalAmount > 0 && (
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>{formatAmount(totalAmount)}</Text>
            </View>
          )}

          {/* Payment Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Choose a Payment Option:</Text>
            <View style={styles.optionsList}>
              {PAYMENT_METHODS.map((method) => (
                <Pressable
                  key={method.id}
                  style={[
                    styles.optionCard,
                    selectedMethod === method.id && styles.optionCardSelected,
                    reserveAndPayLater && styles.optionCardDisabled,
                  ]}
                  onPress={() => handleMethodSelect(method.id)}
                  disabled={reserveAndPayLater}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionIconContainer,
                        selectedMethod === method.id &&
                          styles.optionIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={method.icon}
                        size={24}
                        color={
                          selectedMethod === method.id ? "#FFFFFF" : "#6B7280"
                        }
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionName,
                          selectedMethod === method.id &&
                            styles.optionNameSelected,
                        ]}
                      >
                        {method.name}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {method.description}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedMethod === method.id && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedMethod === method.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Reserve and Pay Later */}
        {!hideReserveOption && (
          <View style={styles.reserveContainer}>
            <View style={styles.reserveInfo}>
              <Text style={styles.reserveTitle}>Reserve and Pay Later</Text>
              <Text style={styles.reserveSubtitle}>
                Secure this property now and complete payment within 1 hour.
              </Text>
            </View>
            <Switch
              value={reserveAndPayLater}
              onValueChange={handleReserveToggle}
              trackColor={{ false: "#D1D1D6", true: "#010135" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D1D6"
            />
          </View>
        )}

          {/* Footer */}
          <View style={styles.footer}>
            {/* Terms Notice - Before the button */}
            <View style={styles.termsContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#EF4444"
              />
              <Text style={styles.termsText}>
                By Paying you accept our Terms & Conditions
              </Text>
            </View>

            <Pressable
              style={[
                styles.proceedButton,
                !selectedMethod &&
                  !reserveAndPayLater &&
                  styles.proceedButtonDisabled,
              ]}
              onPress={handleProceed}
              disabled={!selectedMethod && !reserveAndPayLater}
            >
              <Text style={styles.proceedButtonText}>
                {reserveAndPayLater ? "Reserve Now" : "Proceed to Payment"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: Platform.OS === 'web' ? "center" : "flex-end",
    alignItems: Platform.OS === 'web' ? "center" : "stretch",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: Platform.OS === 'web' ? 'auto' : 450,
    width: Platform.OS === 'web' ? '95%' : '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  amountContainer: {
    backgroundColor: "#EFF6FF", // Light blue background
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  amountLabel: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#010135", // Primary dark blue
  },
  optionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  optionsList: {
    gap: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#010135",
    backgroundColor: "#F5F7FF", // Very light blue
    shadowOpacity: 0.08,
  },
  optionCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#F9FAFB",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionIconSelected: {
    backgroundColor: "#010135", // Solid primary color when selected
  },
  optionTextContainer: {
    flex: 1,
  },
  optionName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  optionNameSelected: {
    color: "#010135",
  },
  optionDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#010135",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#010135",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  separatorText: {
    marginHorizontal: 16,
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  reserveContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reserveInfo: {
    flex: 1,
    marginRight: 16,
  },
  reserveTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 5,
  },
  reserveSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 20,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 6,
  },
  termsText: {
    fontSize: 13,
    color: "#6B7280",
  },
  proceedButton: {
    backgroundColor: "#010135",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
});

export default PaymentMethodModal;
