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
      logService.logError("Failed to fetch host listings", {
        message: error.message,
        status: error.response?.status,
      });

      if (error.response?.status === 401) {
        return {
          success: false,
          listings: [],
          message: "Authentication required. Please log in again.",
          error: "UNAUTHORIZED",
        };
      }

      if (error.response?.status === 404) {
        return {
          success: true,
          listings: [],
          message: "No listings found",
        };
      }

      return {
        success: false,
        listings: [],
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch listings",
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
      return {
        success: false,
        listings: [],
        message: "Failed to fetch listings",
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
   * Upload photos for a listing
   * @param {Array} imageUris - Array of local image URIs from device
   * @returns {Promise<Object>} Response with image URLs
   */
  async uploadImages(imageUris) {
    console.log("[ListingService] Uploading images...", imageUris.length);
    logService.logInfo("Uploading listing images", { count: imageUris.length });

    // Handle empty images array
    if (!imageUris || imageUris.length === 0) {
      console.log(
        "[ListingService] No images to upload, returning empty array",
      );
      return {
        success: true,
        message: "No images to upload",
        images: [],
      };
    }

    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required",
          error: "NO_TOKEN",
        };
      }

      const formData = new FormData();
      let imageCount = 0;

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];

        if (!uri) {
          console.log("[ListingService] Skipping empty URI at index " + i);
          continue;
        }

        // Handle web and native differently
        if (Platform.OS === "web") {
          // For web, handle both data URLs and blob URLs
          try {
            let blob;
            let extension = "jpg";
            let mimeType = "image/jpeg";

            if (uri.startsWith("data:")) {
              // Data URL (base64) - convert to blob
              console.log("[ListingService] Converting data URL to blob...");
              const parts = uri.split(",");
              const mimeMatch = parts[0].match(/:(.*?);/);
              if (mimeMatch) {
                mimeType = mimeMatch[1];
                extension = mimeType.split("/")[1] || "jpg";
              }
              const base64Data = parts[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              const byteArray = new Uint8Array(byteNumbers);
              blob = new Blob([byteArray], { type: mimeType });
            } else {
              // Blob URL or regular URL - fetch and convert
              console.log("[ListingService] Fetching blob from URL...");
              const response = await fetch(uri);
              blob = await response.blob();
              mimeType = blob.type || "image/jpeg";
              extension = mimeType.split("/")[1] || "jpg";
            }

            formData.append("images", blob, "image_" + i + "." + extension);
            imageCount++;
            console.log(
              "[ListingService] Added web image " +
                imageCount +
                " to upload queue (size: " +
                blob.size +
                " bytes)",
            );
          } catch (blobError) {
            console.error(
              "[ListingService] Error converting web image to blob:",
              blobError,
            );
            // Skip this image on web if conversion fails
            continue;
          }
        } else {
          // For native (React Native), use object format
          const filename = uri.split("/").pop() || "image_" + i + ".jpg";
          const extension = filename.split(".").pop() || "jpg";
          const mimeType = extension === "png" ? "image/png" : "image/jpeg";

          formData.append("images", {
            uri: uri,
            type: mimeType,
            name: "image_" + i + "." + extension,
          });
          imageCount++;
          console.log(
            "[ListingService] Added native image " +
              imageCount +
              " to upload queue",
          );
        }
      }

      // If no valid images were added, return success with empty array
      if (imageCount === 0) {
        console.log("[ListingService] No valid images to upload");
        return {
          success: true,
          message: "No valid images to upload",
          images: [],
        };
      }

      console.log(
        "[ListingService] Sending " + imageCount + " images to API...",
      );
      console.log(
        "[ListingService] Endpoint: POST /v1/listings/upload-images",
      );

      // Use configService for dynamic URL detection
      const baseURL = await configService.getBaseURL();

      const response = await fetch(
        baseURL + "/v1/listings/upload-images",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(function () {
          return {};
        });
        throw new Error(
          errorData.message || "Upload failed with status " + response.status,
        );
      }

      const apiResponse = await response.json();

      console.log("[ListingService] Images uploaded successfully");
      console.log("[ListingService] Response:", apiResponse);

      return {
        success: true,
        message: "Images uploaded successfully",
        images:
          apiResponse && apiResponse.body && apiResponse.body.images
            ? apiResponse.body.images
            : apiResponse && apiResponse.images
              ? apiResponse.images
              : [],
      };
    } catch (error) {
      console.error("[ListingService] Error uploading images:", error);

      const categorized = NetworkErrorHandler.categorizeError(error);

      return {
        success: false,
        message:
          categorized.userMessage ||
          "Failed to upload images. Please try again.",
        error: categorized.type,
        details: error.message,
      };
    }
  }

  /**
   * Upload videos for a listing
   * @param {Array} videoUris - Array of local video URIs from device
   * @returns {Promise<Object>} Response with video URLs
   */
  async uploadVideos(videoUris) {
    console.log(
      "[ListingService] Uploading videos...",
      videoUris && videoUris.length,
    );

    if (!videoUris || videoUris.length === 0) {
      return {
        success: true,
        message: "No videos to upload",
        videos: [],
      };
    }

    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required",
          error: "NO_TOKEN",
        };
      }

      const formData = new FormData();
      let videoCount = 0;

      for (let i = 0; i < videoUris.length; i++) {
        const uri = videoUris[i];
        if (!uri) continue;

        // Web: fetch blob or handle data URLs
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
              for (let j = 0; j < byteCharacters.length; j++)
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              const byteArray = new Uint8Array(byteNumbers);
              blob = new Blob([byteArray], { type: mimeType });
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
          // Native: append file object as-is
          const filename = uri.split("/").pop() || `video_${i}.mp4`;
          const extension = filename.split(".").pop() || "mp4";
          const mimeType = "video/mp4";

          formData.append("videos", {
            uri: uri,
            type: mimeType,
            name: `video_${i}.${extension}`,
          });
          videoCount++;
        }
      }

      if (videoCount === 0) {
        return {
          success: true,
          message: "No valid videos to upload",
          videos: [],
        };
      }

      const baseURL = await configService.getBaseURL();
      const response = await fetch(
        baseURL + "/v1/listings/upload-videos",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed with status ${response.status}`,
        );
      }

      const apiResponse = await response.json();

      return {
        success: true,
        message: "Videos uploaded successfully",
        videos:
          apiResponse && (apiResponse.body?.videos || apiResponse.videos)
            ? apiResponse.body?.videos || apiResponse.videos
            : [],
      };
    } catch (error) {
      console.error("[ListingService] Error uploading videos:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to upload videos. Please try again.",
        error: categorized.type,
        details: error.message,
      };
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
        propertyCategory: draftData.category || draftData.propertyCategory || "rental", // Ensure DB alignment
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
      payload.propertyImages = photos || uiImages || draftData.propertyImages || [];
      payload.propertyVideos = draftData.video || draftData.propertyVideos || [];

      // 2. Map Core Property Details
      if (guestCapacity) payload.guests = Number(guestCapacity);
      if (propertyHighlight) payload.description = propertyHighlight;

      // 3. Map/Align Pricing Structure
      const priceVal = Number(draftData.price) || 0;
      const periodVal = uiPeriod || draftData.pricingPeriod || "night";
      
      payload.price = priceVal;
      payload.pricingPeriod = periodVal;
      
      // Ensure propertyPrice object exists for model compatibility
      payload.propertyPrice = {
        price: priceVal,
        currency: draftData.currency || "NGN",
        frequency: `per ${periodVal.replace(/^per\s+/, "")}`, // "night" -> "per night"
      };

      // 4. Map Admin/Governance Fees
      payload.cautionFee = Number(uiCaution || uiDeposit || draftData.cautionFee || draftData.securityDeposit || 0);
      payload.serviceCharge = Number(uiService || draftData.serviceCharge || 0);
      
      // Ensure flat fields are valid numbers or null (don't send NaN)
      const toNum = (val) => {
          if (val === undefined || val === null || val === "") return 0;
          const n = Number(val);
          return isNaN(n) ? 0 : n;
      };

      payload.price = toNum(payload.price);
      payload.bedrooms = toNum(payload.bedrooms);
      payload.bathrooms = toNum(payload.bathrooms);
      payload.guests = toNum(payload.guests || guestCapacity);
      payload.cautionFee = toNum(payload.cautionFee);
      payload.serviceCharge = toNum(payload.serviceCharge);

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
        response = await apiClient.patch(
          "/v1/listings/update/" + existingId,
          payload,
          { headers: { Authorization: "Bearer " + token } },
        );
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

      // Map _id to draftId for local consistency
      const mappedDrafts = drafts.map((d) => ({
        ...d,
        draftId: d._id,
      }));

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
      console.error("[ListingService] Error deleting draft:", error);
      return { success: false, message: error.message };
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
