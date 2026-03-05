/**
 * TransactionDetailScreen - Receipt/Transaction detail for completed bookings
 * Users can view and download this receipt from the booking confirmation screen
 */

import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";
import DownloadConfirmationModal from "../../components/common/DownloadConfirmationModal";
import DownloadOptionsModal from "../../components/common/DownloadOptionsModal";

const TransactionDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isDownloading, setIsDownloading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const viewShotRef = useRef(null);

  // Parse transaction data from params
  const transactionData = {
    status: params.status || "Confirmed",
    transactionId: params.transactionId || params.refCode || "LNST2569311",
    transactionType: params.transactionType || "Booking",
    amount: params.amount || params.total || "₦70,000",
    paymentMethod: params.paymentMethod || "Wallet",
    dateTime: params.dateTime || formatDateTime(new Date()),
    propertyName: params.propertyName || "Property Booking",
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    bookingId: params.bookingId,
  };

  // Dynamic status message for all transaction types
  function getStatusMessage(type, status) {
    const s = status?.toLowerCase();
    const t = type?.toLowerCase() || "";
    
    if (t.includes("booking") && (t.includes("payment") || t.includes("receipt"))) {
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Transaction Successful";
        return `Transaction Status: ${status}`;
    }

    switch (t) {
      case "booking":
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Transaction Successful";
        return `Transaction Status: ${status}`;
      case "payout":
      case "host payout":
        if (s === "failed" || s === "cancelled") return "Payout Failed";
        if (s === "pending" || s === "reserved") return "Payout Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Payout Successful";
        return `Payout Status: ${status}`;
      case "app charge":
      case "appcharge":
      case "app fee (deduction)":
      case "host app fee (deduction)":
        if (s === "failed" || s === "cancelled") return "Charge Failed";
        if (s === "pending" || s === "reserved") return "Charge Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Charge Successful";
        return `Charge Status: ${status}`;
      case "vat on app fee":
      case "host vat fee deduction":
        if (s === "failed" || s === "cancelled") return "VAT Deduction Failed";
        if (s === "pending" || s === "reserved") return "VAT Deduction Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "VAT Deduction Successful";
        return `VAT Status: ${status}`;
      case "rent fee (rent + service charge)":
      case "earnings from booking":
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Transaction Successful";
        return `Transaction Status: ${status}`;
      case "wallet funding":
      case "funding":
      case "walletfunding":
        if (s === "failed" || s === "cancelled") return "Funding Failed";
        if (s === "pending" || s === "reserved") return "Funding Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Funding Successful";
        return `Funding Status: ${status}`;
      case "rent income":
      case "rent earnings":
        if (s === "failed" || s === "cancelled") return "Income Failed";
        if (s === "pending" || s === "reserved") return "Income Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Income Credited";
        return `Income Status: ${status}`;
      default:
        if (t.includes("earnings from") || t.includes("rent income") || t.includes("rent earnings")) {
            if (s === "failed" || s === "cancelled") return "Transaction Failed";
            if (s === "pending" || s === "reserved") return "Transaction Pending";
            if (s === "confirmed" || s === "success" || s === "completed")
              return "Transaction Successful";
            return `Transaction Status: ${status}`;
        }
        if (s === "on_hold" || s === "on hold") return "Funds Held";
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Transaction Successful";
        return `Transaction Status: ${status}`;
    }
  }

  function formatDateTime(date) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleDateString("en-US", options).replace(",", ".");
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleBackToHome = () => {
    router.replace("/(tabs)");
  };

  const handleDownloadPress = () => {
    setModalVisible(true);
  };

  const handleSaveImage = async () => {
    try {
      setIsDownloading(true);
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          format: "png",
          quality: 0.9,
          result: "tmpfile",
        });

        if (Platform.OS === "android" || Platform.OS === "ios") {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: `Receipt-${transactionData.transactionId}.png`,
            UTI: "public.png",
          });
          setConfirmationMessage("Receipt image saved successfully.");
          setConfirmationVisible(true);
        } else {
          Alert.alert("Success", "Receipt saved as image!");
        }
      }
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save receipt image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #010135; margin-bottom: 5px; }
            .title { font-size: 18px; color: #666; }
            .status-badge { 
              display: inline-block; 
              padding: 6px 16px; 
              border-radius: 20px; 
              font-weight: bold; 
              font-size: 14px;
              margin: 10px 0;
            }
            .success { background-color: rgba(49, 235, 61, 0.1); color: #2E7D32; }
            .pending { background-color: rgba(245, 158, 11, 0.1); color: #F59E0B; }
            .failed { background-color: rgba(239, 68, 68, 0.1); color: #EF4444; }
            
            .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table td { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
            .label { font-weight: 500; color: #666; }
            .value { text-align: right; font-weight: 600; color: #000; }
            .amount { font-size: 18px; font-weight: bold; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LUNEST</div>
            <div class="title">Transaction Receipt</div>
            <div class="status-badge ${transactionData.status.toLowerCase()}">
              ${transactionData.status}
            </div>
          </div>
          
          <table class="details-table">
            <tr>
              <td class="label">Transaction ID</td>
              <td class="value">${transactionData.transactionId}</td>
            </tr>
            <tr>
              <td class="label">Type</td>
              <td class="value">${transactionData.transactionType}</td>
            </tr>
            <tr>
              <td class="label">Date</td>
              <td class="value">${transactionData.dateTime}</td>
            </tr>
            <tr>
              <td class="label">Payment Method</td>
              <td class="value">${transactionData.paymentMethod}</td>
            </tr>
             ${
               transactionData.checkIn
                 ? `<tr><td class="label">Check-in</td><td class="value">${transactionData.checkIn}</td></tr>`
                 : ""
             }
             ${
               transactionData.checkOut
                 ? `<tr><td class="label">Check-out</td><td class="value">${transactionData.checkOut}</td></tr>`
                 : ""
             }
            <tr>
              <td class="label">Amount</td>
              <td class="value amount">${transactionData.amount}</td>
            </tr>
          </table>
          
          <div class="footer">
            <p>Thank you for using Lunest.</p>
            <p>This is an electronically generated receipt.</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      setConfirmationMessage("Receipt PDF downloaded successfully.");
      setConfirmationVisible(true);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF receipt.");
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "success":
      case "completed":
        return "#2E7D32";
      case "pending":
      case "reserved":
        return "#F59E0B";
      case "on_hold":
      case "on hold":
        return "#192DFF";
      default:
        return "#2E7D32";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "success":
      case "completed":
        return "rgba(49, 235, 61, 0.3)";
      case "pending":
      case "reserved":
        return "rgba(245, 158, 11, 0.2)";
      case "on_hold":
      case "on hold":
        return "rgba(25, 45, 255, 0.1)";
      default:
        return "rgba(49, 235, 61, 0.3)";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {getStatusMessage(
            transactionData.transactionType,
            transactionData.status,
          )}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt Card Wrapped in ViewShot for Capture */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 0.9 }}
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <View style={styles.receiptCard}>
            {/* Status Row */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Transaction Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBgColor(transactionData.status) },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(transactionData.status) },
                  ]}
                >
                  {getStatusMessage(
                    transactionData.transactionType,
                    transactionData.status,
                  )}
                </Text>
              </View>
            </View>

            {/* Success Icon and Message */}
            <View style={styles.successSection}>
              <View style={styles.successIcon}>
                {(() => {
                  const s = transactionData.status?.toLowerCase();
                  if (s === "failed" || s === "cancelled") {
                    return (
                      <Ionicons name="close-circle" size={60} color="#EF4444" />
                    );
                  } else if (s === "pending" || s === "reserved") {
                    return <Ionicons name="time" size={60} color="#F59E0B" />;
                  } else if (s === "on_hold" || s === "on hold") {
                    return <Ionicons name="lock-closed" size={60} color="#192DFF" />;
                  } else {
                    return (
                      <Ionicons
                        name="checkmark-circle"
                        size={60}
                        color="#2E7D32"
                      />
                    );
                  }
                })()}
              </View>
              <Text style={styles.successMessage}>
                {(() => {
                  const type = transactionData.transactionType?.toLowerCase();
                  const s = transactionData.status?.toLowerCase();
                  if (s === "failed" || s === "cancelled") {
                    if (type === "payout" || type === "host payout")
                      return "Your payout was not successful.";
                    if (
                      type === "wallet funding" ||
                      type === "funding" ||
                      type === "walletfunding"
                    )
                      return "Wallet funding failed.";
                    if (type === "app charge" || type === "appcharge")
                      return "App charge failed.";
                    return "Your transaction was not successful.";
                  } else if (s === "pending" || s === "reserved") {
                    if (type === "payout" || type === "host payout") return "Your payout is pending.";
                    if (
                      type === "wallet funding" ||
                      type === "funding" ||
                      type === "walletfunding"
                    )
                      return "Wallet funding is pending.";
                    if (type === "app charge" || type === "appcharge")
                      return "App charge is pending.";
                    return "Your transaction is pending.";
                  } else if (s === "on_hold" || s === "on hold") {
                    if (type === "security deposit" || type === "caution fee") return "This caution fee is being held in escrow.";
                    return "These funds are currently on hold.";
                  } else {
                    if (type === "payout" || type === "host payout")
                      return "Your payout has been completed successfully.";
                    if (
                      type === "wallet funding" ||
                      type === "funding" ||
                      type === "walletfunding"
                    )
                      return "Wallet funding was successful.";
                    if (
                      type === "app charge" ||
                      type === "appcharge" ||
                      type === "app fee (deduction)" ||
                      type === "host app fee (deduction)"
                    )
                      return "App charge was successful.";
                    if (
                      type === "vat on app fee" ||
                      type === "host vat fee deduction"
                    )
                      return "VAT deduction was successful.";
                    if (type?.toLowerCase().includes("earnings") || type?.toLowerCase().includes("rent income"))
                      return "Your earnings have been credited successfully.";
                    if (type?.toLowerCase().includes("booking payment"))
                      return "Your booking payment was successful.";
                    return "Your transaction has been completed successfully.";
                  }
                })()}
              </Text>
            </View>

            {/* Transaction Details */}
            <View style={styles.detailsSection}>
              {/* Transaction ID */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue}>
                  {transactionData.transactionId}
                </Text>
              </View>

              {/* Transaction Type */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Type</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>
                    {transactionData.transactionType}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValueBold}>
                  {transactionData.amount}
                </Text>
              </View>

              {/* Payment Method */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {transactionData.paymentMethod}
                </Text>
              </View>

              {/* Date & Time */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {transactionData.dateTime}
                </Text>
              </View>

              {/* Check-in/Check-out if available */}
              {transactionData.checkIn && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Check-in:</Text>
                  <Text style={styles.detailValue}>
                    {transactionData.checkIn}
                  </Text>
                </View>
              )}
              {transactionData.checkOut && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Check-out:</Text>
                  <Text style={styles.detailValue}>
                    {transactionData.checkOut}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ViewShot>

        {/* Refund Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={18} color="#EF4444" />
          <Text style={styles.noticeText}>
            <Text style={styles.noticeTextRed}>
              This booking is non-refundable.{" "}
            </Text>
            <Text style={styles.noticeTextLink}>View Policy</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable
          style={styles.downloadButton}
          onPress={handleDownloadPress}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFF" />
              <Text style={styles.downloadButtonText}>Download</Text>
            </>
          )}
        </Pressable>
        <Pressable style={styles.homeButton} onPress={handleBackToHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </View>

      <DownloadOptionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaveImage={handleSaveImage}
        onDownloadReceipt={handleDownloadPDF}
        loading={isDownloading}
      />

      <DownloadConfirmationModal
        visible={confirmationVisible}
        onClose={() => setConfirmationVisible(false)}
        message={confirmationMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#EFEFEF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 8,
    gap: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  successSection: {
    alignItems: "center",
    gap: 16,
  },
  successIcon: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  successMessage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2E7D32",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 230,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#525252",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  typeBadge: {
    backgroundColor: "#010135",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E5EFFF",
  },
  noticeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
  },
  noticeTextRed: {
    color: "#EF4444",
  },
  noticeTextLink: {
    color: "#010135",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  downloadButton: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#010135",
    borderRadius: 25,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  homeButton: {
    flex: 1,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#010135",
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});

export default TransactionDetailScreen;
