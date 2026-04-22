/**
 * TransactionDetailScreen - Receipt/Transaction detail for completed bookings
 * Users can view and download this receipt from the booking confirmation screen
 */

import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
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
import authService from "../../services/authService";

const logoImage = require("../../assets/images/lunest_logo_main.png");

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
    couponCode: params.couponCode || "",
    couponDiscount: params.couponDiscount || "",
  };

  // Dynamic status message for all transaction types
  function getStatusMessage(type, status) {
    const s = status?.toLowerCase();
    const t = type?.toLowerCase() || "";
    
    if (t.includes("booking") && (t.includes("payment") || t.includes("receipt"))) {
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "disputed") return "Transaction Disputed";
        if (s === "confirmed" || s === "success" || s === "completed")
          return "Transaction Successful";
        return `Transaction Status: ${status}`;
    }

    switch (t) {
      case "booking":
        if (s === "failed" || s === "cancelled") return "Transaction Failed";
        if (s === "pending" || s === "reserved") return "Transaction Pending";
        if (s === "disputed") return "Transaction Disputed";
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
        if (s === "disputed") return "Funds Disputed";
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
      
      if (Platform.OS === "web") {
        const { toPng } = require('html-to-image');
        // On web, viewShotRef.current points to the DOM node
        if (viewShotRef.current) {
          const dataUrl = await toPng(viewShotRef.current, {
            backgroundColor: "#FFFFFF",
            cacheBust: true,
            pixelRatio: 2,
          });

          await saveRefAsImage(dataUrl, `Receipt-${transactionData.transactionId}.png`);
          
          setConfirmationMessage("Receipt image downloaded successfully.");
          setConfirmationVisible(true);
        }
        return;
      }

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
      setModalVisible(false); // Ensure modal closes
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      const userData = await authService.getUserData();
      const userName = userData?.fullName || "Account Holder";
      const userEmail = userData?.email || "";

      // Load Logo
      let logoSrc = "";
      try {
        const asset = Asset.fromModule(logoImage);
        await asset.downloadAsync();
        const logoFile = new File(asset.localUri);
        const logoBase64 = await logoFile.base64();
        logoSrc = `data:image/png;base64,${logoBase64}`;
      } catch (imgErr) {
        console.warn("[PDF] Logo load error:", imgErr);
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; color: #333; line-height: 1.5; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
            .header-left { flex: 1; }
            .header-right { text-align: right; }
            .logo { height: 45px; width: auto; }
            h1 { color: #010135; margin: 0; font-size: 26px; letter-spacing: -0.5px; }
            
            .details-table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #eee; }
            .details-table td { 
              padding: 12px 15px; 
              border: 1px solid #eee;
              font-size: 13px;
              color: #444;
            }
            .label { font-weight: 600; color: #666; width: 35%; background-color: #fcfcfc; text-transform: uppercase; font-size: 11px; }
            .value { text-align: left; font-weight: 700; color: #010135; }
            .amount-row td { background-color: #f8f9ff; }
            .amount { font-size: 18px; font-weight: 800; color: #010135; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #f0f0f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : `<h1>LUNEST</h1>`}
            </div>
            <div class="header-right">
              <h1>Digital Receipt</h1>
            </div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Account Holder</td>
              <td class="value">${userName}</td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="value">${userEmail || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">Status</td>
              <td class="value">
                <span class="status-badge status-${transactionData.status.toLowerCase()}">
                  ${transactionData.status}
                </span>
              </td>
            </tr>
            <tr>
              <td class="label">Generated On</td>
              <td class="value">${new Date().toLocaleString()}</td>
            </tr>
          
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
              <td class="value amount">${transactionData.amount}</td>
            </tr>
            ${
              transactionData.couponCode
                ? `<tr><td class="label">Coupon Applied (${transactionData.couponCode})</td><td class="value" style="color: #2E7D32">-₦${Number(transactionData.couponDiscount).toLocaleString()}</td></tr>`
                : ""
            }
          </table>
          
          <div class="footer">
            <p>Thank you for choosing Lunest.</p>
            <p>This is a system-generated receipt. For any inquiries, please contact Lunest Support.</p>
            <p>&copy; ${new Date().getFullYear()} Lunest Technologies.</p>
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
      case "disputed":
        return "#DC2626";
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
      case "disputed":
        return "rgba(220, 38, 38, 0.1)";
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
                  } else if (s === "disputed") {
                    return <Ionicons name="warning" size={60} color="#DC2626" />;
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
                    if (type === "security deposit" || type === "caution fee") return "This caution fee is being held in escrow.";
                    return "These funds are currently on hold.";
                  } else if (s === "disputed") {
                    return "This transaction is currently under dispute.";
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
              
              {/* Coupon Discount Row */}
              {transactionData.couponCode ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Coupon Applied ({transactionData.couponCode}):</Text>
                  <Text style={[styles.detailValue, { color: "#2E7D32" }]}>
                    -₦{Number(transactionData.couponDiscount).toLocaleString()}
                  </Text>
                </View>
              ) : null}

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

              {/* Breakdown Section (Optional, from metadata) */}
              {params.metadata && (() => {
                try {
                  const metadata = typeof params.metadata === 'string' ? JSON.parse(params.metadata) : params.metadata;
                  const breakdown = metadata.breakdown;
                  if (!breakdown) return null;

                  return (
                    <View style={styles.breakdownBox}>
                      <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
                      {breakdown.rent > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Base Rent</Text>
                          <Text style={styles.breakdownValue}>₦{Number(breakdown.rent).toLocaleString()}</Text>
                        </View>
                      )}
                      {breakdown.serviceCharge > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Service Charge</Text>
                          <Text style={styles.breakdownValue}>₦{Number(breakdown.serviceCharge).toLocaleString()}</Text>
                        </View>
                      )}
                      {breakdown.appFee > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>App Charge ({metadata.calculation?.appFeePercent || 3}%)</Text>
                          <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(breakdown.appFee).toLocaleString()}</Text>
                        </View>
                      )}
                      {breakdown.vat > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>VAT on App Charge</Text>
                          <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(breakdown.vat).toLocaleString()}</Text>
                        </View>
                      )}
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabelBold}>Net Earning</Text>
                        <Text style={styles.breakdownValueBold}>₦{Number(breakdown.net).toLocaleString()}</Text>
                      </View>
                    </View>
                  );
                } catch (e) {
                  return null;
                }
              })()}

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
        showAgreement={false}
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
    width: "100%",
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#525252",
  },
  detailValue: {
    color: "#000",
    flex: 2,
    textAlign: "right",
    flexWrap: "wrap",
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    flex: 2,
    textAlign: "right",
    flexWrap: "wrap",
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
  breakdownBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F8F9FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5EFFF",
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#525252",
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E5EFFF",
    marginVertical: 8,
  },
  breakdownLabelBold: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
  },
  breakdownValueBold: {
    fontSize: 14,
    fontWeight: "800",
    color: "#010135",
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
