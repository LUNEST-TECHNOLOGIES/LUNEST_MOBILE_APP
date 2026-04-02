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
};

export default kycService;
