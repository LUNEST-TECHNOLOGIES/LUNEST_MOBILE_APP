import apiClient from "./apiClient";

const extractErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data || error;

  if (responseData && typeof responseData === "object") {
    return responseData.message || responseData.error || fallbackMessage;
  }

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  return error?.message || fallbackMessage;
};

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
      return response.body || response.data || response;
    } catch (error) {
      console.error("KYC Verification Error:", error.response?.data || error.message);
      throw new Error(extractErrorMessage(error, "An error occurred during verification"));
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
      return response.body || response.data || response;
    } catch (error) {
      console.error("Didit Session Error:", error.response?.data || error.message);
      throw new Error(extractErrorMessage(error, "Failed to initialize Didit verification session"));
    }
  },

  /**
   * Initialize Didit database validation using a direct NIN input
   * @param {string} nin
   * @param {string} [callbackUrl]
   */
  validateDiditDatabase: async (nin, callbackUrl) => {
    try {
      const response = await apiClient.post("/v1/kyc/didit/database-validate", {
        nin,
        callbackUrl,
      });
      return response.body || response.data || response;
    } catch (error) {
      console.error("Didit Database Validation Error:", error.response?.data || error.message);
      throw new Error(extractErrorMessage(error, "Failed to validate ID number with Didit"));
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
      return response.body || response.data || response;
    } catch (error) {
      console.error("Didit Status Error:", error.response?.data || error.message);
      throw new Error(extractErrorMessage(error, "Failed to check Didit verification status"));
    }
  },

  /**
   * Verify NIN via Kora Identity API (second KYC option)
   * @param {string} nin - 11-digit National Identification Number
   */
  koraVerifyNIN: async (nin) => {
    try {
      const response = await apiClient.post("/v1/kyc/kora/verify-nin", { nin });
      return response.body || response.data || response;
    } catch (error) {
      console.error("Kora NIN Verification Error:", error.response?.data || error.message);
      throw new Error(extractErrorMessage(error, "Failed to verify NIN via Kora. Please check your NIN and try again."));
    }
  },
};

export default kycService;
