import apiClient from "./apiClient";

const referralService = {
  /**
   * Fetch referral stats for the current user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  /**
   * Fetch referral stats for the current user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async fetchReferralStats(userId) {
    try {
      // Fetch points records
      const response = await apiClient.post("/v1/points", { user: userId });
      
      if (response.success || response.data?.status === "SUCCESS") {
        const pointsRecords = response.body || response.data?.data || [];
        
        // Calculate total points
        const totalPoints = pointsRecords.reduce((sum, record) => sum + (record.point || 0), 0);
        
        // Filter referral specific records
        const referralRecords = pointsRecords.filter(r => r.type === "REFERRAL");
        const referredCount = referralRecords.length;

        return {
          success: true,
          totalPoints,
          referredCount,
          records: pointsRecords
        };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to fetch stats" };
    } catch (error) {
      console.error("[ReferralService] fetchReferralStats error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Fetch list of referred users
   * @returns {Promise<Object>}
   */
  async getReferrals() {
    try {
      const response = await apiClient.get("/v1/users/referrals");
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, referrals: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to fetch referrals" };
    } catch (error) {
      console.error("[ReferralService] getReferrals error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Generate referral code on-demand from the backend
   * @returns {Promise<Object>} { success, referralCode, referralLink }
   */
  async generateReferralCode() {
    try {
      const response = await apiClient.post("/v1/users/generate-referral");
      if (response.success || response.data?.status === "SUCCESS") {
        const data = response.body || response.data?.data || {};
        return {
          success: true,
          referralCode: data.referralCode,
          referralLink: data.referralLink,
        };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to generate code" };
    } catch (error) {
      console.error("[ReferralService] generateReferralCode error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Generate a referral link for a user (local fallback)
   * @param {string} referralCode 
   * @returns {string}
   */
  generateReferralLink(referralCode) {
    // Use the backend redirector for cross-platform sharing
    // In dev: http://192.168.0.200:3000/join/CODE
    // In prod: https://lunest.app/join/CODE
    const APP_CONFIG = require("../config/appConfig").default;
    return `${APP_CONFIG.REFERRAL_DOMAIN}/join/${referralCode || ""}`;
  },

  // ─── Points / Loyalty ──────────────────────────────────────

  /**
   * Get points summary for the authenticated user
   */
  async getPointsSummary() {
    try {
      const response = await apiClient.get("/v1/points/summary");
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, data: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to fetch summary" };
    } catch (error) {
      console.error("[ReferralService] getPointsSummary error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get paginated points history
   * @param {number} page
   * @param {number} limit
   */
  async getPointsHistory(page = 1, limit = 20) {
    try {
      const response = await apiClient.get(`/v1/points/history?page=${page}&limit=${limit}`);
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, data: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to fetch history" };
    } catch (error) {
      console.error("[ReferralService] getPointsHistory error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Redeem points for wallet balance
   * @param {number} points
   */
  async redeemPoints(points) {
    try {
      const response = await apiClient.post("/v1/points/redeem", { points });
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, data: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to redeem points" };
    } catch (error) {
      console.error("[ReferralService] redeemPoints error:", error);
      return { success: false, message: error.message };
    }
  },

  // ─── Coupons ───────────────────────────────────────────────

  /**
   * Fetch user's coupons
   */
  async getMyCoupons() {
    try {
      const response = await apiClient.get("/v1/coupons/my-coupons");
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, coupons: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Failed to fetch coupons" };
    } catch (error) {
      console.error("[ReferralService] getMyCoupons error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Validate a coupon code
   * @param {string} code
   */
  async validateCoupon(code) {
    try {
      const response = await apiClient.post("/v1/coupons/validate", { code });
      if (response.success || response.data?.status === "SUCCESS") {
        return { success: true, data: response.body || response.data?.data };
      }
      return { success: false, message: response.message || response.data?.message || "Invalid coupon" };
    } catch (error) {
      console.error("[ReferralService] validateCoupon error:", error);
      return { success: false, message: error.message };
    }
  },
};

export default referralService;
