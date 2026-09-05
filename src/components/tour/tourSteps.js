/**
 * LUNEST Product Tour Steps Configuration
 * Follows the Modern Glassmorphism First-Login Tour specification.
 * Brand name "LUNEST" is ALWAYS in ALL CAPS.
 */

export const GUEST_TOUR_STEPS = [
  {
    id: "guest-welcome",
    type: "modal",
    title: "Welcome to LUNEST 👋",
    description:
      "You're all set. Let's take a quick look around so you can get the most out of LUNEST.",
    primaryButtonText: "Take the Tour",
    secondaryButtonText: "Skip Tour",
  },
  {
    id: "guest-home",
    anchorId: "tour-home-header",
    title: "Your LUNEST home",
    description:
      "Discover curated properties and apartments near your current location.",
    preferredPosition: "bottom",
  },
  {
    id: "guest-search",
    anchorId: "tour-search-bar",
    title: "Find your next stay 🔍",
    description:
      "Search properties by location, dates and available filters.",
    preferredPosition: "bottom",
  },
  {
    id: "guest-property",
    anchorId: "tour-property-card",
    title: "Explore properties",
    description:
      "Review verified photos, amenities, pricing and real host ratings.",
    preferredPosition: "top",
  },
  {
    id: "guest-bookings",
    anchorId: "tour-guest-nav-bookings",
    title: "Book with confidence",
    description:
      "View and manage your upcoming reservations, check-ins and receipts.",
    preferredPosition: "top",
  },
  {
    id: "guest-saved",
    anchorId: "tour-guest-nav-saved",
    title: "Saved favorites ❤️",
    description:
      "Save homes you love to compare rates and book whenever you're ready.",
    preferredPosition: "top",
  },
  {
    id: "guest-notifications",
    anchorId: "tour-notifications-btn",
    title: "Stay updated 🔔",
    description:
      "Get real-time updates on bookings, payments, and account activity.",
    preferredPosition: "bottom",
  },
  {
    id: "guest-profile",
    anchorId: "tour-guest-nav-profile",
    title: "Your account",
    description:
      "Manage your profile, security settings, saved favorites, and preferences.",
    preferredPosition: "top",
  },
  {
    id: "guest-kyc",
    anchorId: "tour-guest-nav-profile",
    isKycOnly: true, // Only shown if user has NOT completed KYC
    title: "Complete your verification",
    description:
      "Your identity verification helps keep the LUNEST community safer.",
    primaryButtonText: "Verify Now",
    secondaryButtonText: "Later",
    preferredPosition: "top",
  },
  {
    id: "guest-finish",
    type: "modal",
    isFinish: true,
    title: "You're ready to explore LUNEST 🚀",
    description:
      "Start finding and booking unique places to stay with confidence.",
    primaryButtonText: "Start Exploring",
  },
];

export const HOST_TOUR_STEPS = [
  {
    id: "host-welcome",
    type: "modal",
    title: "Welcome to LUNEST Hosting 🏠",
    description:
      "You're all set. Let's take a quick look around so you can get the most out of hosting on LUNEST.",
    primaryButtonText: "Take the Tour",
    secondaryButtonText: "Skip Tour",
  },
  {
    id: "host-dashboard",
    anchorId: "tour-host-nav-dashboard",
    title: "Your Host Hub",
    description:
      "Track your hosting performance, upcoming guest check-ins, and key activity.",
    preferredPosition: "top",
  },
  {
    id: "host-create-listing",
    anchorId: "tour-host-create-listing",
    title: "Add a property",
    description:
      "Create and publish new listings with photos, amenities, and nightly rates.",
    preferredPosition: "bottom",
  },
  {
    id: "host-listings",
    anchorId: "tour-host-nav-listings",
    title: "Property management",
    description:
      "Manage all your listed properties, calendar availability, and pricing in one place.",
    preferredPosition: "top",
  },
  {
    id: "host-bookings",
    anchorId: "tour-host-nav-bookings",
    title: "Guest reservations",
    description:
      "Review reservation requests, manage check-ins, and view guest details.",
    preferredPosition: "top",
  },
  {
    id: "host-earnings",
    anchorId: "tour-host-nav-earnings",
    title: "Track your earnings 💰",
    description:
      "Monitor your revenue, payouts, transactions, and linked bank accounts.",
    preferredPosition: "top",
  },
  {
    id: "host-profile",
    anchorId: "tour-host-nav-profile",
    title: "Host account & settings",
    description:
      "Manage your host profile, payout preferences, and account security.",
    preferredPosition: "top",
  },
  {
    id: "host-kyc",
    anchorId: "tour-host-nav-profile",
    isKycOnly: true, // Only shown if host has NOT completed KYC
    title: "Complete your verification",
    description:
      "Host identity verification unlocks instant payouts and builds trust with prospective guests.",
    primaryButtonText: "Verify Now",
    secondaryButtonText: "Later",
    preferredPosition: "top",
  },
  {
    id: "host-finish",
    type: "modal",
    isFinish: true,
    title: "You're ready to host on LUNEST 🚀",
    description:
      "Start welcoming guests and managing your listings with ease.",
    primaryButtonText: "Start Hosting",
  },
];
