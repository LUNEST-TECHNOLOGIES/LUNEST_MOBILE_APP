/**
 * Dashboard Service
 * Handles fetching host dashboard stats and data
 * Ensures data isolation - each host only sees their own statistics
 */

import apiClient from "./apiClient";
import authService from "./authService";
import bookingService from "./bookingService";
import configService from "./configService";
import listingService from "./listingService";

class DashboardService {
  /**
   * Fetch host dashboard overview data
   * All data returned is specific to the authenticated host
   * @returns {Promise<Object>} Dashboard stats and data
   */
  async fetchHostDashboard() {
    console.log(
      "📊 [DashboardService] Fetching host-specific dashboard data...",
    );
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated",
        };
      }

      // Fetch all host-specific data in parallel for performance
      // Now including the single optimized dashboard stats endpoint with /v1 prefix
      const [statsResult, listingsResult, bookingsResult, userProfileResult] = await Promise.allSettled([
        apiClient.get("/v1/notifications/host/dashboard-stats", { silent: true }),
        listingService.fetchUserListings(), // Uses /my-listings - only host's listings
        bookingService.fetchHostBookings(), // Uses /my-bookings - only host's property bookings
        authService.fetchProfile(),
      ]);

      // Handle results gracefully with strict array type checks
      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const statsData = (statsRes && statsRes.data) ? statsRes.data : (statsRes || {});
      const stats = statsData.body || statsData;

      const rawListings = listingsResult.status === 'fulfilled' ? listingsResult.value : null;
      const listings = Array.isArray(rawListings)
        ? rawListings
        : (Array.isArray(rawListings?.listings) ? rawListings.listings : (Array.isArray(rawListings?.data) ? rawListings.data : []));

      const rawBookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : null;
      const bookings = Array.isArray(rawBookings)
        ? rawBookings
        : (Array.isArray(rawBookings?.bookings) ? rawBookings.bookings : (Array.isArray(rawBookings?.data) ? rawBookings.data : []));

      const userProfile = userProfileResult.status === 'fulfilled' ? (userProfileResult.value?.data || userProfileResult.value || {}) : {};

      // Helper to safely parse financial numbers
      const parseAmount = (val) => {
        if (val === null || val === undefined) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      // Use backend API stats as the authoritative source for host earnings and wallet balance.
      const rawStatsEarnings = parseAmount(stats.totalEarnings);
      const rawWalletBalance = parseAmount(stats.walletBalance ?? userProfile?.walletBalance ?? userProfile?.wallet?.availableBalance ?? (statsRes?.body?.walletBalance));

      const totalBusinessEarnings = rawStatsEarnings;
      const walletBalance = rawWalletBalance;
      const totalListings = typeof stats.totalListings === "number" ? stats.totalListings : listings.length;
      const totalBookings = typeof stats.totalBookings === "number" ? stats.totalBookings : bookings.length;

      // Filter bookings for UI displays
      const confirmedBookings = bookings.filter((b) => {
        const status = b.status ? b.status.toUpperCase() : "";
        return ["CONFIRMED", "ONGOING"].includes(status);
      });
      
      const completedBookings = bookings.filter((b) => {
        const status = b.status ? b.status.toUpperCase() : "";
        return status === "COMPLETED";
      });

      const upcomingBookings = confirmedBookings.filter((b) => {
        const checkIn = new Date(b.checkIn);
        return checkIn > new Date();
      }).length;

      // Get base URL for image conversion
      const baseURL = await configService.getBaseURL();

      // Helper function to convert image URLs to full URLs
      const convertImageUrl = (image) => {
        if (!image) return null;
        // Handle object format: { url: '/uploads/listings/...', filename: '...' }
        if (typeof image === "object" && image.url) {
          if (image.url.startsWith("http")) return image.url;
          return `${baseURL}${image.url}`;
        }
        // Handle string format
        if (typeof image === "string") {
          if (image.startsWith("http")) return image;
          return `${baseURL}${image}`;
        }
        return null;
      };

      // Format listings for carousel
      const formattedListings = listings.slice(0, 5).map((listing) => {
        // Convert property images to full URLs
        const processedImages = (listing.images || listing.propertyImages || [])
          .map(convertImageUrl)
          .filter(Boolean);

        // Get location from various possible fields
        const locationCity =
          listing.city ||
          (listing.propertyLocation && listing.propertyLocation.city) ||
          (listing.address && listing.address.city) ||
          null;
        const locationState =
          listing.state ||
          (listing.propertyLocation && listing.propertyLocation.state) ||
          (listing.address && listing.address.state) ||
          null;
        const fullAddress =
          listing.propertyLocation && listing.propertyLocation.fullAddress
            ? listing.propertyLocation.fullAddress
            : null;

        // Build location string
        let displayLocation = "No location";
        if (fullAddress) {
          displayLocation = fullAddress;
        } else if (locationCity && locationState) {
          displayLocation = `${locationCity}, ${locationState}`;
        } else if (locationCity) {
          displayLocation = locationCity;
        } else if (listing.location) {
          displayLocation = listing.location;
        }

        const amenitiesSlice =
          listing.amenities && listing.amenities.length > 0
            ? listing.amenities.slice(0, 3)
            : [];

        // Get title from various possible fields
        const propertyTitle =
          listing.propertyTitle ||
          listing.propertyName ||
          listing.title ||
          "Untitled Property";

        return {
          id: listing._id,
          propertyName: propertyTitle,
          title: propertyTitle,
          location: displayLocation,
          price:
            listing.price ||
            (listing.propertyPrice && listing.propertyPrice.price) ||
            0,
          priceUnit: listing.pricingPeriod || listing.priceUnit || "Night",
          pricingPeriod: listing.pricingPeriod || "night",
          rating: listing.rating || 0,
          isVerified: listing.verified || false,
          isAvailable:
            listing.status === "AVAILABLE" ||
            listing.status === "LIVE" ||
            listing.available !== false,
          amenities: listing.amenities || [], // Full amenities for detail view
          amenitiesPreview: amenitiesSlice, // Sliced version for card preview
          images: processedImages,
          image: processedImages[0] || null,
          status: listing.status,
          description: listing.description || "",
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.bathrooms || 0,
          guests: listing.guests || 0,
          propertyType: listing.propertyType || "Property",
          // Additional fields for detail view
          regulations: listing.regulations || [],
          houseRules: listing.houseRules || "",
          additionalRules: listing.additionalRules || "",
          features: listing.features || [],
          checkInTime: listing.checkInTime || "",
          checkOutTime: listing.checkOutTime || "",
          securityDeposit: listing.securityDeposit || 0,
          cleaningFee: listing.cleaningFee || 0,
          instantBooking: listing.instantBooking || false,
          address: listing.address || "",
          city: listing.city || locationCity || "",
          state: listing.state || locationState || "",
        };
      });

      // Calculate weekly data for charts (last 7 days)
      const weeklyBookingsData = this.calculateWeeklyData(bookings, "checkIn");
      const weeklyEarningsData =
        this.calculateWeeklyEarnings(completedBookings);

      // Get user info - use safe property access
      const userName =
        userProfile.fullName ||
        userProfile.firstName ||
        userProfile.name ||
        "Host";
      const userAddress = userProfile.address ? userProfile.address : null;
      const location =
        userAddress && userAddress.city ? userAddress.city : "Nigeria";
      const plan =
        userProfile && userProfile.hostPlan
          ? userProfile.hostPlan
          : "Basic Plan";

      console.log(
        `✅ [DashboardService] Dashboard loaded - ${totalListings} listings, ${totalBookings} bookings, ₦${totalBusinessEarnings} business earnings, ₦${walletBalance} wallet balance`,
      );

      // Calculate yearly data for combined chart
      const yearlyData = this.calculateYearlyData(bookings, completedBookings);

      return {
        success: true,
        data: {
          userName,
          location: `${location}`,
          plan,
          totalEarnings: totalBusinessEarnings, // Business earnings from completed bookings
          walletBalance, // Actual wallet balance
          onHoldEarnings: stats.onHoldEarnings || 0,
          onHoldCaution: stats.onHoldCaution || 0,
          onHoldPlatformFee: stats.onHoldPlatformFee || 0,
          onHoldVat: stats.onHoldVat || 0,
          pendingBalance: stats.pendingBalance || ((stats.onHoldEarnings || 0) + (stats.onHoldCaution || 0)),
          pendingBalanceLabel: stats.pendingBalanceLabel || "Total On Hold:",
          hostRating: stats.hostRating || 0,
          hostRatingCount: stats.hostRatingCount || 0,
          totalBookings,
          totalListings,
          upcomingBookings,
          newMessages: 0, // Placeholder: Messaging feature is currently under development (Coming Soon)
          bookingsData: weeklyBookingsData,
          earningsData: weeklyEarningsData,
          yearlyBookings: yearlyData.yearlyBookings,
          yearlyEarnings: yearlyData.yearlyEarnings,
          years: yearlyData.years,
          listings: formattedListings,
          recentActivities: this.formatRecentActivities(bookings.slice(0, 5)),
        },
      };
    } catch (error) {
      console.error("❌ [DashboardService] Error fetching dashboard:", error);
      return {
        success: false,
        message: "Failed to load dashboard data",
      };
    }
  }

  /**
   * Calculate weekly booking counts for chart
   * Returns array of numbers for the last 7 days [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
   */
  calculateWeeklyData(bookings, dateField) {
    const today = new Date();
    const weekData = [];

    // Get data for last 7 days, starting from 6 days ago to today
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const count = bookings.filter((b) => {
        const bookingDate = new Date(b[dateField] || b.createdAt);
        return bookingDate.toDateString() === date.toDateString();
      }).length;

      weekData.push(count);
    }

    return weekData;
  }

  /**
   * Calculate weekly earnings for chart
   */
  calculateWeeklyEarnings(completedBookings) {
    const today = new Date();
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dailyEarnings = completedBookings
        .filter((b) => {
          const bookingDate = new Date(b.checkOut || b.updatedAt);
          return bookingDate.toDateString() === date.toDateString();
        })
        .reduce((sum, b) => sum + (b.pricingBreakdown?.hostEarnings || b.pricingBreakdown?.hostTotal || b.hostEarnings || 0), 0);

      weekData.push(dailyEarnings);
    }

    return weekData;
  }

  /**
   * Calculate yearly data for combined chart
   * Returns arrays for last 4 years: bookings count and total earnings
   */
  calculateYearlyData(allBookings, completedBookings) {
    const currentYear = new Date().getFullYear();
    const years = [];
    const yearlyBookings = [];
    const yearlyEarnings = [];

    // Get data for last 4 years
    for (let i = 3; i >= 0; i--) {
      const year = currentYear - i;
      years.push(year.toString());

      // Count bookings for this year
      const bookingsThisYear = allBookings.filter((b) => {
        const bookingDate = new Date(b.createdAt || b.checkIn);
        return bookingDate.getFullYear() === year;
      }).length;
      yearlyBookings.push(bookingsThisYear);

      // Sum earnings for this year
      const earningsThisYear = completedBookings
        .filter((b) => {
          const bookingDate = new Date(b.checkOut || b.updatedAt);
          return bookingDate.getFullYear() === year;
        })
        .reduce((sum, b) => sum + (b.pricingBreakdown?.hostEarnings || b.pricingBreakdown?.hostTotal || b.hostEarnings || 0), 0);
      yearlyEarnings.push(earningsThisYear);
    }

    return { years, yearlyBookings, yearlyEarnings };
  }

  /**
   * Format recent bookings as activities
   */
  formatRecentActivities(bookings) {
    return bookings.map((booking, index) => {
      const guest = booking.guest || {};
      const guestName = guest.firstName
        ? `${guest.firstName} ${guest.lastName || ""}`.trim()
        : "A guest";
      const listing = booking.listing || {};
      const propertyName = listing.title || "your property";
      const status = booking.status ? booking.status.toUpperCase() : "";

      let title = "";
      let subtitle = "";

      switch (status) {
        case "PENDING":
        case "RESERVED":
          title = `${guestName} requested to book ${propertyName}`;
          subtitle = "View Request";
          break;
        case "CONFIRMED":
          title = `Booking confirmed for ${propertyName}`;
          subtitle = "View Details";
          break;
        case "COMPLETED":
          title = `${guestName} completed their stay at ${propertyName}`;
          subtitle = "Leave Review";
          break;
        case "CANCELED":
          title = `Booking cancelled for ${propertyName}`;
          subtitle = "View Details";
          break;
        default:
          title = `Activity for ${propertyName}`;
          subtitle = "View Details";
      }

      return {
        id: booking._id || String(index),
        title,
        subtitle,
        bookingId: booking._id,
      };
    });
  }
}

export default new DashboardService();
