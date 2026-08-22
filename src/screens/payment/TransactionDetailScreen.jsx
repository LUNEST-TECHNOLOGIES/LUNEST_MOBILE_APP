/**
 * TransactionDetailScreen - Receipt/Transaction detail for completed bookings
 * Users can view and download this receipt from the booking confirmation screen
 */

import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
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
import { saveRefAsImage, downloadFile } from "../../utils/downloadUtils";
import { ChevronLeft } from "lucide-react-native";
import bookingService from "../../services/bookingService";

const logoImage = require("../../assets/images/lunest_logo_main.png");

const TransactionDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isDownloading, setIsDownloading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const viewShotRef = useRef(null);
  const Wrapper = Platform.OS === "web" ? View : ViewShot;
  const wrapperProps = Platform.OS === "web" ? {} : { options: { format: "png", quality: 0.9 } };

  // Parse transaction data from params
  const rawCategory = (params.category || "").toUpperCase();
  const rawType = (params.transactionType || "").toUpperCase();
  const isTopUp = rawCategory === "TOP_UP" || 
                  rawType.includes("TOP_UP") || 
                  rawType.includes("TOP UP") || 
                  rawType.includes("WALLET FUNDING") ||
                  rawCategory === "ADDED_FUNDS";

  const computeDisplayType = () => {
    if (isTopUp) return "Wallet Funding";
    if (rawCategory === "SECURITY_DEPOSIT" || rawType.includes("CAUTION")) {
      return params.transactionType || "Caution Fee";
    }
    return params.transactionType || (rawCategory === "BOOKING" ? "Booking Payment" : "Transaction");
  };

  const transactionData = {
    status: params.status || "Confirmed",
    transactionId: params.transactionId || params.refCode || "LNST2569311",
    reference: params.reference || params.paymentReference || "",
    transactionType: computeDisplayType(),
    amount: params.amount || params.total || "₦70,000",
    paymentMethod: params.paymentMethod || "Wallet",
    dateTime: params.dateTime || formatDateTime(new Date()),
    propertyName: params.propertyName || "Property Booking",
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    bookingId: params.bookingId,
    bookingStatus: params.bookingStatus || "",
    couponCode: params.couponCode || "",
    couponDiscount: params.couponDiscount || "",
    category: params.category || (params.transactionType?.toUpperCase().includes("BOOKING") ? "BOOKING" : "")
  };

  const getBookingRef = () => {
    try {
      const metadata = typeof params.metadata === 'string' ? JSON.parse(params.metadata) : (params.metadata || {});
      return metadata.bookingReference || metadata.bookingRef || "";
    } catch (e) {
      return "";
    }
  };
  const bookingRef = getBookingRef();

  // REUSABLE BREAKDOWN CALCULATION
  const getBreakdown = () => {
    // No breakdown card needed for wallet funding / top-up transactions
    if (isTopUp || rawCategory === "TOP_UP" || rawCategory === "ADDED_FUNDS") {
      return null;
    }
    if (!params.metadata) return null;
    try {
      const metadata = typeof params.metadata === 'string' ? JSON.parse(params.metadata) : (params.metadata || {});
      let breakdown = metadata.breakdown;
      
      // Support pricingBreakdown from BookingRepo summary transactions
      if (!breakdown && metadata.pricingBreakdown) {
        const pb = metadata.pricingBreakdown;
        breakdown = {
          rent: pb.rentFee || pb.rentAmount || pb.rent || 0,
          serviceCharge: pb.serviceCharge || 0,
          guestFee: pb.guestFee || 0,
          guestVat: pb.guestVat || pb.vat || 0,
          hostFee: pb.hostFee || 0,
          hostVat: pb.hostVat || 0,
          cautionFee: pb.securityDeposit || pb.cautionFee || 0,
          total: pb.guestTotal || pb.total || 0,
          netEarning: pb.hostEarnings || pb.netEarning || 0
        };
      }

      // Support Host-side flat metadata (from HOST_EARNING transactions)
      if (!breakdown && (metadata.hostSide || metadata.type === 'HOST')) {
        breakdown = {
          rent: metadata.rentAmount || metadata.rentFee || metadata.rent || 0,
          serviceCharge: metadata.serviceCharge || 0,
          hostFee: metadata.hostFee || metadata.appFee || 0,
          hostVat: metadata.hostVat || metadata.vat || 0,
          cautionFee: metadata.cautionFee || metadata.securityDeposit || 0,
          netEarning: metadata.hostEarnings || metadata.netEarning || metadata.net || 0,
        };
        breakdown.total = metadata.total || (Number(breakdown.netEarning) + Number(breakdown.cautionFee));
      }

      // Special mapping for COUPON_PAYMENT
      if (!breakdown && metadata.couponCode) {
        breakdown = {
          rent: metadata.originalAmount || 0,
          couponDiscount: metadata.discountAmount || metadata.couponDiscount || 0,
          total: metadata.finalAmount || 0,
        };
      }

      // SECURITY_DEPOSIT escrow breakdown (from EscrowService resolution)
      const escrow = metadata.escrowBreakdown;
      const isSecurityDeposit = rawCategory === 'SECURITY_DEPOSIT' || 
        rawCategory === 'SECURITY_DEPOSIT_REFUND' ||
        transactionData.category === 'SECURITY_DEPOSIT' || 
        transactionData.transactionType?.toLowerCase().includes('caution fee');
      
      if (isSecurityDeposit && escrow) {
        const isHostClaim = escrow.resolution === 'RELEASED_TO_HOST' || 
                            escrow.resolution === 'CLAIMED_BY_HOST' ||
                            metadata.hostSide === true || 
                            metadata.type === 'HOST';

        if (isHostClaim) {
          const approvedClaim = escrow.damageClaim || escrow.originalDeposit || 0;
          const hostFee = escrow.escrowFee || 0;
          const hostVat = escrow.escrowVat || 0;
          const netPayout = escrow.netRefund || Number((approvedClaim - hostFee - hostVat).toFixed(2));

          return {
            isSecurityDeposit: true,
            isHostClaim: true,
            isGuestSide: false,
            originalDeposit: escrow.originalDeposit || 0,
            approvedClaim,
            hostFee,
            hostVat,
            totalDeductions: Number((hostFee + hostVat).toFixed(2)),
            netPayout,
            resolution: escrow.resolution || 'RELEASED_TO_HOST',
          };
        }

        return {
          isSecurityDeposit: true,
          isHostClaim: false,
          isGuestSide: true,
          originalDeposit: escrow.originalDeposit || 0,
          escrowFee: escrow.escrowFee || 0,
          escrowVat: escrow.escrowVat || 0,
          totalDeductions: escrow.totalDeductions || Number(((escrow.escrowFee || 0) + (escrow.escrowVat || 0)).toFixed(2)),
          damageClaim: escrow.damageClaim || 0,
          remainingDeposit: escrow.remainingDeposit ?? (escrow.originalDeposit - (escrow.damageClaim || 0)),
          netRefund: escrow.netRefund || 0,
          resolution: escrow.resolution || 'RELEASED_TO_GUEST',
        };
      }

      // For SECURITY_DEPOSIT transactions without escrowBreakdown (pre-resolution / legacy),
      // compute the breakdown from the transaction amount (5% fee + 7.5% VAT on fee)
      if (isSecurityDeposit && !breakdown) {
        const depositAmount = parseFloat(params.amount?.replace(/[₦,]/g, '')) || 0;
        const fee = parseFloat(params.fee) || 0;
        const netAmount = parseFloat(params.netAmount) || 0;
        
        if (fee > 0 || netAmount > 0) {
          // Transaction has fee/netAmount fields from resolution
          const computedOriginal = netAmount + fee;
          const computedEscrowFee = Number((computedOriginal * 0.05).toFixed(2));
          const computedEscrowVat = Number((computedEscrowFee * 0.075).toFixed(2));
          return {
            isSecurityDeposit: true,
            isHostClaim: false,
            isGuestSide: true,
            originalDeposit: computedOriginal || depositAmount,
            escrowFee: computedEscrowFee,
            escrowVat: computedEscrowVat,
            totalDeductions: Number((computedEscrowFee + computedEscrowVat).toFixed(2)),
            damageClaim: 0,
            remainingDeposit: computedOriginal || depositAmount,
            netRefund: netAmount || depositAmount,
            resolution: '',
          };
        }
      }

      if (!breakdown) return null;

      // Normalize breakdown keys for consistency with multiple fallbacks
      const normalizedBreakdown = {
        rent: breakdown.rent ?? breakdown.rentAmount ?? breakdown.rentFee ?? metadata.rentAmount ?? metadata.rentFee ?? metadata.rent ?? 0,
        serviceCharge: breakdown.serviceCharge ?? metadata.serviceCharge ?? 0,
        guestFee: breakdown.guestFee ?? breakdown.appFee ?? metadata.guestFee ?? metadata.appFee ?? 0,
        guestVat: breakdown.guestVat ?? breakdown.vat ?? metadata.guestVat ?? metadata.vat ?? 0,
        hostFee: breakdown.hostFee ?? breakdown.appFee ?? metadata.hostFee ?? metadata.appFee ?? 0,
        hostVat: breakdown.hostVat ?? breakdown.vat ?? metadata.hostVat ?? metadata.vat ?? 0,
        appFee: breakdown.hostFee ?? breakdown.appFee ?? metadata.hostFee ?? metadata.appFee ?? 0, // Alias for template compatibility
        vat: breakdown.hostVat ?? breakdown.vat ?? metadata.hostVat ?? metadata.vat ?? 0, // Alias for template compatibility
        cautionFee: breakdown.cautionFee ?? breakdown.securityDeposit ?? breakdown.caution ?? metadata.cautionFee ?? metadata.securityDeposit ?? 0,
        netEarning: breakdown.netEarning ?? breakdown.net ?? breakdown.hostEarnings ?? metadata.hostEarnings ?? metadata.netEarning ?? metadata.net ?? 0,
        total: breakdown.total ?? breakdown.amount ?? metadata.total ?? metadata.amount ?? 0,
        couponDiscount: breakdown.couponDiscount ?? breakdown.discount ?? metadata.couponDiscount ?? metadata.discount ?? 0
      };

      // Infer side
      const isGuestSide = metadata.guestSide ?? (
        transactionData.transactionType?.toLowerCase().includes("booking payment") || 
        transactionData.transactionType === "Booking" ||
        transactionData.transactionType?.toLowerCase().includes("coupon")
      );

      return { ...normalizedBreakdown, isGuestSide };
    } catch (e) {
      return null;
    }
  };

  const currentBreakdown = getBreakdown();

  // Dynamic status message for all transaction types
  function getStatusMessage(type, status) {
    const s = status?.toLowerCase() || "";
    const t = type?.toLowerCase() || "";
    const bs = transactionData.bookingStatus?.toLowerCase();

    // IF booking is cancelled, OVERRIDE the transaction status display
    if (bs === "cancelled" && transactionData.category !== "CANCELLATION_PENALTY") {
      return "Booking Cancelled";
    }

    if (s === "failed" || s === "cancelled") {
      if (t.includes("penalty")) return "Penalty Failed";
      if (t.includes("payout")) return "Payout Failed";
      if (t.includes("funding")) return "Funding Failed";
      if (t.includes("charge")) return "Charge Failed";
      if (t.includes("vat")) return "VAT Deduction Failed";
      return "Transaction Failed";
    }

    if (s === "pending" || s === "reserved") {
      if (t.includes("penalty")) return "Penalty Pending";
      if (t.includes("payout")) return "Payout Pending";
      if (t.includes("funding")) return "Funding Pending";
      if (t.includes("charge")) return "Charge Pending";
      if (t.includes("vat")) return "VAT Deduction Pending";
      return "Transaction Pending";
    }

    if (s === "processing") {
      return "Payment Processing";
    }

    if (s === "on_hold" || s === "on hold") {
      return "In Escrow";
    }

    if (s === "disputed") {
      return "Funds Disputed";
    }

    // Success/Completed states
    if (t.includes("penalty") || transactionData.category === "CANCELLATION_PENALTY") return "Penalty Applied";
    if (t.includes("payout") || t === "host payout") return "Payout Successful";
    if (t.includes("charge") || t === "app charge") return "Charge Successful";
    if (t.includes("vat")) return "VAT Deduction Successful";
    if (t.includes("funding") || t === "wallet funding") return "Funding Successful";
    if (t.includes("income") || t.includes("earnings")) return "Income Credited";
    return "Transaction Successful";
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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleBackToHome = () => {
    router.replace("/(tabs)");
  };
  
  const handleResolveStatus = async () => {
    const ref = transactionData.reference || transactionData.transactionId;
    if (!ref) {
      Alert.alert("Error", "No reference found to verify.");
      return;
    }
    
    setIsResolving(true);
    try {
      const isBooking = transactionData.category === "BOOKING" || transactionData.bookingId || transactionData.transactionType?.toLowerCase().includes("booking");
      let result;

      if (isBooking) {
        const bookingService = require("../../services/bookingService").default;
        console.log("[TransactionDetail] Resolving booking payment for:", ref);
        result = await bookingService.verifyPayment(ref);
      } else {
        const paymentService = require("../../services/paymentService").default;
        console.log("[TransactionDetail] Resolving wallet payment for:", ref);
        result = await paymentService.verifyPayment(ref);
      }
      
      if (result && (result.success || result.status === "COMPLETED" || result.status === "success")) {
        Alert.alert("Payment Verified", "Your transaction has been successfully verified!", [
          { 
            text: "OK", 
            onPress: () => {
              if (isBooking) {
                router.replace("/bookings");
              } else {
                router.replace("/profile");
              }
            } 
          }
        ]);
      } else if (result?.status === "FAILED" || result?.body?.status === "FAILED" || result?.paymentStatus === "FAILED") {
        setTransactionData(prev => ({ ...prev, status: "FAILED", paymentStatus: "FAILED" }));
        Alert.alert(
          "Payment Unconfirmed",
          result?.message || "No completed charge was found on the payment gateway. This transaction has been marked as failed."
        );
      } else {
        Alert.alert(
          "Verification Pending", 
          result?.message || "We couldn't verify the payment status yet. If you have completed the payment, please wait a moment and try again."
        );
      }
    } catch (err) {
      console.error("[TransactionDetail] Resolve error:", err);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("charge not found")) {
        setTransactionData(prev => ({ ...prev, status: "FAILED", paymentStatus: "FAILED" }));
        Alert.alert("Payment Unconfirmed", "No charge record was found on the payment gateway. This transaction has been marked as unconfirmed.");
      } else {
        Alert.alert("Verification Notice", msg || "An error occurred while verifying status. Please try again.");
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleCopyReference = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
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
          await saveRefAsImage(uri, `Receipt-${transactionData.transactionId}.png`);
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

      // Web support for PDF receipts
      if (Platform.OS === "web") {
        // 1. Try backend receipt first if it's a booking
        if (transactionData.category === "BOOKING" && transactionData.bookingId) {
          try {
            const result = await bookingService.fetchReceipt(transactionData.bookingId);
            if (result.success && result.url) {
              await downloadFile(result.url, `Receipt-${transactionData.transactionId}.pdf`, "application/pdf");
              setConfirmationMessage("Receipt PDF downloaded successfully.");
              setConfirmationVisible(true);
              return;
            }
          } catch (e) {
            console.warn("[Web PDF] Backend receipt fetch failed:", e);
          }
        }
        
        // 2. Fallback: Use browser print for other transactions or if backend fails
        window.print();
        return;
      }

      const userData = await authService.getUserData();
      const userName = userData?.fullName || "Account Holder";
      const userEmail = userData?.email || "";

      // Load Logo
      let logoSrc = "";
      try {
        const asset = Asset.fromModule(logoImage);
        await asset.downloadAsync();
        const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
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
                <span class="status-badge status-${transactionData.bookingStatus?.toLowerCase() === 'cancelled' ? 'cancelled' : transactionData.status.toLowerCase()}">
                  ${getStatusMessage(transactionData.transactionType, transactionData.status)}
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
            ${
              currentBreakdown ? `
              <tr>
                <td colspan="2" style="background-color: #f8f9ff; font-weight: 700; font-size: 11px; color: #010135; padding: 12px 15px; text-transform: uppercase; border-top: 2px solid #eee;">
                  ${currentBreakdown.isSecurityDeposit ? "Caution Fee Breakdown" : currentBreakdown.isGuestSide ? "Payment Breakdown" : "Earnings Breakdown"}
                </td>
              </tr>
              ${currentBreakdown.isSecurityDeposit ? (
                currentBreakdown.isHostClaim ? `
                  <tr><td class="label">Approved Damage Claim</td><td class="value">₦${Number(currentBreakdown.approvedClaim || 0).toLocaleString()}</td></tr>
                  ${currentBreakdown.hostFee > 0 ? `<tr><td class="label">LUNEST Processing Fee</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.hostFee).toLocaleString()}</td></tr>` : ''}
                  ${currentBreakdown.hostVat > 0 ? `<tr><td class="label">VAT on Fee</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.hostVat).toLocaleString()}</td></tr>` : ''}
                  <tr class="amount-row">
                    <td class="label" style="font-size: 14px; color: #010135;">Net Credited to Wallet</td>
                    <td class="value amount" style="color: #2E7D32">₦${Number(currentBreakdown.netPayout || 0).toLocaleString()}</td>
                  </tr>
                ` : `
                  <tr><td class="label">Caution Fee Deposited</td><td class="value">₦${Number(currentBreakdown.originalDeposit || 0).toLocaleString()}</td></tr>
                  ${currentBreakdown.damageClaim > 0 ? `<tr><td class="label">Damage Claim (Host)</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.damageClaim).toLocaleString()}</td></tr>` : ''}
                  ${currentBreakdown.damageClaim > 0 && currentBreakdown.remainingDeposit > 0 && currentBreakdown.remainingDeposit !== currentBreakdown.originalDeposit ? `<tr><td class="label" style="color: #666">Remaining Deposit</td><td class="value" style="color: #666">₦${Number(currentBreakdown.remainingDeposit).toLocaleString()}</td></tr>` : ''}
                  ${currentBreakdown.escrowFee > 0 ? `<tr><td class="label">LUNEST App Fee (5%)</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.escrowFee).toLocaleString()}</td></tr>` : ''}
                  ${currentBreakdown.escrowVat > 0 ? `<tr><td class="label">VAT on App Fee (7.5%)</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.escrowVat).toLocaleString()}</td></tr>` : ''}
                  <tr class="amount-row">
                    <td class="label" style="font-size: 14px; color: #010135;">${currentBreakdown.damageClaim > 0 && currentBreakdown.netRefund === 0 ? 'Refund Amount' : 'Net Refund to Wallet'}</td>
                    <td class="value amount" style="color: ${currentBreakdown.netRefund > 0 ? '#2E7D32' : '#B70808'}">₦${Number(currentBreakdown.netRefund || 0).toLocaleString()}</td>
                  </tr>
                `
              ) : currentBreakdown.isGuestSide ? `
                ${currentBreakdown.rent ? `<tr><td class="label">Property Rent</td><td class="value">₦${Number(currentBreakdown.rent).toLocaleString()}</td></tr>` : ''}
                ${currentBreakdown.serviceCharge ? `<tr><td class="label">Service Charge</td><td class="value">₦${Number(currentBreakdown.serviceCharge).toLocaleString()}</td></tr>` : ''}
                ${currentBreakdown.guestFee ? `<tr><td class="label">LUNEST Service Fee</td><td class="value">₦${Number(currentBreakdown.guestFee).toLocaleString()}</td></tr>` : ''}
                ${(currentBreakdown.guestVat || currentBreakdown.vat) ? `<tr><td class="label">VAT on Fee</td><td class="value">₦${Number(currentBreakdown.guestVat || currentBreakdown.vat).toLocaleString()}</td></tr>` : ''}
                ${currentBreakdown.cautionFee ? `<tr><td class="label">Caution Fee (Refundable)</td><td class="value">₦${Number(currentBreakdown.cautionFee).toLocaleString()}</td></tr>` : ''}
                <tr class="amount-row">
                  <td class="label" style="font-size: 14px; color: #010135;">Total Paid</td>
                  <td class="value amount">₦${Number(currentBreakdown.total || currentBreakdown.amount).toLocaleString()}</td>
                </tr>
              ` : `
                ${(currentBreakdown.rent !== undefined && currentBreakdown.rent !== null) ? `<tr><td class="label">Property Rent</td><td class="value">₦${Number(currentBreakdown.rent).toLocaleString()}</td></tr>` : ''}
                ${(currentBreakdown.serviceCharge !== undefined && currentBreakdown.serviceCharge !== null) ? `<tr><td class="label">Service Charge</td><td class="value">₦${Number(currentBreakdown.serviceCharge).toLocaleString()}</td></tr>` : ''}
                ${(currentBreakdown.appFee || currentBreakdown.hostFee) ? `<tr><td class="label">Host App Fee</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.appFee || currentBreakdown.hostFee).toLocaleString()}</td></tr>` : ''}
                ${(currentBreakdown.hostVat || currentBreakdown.vat) ? `<tr><td class="label">VAT</td><td class="value" style="color: #B70808">-₦${Number(currentBreakdown.hostVat || currentBreakdown.vat).toLocaleString()}</td></tr>` : ''}
                ${(currentBreakdown.netEarning !== undefined && currentBreakdown.netEarning !== null) ? `<tr><td class="label">Net Rent Earning</td><td class="value">₦${Number(currentBreakdown.netEarning).toLocaleString()}</td></tr>` : ''}
                ${currentBreakdown.cautionFee ? `<tr><td class="label">Caution Fee (Escrow)</td><td class="value">₦${Number(currentBreakdown.cautionFee).toLocaleString()}</td></tr>` : ''}
                <tr class="amount-row">
                  <td class="label" style="font-size: 14px; color: #010135;">Total Earning</td>
                  <td class="value amount">₦${Number(currentBreakdown.total).toLocaleString()}</td>
                </tr>
              `}
              ` : `
              <tr class="amount-row">
                <td class="label" style="font-size: 14px; color: #010135;">Amount</td>
                <td class="value amount">${transactionData.amount}</td>
              </tr>
              `
            }
            ${
              transactionData.couponCode
                ? `<tr><td class="label">Coupon Applied (${transactionData.couponCode})</td><td class="value" style="color: #2E7D32">-₦${Number(transactionData.couponDiscount).toLocaleString()}</td></tr>`
                : ""
            }
          </table>
          
          <div class="footer">
            <p>Thank you for choosing LUNEST.</p>
            <p>This is a system-generated receipt. For any inquiries, please contact LUNEST Support.</p>
            <p>&copy; ${new Date().getFullYear()} LUNEST Technologies.</p>
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
      case "failed":
      case "cancelled":
        return "#EF4444";
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
      case "failed":
      case "cancelled":
        return "rgba(239, 68, 68, 0.1)";
      default:
        return "rgba(49, 235, 61, 0.3)";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ChevronLeft size={24} color="#000" strokeWidth={2} />
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
        {/* Receipt Card Wrapped in ViewShot (Native) or View (Web) for Capture */}
        <Wrapper
          ref={viewShotRef}
          {...wrapperProps}
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <View style={styles.receiptCard}>
            {/* Status Row */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Transaction Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBgColor(transactionData.bookingStatus?.toLowerCase() === 'cancelled' && transactionData.category !== "CANCELLATION_PENALTY" ? 'cancelled' : transactionData.status) },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(transactionData.bookingStatus?.toLowerCase() === 'cancelled' && transactionData.category !== "CANCELLATION_PENALTY" ? 'cancelled' : transactionData.status) },
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
                  const bs = transactionData.bookingStatus?.toLowerCase();
                  
                  if (transactionData.category === "CANCELLATION_PENALTY") {
                    if (s === "failed" || s === "cancelled") {
                      return <Ionicons name="close-circle" size={60} color="#EF4444" />;
                    } else if (s === "pending" || s === "reserved") {
                      return <Ionicons name="time" size={60} color="#F59E0B" />;
                    } else {
                      return <Ionicons name="alert-circle" size={60} color="#B70808" />;
                    }
                  }

                  if (bs === "cancelled") {
                    return <Ionicons name="close-circle" size={60} color="#EF4444" />;
                  }
                  
                  if (s === "failed" || s === "cancelled") {
                    return (
                      <Ionicons name="close-circle" size={60} color="#EF4444" />
                    );
                  } else if (s === "pending" || s === "reserved") {
                    return <Ionicons name="time" size={60} color="#F59E0B" />;
                  } else if (s === "on_hold" || s === "on hold" || s === "processing") {
                    return <Ionicons name="lock-closed" size={60} color="#192DFF" />;
                  } else if (s === "disputed") {
                    return <Ionicons name="alert-circle" size={60} color="#DC2626" />;
                  } else {
                    return (
                      <Ionicons name="checkmark-circle" size={60} color="#2E7D32" />
                    );
                  }
                })()}
              </View>
              <Text style={styles.successTitle}>
                {(() => {
                  const s = transactionData.status?.toLowerCase() || "";
                  const bs = transactionData.bookingStatus?.toLowerCase() || "";
                  if (bs === 'cancelled' && transactionData.category !== "CANCELLATION_PENALTY") return 'Booking Cancelled';
                  if (transactionData.category === "CANCELLATION_PENALTY") return s === 'failed' || s === 'cancelled' ? 'Penalty Failed' : 'Penalty Applied';
                  if (s === 'failed' || s === 'cancelled') return 'Transaction Failed';
                  if (s === 'pending' || s === 'reserved') return transactionData.category === "BOOKING" ? 'Booking Pending' : 'Payment Pending';
                  if (s === 'processing') return 'Payment Processing';
                  if (s === 'on_hold' || s === 'on hold') return 'Funds in Escrow';
                  if (s === 'disputed') return 'Transaction Disputed';
                  return transactionData.category === "BOOKING" ? "Stay Secured!" : "Transaction Successful";
                })()}
              </Text>
              <Text style={styles.successSubtitle}>
                {(() => {
                  const s = transactionData.status?.toLowerCase() || "";
                  const bs = transactionData.bookingStatus?.toLowerCase() || "";
                  if (bs === 'cancelled' && transactionData.category !== "CANCELLATION_PENALTY") {
                    return `Booking #${transactionData.transactionId} has been cancelled.`;
                  }
                  if (transactionData.category === "CANCELLATION_PENALTY") {
                    return `A cancellation penalty has been applied to booking ${bookingRef ? `#${bookingRef}` : ""}.`;
                  }
                  if (s === 'failed' || s === 'cancelled') {
                    return `Your ${transactionData.transactionType} could not be processed.`;
                  }
                  if (s === 'pending' || s === 'reserved') {
                    return transactionData.category === "BOOKING"
                      ? `Your booking at ${transactionData.propertyName} is awaiting payment confirmation.`
                      : `Your ${transactionData.transactionType} is awaiting payment confirmation.`;
                  }
                  if (s === 'processing') {
                    return `Your transaction is currently being processed.`;
                  }
                  if (s === 'on_hold' || s === 'on hold') {
                    return `Funds are securely held in escrow until stay completion.`;
                  }
                  if (s === 'disputed') {
                    return `This transaction is flagged for resolution.`;
                  }
                  return transactionData.category === "BOOKING" 
                    ? `Your stay at ${transactionData.propertyName} is confirmed.` 
                    : (currentBreakdown && !currentBreakdown.isGuestSide ? "" : `Your ${transactionData.transactionType} has been processed.`);
                })()}
              </Text>
            </View>
              <Text style={[styles.successMessage, { color: getStatusColor(transactionData.bookingStatus?.toLowerCase() === 'cancelled' && transactionData.category !== "CANCELLATION_PENALTY" ? 'cancelled' : transactionData.status) }]}>
                {(() => {
                  const type = transactionData.transactionType?.toLowerCase();
                  const s = transactionData.status?.toLowerCase();
                  const bs = transactionData.bookingStatus?.toLowerCase();

                  if (transactionData.category === "CANCELLATION_PENALTY") {
                    if (s === "failed" || s === "cancelled") {
                      return "The cancellation penalty transaction failed.";
                    } else if (s === "pending" || s === "reserved") {
                      return "The cancellation penalty is pending.";
                    } else {
                      return "This cancellation penalty has been deducted from your wallet balance.";
                    }
                  }

                  if (bs === "cancelled") {
                    return "This booking was cancelled and the transaction has been updated accordingly.";
                  }

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
                  } else if (s === "on_hold" || s === "on hold" || s === "processing") {
                    return "Funds are securely held in escrow and will be released following checkout reconciliation.";
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

            {/* Transaction Details */}
            <View style={styles.detailsSection}>
              {/* Transaction ID */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue}>
                  {transactionData.transactionId}
                </Text>
              </View>

              {/* Booking Reference (Extracted from metadata) */}
              {(() => {
                try {
                  const metadata = typeof params.metadata === 'string' ? JSON.parse(params.metadata) : (params.metadata || {});
                  const bRef = metadata.bookingReference || metadata.bookingRef;
                  if (bRef) {
                    return (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking Reference:</Text>
                        <Text style={[styles.detailValue, { fontWeight: '700' }]}>#{bRef}</Text>
                      </View>
                    );
                  }
                } catch (e) {}
                return null;
              })()}

              {/* Payment Reference */}
              {transactionData.reference ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction Ref:</Text>
                  <View style={styles.referenceContainer}>
                    <Text style={[styles.detailValue, styles.referenceText]} numberOfLines={1}>
                      {transactionData.reference}
                    </Text>
                    {isCopied && (
                      <Text style={{ fontSize: 10, color: '#2E7D32', fontWeight: '600', marginRight: 4 }}>Copied!</Text>
                    )}
                    <Pressable
                      onPress={() => handleCopyReference(transactionData.reference)}
                      style={[styles.copyButton, isCopied && { backgroundColor: '#E8F5E9' }]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name={isCopied ? "checkmark-outline" : "copy-outline"} 
                        size={14} 
                        color={isCopied ? "#2E7D32" : "#192DFF"} 
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}

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

              {/* Breakdown Section */}
              {currentBreakdown && (
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownTitle}>
                    {currentBreakdown.isSecurityDeposit 
                      ? (currentBreakdown.isHostClaim ? "Caution Fee Claim Breakdown" : "Caution Fee Breakdown")
                      : currentBreakdown.isGuestSide 
                        ? "Payment Breakdown" 
                        : "Earnings Breakdown"}
                  </Text>
                  
                  {currentBreakdown.isSecurityDeposit ? (
                    currentBreakdown.isHostClaim ? (
                      <>
                        {/* Approved Damage Claim */}
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Approved Damage Claim</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.approvedClaim || 0).toLocaleString()}</Text>
                        </View>

                        {/* Processing Fee */}
                        {currentBreakdown.hostFee > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>LUNEST Processing Fee</Text>
                            <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.hostFee).toLocaleString()}</Text>
                          </View>
                        )}

                        {/* VAT on Fee */}
                        {currentBreakdown.hostVat > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>VAT on Fee</Text>
                            <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.hostVat).toLocaleString()}</Text>
                          </View>
                        )}

                        <View style={styles.breakdownDivider} />

                        {/* Net Credited to Wallet */}
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabelBold}>Net Credited to Wallet</Text>
                          <Text style={[styles.breakdownValueBold, { color: '#2E7D32' }]}>
                            ₦{Number(currentBreakdown.netPayout || 0).toLocaleString()}
                          </Text>
                        </View>

                        {/* Note */}
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 8, fontStyle: 'italic' }}>
                          Damage claim approved and credited to host wallet.
                        </Text>
                      </>
                    ) : (
                      <>
                        {/* Original Caution Deposit */}
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Caution Fee Deposited</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.originalDeposit || 0).toLocaleString()}</Text>
                        </View>

                        {/* Damage Claim - only show if > 0 */}
                        {currentBreakdown.damageClaim > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Damage Claim (Host)</Text>
                            <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.damageClaim).toLocaleString()}</Text>
                          </View>
                        )}

                        {/* Remaining after claim (only for SPLIT) */}
                        {currentBreakdown.damageClaim > 0 && currentBreakdown.remainingDeposit > 0 && currentBreakdown.remainingDeposit !== currentBreakdown.originalDeposit && (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: '#666' }]}>Remaining Deposit</Text>
                            <Text style={[styles.breakdownValue, { color: '#666' }]}>₦{Number(currentBreakdown.remainingDeposit).toLocaleString()}</Text>
                          </View>
                        )}

                        {/* Escrow App Fee (5%) */}
                        {currentBreakdown.escrowFee > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>LUNEST App Fee (5%)</Text>
                            <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.escrowFee).toLocaleString()}</Text>
                          </View>
                        )}

                        {/* VAT on Escrow Fee (7.5%) */}
                        {currentBreakdown.escrowVat > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>VAT on App Fee (7.5%)</Text>
                            <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.escrowVat).toLocaleString()}</Text>
                          </View>
                        )}

                        <View style={styles.breakdownDivider} />

                        {/* Net Refund */}
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabelBold}>
                            {currentBreakdown.damageClaim > 0 && currentBreakdown.netRefund === 0 
                              ? "Refund Amount" 
                              : "Net Refund to Wallet"}
                          </Text>
                          <Text style={[styles.breakdownValueBold, { color: currentBreakdown.netRefund > 0 ? '#2E7D32' : '#B70808' }]}>
                            ₦{Number(currentBreakdown.netRefund || 0).toLocaleString()}
                          </Text>
                        </View>

                        {/* Resolution Status Note */}
                        {currentBreakdown.resolution && (
                          <Text style={{ fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' }}>
                            {currentBreakdown.resolution === 'RELEASED_TO_GUEST' 
                              ? 'No damages reported — deposit refunded to wallet.' 
                              : currentBreakdown.resolution === 'CLAIMED_BY_HOST' 
                                ? 'Full deposit claimed by host for damages.'
                                : (currentBreakdown.resolution === 'SPLIT' || currentBreakdown.resolution === 'PARTIAL_SPLIT')
                                  ? 'Partial claim approved — remaining balance refunded to wallet.'
                                  : ''}
                          </Text>
                        )}

                        {/* Accounting Note */}
                        <Text style={{ fontSize: 10, color: '#777', marginTop: 6, fontStyle: 'italic', lineHeight: 14 }}>
                          * Note: The platform App Fee (5%) and VAT (7.5%) charged during booking covered platform transaction processing. Caution fee release allocates the deposit principal held in escrow.
                        </Text>
                      </>
                    )
                  ) : currentBreakdown.isGuestSide ? (
                    <>
                      {/* Property Rent */}
                      {currentBreakdown.rent > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Property Rent</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.rent || 0).toLocaleString()}</Text>
                        </View>
                      )}

                      {/* Property Service Charge */}
                      {currentBreakdown.serviceCharge > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Property Service Charge</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.serviceCharge || 0).toLocaleString()}</Text>
                        </View>
                      )}

                      {currentBreakdown.guestFee > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>LUNEST Service Fee</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.guestFee).toLocaleString()}</Text>
                        </View>
                      )}
                      {(currentBreakdown.guestVat > 0 || currentBreakdown.vat > 0) && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>VAT on Service Fee</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.guestVat || currentBreakdown.vat || 0).toLocaleString()}</Text>
                        </View>
                      )}
                      {currentBreakdown.cautionFee > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Caution Fee (Refundable)</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.cautionFee).toLocaleString()}</Text>
                        </View>
                      )}
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabelBold}>Total Paid</Text>
                        <Text style={styles.breakdownValueBold}>₦{Number(currentBreakdown.total || currentBreakdown.amount || 0).toLocaleString()}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Property Rent */}
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Property Rent</Text>
                        <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.rent || 0).toLocaleString()}</Text>
                      </View>

                      {/* Property Service Charge */}
                      {currentBreakdown.serviceCharge > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Service Charge</Text>
                          <Text style={styles.breakdownValue}>₦{Number(currentBreakdown.serviceCharge || 0).toLocaleString()}</Text>
                        </View>
                      )}

                      {/* Host App Fee (3%) - Only show if > 0 */}
                      {(currentBreakdown.hostFee > 0) && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Host App Fee</Text>
                          <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.hostFee).toLocaleString()}</Text>
                        </View>
                      )}

                      {/* VAT on App Fee (7.5%) - Only show if > 0 */}
                      {(currentBreakdown.hostVat > 0) && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>VAT</Text>
                          <Text style={[styles.breakdownValue, { color: '#B70808' }]}>-₦{Number(currentBreakdown.hostVat).toLocaleString()}</Text>
                        </View>
                      )}

                      {/* Net Rent Earning (Total Earnings from Rent) */}
                      <View style={[styles.breakdownRow, { marginTop: 4 }]}>
                        <Text style={[styles.breakdownLabel, { fontWeight: '700', color: '#010135' }]}>Net Rent Earning</Text>
                        <Text style={[styles.breakdownValue, { fontWeight: '800', color: '#010135' }]}>₦{Number(currentBreakdown.netEarning || 0).toLocaleString()}</Text>
                      </View>

                      <View style={[styles.breakdownDivider, { marginVertical: 12 }]} />

                      {/* Caution Fee - Standalone Escrow Section */}
                      {currentBreakdown.cautionFee > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { fontWeight: '600' }]}>Caution Fee (Held in Escrow)</Text>
                          <Text style={[styles.breakdownValue, { fontWeight: '600' }]}>₦{Number(currentBreakdown.cautionFee).toLocaleString()}</Text>
                        </View>
                      )}

                      <View style={[styles.breakdownDivider, { marginTop: 12, marginBottom: 8 }]} />
                      
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabelBold}>Total Earning</Text>
                        <Text style={styles.breakdownValueBold}>
                            ₦{Number(currentBreakdown.total || (Number(currentBreakdown.netEarning || 0) + Number(currentBreakdown.cautionFee || 0)) || 0).toLocaleString()}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

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
        </Wrapper>


      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {/* Resolve / Verify Button - For Pending or Processing Transactions */}
        {(["PENDING", "PROCESSING", "RESERVED"].includes(transactionData.status?.toUpperCase())) && (
          <Pressable
            style={[styles.resolveButton, isResolving && { opacity: 0.7 }]}
            onPress={handleResolveStatus}
            disabled={isResolving}
          >
            {isResolving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.resolveButtonText}>
                {transactionData.category === "BOOKING" ? "Verify Booking Status" : "Verify Payment Status"}
              </Text>
            )}
          </Pressable>
        )}

        <View style={styles.buttonRow}>
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
    flexShrink: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E5EFFF",
    textAlign: 'center',
  },
  referenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
    gap: 8,
  },
  referenceText: {
    fontSize: 13,
    color: "#666",
    maxWidth: "80%",
  },
  copyButton: {
    padding: 6,
    backgroundColor: "#F0F4FF",
    borderRadius: 6,
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
  escrowNote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
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
  resolveButton: {
    backgroundColor: "#2E7D32",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  resolveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default TransactionDetailScreen;
