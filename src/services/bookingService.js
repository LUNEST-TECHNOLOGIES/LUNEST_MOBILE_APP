/**
 * Booking Service
 * Handles all booking-related API calls
 * Ensures data isolation - hosts only see their bookings, guests only see theirs
 */

import { Platform } from "react-native";
import apiClient from "./apiClient";
import authService from "./authService";
import configService from "./configService";
import NetworkErrorHandler from "./networkErrorHandler";

class BookingService {
  constructor() {
    // baseURL is managed by authService instance
  }

  /**
   * Calculate pricing breakdown (Host Total + Fees)
   * Use this on the booking screen to show price details instantly
   * @param {number} amount - The base amount (host total)
   * @returns {Object|null} Breakdown of fees and totals
   */
  calculatePricing(amount) {
    const GUEST_FEE_PERCENT = 5;
    const HOST_FEE_PERCENT = 3;

    const price = parseFloat(amount);
    if (isNaN(price)) return null;

    const guestFee = (price * GUEST_FEE_PERCENT) / 100;
    const guestTotal = price + guestFee;
    const hostFee = (price * HOST_FEE_PERCENT) / 100;
    const hostEarnings = price - hostFee;

    return {
      price,
      guestFee,
      guestTotal,
      hostFee,
      hostEarnings,
    };
  }

  /**
   * Create a new booking (for guests)
   * @param {Object} bookingData - The booking data
   * @returns {Promise<Object>} Response with booking details
   */
  async createBooking(bookingData) {
    console.log("📝 [BookingService] Creating booking...");
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required. Please log in again.",
        };
      }

      // Sanitize booking type (backend expects 'DAILY' or 'WEEKLY')
      const payload = { ...bookingData };
      if (payload.type === "DAILY/WEEKLY") {
        payload.type = "DAILY";
      }

      // Validate dates locally before sending
      if (payload.checkIn && payload.checkOut) {
        const checkIn = new Date(payload.checkIn);
        const checkOut = new Date(payload.checkOut);
        // Allow same day booking (checkOut >= checkIn)
        if (checkOut < checkIn) {
          return {
            success: false,
            message: "Check-out date cannot be before check-in date",
          };
        }
      }

      const response = await apiClient.post(
        "/v1/bookings/create",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("✅ [BookingService] Booking created successfully");
      return {
        success: true,
        message: "Booking created successfully",
        booking:
          (response && response.body) ||
          (response && response.data) ||
          response,
      };
    } catch (error) {
      console.error("❌ [BookingService] Error creating booking:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to create booking",
        error: categorized.type,
      };
    }
  }

  /**
   * Fetch bookings for host's properties only
   * Uses the protected /my-bookings endpoint that filters by host's listings
   * @param {Object} filters - Optional filters (status, date range, etc.)
   * @returns {Promise<Array>} Array of bookings for host's properties only
   */
  async fetchHostBookings(filters = {}) {
    console.log(
      "📋 [BookingService] Fetching HOST bookings (host-specific)...",
    );
    console.log("[BookingService] Filters:", JSON.stringify(filters));

    try {
      const token = await authService.getToken();
      if (!token) {
        console.error("❌ [BookingService] No auth token available");
        return {
          success: false,
          bookings: [],
          message: "Not authenticated",
        };
      }
      console.log(
        "[BookingService] Auth token found:",
        token.substring(0, 20) + "...",
      );

      // Use the host-specific endpoint that filters by host's listings
      const endpoint = "/v1/bookings/my-bookings";
      console.log("[BookingService] Calling endpoint:", endpoint);
      console.log("[BookingService] Request payload:", JSON.stringify(filters));

      const response = await apiClient.post(endpoint, filters, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(
        "[BookingService] Raw response received:",
        JSON.stringify(response, null, 2),
      );
      console.log("✅ [BookingService] Host bookings fetched successfully");

      // Extract bookings from response
      const bookings =
        (response && response.body) || (response && response.data) || [];
      console.log(
        `[BookingService] Extracted ${Array.isArray(bookings) ? bookings.length : 0} bookings`,
      );

      if (Array.isArray(bookings) && bookings.length > 0) {
        console.log(
          "[BookingService] First booking sample:",
          JSON.stringify(bookings[0], null, 2),
        );
      }

      return {
        success: true,
        bookings: bookings,
      };
    } catch (error) {
      console.error("❌ [BookingService] Error fetching host bookings:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        bookings: [],
        message: categorized.userMessage || "Failed to fetch bookings",
        error: categorized.type,
      };
    }
  }

  /**
   * Fetch guest's own bookings only
   * Uses the protected /guest-bookings endpoint that filters by guest ID
   * @param {Object} filters - Optional filters (status, date range, etc.)
   * @returns {Promise<Array>} Array of guest's own bookings only
   */
  async fetchGuestBookings(filters = {}) {
    console.log(
      "📋 [BookingService] Fetching GUEST bookings (guest-specific)...",
    );
    console.log("[BookingService] Filters:", JSON.stringify(filters));

    try {
      const token = await authService.getToken();
      if (!token) {
        console.error("❌ [BookingService] No auth token available");
        return {
          success: false,
          bookings: [],
          message: "Not authenticated",
        };
      }
      console.log(
        "[BookingService] Auth token found:",
        token.substring(0, 20) + "...",
      );

      // Use the guest-specific endpoint that filters by guest ID
      const endpoint = "/v1/bookings/guest-bookings";
      console.log("[BookingService] Calling endpoint:", endpoint);
      console.log("[BookingService] Request payload:", JSON.stringify(filters));

      const response = await apiClient.post(endpoint, filters, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(
        "[BookingService] Raw response received:",
        JSON.stringify(response, null, 2),
      );
      console.log("✅ [BookingService] Guest bookings fetched successfully");

      // Extract bookings from response
      const bookings =
        (response && response.body) || (response && response.data) || [];
      console.log(
        `[BookingService] Extracted ${Array.isArray(bookings) ? bookings.length : 0} bookings`,
      );

      if (Array.isArray(bookings) && bookings.length > 0) {
        console.log(
          "[BookingService] First booking sample:",
          JSON.stringify(bookings[0], null, 2),
        );
      }

      return {
        success: true,
        bookings: bookings,
      };
    } catch (error) {
      console.error(
        "❌ [BookingService] Error fetching guest bookings:",
        error,
      );
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        bookings: [],
        message: categorized.userMessage || "Failed to fetch bookings",
        error: categorized.type,
      };
    }
  }

  /**
   * Fetch a single booking by ID
   * @param {string} bookingId - The booking ID
   * @returns {Promise<Object>} Booking details
   */
  isValidObjectId(id) {
    return (
      typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id)
    );
  }

  async fetchBookingById(bookingId) {
    console.log("🔍 [BookingService] Fetching booking:", bookingId);

    // Defensive: check for valid MongoDB ObjectId
    if (!this.isValidObjectId(bookingId)) {
      console.error(
        "❌ [BookingService] Invalid or missing bookingId (must be 24-char hex string):",
        bookingId,
      );
      return {
        success: false,
        booking: null,
        message: "Invalid booking ID. Please contact support or try again.",
      };
    }

    try {
      const token = await authService.getToken();

      // CRITICAL FIX: Backend expects { _id: "..." } in the request body
      const payload = { _id: bookingId };

      console.log(
        "[BookingService] Token:",
        token ? "✅ Present" : "❌ Missing",
      );
      console.log(
        "[BookingService] Payload being sent:",
        JSON.stringify(payload),
      );
      console.log(
        "[BookingService] Calling endpoint: /v1/bookings/single",
      );

      const response = await apiClient.post(
        "/v1/bookings/single",
        payload, // Send the payload as the body
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      console.log(
        "[BookingService] Raw backend response:",
        JSON.stringify(response, null, 2),
      );

      // Defensive: extract booking object from possible response shapes
      let booking =
        (response && response.body) || (response && response.data) || response;

      // Patch: normalize MongoDB Extended JSON ObjectId fields to strings
      const normalizeId = (val) => {
        if (val && typeof val === "object" && "$oid" in val) return val.$oid;
        return val;
      };
      if (booking && typeof booking === "object") {
        // Top-level _id
        if (
          booking._id &&
          typeof booking._id === "object" &&
          "$oid" in booking._id
        ) {
          booking._id = booking._id.$oid;
        }
        // listing
        if (
          booking.listing &&
          typeof booking.listing === "object" &&
          "$oid" in booking.listing
        ) {
          booking.listing = booking.listing.$oid;
        }
        // guests._id
        if (
          booking.guests &&
          typeof booking.guests === "object" &&
          booking.guests._id &&
          typeof booking.guests._id === "object" &&
          "$oid" in booking.guests._id
        ) {
          booking.guests._id = booking.guests._id.$oid;
        }
        // totalAmount._id
        if (
          booking.totalAmount &&
          typeof booking.totalAmount === "object" &&
          booking.totalAmount._id &&
          typeof booking.totalAmount._id === "object" &&
          "$oid" in booking.totalAmount._id
        ) {
          booking.totalAmount._id = booking.totalAmount._id.$oid;
        }
        // bookedBy
        if (
          booking.bookedBy &&
          typeof booking.bookedBy === "object" &&
          "$oid" in booking.bookedBy
        ) {
          booking.bookedBy = booking.bookedBy.$oid;
        }
        // createdAt, checkIn, checkOut, updatedAt
        const dateFields = ["createdAt", "checkIn", "checkOut", "updatedAt"];
        for (const field of dateFields) {
          if (
            booking[field] &&
            typeof booking[field] === "object" &&
            "$date" in booking[field]
          ) {
            booking[field] = booking[field].$date;
          }
        }
      }

      if (!booking || typeof booking !== "object" || !("_id" in booking)) {
        // Malformed or missing booking
        console.error("❌ [BookingService] Invalid booking response:", booking);
        return {
          success: false,
          booking: null,
          message: "Booking not found or invalid response from backend.",
        };
      }

      console.log("✅ [BookingService] Booking fetched successfully");
      return {
        success: true,
        booking,
      };
    } catch (error) {
      console.error("❌ [BookingService] Error fetching booking:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        booking: null,
        message: categorized.userMessage || "Failed to fetch booking. Please try again.",
        error: categorized.type,
      };
    }
  }

  /**
   * Update booking status (for hosts - confirm, cancel, etc.)
   * @param {string} bookingId - The booking ID
   * @param {string} status - New status
   * @param {Object} extra - Optional extra data (cancelReason, cancelNote)
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(bookingId, status, extra = {}) {
    console.log(
      "✏️ [BookingService] Updating booking status:",
      bookingId,
      "->",
      status,
    );

    if (!bookingId) {
      console.error("❌ [BookingService] No booking ID provided");
      return {
        success: false,
        message: "Booking ID is required",
      };
    }

    try {
      const token = await authService.getToken();
      if (!token) {
        console.error("❌ [BookingService] No authentication token available");
        return {
          success: false,
          message: "Authentication required",
        };
      }

      console.log(
        `📤 [BookingService] Sending ${status} request for booking ${bookingId}...`,
      );

      // Build payload with status + optional cancel data
      const payload = { status };
      if (extra.cancelReason) payload.cancelReason = extra.cancelReason;
      if (extra.cancelNote) payload.cancelNote = extra.cancelNote;

      const response = await apiClient.patch(
        `/v1/bookings/${bookingId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(
        "✅ [BookingService] Booking status updated successfully to:",
        status,
      );

      // Log additional info for cancellations
      if (status === "CANCELLED") {
        console.log(
          `🚫 [BookingService] Booking ${bookingId} has been cancelled and backend updated`,
        );
      }

      return {
        success: true,
        message: "Booking updated successfully",
        booking: (response && response.body) || (response && response.data),
        status: status,
        bookingId: bookingId,
      };
    } catch (error) {
      console.error(
        `❌ [BookingService] Error updating booking ${bookingId} to ${status}:`,
        error,
      );
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message:
          categorized.userMessage ||
          `Failed to ${status.toLowerCase()} booking`,
        error: categorized.type,
        bookingId: bookingId,
        attemptedStatus: status,
      };
    }
  }

  /**
   * Guest confirms check-in manually
   * @param {string} bookingId - The booking ID
   * @returns {Promise<Object>} Result
   */
  async checkInBooking(bookingId) {
    console.log("🛎️ [BookingService] Confirming manual check-in for:", bookingId);

    if (!bookingId) {
      return { success: false, message: "Booking ID is required" };
    }

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.post(
        `/v1/bookings/${bookingId}/check-in`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("✅ [BookingService] Check-in confirmed successfully");
      return {
        success: true,
        message: "Check-in confirmed. Host earnings released.",
        booking: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Error confirming check-in:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to confirm check-in",
      };
    }
  }

  /**
   * Upload review images to the server
   * Any authenticated user (guest or host) can upload review images
   * @param {string[]} imageUris - Array of local image URIs
   * @returns {Promise<Object>} Result with uploaded image URLs
   */
  async uploadReviewImages(imageUris) {
    console.log(
      "[BookingService] Uploading review images...",
      imageUris?.length,
    );
    if (!imageUris || imageUris.length === 0) {
      return { success: true, images: [] };
    }

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const formData = new FormData();
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        if (!uri) continue;

        if (Platform.OS === "web") {
          try {
            let blob;
            if (uri.startsWith("data:")) {
              const parts = uri.split(",");
              const mimeMatch = parts[0].match(/:(.*?);/);
              const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
              const byteChars = atob(parts[1]);
              const byteNums = new Array(byteChars.length);
              for (let j = 0; j < byteChars.length; j++)
                byteNums[j] = byteChars.charCodeAt(j);
              blob = new Blob([new Uint8Array(byteNums)], { type: mimeType });
            } else {
              const res = await fetch(uri);
              blob = await res.blob();
            }
            formData.append("images", blob, `review_${i}.jpg`);
          } catch (e) {
            console.warn("[BookingService] Skipping web image", i, e);
          }
        } else {
          const filename = uri.split("/").pop() || `review_${i}.jpg`;
          const ext = filename.split(".").pop() || "jpg";
          formData.append("images", {
            uri,
            type: ext === "png" ? "image/png" : "image/jpeg",
            name: filename,
          });
        }
      }

      const baseURL = await configService.getBaseURL();
      const response = await fetch(
        `${baseURL}/v1/bookings/upload-review-images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      const images = data?.body?.images || data?.images || [];
      return { success: true, images };
    } catch (error) {
      console.error("[BookingService] uploadReviewImages error:", error);
      return {
        success: false,
        message: error.message || "Failed to upload review images",
      };
    }
  }

  /**
   * Submit a host review for a guest on a completed booking
   * @param {string} bookingId - The booking ID
   * @param {number} rating - Rating 1-5
   * @param {string} feedback - Optional feedback text
   * @param {string[]} images - Optional image URLs
   * @param {Object} categories - Optional rating categories
   * @returns {Promise<Object>} Result
   */
  async submitReview(
    bookingId,
    rating,
    feedback = "",
    images = [],
    categories = {},
    role = null,
  ) {
    let normalizedBookingId;
    if (typeof bookingId === 'string') {
      const match = bookingId.match(/[a-fA-F0-9]{24}/);
      normalizedBookingId = match ? match[0] : bookingId;
    } else if (bookingId && typeof bookingId === 'object') {
      // Handle potential SchemaObjectId or other objects
      const idStr = bookingId.path || bookingId._id || bookingId.id || (bookingId.toObject ? bookingId.toObject()._id : null);
      if (typeof idStr === 'string') {
        const match = idStr.match(/[a-fA-F0-9]{24}/);
        normalizedBookingId = match ? match[0] : idStr;
      } else {
        normalizedBookingId = idStr; // Might be null or original object
      }
    } else {
      normalizedBookingId = bookingId;
    }

    console.log(
      "⭐ [BookingService] Submitting review for booking:",
      normalizedBookingId,
      "rating:",
      rating,
    );

    if (!normalizedBookingId || !rating) {
      return {
        success: false,
        message: "Booking ID and rating are required",
      };
    }

    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required",
        };
      }

      console.log(`📤 [BookingService] Sending review payload:`, {
        bookingId: normalizedBookingId,
        rating,
        feedbackLength: feedback.length,
        imagesCount: images.length,
        hasCategories: Object.keys(categories).length > 0,
      });

      const response = await apiClient.post(
        "/v1/bookings/review",
        { bookingId: normalizedBookingId, rating, feedback, images, categories, role },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("✅ [BookingService] Review submitted successfully");
      return {
        success: true,
        message: "Review submitted successfully",
        booking: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Error submitting review:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to submit review",
      };
    }
  }

  /**
   * Fetch rental agreement URL for a booking
   * @param {string} bookingId
   * @returns {Promise<Object>} { success, url }
   */
  async fetchRentalAgreement(bookingId) {
    console.log(
      "📄 [BookingService] Fetching rental agreement for:",
      bookingId,
    );
    if (!bookingId) return { success: false, message: "Booking ID required" };

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.get(
        `/v1/bookings/${bookingId}/agreement`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data =
        (response && response.body) || (response && response.data) || response;

      if (data && data.url) {
        // Prepend base URL if relative path
        const fullUrl = data.url.startsWith("http")
          ? data.url
          : `${apiClient.baseURL}/${data.url}`;

        return { success: true, url: fullUrl };
      }
      return { success: false, message: "Agreement not available" };
    } catch (error) {
      console.error("❌ [BookingService] Error fetching agreement:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch agreement",
      };
    }
  }

  /**
   * Alias for fetchRentalAgreement (used by Host side)
   */
  async fetchHostAgreement(bookingId) {
    return this.fetchRentalAgreement(bookingId);
  }

  /**
   * Alias for fetchRentalAgreement (used by Guest side)
   */
  async fetchUserAgreement(bookingId) {
    return this.fetchRentalAgreement(bookingId);
  }

  /**
   * Fetch receipt URL for a booking
   * @param {string} bookingId
   * @returns {Promise<Object>} { success, url }
   */
  async fetchReceipt(bookingId) {
    console.log("🧾 [BookingService] Fetching receipt for:", bookingId);
    if (!bookingId) return { success: false, message: "Booking ID required" };

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.get(
        `/v1/bookings/${bookingId}/receipt`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data =
        (response && response.body) || (response && response.data) || response;

      if (data && data.url) {
        // Prepend base URL if relative path
        const fullUrl = data.url.startsWith("http")
          ? data.url
          : `${apiClient.baseURL}/${data.url}`;

        return { success: true, url: fullUrl };
      }
      return { success: false, message: "Receipt not available" };
    } catch (error) {
      console.error("❌ [BookingService] Error fetching receipt:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch receipt",
      };
    }
  }

  /**
   * Check if the current user has a completed booking for a listing
   * @param {string} listingId
   * @returns {Promise<boolean>}
   */
  async hasUserBookedListing(listingId) {
    if (!listingId) return false;
    try {
      // Fetch guest's bookings for this listing
      // We assume the backend filters by listingId if provided in payload
      const result = await this.fetchGuestBookings({ listing: listingId });

      if (result.success && Array.isArray(result.bookings)) {
        // Check if any booking is properly status'd
        // We accept COMPLETED, CHECKED_OUT, or even CONFIRMED if they stayed already
        // For now, let's assume 'COMPLETED' or 'CHECKED_OUT' implies a past stay
        return result.bookings.some((booking) => {
          const status = booking.status;
          return (
            status === "COMPLETED" ||
            status === "CHECKED_OUT" ||
            status === "PAST"
          );
        });
      }
    } catch (error) {
      console.error(
        "[BookingService] Error checking user booking history:",
        error,
      );
    }
    return false;
  }

  /**
   * Fetch reviews for a specific user (as a guest or host)
   * Retrieves completed bookings that have reviews
   * @param {string} userId - The user ID whose reviews to fetch
   * @param {string} role - Either 'GUEST' or 'HOST'
   * @returns {Promise<Object>}
   */
  async fetchUserReviews(userId, role = "GUEST") {
    console.log(`⭐ [BookingService] Fetching reviews for ${role}:`, userId);
    try {
      const token = await authService.getToken();
      const response = await apiClient.get(
        `/v1/bookings/reviews/${userId}/${role}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const data =
        (response && response.body) || (response && response.data) || [];
      const reviewsArray = Array.isArray(data) ? data : data.reviews || [];
      return {
        success: true,
        reviews: reviewsArray,
        averageRating: data.averageRating,
        totalReviews: data.totalReviews,
      };
    } catch (error) {
      console.error("[BookingService] fetchUserReviews error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch reviews",
      };
    }
  }

  /**
   * Fetch reviews for a specific listing
   * @param {string} listingId
   * @returns {Promise<Object>}
   */
  async fetchListingReviews(listingId) {
    console.log("⭐ [BookingService] Fetching reviews for listing:", listingId);
    try {
      // Validate listingId before making API call
      if (
        !listingId ||
        typeof listingId !== "string" ||
        !/^[0-9a-fA-F]{24}$/.test(listingId)
      ) {
        console.warn(
          "[BookingService] Invalid listing ID for reviews:",
          listingId,
        );
        return { success: false, reviews: [], message: "Invalid listing ID" };
      }

      const response = await apiClient.get(
        `/v1/bookings/listing-reviews/${listingId}`,
      );

      const data =
        (response && response.body) || (response && response.data) || [];
      const reviewsArray = Array.isArray(data) ? data : data.reviews || [];
      return {
        success: true,
        reviews: reviewsArray,
        averageRating: data.averageRating,
        totalReviews: data.totalReviews,
      };
    } catch (error) {
      console.error("[BookingService] fetchListingReviews error:", error);
      return {
        success: false,
        reviews: [],
        message: error.message || "Failed to fetch listing reviews",
      };
    }
  }

  /**
   * Confirm guest checkout and mark booking as COMPLETED
   * This is the proper endpoint for guest checkout - it does NOT process payment
   * @param {string} bookingId - The booking ID
   * @returns {Promise<Object>}
   */
  async confirmCheckout(bookingId) {
    console.log(
      `[BookingService] Confirming checkout for booking ${bookingId}`,
    );
    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.post(
        `/v1/bookings/${bookingId}/confirm-checkout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return {
        success: true,
        message: response?.message || "Checkout confirmed successfully",
        booking: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Error confirming checkout:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to confirm checkout",
      };
    }
  }

  /**
   * Resolve caution fee (Release to guest, release to host, or dispute)
   * Handles disputes separately using booking reference code as the joining key for both guest and host sides
   * @param {string} bookingRef - Booking reference code (e.g., 'LNS-XXXXXX')
   * @param {string} action - 'RELEASE_TO_GUEST', 'RELEASE_TO_HOST', 'DISPUTE'
   * @param {string} reason - Optional reason for dispute/release
   * @returns {Promise<Object>}
   */
  async resolveCautionFee(bookingRef, action, reason = "") {
    console.log(
      `🛡️ [BookingService] Resolving caution fee for ${bookingRef}: ${action}`,
    );
    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.post(
        `/v1/bookings/reference/${bookingRef}/resolve-caution`,
        { action, reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return {
        success: true,
        message: response?.message || "Caution fee resolution submitted",
        booking: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Error resolving caution fee:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to resolve caution fee",
      };
    }
  }

  /**
   * Report an issue with a booking / Raise a dispute
   * @param {string} bookingId - The booking ID
   * @param {string} reason - The reason for the dispute
   * @returns {Promise<Object>}
   */
  async reportIssue(bookingId, reason) {
    console.log(`🛡️ [BookingService] Reporting issue for booking ${bookingId}:`, reason);
    if (!bookingId || !reason) return { success: false, message: "Booking ID and reason required" };

    try {
      const token = await authService.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await apiClient.post(
        `/v1/bookings/${bookingId}/report-issue`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return {
        success: true,
        message: response?.message || "Dispute raised successfully",
        booking: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Error reporting issue:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Failed to report issue",
      };
    }
  }

  /**
   * Publicly verify a rental agreement via reference code
   * Requires no authentication - used by QR code scanned from PDFs
   * @param {string} bookingRef - The reference code of the booking
   * @returns {Promise<Object>} Verification details
   */
  async verifyPublicAgreement(bookingRef) {
    console.log("🛡️ [BookingService] Publicly verifying agreement:", bookingRef);
    if (!bookingRef) return { success: false, message: "Reference code required" };

    try {
      // Backend route: /api/v1/bookings/verify-agreement/:bookingRef
      const response = await apiClient.get(`/v1/bookings/verify-agreement/${bookingRef}`, { silent: true });
      const data = (response && response.body) || (response && response.data) || response;
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error("❌ [BookingService] Verification error:", error);
      return {
        success: false,
        message: error.message || "Invalid or expired agreement reference."
      };
    }
  }

  /**
   * Manually verify a payment and resolve booking status
   * Used when a payment is successful but the booking remains PENDING
   * @param {string} reference - Payment or booking reference
   */
  async verifyPayment(reference) {
    console.log("💳 [BookingService] Manually verifying payment:", reference);
    try {
      const token = await authService.getToken();
      const response = await apiClient.get(`/v1/bookings/verify-payment/${reference}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      return {
        success: true,
        message: response?.message || "Payment verified successfully",
        data: (response && response.body) || (response && response.data),
      };
    } catch (error) {
      console.error("❌ [BookingService] Verify payment error:", error);
      const categorized = NetworkErrorHandler.categorizeError(error);
      return {
        success: false,
        message: categorized.userMessage || "Payment verification failed",
      };
    }
  }
  /**
   * Get stay extension quote (2% Discounted Fee)
   */
  async getExtensionQuote(bookingId, duration, unitType = "DAILY") {
    try {
      const response = await apiClient.post(`/v1/bookings/${bookingId}/extension/quote`, {
        duration,
        unitType
      });
      return {
        success: true,
        data: (response && response.body) || (response && response.data)
      };
    } catch (error) {
      console.error("❌ [BookingService] getExtensionQuote error:", error);
      return {
        success: false,
        message: error.message || "Failed to calculate extension quote"
      };
    }
  }

  /**
   * Confirm stay extension payment
   */
  async confirmExtensionPayment(bookingId, { duration, unitType, paymentReference, paymentMethod }) {
    try {
      const response = await apiClient.post(`/v1/bookings/${bookingId}/extension/confirm`, {
        duration,
        unitType,
        paymentReference,
        paymentMethod
      });
      return {
        success: true,
        data: (response && response.body) || (response && response.data)
      };
    } catch (error) {
      console.error("❌ [BookingService] confirmExtensionPayment error:", error);
      return {
        success: false,
        message: error.message || "Failed to confirm extension payment"
      };
    }
  }

  /**
   * Toggle auto-recurring rent extension
   */
  async toggleRecurringRent(bookingId, enabled, interval, authorizationCode) {
    try {
      const response = await apiClient.post(`/v1/bookings/${bookingId}/recurring-rent/toggle`, {
        enabled,
        interval,
        authorizationCode
      });
      return {
        success: true,
        data: (response && response.body) || (response && response.data)
      };
    } catch (error) {
      console.error("❌ [BookingService] toggleRecurringRent error:", error);
      return {
        success: false,
        message: error.message || "Failed to update recurring rent preference"
      };
    }
  }
}

const bookingService = new BookingService();
export default bookingService;
