/**
 * Payment Service
 * Handles Paystack integration for wallet funding and withdrawals
 */

import apiClient from "./apiClient";

class PaymentService {
  /**
   * Initialize a payment (get Paystack checkout URL)
   * @param {number} amount - Amount in Naira
   * @param {string} email - User's email
   * @param {object} metadata - Optional metadata
   * @returns {Promise<{authorization_url: string, access_code: string, reference: string}>}
   */
  async initializePayment(amountOrParams, emailParam, metadataParam = {}) {
    try {
      let amount, email, metadata;
      if (typeof amountOrParams === "object" && amountOrParams !== null) {
        amount = amountOrParams.amount;
        email = amountOrParams.email;
        metadata = amountOrParams.metadata || amountOrParams;
      } else {
        amount = amountOrParams;
        email = emailParam;
        metadata = metadataParam;
      }

      if (!email) {
        try {
          const { getUserData } = require("./userDataService");
          const user = await getUserData();
          email = user?.emailAddress || user?.email || "";
        } catch (_) {}
      }

      console.log("[PaymentService] Initializing payment:", { amount, email });

      const response = await apiClient.post("/v1/payments/initialize", {
        amount,
        email,
        metadata,
      });

      if (response && (response.success || response.status || response.body || response.data)) {
        const payload = response.body || response.data || response;
        console.log(
          "[PaymentService] Payment initialized successfully:",
          payload?.reference || payload?.authorization_url,
        );
        return payload;
      } else {
        throw new Error(response?.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("[PaymentService] Initialize payment error:", error);
      throw error;
    }
  }

  /**
   * Verify a payment
   * @param {string} reference - Payment reference
   * @returns {Promise<{reference: string, amount: number, status: string}>}
   */
  async verifyPayment(reference) {
    try {
      console.log("[PaymentService] Verifying payment:", reference);

      const response = await apiClient.get(`/v1/payments/verify/${reference}`);

      if (response.success) {
        console.log("[PaymentService] Payment verified:", response.body.status);
        return response.body;
      } else {
        throw new Error(response.message || "Payment verification failed");
      }
    } catch (error) {
      console.error("[PaymentService] Verify payment error:", error);
      throw error;
    }
  }

  /**
   * Get list of banks
   * @returns {Promise<Array<{name: string, code: string}>>}
   */
  async getBanks() {
    try {
      console.log("[PaymentService] Fetching banks");

      const response = await apiClient.get("/v1/payments/banks");

      if (response.success) {
        console.log("[PaymentService] Banks fetched:", response.body.length);
        return response.body;
      } else {
        throw new Error(response.message || "Failed to fetch banks");
      }
    } catch (error) {
      console.error("[PaymentService] Get banks error:", error);
      throw error;
    }
  }

  /**
   * Verify bank account details
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @returns {Promise<{account_number: string, account_name: string}>}
   */
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      console.log("[PaymentService] Verifying bank account:", accountNumber);

      const response = await apiClient.get(
        `/v1/payments/verify-account?account_number=${accountNumber}&bank_code=${bankCode}`,
        { silent: true }
      );

      if (response.success) {
        console.log(
          "[PaymentService] Account verified:",
          response.body.account_name,
        );
        return response.body;
      } else {
        throw new Error(response.message || "Failed to verify account");
      }
    } catch (error) {
      console.error("[PaymentService] Verify account error:", error);
      throw error;
    }
  }

  /**
   * Initialize withdrawal to bank
   * @param {number} amount - Amount in Naira
   * @param {string} bankCode - Bank code
   * @param {string} accountNumber - Bank account number
   * @param {string} accountName - Account holder name
   * @returns {Promise<{reference: string, amount: number, status: string}>}
   */
  async initializeWithdrawal(amount, bankCode, accountNumber, accountName, origin = "mobile") {
    try {
      console.log("[PaymentService] Initializing withdrawal:", {
        amount,
        accountNumber,
        origin
      });

      const response = await apiClient.post("/v1/payments/withdraw", {
        amount,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        origin,
      });

      if (response.success) {
        console.log(
          "[PaymentService] Withdrawal initiated:",
          response.body.reference,
        );
        return response.body;
      } else {
        throw new Error(response.message || "Failed to initiate withdrawal");
      }
    } catch (error) {
      console.error("[PaymentService] Withdrawal error:", error);
      throw error;
    }
  }

  /**
   * Get wallet balance and transactions
   * @returns {Promise<{balance: number, transactions: Array}>}
   */
  async getWalletInfo() {
    try {
      console.log("[PaymentService] Fetching wallet info");

      const response = await apiClient.get("/v1/wallet/balance");

      if (!response) {
        throw new Error("No response from wallet service");
      }

      if (response.success) {
        return response.body;
      } else {
        throw new Error(response.message || "Failed to fetch wallet info");
      }
    } catch (error) {
      console.error("[PaymentService] Get wallet info error:", error);
      throw error;
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;
