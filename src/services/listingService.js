/**
 * Listing Service
 * Handles all listing-related API calls
 */

import { Platform } from "react-native";
import axiosInstance from "../lib/axiosInstance";
import apiClient from "./apiClient";
import authService from "./authService";
import configService from "./configService";
import logService from "./logService";
import NetworkErrorHandler from "./networkErrorHandler";
import storageService from "./storageService";
// Listing Status Constants from API Backend
export const LISTING_STATUSES = {
  PENDING: "PENDING",
  AVAILABLE: "AVAILABLE",
  BOOKED: "BOOKED",
  SOLD: "SOLD",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  PAUSED: "PAUSED",
};

// Listing Status Display Names
export const LISTING_STATUS_LABELS = {
  [LISTING_STATUSES.PENDING]: "Pending Review",
  [LISTING_STATUSES.AVAILABLE]: "Available",
  [LISTING_STATUSES.BOOKED]: "Booked",
  [LISTING_STATUSES.SOLD]: "Sold",
  [LISTING_STATUSES.REJECTED]: "Rejected",
  [LISTING_STATUSES.SUSPENDED]: "Suspended",
  [LISTING_STATUSES.PAUSED]: "Paused",
};

// Listing Status Colors for UI
export const LISTING_STATUS_COLORS = {
  [LISTING_STATUSES.PENDING]: "#F59E0B", // amber
  [LISTING_STATUSES.AVAILABLE]: "#10B981", // green
  [LISTING_STATUSES.BOOKED]: "#3B82F6", // blue
  [LISTING_STATUSES.SOLD]: "#6B7280", // gray
  [LISTING_STATUSES.REJECTED]: "#EF4444", // red
  [LISTING_STATUSES.SUSPENDED]: "#F97316", // orange
  [LISTING_STATUSES.PAUSED]: "#FD3131", // red
};

const ARRAY_FIELDS = ["amenities", "landmarks", "photos", "images", "selectedAmenities", "customAmenities"];

const VALID_STATUSES = ["DRAFT", "PENDING", "AVAILABLE", "BOOKED", "SOLD", "REJECTED", "SUSPENDED", "PAUSED", "ACTIVE", "ALL"];

const sanitizeStatus = (status) => {
  if (!status) return "PENDING";
  const upperStatus = String(status).toUpperCase();
  if (VALID_STATUSES.includes(upperStatus)) return upperStatus;
  if (upperStatus === "LIVE") return "AVAILABLE";
  return "PENDING";
};

class ListingService {
  constructor() {
    // baseURL is managed by authService instance
  }

  /**
   * Get all available listing statuses
   * @returns {Object} Available listing statuses and their metadata
   */
  getAvailableStatuses() {
    console.log("[ListingService] Getting available listing statuses");
    return {
      success: true,
      statuses: Object.values(LISTING_STATUSES),
      statusLabels: LISTING_STATUS_LABELS,
      statusColors: LISTING_STATUS_COLORS,
      statusEnum: LISTING_STATUSES,
    };
  }

  /**
   * Get listing status display information
   * @param {string} status - The status value from API
   * @returns {Object} Status display information
   */
  getStatusDisplayInfo(status) {
    if (!status || !LISTING_STATUSES[status.toUpperCase()]) {
      return {
        label: "Unknown Status",
        color: "#6B7280",
        value: status || "unknown",
        isValid: false,
      };
    }

    const normalizedStatus = status.toUpperCase();
    return {
      label: LISTING_STATUS_LABELS[normalizedStatus] || status,
      color: LISTING_STATUS_COLORS[normalizedStatus] || "#6B7280",
      value: normalizedStatus,
      isValid: true,
    };
  }

  /**
   * Check if a status is a valid listing status
   * @param {string} status - Status to validate
   * @returns {boolean} True if status is valid
   */
  isValidStatus(status) {
    return (
      status && Object.values(LISTING_STATUSES).includes(status.toUpperCase())
    );
  }

  /**
   * Get filtered statuses based on user role
   * @param {string} userRole - User role (GUEST, HOST, ADMIN)
   * @returns {Object} Filtered statuses for the user role
   */
  getStatusesForRole(userRole = "GUEST") {
    const allStatuses = this.getAvailableStatuses();

    switch (userRole.toUpperCase()) {
      case "HOST":
        return allStatuses;
      case "ADMIN":
      case "SUPERADMIN":
        return allStatuses;
      case "GUEST":
      default:
        const guestVisibleStatuses = [
          LISTING_STATUSES.AVAILABLE,
          LISTING_STATUSES.BOOKED,
          LISTING_STATUSES.SOLD,
        ];
        return {
          ...allStatuses,
          statuses: guestVisibleStatuses,
        };
    }
  }

  /**
   * Get status transition rules
   * @param {string} currentStatus - Current listing status
   * @param {string} userRole - User role making the transition
   * @returns {Array} Array of allowed next statuses
   */
  getAllowedStatusTransitions(currentStatus, userRole = "HOST") {
    const current = currentStatus && currentStatus.toUpperCase();
    const role = userRole.toUpperCase();

    if (role === "ADMIN" || role === "SUPERADMIN") {
      return Object.values(LISTING_STATUSES).filter(
        (status) => status !== current,
      );
    }

    if (role === "HOST") {
      switch (current) {
        case LISTING_STATUSES.PENDING:
          return [];
        case LISTING_STATUSES.AVAILABLE:
          return [LISTING_STATUSES.BOOKED];
        case LISTING_STATUSES.BOOKED:
          return [LISTING_STATUSES.AVAILABLE];
        case LISTING_STATUSES.SOLD:
          return [LISTING_STATUSES.AVAILABLE];
        case LISTING_STATUSES.REJECTED:
        case LISTING_STATUSES.SUSPENDED:
          return [];
        default:
          return [];
      }
    }

    return [];
  }

  /**
   * Fetch listings with pagination support (React Query friendly)
   * @param {Object} params - { page, limit, refresh, ...filters }
   * @returns {Promise<Array>} List of listings
   */
  async fetchPaginatedListings({ page = 1, limit = 10, refresh = false, ...filters } = {}) {
    console.log(`[ListingService] Fetching paginated listings (Page: ${page}, Limit: ${limit}, Refresh: ${refresh})`);
    try {
      const response = await axiosInstance.get("/v1/listings/paginated", {
        params: {
          ...filters,
          page,
          limit,
          refresh: refresh ? 'true' : 'false'
        }
      });

      // Backend returns PaginatedResponse structure: { listings: [], pagination: {}, filters: {} }
      if (response.data && response.data.success) {
        return response.data.body || { listings: [], pagination: {} };
      }
      return { listings: [], pagination: {} };
    } catch (error) {
      console.error("[ListingService] Error in fetchPaginatedListings:", error);
      throw error; // Let React Query handle the error
    }
  }

  /**
   * Search listings with advanced filters and smart query parsing
   * @param {Object} payload - { query, city, state, minPrice, maxPrice, category, amenities, page, limit }
   * @returns {Promise<Object>} Search results
   */
  async searchListings(payload = {}) {
    console.log("[ListingService] Searching listings with payload:", payload);
    try {
      // Use the new /search endpoint which handles NLP and advanced filters correctly
      const response = await apiClient.post("/v1/listings/search", payload);
      
      const responseBody = response?.body || response?.data || {};
      const listings = responseBody?.listings || 
                       (Array.isArray(responseBody) ? responseBody : []);

      return {
        success: true,
        listings: Array.isArray(listings) ? listings : [],
        count: Array.isArray(listings) ? listings.length : 0,
        pagination: responseBody?.pagination || {},
        suggestions: responseBody?.suggestions || [],
        suggestionMessage: responseBody?.suggestionMessage || "",
        searchEngine: responseBody?.searchEngine || "mongodb",
      };
    } catch (error) {
      console.error("[ListingService] Error searching listings:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        listings: [],
        message: categorized.userMessage || "Search failed",
        error: categorized.type,
      };
    }
  }

  /**
   * Track the most recently viewed listing so Home/Explore screen can prioritize it
   * @param {Object} listing - The listing object or ID
   */
  setLastViewedListing(listing) {
    if (!listing) return;
    const id = listing.id || listing._id || listing.listingId;
    if (id) {
      this._lastViewedListingId = String(id);
      this._lastViewedListingData = listing;
      console.log("[ListingService] Set last viewed listing:", this._lastViewedListingId);
      // Asynchronously cache to persistent storage for offline/instant access
      this.recordRecentlyViewed(listing).catch(() => {});
    }
  }

  /**
   * Record a recently viewed listing to local storage
   * @param {Object} listing 
   */
  async recordRecentlyViewed(listing) {
    if (!listing) return;
    const id = listing._id || listing.id || listing.listingId;
    if (!id) return;

    try {
      const STORAGE_KEY = "lunest_recently_viewed_listings";
      const existing = (await storageService.getItem(STORAGE_KEY)) || [];
      const filtered = Array.isArray(existing)
        ? existing.filter((item) => {
            const itemId = item?._id || item?.id;
            return itemId && String(itemId) !== String(id);
          })
        : [];

      const rawPrice =
        (typeof listing.propertyPrice === "number" ? listing.propertyPrice : null) ??
        listing.propertyPrice?.price ??
        listing.price ??
        listing.rent ??
        0;

      const recentEntry = {
        _id: String(id),
        id: String(id),
        propertyTitle: listing.propertyTitle || listing.propertyName || listing.title || "Accommodation",
        propertyName: listing.propertyName || listing.propertyTitle || listing.title || "Accommodation",
        propertyPrice: listing.propertyPrice || { price: rawPrice, frequency: listing.pricingPeriod || "per night" },
        price: rawPrice,
        pricingPeriod: listing.pricingPeriod || listing.propertyPrice?.frequency || "night",
        propertyImages: listing.propertyImages || listing.images || (listing.coverImage ? [listing.coverImage] : []),
        coverImage: listing.coverImage || listing.propertyImages?.[0] || null,
        propertyLocation: listing.propertyLocation || { fullAddress: listing.address || listing.location || "" },
        address: listing.address || listing.location || listing.propertyLocation?.fullAddress || "",
        bedrooms: listing.bedrooms ?? listing.bedroom ?? 0,
        bathrooms: listing.bathrooms ?? listing.bathroom ?? 0,
        status: listing.status || "AVAILABLE",
        viewedAt: new Date().toISOString(),
      };

      const updated = [recentEntry, ...filtered].slice(0, 20);
      await storageService.setItem(STORAGE_KEY, updated);
      console.log("[ListingService] Successfully cached recently viewed listing:", id);
    } catch (e) {
      console.warn("[ListingService] Failed to cache recently viewed listing locally:", e?.message);
    }
  }

  getLastViewedListingId() {
    return this._lastViewedListingId || null;
  }

  getLastViewedListingData() {
    return this._lastViewedListingData || null;
  }

  /**
   * Fetch recently viewed listings for the authenticated user
   * @returns {Promise<Object>} Recently viewed listings
   */
  async fetchRecentlyViewed() {
    console.log("[ListingService] Fetching recently viewed listings...");
    const STORAGE_KEY = "lunest_recently_viewed_listings";
    let localRecent = [];
    try {
      localRecent = (await storageService.getItem(STORAGE_KEY)) || [];
      if (!Array.isArray(localRecent)) localRecent = [];
    } catch (e) {
      localRecent = [];
    }

    try {
      const response = await axiosInstance.get("/v1/listings/recently-viewed");
      const serverListings = response.data?.body || response.data?.data || response.data || [];
      const serverArray = Array.isArray(serverListings) ? serverListings : [];

      // Merge server listings with local cache (server listings prioritized, local fills gaps)
      const merged = [...serverArray];
      const seenIds = new Set(serverArray.map((l) => String(l._id || l.id)));

      for (const localItem of localRecent) {
        const localId = String(localItem._id || localItem.id);
        if (localId && !seenIds.has(localId)) {
          merged.push(localItem);
          seenIds.add(localId);
        }
      }

      return {
        success: true,
        listings: merged,
        count: merged.length,
      };
    } catch (error) {
      console.warn("[ListingService] Backend error fetching recently viewed, using local storage cache:", error?.message);
      return {
        success: true,
        listings: localRecent,
        count: localRecent.length,
      };
    }
  }

  /**
   * Fetch listings with status filtering
   * @param {Object} filters - Filtering options including status
   * @returns {Promise<Object>} Filtered listings
   */
  async fetchListingsByStatus(filters = {}) {
    console.log("[ListingService] Fetching listings by status:", filters);
    try {
      const response = await apiClient.post("/v1/listings", filters);

      const listings =
        response && response.body
          ? response.body
          : response && response.data
            ? response.data
            : [];

      console.log(
        "[ListingService] Listings fetched successfully with status filter",
      );
      return {
        success: true,
        listings: listings,
        count: listings.length,
      };
    } catch (error) {
      console.error(
        "[ListingService] Error fetching listings by status:",
        error,
      );
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        listings: [],
        message: categorized.userMessage || "Failed to fetch listings",
        error: categorized.type,
      };
    }
  }

  /**
   * Get listing status statistics for a host
   * @returns {Promise<Object>} Status statistics
   */
  async getMyListingStatusStats() {
    console.log("[ListingService] Getting listing status statistics");
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required",
          error: "NO_TOKEN",
        };
      }

      const result = await this.fetchUserListings();
      if (!result.success) {
        return result;
      }

      const listings = result.listings || [];

      const stats = {};
      Object.values(LISTING_STATUSES).forEach((status) => {
        stats[status] = 0;
      });

      listings.forEach((listing) => {
        const status = listing.status && listing.status.toUpperCase();
        if (status && stats.hasOwnProperty(status)) {
          stats[status]++;
        }
      });

      console.log("[ListingService] Status statistics calculated:", stats);
      return {
        success: true,
        stats: stats,
        total: listings.length,
        statusLabels: LISTING_STATUS_LABELS,
      };
    } catch (error) {
      console.error("[ListingService] Error getting status stats:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to get status statistics",
        error: categorized.type,
      };
    }
  }

  /**
   * Create a new listing
   * @param {Object} listingData - The listing data to submit
   * @returns {Promise<Object>} Response with listing details
   */
  async createListing(listingData) {
    console.log("[ListingService] Creating listing...");
    const userData = await authService.getUserData();
    const hostId = userData?._id || userData?.id;

    const payload = { 
      ...listingData,
      host: hostId || listingData.host,
      status: sanitizeStatus(listingData.status)
    };

    // SANITIZE PAYLOAD - Ensure types match backend expectations
    if (payload.price) payload.price = Number(payload.price) || 0;
    if (payload.bedrooms) payload.bedrooms = Number(payload.bedrooms) || 0;
    if (payload.bathrooms) payload.bathrooms = Number(payload.bathrooms) || 0;
    if (payload.guests) payload.guests = Number(payload.guests) || 0;
    if (payload.guestCapacity) payload.guestCapacity = Number(payload.guestCapacity) || 0;

    ARRAY_FIELDS.forEach(field => {
      if (payload[field] && typeof payload[field] === "string") {
        try {
          payload[field] = JSON.parse(payload[field]);
        } catch (e) {
          if (payload[field]?.includes && payload[field].includes(",")) {
            payload[field] = payload[field].split(",").map(s => String(s).trim());
          }
        }
      }
    });

    if (Array.isArray(payload.houseRules)) {
      payload.houseRules = payload.houseRules.join("\n");
    }

    try {
      console.log("[ListingService] Sending listing data to API via axiosInstance...");
      const response = await axiosInstance.post("/v1/listings/create", payload);

      console.log("[ListingService] Listing created successfully");
      return {
        success: true,
        message: "Listing created successfully",
        listing: response.data?.listing || response.data?.body || response.data
      };
    } catch (error) {
      console.error("[ListingService] Error creating listing:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);

      return {
        success: false,
        message: error.response?.data?.message || categorized.userMessage || "Failed to create listing",
        error: categorized.type,
        details: error.message
      };
    }
  }

  /**
   * Fetch all listings for the current host user only
   * Uses the protected /my-listings endpoint that filters by host ID
   * @returns {Promise<Array>} Array of host's listings only
   */
  async fetchUserListings() {
    console.log("[ListingService] Fetching user listings (host only)...");
    logService.logInfo("Fetching host listings");
    try {
      // axiosInstance handles token injection automatically via interceptors
      const response = await axiosInstance.post("/v1/listings/my-listings", {});

      const listings = response.data?.body || response.data?.data || [];

      console.log(
        `✅ [ListingService] Fetched ${listings.length} host listings`,
      );

      return {
        success: true,
        listings: listings,
      };
    } catch (error) {
      console.error("[ListingService] Error fetching user listings:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      
      logService.logError("Failed to fetch host listings", {
        message: error.message,
        status: error.response?.status,
        categorized: categorized.type
      });

      return {
        success: false,
        listings: [],
        message: error.response?.data?.message || categorized.userMessage || "Failed to fetch listings",
        error: categorized.type,
      };
    }
  }

  /**
   * Fetch all public listings (for guest browsing)
   * @returns {Promise<Array>} Array of all public listings
   */
  async fetchAllListings(filters = {}) {
    console.log("[ListingService] Fetching all public listings...");
    try {
      const response = await apiClient.post("/v1/listings", filters);

      console.log("[ListingService] All listings fetched successfully");
      return {
        success: true,
        listings:
          response && response.body
            ? response.body
            : response && response.data
              ? response.data
              : [],
      };
    } catch (error) {
      console.error("[ListingService] Error fetching listings:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        listings: [],
        message: categorized.userMessage || "Failed to fetch listings",
        error: categorized.type,
      };
    }
  }

  /**
   * Fetch a single listing by ID
   * @param {string} listingId - The listing ID
   * @returns {Promise<Object>} Listing details
   */
  async fetchListingById(listingId) {
    if (!listingId) {
      console.error("[ListingService] fetchListingById: No listingId provided");
      return { success: false, message: "Listing ID is required" };
    }

    console.log("[ListingService] Fetching listing details for ID:", listingId);
    try {
      // Use axiosInstance for automatic token handling and base URL
      const response = await axiosInstance.get(`/v1/listings/${listingId}`);
      
      // The backend returns the listing in body or data field depending on the endpoint
      const listing = response.data?.body || response.data?.data || response.data;

      if (!listing) {
        console.error("[ListingService] No listing found for ID:", listingId);
        return {
          success: false,
          listing: null,
          message: "Listing not found",
        };
      }

      console.log(
        "[ListingService] Successfully fetched listing:",
        listing._id || listing.id,
      );
      return {
        success: true,
        listing: listing,
      };
    } catch (error) {
      console.error("[ListingService] Error fetching listing by ID:", {
        id: listingId,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      const categorized = NetworkErrorHandler.categorizeError(error);
      let errorMessage = error.response?.data?.message || categorized.userMessage || "Failed to fetch listing";

      return {
        success: false,
        listing: null,
        message: errorMessage,
        error: categorized.type,
      };
    }
  }

  /**
   * Update an existing listing
   * @param {string} listingId - The listing ID
   * @param {Object} updateData - Updated listing data
   * @returns {Promise<Object>} Updated listing
   */
  async updateListing(listingId, updateData) {
    if (!listingId) {
      console.error("[ListingService] updateListing: No listingId provided");
      return { success: false, message: "Listing ID is required" };
    }

    console.log(`[ListingService] Updating listing: ${listingId}`);
    try {
      const payload = { ...updateData };
      
      // Standardize status for backend enum
      if (payload.status) {
        payload.status = sanitizeStatus(payload.status);
      }

      // DIAGNOSTIC LOGGING
      console.log("[ListingService] Update Payload (Sanitized):", {
        ...payload,
        propertyImages: `[${payload.propertyImages?.length || 0} images]`,
        propertyVideos: `[${payload.propertyVideos?.length || 0} videos]`
      });

      const endpoint = `/v1/listings/update/${listingId}`;
      console.log(`[ListingService] PATCH Request (via apiClient): ${endpoint}`);

      // Use apiClient for consistency with convertToDraft and other methods
      const response = await apiClient.patch(endpoint, payload);

      console.log("[ListingService] Listing updated successfully");
      return {
        success: true,
        message: "Listing updated successfully",
        listing: response.body || response.data || response
      };
    } catch (error) {
      console.error("[ListingService] Error updating listing:", {
        id: listingId,
        status: error.status || error.response?.status,
        message: error.message || error.response?.message,
        data: error.response
      });

      const categorized = NetworkErrorHandler.categorizeError(error);
      let userMessage = error.response?.data?.message || categorized.userMessage || "Failed to update listing";
      
      if (error.response?.status === 404) {
        userMessage = "Listing not found. It may have been deleted or the ID is incorrect.";
        console.warn(`[ListingService] 404 Detected for ID: ${listingId}. Verify if this is a DRAFT that should be CREATED instead.`);
      }

      return {
        success: false,
        message: userMessage,
        error: categorized.type,
        details: error.response?.data || error.message
      };
    }
  }

  /**
   * Convert an approved/live listing to draft for editing
   * This pauses the listing and sets it to DRAFT status so host can edit it
   * After editing, the listing will need re-approval
   * @param {string} listingId - The listing ID
   * @returns {Promise<Object>} Result with updated listing
   */
  async convertToDraft(listingId) {
    console.log("[ListingService] Converting listing to draft:", listingId);
    try {
      const token = await authService.getToken();
      console.log("[ListingService] Token available:", !!token);

      if (!token) {
        return {
          success: false,
          message: "Authentication required. Please log in again.",
        };
      }

      // Update the listing status to DRAFT
      // apiClient will automatically add the auth token via buildHeaders
      const response = await apiClient.patch(
        "/v1/listings/update/" + listingId,
        { status: "DRAFT" },
      );

      console.log("[ListingService] Listing converted to draft successfully");
      console.log("[ListingService] Response:", response);

      return {
        success: true,
        message: "Listing converted to draft for editing",
        listing:
          response && response.body ? response.body : response && response.data,
      };
    } catch (error) {
      console.error(
        "[ListingService] Error converting listing to draft:",
        error,
      );
      console.error("[ListingService] Error status:", error.status);
      console.error("[ListingService] Error response:", error.response);

      // Provide more specific error messages
      let userMessage = "Failed to convert listing to draft";
      if (error.status === 403) {
        userMessage = "Permission denied. You can only edit your own listings.";
      } else if (error.status === 401) {
        userMessage = "Session expired. Please log in again.";
      } else if (error.status === 404) {
        userMessage = "Listing not found.";
      }

      return {
        success: false,
        message: userMessage,
        error: error.status || "unknown",
      };
    }
  }

  /**
   * Delete a listing
   * @param {string} listingId - The listing ID
   * @returns {Promise<Object>} Response
   */
  async deleteListing(listingId) {
    console.log("[ListingService] Deleting listing:", listingId);
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required",
        };
      }

      const response = await apiClient.delete(
        "/v1/listings/delete/" + listingId,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        },
      );

      // Check the backend response success field
      if (response && response.success === false) {
        return {
          success: false,
          message: response.message || "Failed to delete listing",
        };
      }

      console.log("[ListingService] Listing deleted successfully");
      return {
        success: true,
        message: response?.message || "Listing deleted successfully",
      };
    } catch (error) {
      console.error("[ListingService] Error deleting listing:", error);
      return {
        success: false,
        message:
          error?.response?.message ||
          error?.message ||
          "Failed to delete listing",
      };
    }
  }

  /**
   * Toggle listing availability (pause/unpause)
   * Pausing sets status to PAUSED, unpausing restores to AVAILABLE
   * @param {string} listingId - The listing ID
   * @param {boolean} pause - true to pause, false to unpause
   * @returns {Promise<Object>} Result with updated listing
   */
  async toggleListingAvailability(listingId, pause) {
    console.log(
      `[ListingService] ${pause ? "Pausing" : "Unpausing"} listing:`,
      listingId,
    );
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, message: "Authentication required" };
      }

      const newStatus = pause ? "PAUSED" : "AVAILABLE";
      const response = await apiClient.patch(
        "/v1/listings/update/" + listingId,
        { status: newStatus },
      );

      console.log(
        `[ListingService] Listing ${pause ? "paused" : "unpaused"} successfully`,
      );
      return {
        success: true,
        message: `Listing ${pause ? "paused" : "resumed"} successfully`,
        listing: response?.body || response?.data,
      };
    } catch (error) {
      console.error(
        `[ListingService] Error ${pause ? "pausing" : "unpausing"} listing:`,
        error,
      );

      let userMessage = `Failed to ${pause ? "pause" : "resume"} listing`;
      if (error.status === 403) {
        userMessage =
          "Permission denied. You can only update your own listings.";
      } else if (error.status === 401) {
        userMessage = "Session expired. Please log in again.";
      } else if (error.status === 404) {
        userMessage = "Listing not found.";
      }

      return { success: false, message: userMessage };
    }
  }

  /**
  /**
   * Upload an image directly to S3 using a presigned PUT URL (fastest direct method)
   * Flow: get presigned URL from backend (fileCategory: "images") -> PUT directly to S3 -> confirm
   * @param {string} imageUri - Local URI or blob URL of the image
   * @param {function} onProgress - Progress callback (0-100)
   * @returns {Promise<{success, url}>}
   */
  async uploadImageFast(imageUri, onProgress = null) {
    console.log("[ListingService] Fast image upload via direct presigned S3 URL...");

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      // STEP 1: Prepare blob first to accurately determine true MIME type & extension
      let imageBlob;
      let mimeType = "image/jpeg";
      let ext = "jpg";

      if (imageUri && imageUri.startsWith("data:")) {
        const match = imageUri.match(/data:([^;]+);/);
        if (match) {
          mimeType = match[1];
          ext = mimeType.split("/")[1] || "jpg";
        }
        const base64Data = imageUri.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteArr = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteArr[i] = byteCharacters.charCodeAt(i);
        imageBlob = new Blob([byteArr], { type: mimeType });
      } else {
        const resp = await fetch(imageUri);
        imageBlob = await resp.blob();
        if (imageBlob && imageBlob.type) {
          mimeType = imageBlob.type;
          ext = mimeType.split("/")[1] || "jpg";
        } else if (imageUri) {
          const uriLower = imageUri.toLowerCase();
          if (uriLower.includes(".png")) { mimeType = "image/png"; ext = "png"; }
          else if (uriLower.includes(".webp")) { mimeType = "image/webp"; ext = "webp"; }
          else if (uriLower.includes(".heic")) { mimeType = "image/heic"; ext = "heic"; }
        }
      }

      if (ext === "jpeg") ext = "jpg";

      // STEP 2: Request presigned upload URL from backend
      const cleanBase = (await configService.getBaseURL()).replace(/\/$/, "");
      const presignedEndpoint = cleanBase.endsWith("/v1")
        ? `${cleanBase}/listings/presigned-upload-url`
        : `${cleanBase}/v1/listings/presigned-upload-url`;

      const urlRes = await fetch(presignedEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ contentType: mimeType, fileCategory: "images", fileName: `image.${ext}` }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to get upload URL");
      }

      const resJson = await urlRes.json();
      const uploadUrl = resJson.uploadUrl || resJson.body?.uploadUrl || resJson.data?.uploadUrl;
      const publicUrl = resJson.publicUrl || resJson.body?.publicUrl || resJson.data?.publicUrl;
      const s3Key = resJson.s3Key || resJson.body?.s3Key || resJson.data?.s3Key;

      if (!uploadUrl) {
        console.warn("[ListingService] No uploadUrl in presigned response:", resJson);
        throw new Error(resJson.message || "No presigned URL returned from server");
      }

      // STEP 3: PUT directly to S3 with progress tracking via XHR
      const s3Url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", mimeType);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100);
            resolve(publicUrl);
          } else {
            reject(new Error(`S3 PUT failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("S3 PUT network error"));
        xhr.send(imageBlob);
      });

      console.log("✅ [ListingService] Image fast-uploaded to S3:", s3Url);
      return { success: true, url: String(s3Url), s3Key };
    } catch (error) {
      console.warn("[ListingService] Fast image upload notice, falling back to multipart:", error.message);
      // Seamlessly fallback to multipart upload
      const fallbackRes = await this.uploadImages([imageUri], onProgress);
      if (fallbackRes.success && fallbackRes.images && fallbackRes.images.length > 0) {
        const uploadedImg = fallbackRes.images[0];
        const url = typeof uploadedImg === "string" ? uploadedImg : (uploadedImg?.url || uploadedImg?.location || uploadedImg?.storagePath || uploadedImg?.path);
        if (url) {
          return { success: true, url };
        }
      }
      return { success: false, message: fallbackRes.message || error.message };
    }
  }

  /**
   * Upload a video directly to S3 using a presigned PUT URL (fastest method)
   * Flow: get presigned URL from backend → PUT directly to S3 → confirm
   * @param {string} videoUri - Local URI or blob URL of the video
   * @param {function} onProgress - Progress callback (0-100)
   * @returns {Promise<{success, url}>}
   */
  async uploadVideoFast(videoUri, onProgress = null) {
    console.log("[ListingService] Fast video upload via presigned S3 URL...");

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      // STEP 1: Accurately detect video mime type and extension from URI or blob
      const isDataUrl = videoUri && videoUri.startsWith("data:");
      let mimeType = "video/mp4";
      let ext = "mp4";

      let videoBlob = null;
      if (isDataUrl) {
        const match = videoUri.match(/data:([^;]+);/);
        if (match) {
          mimeType = match[1];
          const sub = mimeType.split("/")[1]?.toLowerCase();
          if (sub === "quicktime") ext = "mov";
          else if (sub === "webm") ext = "webm";
          else if (sub === "x-matroska" || sub === "mkv") ext = "mkv";
          else if (sub === "x-msvideo" || sub === "avi") ext = "avi";
          else if (sub === "3gpp") ext = "3gp";
          else ext = sub || "mp4";
        }
        const parts = videoUri.split(",");
        const byteCharacters = atob(parts[1]);
        const byteArr = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteArr[i] = byteCharacters.charCodeAt(i);
        videoBlob = new Blob([byteArr], { type: mimeType });
      } else if (Platform.OS === "web") {
        try {
          const resp = await fetch(videoUri);
          videoBlob = await resp.blob();
          if (videoBlob && videoBlob.type) {
            mimeType = videoBlob.type;
            const sub = mimeType.split("/")[1]?.toLowerCase();
            if (sub === "quicktime") ext = "mov";
            else if (sub === "webm") ext = "webm";
            else if (sub === "x-matroska" || sub === "mkv") ext = "mkv";
            else if (sub === "x-msvideo" || sub === "avi") ext = "avi";
            else if (sub === "3gpp") ext = "3gp";
            else ext = sub || "mp4";
          }
        } catch (fetchErr) {
          console.warn("[ListingService] Could not inspect web video blob:", fetchErr?.message);
        }
      } else if (videoUri) {
        const uriLower = videoUri.toLowerCase();
        if (uriLower.includes(".mov") || uriLower.includes(".qt")) { mimeType = "video/quicktime"; ext = "mov"; }
        else if (uriLower.includes(".webm")) { mimeType = "video/webm"; ext = "webm"; }
        else if (uriLower.includes(".avi")) { mimeType = "video/x-msvideo"; ext = "avi"; }
        else if (uriLower.includes(".mkv")) { mimeType = "video/x-matroska"; ext = "mkv"; }
        else if (uriLower.includes(".3gp")) { mimeType = "video/3gpp"; ext = "3gp"; }
        else if (uriLower.includes(".flv")) { mimeType = "video/x-flv"; ext = "flv"; }
        else if (uriLower.includes(".wmv")) { mimeType = "video/x-ms-wmv"; ext = "wmv"; }
        else if (uriLower.includes(".m4v")) { mimeType = "video/x-m4v"; ext = "m4v"; }
      }

      if (ext.length > 5) ext = "mp4";

      // STEP 2: Request presigned upload URL from backend
      const cleanBase = (await configService.getBaseURL()).replace(/\/$/, "");
      const presignedEndpoint = cleanBase.endsWith("/v1")
        ? `${cleanBase}/listings/presigned-upload-url`
        : `${cleanBase}/v1/listings/presigned-upload-url`;

      const urlRes = await fetch(presignedEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ contentType: mimeType, fileCategory: "videos", fileName: `video.${ext}` }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to get upload URL");
      }

      const resJson = await urlRes.json();
      const uploadUrl = resJson.uploadUrl || resJson.body?.uploadUrl || resJson.data?.uploadUrl;
      const publicUrl = resJson.publicUrl || resJson.body?.publicUrl || resJson.data?.publicUrl;
      const s3Key = resJson.s3Key || resJson.body?.s3Key || resJson.data?.s3Key;

      if (!uploadUrl) {
        console.warn("[ListingService] No uploadUrl in presigned video response:", resJson);
        throw new Error(resJson.message || "No presigned URL returned from server");
      }
      if (onProgress) onProgress(15);

      // STEP 3: On Native, stream directly to S3 via FileSystem.uploadAsync without loading into JS memory
      if (Platform.OS !== "web" && LegacyFileSystem && LegacyFileSystem.uploadAsync) {
        try {
          console.log("[ListingService] Streaming video to S3 via native FileSystem.uploadAsync...");
          if (onProgress) onProgress(35);

          const uploadRes = await LegacyFileSystem.uploadAsync(uploadUrl, videoUri, {
            httpMethod: "PUT",
            headers: {
              "Content-Type": mimeType,
            },
            uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
          });

          if (uploadRes && uploadRes.status >= 200 && uploadRes.status < 300) {
            if (onProgress) onProgress(100);
            console.log("✅ [ListingService] Native video streamed directly to S3:", publicUrl);
            return { success: true, url: String(publicUrl), s3Key };
          }
        } catch (nativeFsErr) {
          console.warn("[ListingService] Native uploadAsync fallback to XHR:", nativeFsErr?.message);
        }
      }

      // STEP 4: Web or XHR fallback
      if (!videoBlob) {
        const resp = await fetch(videoUri);
        videoBlob = await resp.blob();
      }

      const s3Url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", mimeType);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(Math.max(20, pct));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100);
            resolve(publicUrl);
          } else {
            reject(new Error(`S3 PUT failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("S3 PUT network error"));
        xhr.send(videoBlob);
      });

      console.log("✅ [ListingService] Video fast-uploaded to S3:", s3Url);
      return { success: true, url: String(s3Url), s3Key };
    } catch (error) {
      console.warn("[ListingService] Fast video upload notice, falling back to multipart:", error.message);
      const fallbackRes = await this.uploadVideos([videoUri], onProgress);
      if (fallbackRes.success && fallbackRes.videos && fallbackRes.videos.length > 0) {
        const uploadedVid = fallbackRes.videos[0];
        const url = typeof uploadedVid === "string" ? uploadedVid : (uploadedVid?.url || uploadedVid?.location || uploadedVid?.storagePath || uploadedVid?.path);
        if (url) {
          return { success: true, url };
        }
      }
      return { success: false, message: fallbackRes.message || error.message };
    }
  }

   /**
   * Upload photos for a listing
   * @param {Array} imageUris - Array of local image URIs from device
   * @returns {Promise<Object>} Response with image URLs
   */
  async uploadImages(imageUris, onProgress = null) {
    console.log("[ListingService] Uploading images...", imageUris && imageUris.length);

    if (!imageUris || imageUris.length === 0) {
      return { success: true, message: "No images to upload", images: [] };
    }

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required", error: "NO_TOKEN" };

      const formData = new FormData();
      let imageCount = 0;

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        if (!uri) continue;

        if (Platform.OS === "web") {
          try {
            let blob;
            let extension = "jpg";
            let mimeType = "image/jpeg";

            if (uri.startsWith("data:")) {
              const parts = uri.split(",");
              const mimeMatch = parts[0].match(/:(.*?);/);
              if (mimeMatch) {
                mimeType = mimeMatch[1];
                extension = mimeType.split("/")[1] || "jpg";
              }
              const base64Data = parts[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) byteNumbers[j] = byteCharacters.charCodeAt(j);
              blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            } else {
              const response = await fetch(uri);
              blob = await response.blob();
              mimeType = blob.type || "image/jpeg";
              extension = mimeType.split("/")[1] || "jpg";
            }

            if (extension === "jpeg") extension = "jpg";
            formData.append("images", blob, `image_${i}.${extension}`);
            imageCount++;
          } catch (blobError) {
            console.error("[ListingService] Error converting web image:", blobError);
            continue;
          }
        } else {
          let extension = "jpg";
          let mime = "image/jpeg";
          const uriLower = uri.toLowerCase();
          if (uriLower.includes(".png")) { extension = "png"; mime = "image/png"; }
          else if (uriLower.includes(".webp")) { extension = "webp"; mime = "image/webp"; }
          else if (uriLower.includes(".heic")) { extension = "heic"; mime = "image/heic"; }

          formData.append("images", {
            uri: uri,
            type: mime,
            name: `image_${i}.${extension}`,
          });
          imageCount++;
        }
      }

      if (imageCount === 0) {
        return { success: false, message: "No valid images were available to upload", images: [] };
      }

      const cleanBase = (await configService.getBaseURL()).replace(/\/$/, "");
      const uploadUrl = cleanBase.endsWith("/v1") ? `${cleanBase}/listings/upload-images` : `${cleanBase}/v1/listings/upload-images`;

      const apiResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Authorization", "Bearer " + token);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (jsonErr) {
              resolve({});
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during image upload"));
        xhr.send(formData);
      });

      const uploadedImages = apiResponse?.body?.images || apiResponse?.images || [];
      const durableImages = uploadedImages.filter((image) => {
        const url = typeof image === "string" ? image : image?.url || image?.location || image?.storagePath || image?.path;
        return typeof url === "string" && /^https?:\/\//i.test(url) && !/(?:^|\/)(?:blob:|data:|file:|content:)/i.test(url);
      });

      if (durableImages.length === 0) {
        return { success: false, message: "The server did not return a durable image URL", images: [] };
      }

      console.log("[ListingService] Images uploaded successfully:", durableImages.length);
      return { success: true, message: "Images uploaded successfully", images: durableImages };
    } catch (error) {
      console.error("[ListingService] Error uploading images:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to upload images. Please try again.",
        error: categorized.type,
        details: error.message,
      };
    }
  }

  /**
   * Upload videos for a listing
   * @param {Array} videoUris - Array of local video URIs from device
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Response with video URLs
   */
  async uploadVideos(videoUris, onProgress = null) {
    console.log("[ListingService] Uploading videos...", videoUris && videoUris.length);

    if (!videoUris || videoUris.length === 0) {
      return { success: true, message: "No videos to upload", videos: [] };
    }

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required", error: "NO_TOKEN" };

      const formData = new FormData();
      let videoCount = 0;

      for (let i = 0; i < videoUris.length; i++) {
        const uri = videoUris[i];
        if (!uri) continue;

        if (Platform.OS === "web") {
          try {
            let blob;
            if (uri.startsWith("data:")) {
              const parts = uri.split(",");
              const mimeMatch = parts[0].match(/:(.*?);/);
              const mimeType = mimeMatch ? mimeMatch[1] : "video/mp4";
              const base64Data = parts[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) byteNumbers[j] = byteCharacters.charCodeAt(j);
              blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            } else {
              const resp = await fetch(uri);
              blob = await resp.blob();
            }

            formData.append("videos", blob, `video_${i}.mp4`);
            videoCount++;
          } catch (err) {
            console.error("[ListingService] Error preparing web video:", err);
            continue;
          }
        } else {
          const filename = uri.split("/").pop() || `video_${i}.mp4`;
          const extension = filename.split(".").pop() || "mp4";
          formData.append("videos", {
            uri: uri,
            type: "video/mp4",
            name: `video_${i}.${extension}`,
          });
          videoCount++;
        }
      }

      if (videoCount === 0) {
        return { success: false, message: "No valid videos to upload", videos: [] };
      }

      const cleanBase = (await configService.getBaseURL()).replace(/\/$/, "");
      const uploadUrl = cleanBase.endsWith("/v1") ? `${cleanBase}/listings/upload-videos` : `${cleanBase}/v1/listings/upload-videos`;

      const apiResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Authorization", "Bearer " + token);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve({});
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during video upload"));
        xhr.send(formData);
      });

      const uploadedVideos = apiResponse?.body?.videos || apiResponse?.videos || [];
      const durableVideos = uploadedVideos.filter((video) => {
        const url = typeof video === "string" ? video : video?.url || video?.location || video?.storagePath || video?.path;
        return typeof url === "string" && /^https?:\/\//i.test(url) && !/(?:^|\/)(?:blob:|data:|file:|content:)/i.test(url);
      });

      if (durableVideos.length === 0) {
        return { success: false, message: "The server did not return a durable video URL", videos: [] };
      }

      console.log("[ListingService] Videos uploaded successfully:", durableVideos.length);
      return { success: true, message: "Videos uploaded successfully", videos: durableVideos };
    } catch (error) {
      console.error("[ListingService] Error uploading videos:", error);
      return { success: false, message: error.message || "Failed to upload video" };
    }
  }

  /**
   * Upload photos for a listing
   * @param {string} listingId - The listing ID
   * @param {Array} photos - Array of photo URIs
   * @returns {Promise<Object>} Response
   */
  async uploadListingPhotos(listingId, photos) {
    console.log("[ListingService] Uploading photos for listing:", listingId);
    if (!photos || photos.length === 0) return { success: true, photos: [] };

    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();
      const formData = new FormData();

      for (let i = 0; i < photos.length; i++) {
        let uri = photos[i];
        if (typeof uri !== 'string') uri = uri.url || uri.uri;
        if (!uri) continue;

        if (Platform.OS === "web") {
          try {
            let blob;
            if (uri.startsWith("data:")) {
              const parts = uri.split(",");
              const byteCharacters = atob(parts[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) byteNumbers[j] = byteCharacters.charCodeAt(j);
              const byteArray = new Uint8Array(byteNumbers);
              blob = new Blob([byteArray], { type: "image/jpeg" });
            } else {
              const resp = await fetch(uri);
              blob = await resp.blob();
            }
            formData.append("photos", blob, `photo_${i}.jpg`);
          } catch (err) {
            console.error("[ListingService] Web photo prepare error:", err);
            continue;
          }
        } else {
          // Native
          const filename = uri.split("/").pop() || `photo_${i}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append("photos", { uri, name: filename, type });
        }
      }

      const response = await fetch(`${baseURL}/v1/listings/upload-photos/${listingId}`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const data = await response.json();
      
      return {
        success: true,
        photos: data.body?.photos || data.photos || [],
      };
    } catch (error) {
      console.error("[ListingService] Photo upload error:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Save a draft listing to the database
   * @param {Object} draftData - The draft listing data
   * @returns {Promise<Object>} Response with draft details
   */
  async saveDraftToDatabase(draftData) {
    console.log("[ListingService] Preparing to save draft to database...");
    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const userData = await authService.getUserData();
      const hostId = userData?._id || userData?.id;

      // STEP 0: Sanitize ID - Check if we have a temporary/local ID that would cause CastError
      const existingId = draftData._id || draftData.id;
      const isTemporaryId = existingId && (
        String(existingId).startsWith("draft_") || 
        String(existingId).startsWith("edit_") ||
        String(existingId).startsWith("remote_")
      );
      
      if (isTemporaryId) {
        console.log("[ListingService] Detected temporary ID, will use as draftId only:", existingId);
      }

      // SANITIZE PAYLOAD - Ensure types and field names match backend expectations
      // First, remove fields that should not coexist with specific structures
      // CRITICAL: Exclude _id and id here to prevent CastError on backend
      const {
        _id,  // eslint-disable-line no-unused-vars
        id,   // eslint-disable-line no-unused-vars
        photos,
        images: uiImages,
        guestCapacity,
        propertyHighlight,
        pricingPeriod: uiPeriod,
        securityDeposit: uiDeposit,
        cautionFee: uiCaution,
        serviceCharge: uiService,
        legalFee: uiLegal,
        agencyFee: uiAgency,
        ...restOfDraft
      } = draftData;

      const payload = {
        ...restOfDraft,
        host: hostId || draftData.host,
        propertyCategory: draftData.propertyCategory || draftData.category || draftData.propertyType || "rental", // Ensure DB alignment
        propertyType: draftData.propertyType || draftData.propertyCategory || "", // Preserve specific type if available
        draftId: draftData.draftId || (isTemporaryId ? String(existingId) : existingId), // Critical for backend update matching
        isDraft: true,
        status: "DRAFT",
      };

      // EXTRA SAFETY: Explicitly remove any _id or id that might have snuck through
      delete payload._id;
      delete payload.id;
      
      // DEBUG: Log what we're actually sending
      console.log("[ListingService] Payload keys:", Object.keys(payload));
      console.log("[ListingService] Has _id?", '_id' in payload, "Has id?", 'id' in payload);

      // 1. Map Media Fields (Model expects propertyImages/propertyVideos)
      const rawPhotos = photos || uiImages || draftData.propertyImages || draftData.photos || [];
      payload.propertyImages = (Array.isArray(rawPhotos) ? rawPhotos : [rawPhotos])
        .map((p) => (typeof p === "string" ? p : p?.url || p?.uri || ""))
        .filter(Boolean);

      const rawVideos = draftData.propertyVideos || draftData.videos || draftData.video || [];
      const videoList = Array.isArray(rawVideos) ? rawVideos : [rawVideos];
      payload.propertyVideos = videoList
        .map((v) => (typeof v === "string" ? v : v?.url || v?.uri || ""))
        .filter(Boolean);

      // 2. Map Core Property Details
      if (guestCapacity) payload.guests = Number(guestCapacity);
      // Helper to ensure numeric fields are valid numbers (strip commas and symbols)
      const toNum = (val) => {
          if (val === undefined || val === null || val === "") return 0;
          if (typeof val === "number") return isNaN(val) ? 0 : val;
          const cleaned = String(val).replace(/[^0-9.]/g, "");
          const n = Number(cleaned);
          return isNaN(n) ? 0 : n;
      };

      // 3. Map/Align Pricing Structure with full sanitization
      const priceVal = toNum(draftData.price ?? draftData.propertyPrice?.price ?? 0);
      const periodVal = uiPeriod || draftData.pricingPeriod || (draftData.propertyPrice?.frequency ? String(draftData.propertyPrice.frequency).replace(/^per\s+/, "") : "night");
      const cautionVal = toNum(uiCaution ?? uiDeposit ?? draftData.cautionFee ?? draftData.securityDeposit ?? draftData.propertyPrice?.cautionFee ?? 0);
      const serviceVal = toNum(uiService ?? draftData.serviceCharge ?? draftData.propertyPrice?.serviceCharge ?? 0);
      const cleaningVal = toNum(draftData.cleaningFee ?? 0);

      payload.price = priceVal;
      payload.pricingPeriod = periodVal;
      payload.cautionFee = cautionVal;
      payload.securityDeposit = cautionVal;
      payload.serviceCharge = serviceVal;
      payload.cleaningFee = cleaningVal;
      payload.acceptRefund = draftData.acceptRefund !== undefined ? Boolean(draftData.acceptRefund) : true;
      payload.currentStep = toNum(draftData.currentStep) || 1;
      payload.termsAgreed = Boolean(draftData.termsAgreed);
      
      // Ensure propertyPrice object exists for model compatibility
      payload.propertyPrice = {
        price: priceVal,
        cautionFee: cautionVal,
        securityDeposit: cautionVal,
        serviceCharge: serviceVal,
        currency: draftData.currency || "NGN",
        frequency: `per ${periodVal.replace(/^per\s+/, "")}`, // "night" -> "per night"
      };

      payload.bedrooms = toNum(payload.bedrooms);
      payload.bathrooms = toNum(payload.bathrooms);
      payload.guests = toNum(payload.guests || guestCapacity);
      payload.sittingRooms = toNum(draftData.sittingRooms);
      payload.lounges = toNum(draftData.lounges);
      payload.workspaces = toNum(draftData.workspaces);
      if (draftData.selectedAmenities || draftData.amenities) {
        const amList = draftData.selectedAmenities || draftData.amenities;
        payload.amenities = Array.isArray(amList) ? amList : (typeof amList === 'string' ? JSON.parse(amList || '[]') : []);
      }

      if (draftData.rentalPurpose || draftData.purposeOfRent) {
        payload.rentalPurpose = draftData.rentalPurpose || draftData.purposeOfRent;
        payload.purposeOfRent = draftData.rentalPurpose || draftData.purposeOfRent;
      }
      if (draftData.furnishing) payload.furnishing = draftData.furnishing;
      if (draftData.titleType) payload.titleType = draftData.titleType;
      if (draftData.usageType) payload.usageType = draftData.usageType;
      if (draftData.totalSquareFootage) payload.totalSquareFootage = draftData.totalSquareFootage;
      if (draftData.roomSizes) {
        payload.roomSizes = Array.isArray(draftData.roomSizes) 
          ? draftData.roomSizes 
          : (typeof draftData.roomSizes === 'string' ? draftData.roomSizes.split(',').map(s => s.trim()).filter(Boolean) : []);
      }
      if (draftData.checkInTime) payload.checkInTime = draftData.checkInTime;
      if (draftData.checkOutTime) payload.checkOutTime = draftData.checkOutTime;
      if (draftData.additionalRules) payload.additionalRules = draftData.additionalRules;
      if (draftData.regulations || draftData.houseRules) {
        payload.regulations = Array.isArray(draftData.regulations) 
          ? draftData.regulations 
          : (Array.isArray(draftData.houseRules) ? draftData.houseRules : []);
      }

      ARRAY_FIELDS.forEach(field => {
        if (payload[field] && typeof payload[field] === "string") {
          try {
            payload[field] = JSON.parse(payload[field]);
          } catch (e) {
            // If it's a comma-separated string, convert or leave as-is
            if (payload[field]?.includes && payload[field].includes(",")) {
              payload[field] = payload[field].split(",").map(s => String(s).trim());
            }
          }
        }
      });

      // 5. Consolidate Amenities (Selected + Custom)
      const selAmenities = Array.isArray(draftData.selectedAmenities) ? draftData.selectedAmenities : [];
      const custAmenities = Array.isArray(draftData.customAmenities) ? draftData.customAmenities.map(a => typeof a === 'string' ? a : a.label) : [];
      
      // If we have selected/custom amenities but no consolidated 'amenities' array yet
      if ((selAmenities.length > 0 || custAmenities.length > 0) && (!payload.amenities || payload.amenities.length === 0)) {
        payload.amenities = [...new Set([...selAmenities, ...custAmenities])];
      }

      // 6. Explicit Availability & Rules mapping
      if (draftData.checkInTime) payload.checkInTime = draftData.checkInTime;
      if (draftData.checkOutTime) payload.checkOutTime = draftData.checkOutTime;
      if (draftData.additionalRules) payload.additionalRules = draftData.additionalRules;

      // Special case for houseRules - some frontends send as array, backend might expect string
      if (Array.isArray(payload.houseRules)) {
        payload.houseRules = payload.houseRules.join("\n");
      } else if (payload.houseRules && typeof payload.houseRules === "object") {
        payload.houseRules = JSON.stringify(payload.houseRules, null, 2);
      }

      // STEP 9: Decide between PATCH (update existing) or POST (create new)
      // We already determined existingId and isTemporaryId at the start
      let response;
      if (existingId && !isTemporaryId) {
        // Valid MongoDB ObjectId - update existing draft via PATCH
        console.log("[ListingService] Syncing existing draft via PATCH:", existingId);
        try {
          response = await apiClient.patch(
            "/v1/listings/update/" + existingId,
            payload,
            { headers: { Authorization: "Bearer " + token } },
          );
        } catch (patchError) {
          // AUTO-RECOVERY: If the listing is not found (404), it might be a stale draft ID 
          // or was deleted from server. Recover by creating it as new.
          if (patchError.status === 404) {
            console.log("[ListingService] ⚠️ 404 on PATCH (Listing not found). Falling back to POST /create for recovery.");
            response = await apiClient.post(
              "/v1/listings/create",
              payload,
              { headers: { Authorization: "Bearer " + token } },
            );
          } else {
            throw patchError;
          }
        }
      } else {
        // No ID or temporary ID - create new draft via POST
        // _id/id already excluded from payload at destructuring
        console.log("[ListingService] Creating brand new draft via POST");
        
        response = await apiClient.post(
          "/v1/listings/create",
          payload,
          { headers: { Authorization: "Bearer " + token } },
        );
      }

      console.log("[ListingService] Draft synchronization complete.");
      return {
        success: true,
        message: "Draft saved to database",
        draft: response.body || response.data || response,
      };
    } catch (error) {
      console.error("[ListingService] Error saving draft to database:", error);
      
      // Extract specific backend message if available
      let errorMsg = error.response?.message || 
                     (error.response?.errors ? (Array.isArray(error.response.errors) ? error.response.errors.join(", ") : JSON.stringify(error.response.errors)) : null) ||
                     error.message || 
                     "Unknown server error";
      
      // Specifically catch Permission or Validation errors for clear feedback
      if (error.status === 403 || error.status === 401) {
        throw new Error("Authentication/Permission Error: " + errorMsg);
      } else if (error.status === 400 || error.name === "ValidationError") {
          throw new Error("Validation Error: " + errorMsg);
      }
      if (error.status === 403) {
          errorMsg = "Unauthorized: Only users with Host privileges can save drafts. Please ensure your account is a Host.";
      }
                       
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Fetch all drafts from the database
   * @returns {Promise<Object>} Response with drafts array
   */
  async fetchDraftsFromDatabase() {
    console.log("[ListingService] Fetching drafts from database...");
    try {
      const token = await authService.getToken();
      if (!token)
        return {
          success: false,
          message: "Authentication required",
          drafts: [],
        };

      const response = await apiClient.get("/v1/listings/drafts", {
        headers: { Authorization: "Bearer " + token },
      });

      const drafts =
        response && response.body
          ? response.body
          : response && response.data
            ? response.data
            : [];

      // Map _id to draftId for local consistency and normalize media and detail arrays
      const mappedDrafts = drafts.map((d) => {
        const rawPhotos = d.propertyImages || d.images || d.photos || [];
        const photos = (Array.isArray(rawPhotos) ? rawPhotos : [rawPhotos])
          .map((p) => (typeof p === "string" ? p : p?.url || p?.uri || ""))
          .filter(Boolean);

        const rawVideos = d.propertyVideos || d.videos || d.video || [];
        const videoList = (Array.isArray(rawVideos) ? rawVideos : [rawVideos])
          .map((v) => (typeof v === "string" ? v : v?.url || v?.uri || ""))
          .filter(Boolean);

        const priceVal = d.price !== undefined && d.price !== null ? Number(d.price) : (d.propertyPrice?.price ? Number(d.propertyPrice.price) : 0);
        const periodVal = d.pricingPeriod || (d.propertyPrice?.frequency ? String(d.propertyPrice.frequency).replace(/^per\s+/, "") : "night");
        const cautionVal = d.cautionFee !== undefined && d.cautionFee !== null ? Number(d.cautionFee) : (d.securityDeposit !== undefined && d.securityDeposit !== null ? Number(d.securityDeposit) : 0);
        const serviceVal = d.serviceCharge !== undefined && d.serviceCharge !== null ? Number(d.serviceCharge) : 0;
        const cleaningVal = d.cleaningFee !== undefined && d.cleaningFee !== null ? Number(d.cleaningFee) : 0;
        const rawAmenities = d.amenities || [];
        const amenitiesList = Array.isArray(rawAmenities) ? rawAmenities : (typeof rawAmenities === 'string' ? JSON.parse(rawAmenities || '[]') : []);

        return {
          ...d,
          _id: d._id,
          draftId: d.draftId || d._id,
          price: priceVal,
          pricingPeriod: periodVal,
          cautionFee: cautionVal,
          securityDeposit: cautionVal,
          serviceCharge: serviceVal,
          cleaningFee: cleaningVal,
          acceptRefund: d.acceptRefund !== undefined ? Boolean(d.acceptRefund) : true,
          propertyTitle: d.propertyTitle || d.propertyName || "",
          propertyName: d.propertyName || d.propertyTitle || "",
          propertyHighlight: d.description || d.propertyHighlight || "",
          description: d.description || d.propertyHighlight || "",
          guestCapacity: d.guests || d.guestCapacity || 0,
          guests: d.guests || d.guestCapacity || 0,
          bedrooms: d.bedrooms || 0,
          bathrooms: d.bathrooms || 0,
          sittingRooms: d.sittingRooms || 0,
          lounges: d.lounges || 0,
          workspaces: d.workspaces || 0,
          rentalPurpose: d.rentalPurpose || d.purposeOfRent || "",
          purposeOfRent: d.rentalPurpose || d.purposeOfRent || "",
          furnishing: d.furnishing || "",
          titleType: d.titleType || "",
          usageType: d.usageType || "",
          totalSquareFootage: d.totalSquareFootage || "",
          roomSizes: Array.isArray(d.roomSizes) ? d.roomSizes : [],
          currentStep: d.currentStep || 1,
          termsAgreed: Boolean(d.termsAgreed),
          checkInTime: d.checkInTime || "02:00 PM",
          checkOutTime: d.checkOutTime || "11:00 AM",
          houseRules: d.regulations || d.houseRules || [],
          regulations: d.regulations || d.houseRules || [],
          additionalRules: d.additionalRules || "",
          address: d.address || d.propertyLocation?.fullAddress || "",
          city: d.city || "",
          state: d.state || "",
          country: d.country || "Nigeria",
          postalCode: d.postalCode || "",
          landmarks: Array.isArray(d.landmarks) ? d.landmarks : (typeof d.landmarks === 'string' ? JSON.parse(d.landmarks || '[]') : []),
          latitude: d.latitude || (d.propertyLocation?.coordinates ? d.propertyLocation.coordinates[0] : 0),
          longitude: d.longitude || (d.propertyLocation?.coordinates ? d.propertyLocation.coordinates[1] : 0),
          amenities: amenitiesList,
          selectedAmenities: amenitiesList,
          photos,
          images: photos,
          propertyImages: photos,
          videos: videoList,
          propertyVideos: videoList,
          video: videoList[0] || null,
        };
      });

      return {
        success: true,
        drafts: mappedDrafts,
        message: "Drafts fetched successfully",
      };
    } catch (error) {
      console.error("[ListingService] Error fetching drafts:", error);
      return { success: false, drafts: [], message: error.message };
    }
  }

  /**
   * Delete a draft from the database
   * @param {string} draftId - The draft ID to delete
   * @returns {Promise<Object>} Response
   */
  async deleteDraftFromDatabase(draftId) {
    console.log("[ListingService] Deleting draft from database:", draftId);
    try {
      if (
        !draftId ||
        draftId.startsWith("draft_") ||
        draftId.startsWith("edit_")
      ) {
        console.log(
          "[ListingService] Draft is local only, skipping backend delete.",
        );
        return { success: true, message: "Local draft deleted." };
      }

      // Validate that draftId looks like a valid MongoDB ObjectId (24-char hex)
      const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(draftId);
      if (!isValidObjectId) {
        console.log(
          "[ListingService] Draft ID is not a valid ObjectId, skipping backend delete:",
          draftId,
        );
        return {
          success: true,
          message: "Local draft deleted (no valid backend ID).",
        };
      }

      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      await apiClient.delete("/v1/listings/delete/" + draftId, {
        headers: { Authorization: "Bearer " + token },
      });

      return {
        success: true,
        message: "Draft deleted from database",
      };
    } catch (error) {
      // Treat 404 as success — the draft is already gone from the server
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        console.log(
          "[ListingService] Draft already deleted from server (404).",
        );
        return { success: true, message: "Draft already deleted." };
      }
      return { success: false, message: error.message };
    }
  }



  /**
   * High-speed upload for multiple listing videos with progress tracking
   * @param {Array<string>} videoUris
   * @param {Function} onProgress
   */
  async uploadVideos(videoUris, onProgress = null) {
    console.log("[ListingService] Uploading videos...", videoUris && videoUris.length);

    if (!Array.isArray(videoUris) || videoUris.length === 0) {
      return { success: true, message: "No videos to upload", videos: [] };
    }

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required", error: "NO_TOKEN" };

      const formData = new FormData();
      let videoCount = 0;

      for (let i = 0; i < videoUris.length; i++) {
        const uri = videoUris[i];
        if (!uri) continue;

        if (Platform.OS === "web" || typeof window !== "undefined") {
          try {
            let blob;
            let mimeType = "video/mp4";
            let ext = "mp4";

            if (uri.startsWith("data:")) {
              const parts = uri.split(",");
              const mimeMatch = parts[0].match(/:(.*?);/);
              if (mimeMatch) {
                mimeType = mimeMatch[1];
                ext = mimeType.split("/")[1] || "mp4";
              }
              const base64Data = parts[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Uint8Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) byteNumbers[j] = byteCharacters.charCodeAt(j);
              blob = new Blob([byteNumbers], { type: mimeType });
            } else {
              const res = await fetch(uri);
              blob = await res.blob();
              if (blob && blob.type) {
                mimeType = blob.type;
                const sub = mimeType.split("/")[1]?.toLowerCase();
                if (sub === "quicktime") ext = "mov";
                else if (sub === "webm") ext = "webm";
                else if (sub === "x-matroska" || sub === "mkv") ext = "mkv";
                else if (sub === "x-msvideo" || sub === "avi") ext = "avi";
                else if (sub === "3gpp" || sub === "3gpp2") ext = "3gp";
                else ext = sub || "mp4";
              }
            }

            if (ext.length > 5) ext = "mp4";
            const filename = `video_${Date.now()}_${i}.${ext}`;
            formData.append("videos", blob, filename);
            videoCount++;
          } catch (blobErr) {
            console.error("[ListingService] Error converting web video to blob:", blobErr);
            continue;
          }
        } else {
          // Native
          let ext = "mp4";
          let mime = "video/mp4";
          const uriLower = uri.toLowerCase();
          if (uriLower.includes(".mov") || uriLower.includes(".qt")) { ext = "mov"; mime = "video/quicktime"; }
          else if (uriLower.includes(".webm")) { ext = "webm"; mime = "video/webm"; }
          else if (uriLower.includes(".mkv")) { ext = "mkv"; mime = "video/x-matroska"; }
          else if (uriLower.includes(".avi")) { ext = "avi"; mime = "video/x-msvideo"; }
          else if (uriLower.includes(".3gp")) { ext = "3gp"; mime = "video/3gpp"; }
          else if (uriLower.includes(".flv")) { ext = "flv"; mime = "video/x-flv"; }
          else if (uriLower.includes(".wmv")) { ext = "wmv"; mime = "video/x-ms-wmv"; }
          else if (uriLower.includes(".m4v")) { ext = "m4v"; mime = "video/x-m4v"; }

          const filename = `video_${Date.now()}_${i}.${ext}`;
          formData.append("videos", {
            uri,
            name: filename,
            type: mime,
          });
          videoCount++;
        }
      }

      if (videoCount === 0) {
        return { success: false, message: "No valid videos were available to upload", videos: [] };
      }

      const cleanBase = (await configService.getBaseURL()).replace(/\/$/, "");
      const uploadEndpoint = cleanBase.endsWith("/v1")
        ? `${cleanBase}/listings/upload-videos`
        : `${cleanBase}/v1/listings/upload-videos`;

      const uploadResult = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadEndpoint, true);
        xhr.setRequestHeader("Authorization", "Bearer " + token);
        // Do NOT set Content-Type on Web so browser automatically computes multipart boundary
        if (Platform.OS !== "web") {
          xhr.setRequestHeader("Content-Type", "multipart/form-data");
        }

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && (data.success || data.status)) {
              const vids = data.body?.videos || data.data?.videos || data.videos || data.data || [];
              resolve({
                success: true,
                videos: vids,
              });
            } else {
              resolve({
                success: false,
                message: data.message || `Upload failed with status ${xhr.status}`,
              });
            }
          } catch (err) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ success: true, videos: [] });
            } else {
              resolve({ success: false, message: `Upload error (${xhr.status})` });
            }
          }
        };

        xhr.onerror = () => {
          resolve({ success: false, message: "Network error during video upload" });
        };

        xhr.send(formData);
      });

      return uploadResult;
    } catch (err) {
      console.error("[ListingService] uploadVideos error:", err);
      return { success: false, message: err.message || "Network error during video upload" };
    }
  }
}

// Export singleton instance
const listingService = new ListingService();
export default listingService;

// Export status utilities for direct use in components
export const getListingStatusInfo = (status) => {
  return listingService.getStatusDisplayInfo(status);
};

export const validateListingStatus = (status) => {
  return listingService.isValidStatus(status);
};

export const getStatusesForUserRole = (userRole) => {
  return listingService.getStatusesForRole(userRole);
};

export const getAllowedTransitions = (currentStatus, userRole) => {
  return listingService.getAllowedStatusTransitions(currentStatus, userRole);
};
