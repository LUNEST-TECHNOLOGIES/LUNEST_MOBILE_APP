import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export const ExtendStayModal = ({
  visible,
  onClose,
  booking,
  onConfirmExtension,
  isProcessing
}) => {
  const [duration, setDuration] = useState(1);
  const [unitType, setUnitType] = useState("DAILY"); // DAILY, WEEKLY, MONTHLY, YEARLY
  const [quote, setQuote] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Helper to determine the property's base rental period
  const getPropertyBaseUnit = () => {
    const rawPeriod = (
      booking?.listing?.pricingPeriod ||
      booking?.pricingPeriod ||
      booking?.rentalType ||
      booking?.listing?.rentalType ||
      booking?.unitType ||
      "night"
    ).toString().toLowerCase();

    if (rawPeriod.includes("year") || rawPeriod.includes("annual")) return "YEARLY";
    if (rawPeriod.includes("month")) return "MONTHLY";
    if (rawPeriod.includes("week")) return "WEEKLY";
    return "DAILY";
  };

  // Helper to get allowed extension unit choices based on property rental type
  const getAvailableUnits = () => {
    const baseUnit = getPropertyBaseUnit();
    switch (baseUnit) {
      case "YEARLY":
        return ["YEARLY"];
      case "MONTHLY":
        return ["MONTHLY", "YEARLY"];
      case "WEEKLY":
        return ["WEEKLY", "MONTHLY"];
      case "DAILY":
      default:
        return ["DAILY", "WEEKLY", "MONTHLY"];
    }
  };

  useEffect(() => {
    if (visible && booking) {
      const baseUnit = getPropertyBaseUnit();
      setUnitType(baseUnit);
      setDuration(1);
      calculateQuote(1, baseUnit);
    }
  }, [visible, booking]);

  useEffect(() => {
    if (visible && booking && unitType) {
      calculateQuote(duration, unitType);
    }
  }, [duration, unitType]);

  const calculateQuote = (dur, unit) => {
    if (!booking) return;
    setIsCalculating(true);

    try {
      const origNights = Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      const totalOrigRent = booking.pricingBreakdown?.rentFee || booking.totalAmount?.price || 0;
      const nightlyRate = Math.round((totalOrigRent / origNights) * 100) / 100;

      let extraNights = dur;
      const currentCheckOut = new Date(booking.checkOut);
      const newCheckOut = new Date(currentCheckOut);

      if (unit === "WEEKLY") {
        extraNights = dur * 7;
        newCheckOut.setDate(newCheckOut.getDate() + extraNights);
      } else if (unit === "MONTHLY") {
        newCheckOut.setMonth(newCheckOut.getMonth() + dur);
        extraNights = Math.max(1, Math.round((newCheckOut.getTime() - currentCheckOut.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (unit === "YEARLY") {
        newCheckOut.setFullYear(newCheckOut.getFullYear() + dur);
        extraNights = Math.max(1, Math.round((newCheckOut.getTime() - currentCheckOut.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        extraNights = dur;
        newCheckOut.setDate(newCheckOut.getDate() + extraNights);
      }

      const rentFee = Math.round(nightlyRate * extraNights * 100) / 100;
      const guestFee = Math.round(rentFee * 0.02 * 100) / 100;   // 2% Discounted LUNEST Fee
      const guestVat = Math.round(guestFee * 0.075 * 100) / 100; // 7.5% VAT on Guest Fee
      const guestTotal = Math.round((rentFee + guestFee + guestVat) * 100) / 100;

      setQuote({
        dur,
        unit,
        extraNights,
        currentCheckOut,
        newCheckOut,
        rentFee,
        guestFee,
        guestVat,
        guestTotal
      });
    } catch (e) {
      console.error("[ExtendStayModal] Error calculating quote:", e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirm = () => {
    if (!quote) return;
    onConfirmExtension(quote);
  };

  if (!visible) return null;

  const availableUnits = getAvailableUnits();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Extend Your Stay ✨</Text>
              <Text style={styles.subtitle}>App fee drops to 2% for stay extensions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Unit Selector Tabs */}
            <Text style={styles.sectionLabel}>Extension Unit ({getPropertyBaseUnit()} property)</Text>
            <View style={styles.unitTabContainer}>
              {availableUnits.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitTab, unitType === u && styles.unitTabActive]}
                  onPress={() => {
                    setUnitType(u);
                    setDuration(1);
                  }}
                >
                  <Text style={[styles.unitTabText, unitType === u && styles.unitTabTextActive]}>
                    {u.charAt(0) + u.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration Selector */}
            <Text style={styles.sectionLabel}>Duration ({unitType.toLowerCase()})</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, duration <= 1 && styles.counterBtnDisabled]}
                onPress={() => duration > 1 && setDuration(duration - 1)}
                disabled={duration <= 1}
              >
                <Ionicons name="remove" size={20} color={duration <= 1 ? "#9CA3AF" : "#1F2937"} />
              </TouchableOpacity>
              <Text style={styles.durationValue}>
                {duration} {unitType === "DAILY" ? "Day(s)" : unitType === "WEEKLY" ? "Week(s)" : unitType === "MONTHLY" ? "Month(s)" : "Year(s)"}
              </Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setDuration(duration + 1)}
              >
                <Ionicons name="add" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Date Summary Card */}
            {quote && (
              <View style={styles.dateCard}>
                <View style={styles.dateCol}>
                  <Text style={styles.dateCardLabel}>CURRENT CHECKOUT</Text>
                  <Text style={styles.dateCardValue}>
                    {new Date(quote.currentCheckOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>

                <Ionicons name="arrow-forward" size={20} color="#010135" />

                <View style={styles.dateCol}>
                  <Text style={styles.dateCardLabel}>NEW CHECKOUT</Text>
                  <Text style={[styles.dateCardValue, { color: "#010135", fontWeight: "700" }]}>
                    {new Date(quote.newCheckOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
              </View>
            )}

            {/* Fee Breakdown */}
            {quote && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rent ({quote.extraNights} night{quote.extraNights > 1 ? "s" : ""})</Text>
                  <Text style={styles.breakdownValue}>₦{quote.rentFee.toLocaleString()}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={styles.breakdownLabel}>LUNEST Fee (Discounted 2%)</Text>
                  </View>
                  <Text style={styles.breakdownValue}>₦{quote.guestFee.toLocaleString()}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>VAT (7.5%)</Text>
                  <Text style={styles.breakdownValue}>₦{quote.guestVat.toLocaleString()}</Text>
                </View>

                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount Payable</Text>
                  <Text style={styles.totalValue}>₦{quote.guestTotal.toLocaleString()}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, isProcessing && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isProcessing || isCalculating}
            >
              {isProcessing || isCalculating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  Confirm & Pay ₦{quote?.guestTotal?.toLocaleString() || "0"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end"
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 30 : 20
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135"
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
    marginTop: 2
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F8FAFC"
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8
  },
  unitTabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12
  },
  unitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9
  },
  unitTabActive: {
    backgroundColor: "#010135",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  unitTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B"
  },
  unitTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  counterBtnDisabled: {
    opacity: 0.5
  },
  durationValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135"
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(1, 1, 53, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(1, 1, 53, 0.15)"
  },
  dateCol: {
    alignItems: "center"
  },
  dateCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#010135",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  dateCardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010135"
  },
  breakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 12
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500"
  },
  breakdownValue: {
    fontSize: 13,
    color: "#010135",
    fontWeight: "600"
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1"
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135"
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#010135"
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  confirmBtn: {
    backgroundColor: "#010135",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmBtnDisabled: {
    opacity: 0.6
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
