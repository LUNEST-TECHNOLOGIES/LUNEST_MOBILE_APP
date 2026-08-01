import apiClient from "./apiClient";

const kycService = {
  /**
   * Verify NIN and facial matching
   * @param {string} nin - 11-digit National Identification Number
   * @param {string} selfieBase64 - Base64 encoded selfie image
   */
  verifyNIN: async (nin, selfieBase64) => {
    try {
      const response = await apiClient.post("/v1/kyc/verify-nin", {
        nin,
        selfie: selfieBase64,
      });
      return response.data;
    } catch (error) {
      console.error("KYC Verification Error:", error.response?.data || error.message);
      throw error.response?.data || { message: "An error occurred during verification" };
    }
  },
  /**
   * Initialize Didit KYC Verification Session
   * @param {string} [callbackUrl] - Optional callback link
   */
  createDiditSession: async (callbackUrl) => {
    try {
      const response = await apiClient.post("/v1/kyc/didit/create-session", {
        callbackUrl,
      });
      return response.data;
    } catch (error) {
      console.error("Didit Session Error:", error.response?.data || error.message);
      throw error.response?.data || { message: "Failed to initialize Didit verification session" };
    }
  },

  /**
   * Query Didit Session status
   * @param {string} [sessionId]
   */
  getDiditSessionStatus: async (sessionId) => {
    try {
      const url = sessionId ? `/v1/kyc/didit/session-status/${sessionId}` : "/v1/kyc/didit/session-status";
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Didit Status Error:", error.response?.data || error.message);
      throw error.response?.data || { message: "Failed to check Didit verification status" };
    }
  },
};

export default kycService;
