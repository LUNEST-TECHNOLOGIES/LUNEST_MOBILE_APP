/**
 * LUNEST Product Tour Steps Configuration
 * Defines step details for both Guest and Host tours.
 * Brand name "LUNEST" is ALWAYS in ALL CAPS.
 */

export const GUEST_TOUR_STEPS = [
  {
    id: "guest-welcome",
    type: "modal",
    title: "Welcome to LUNEST 👋",
    description: "You're all set. Let us quickly show you around the app.",
    primaryButtonText: "Take a quick tour",
    secondaryButtonText: "Skip",
  },
  {
    id: "guest-property-card",
    anchorId: "tour-property-card",
    title: "Curated Stays Near You 📍",
    description:
      "LUNEST automatically detects your location to present premium, verified properties closest to you. Tap any listing to review high-resolution photos, real-time availability, transparent pricing, and instant booking options.",
    preferredPosition: "top",
  },
  {
    id: "guest-search",
    anchorId: "tour-search-bar",
    title: "Explore Any Destination 🔍",
    description:
      "Looking to travel beyond your current location? Use the smart search bar to filter properties across Nigeria by dates, price points, and premium amenities.",
    preferredPosition: "bottom",
  },
  {
    id: "guest-bookings",
    anchorId: "tour-guest-nav-bookings",
    title: "View and manage your bookings",
    description:
      "Review your upcoming trips, active stays, and past reservation details at any time.",
    preferredPosition: "top",
  },
  {
    id: "guest-saved",
    anchorId: "tour-guest-nav-saved",
    title: "Saved favorites ❤️",
    description:
      "Bookmark properties you love to easily compare prices, check availability, and book later.",
    preferredPosition: "top",
  },
  {
    id: "guest-notifications",
    anchorId: "tour-notifications-btn",
    title: "Stay updated 🔔",
    description:
      "We'll keep you informed about bookings, verification updates, payments and important account activity.",
    preferredPosition: "bottom",
  },
  {
    id: "guest-profile",
    anchorId: "tour-guest-nav-profile",
    title: "Your account",
    description:
      "Manage your profile, identity verification, bookings, settings and other account information here.",
    preferredPosition: "top",
  },
  {
    id: "guest-kyc",
    anchorId: "tour-guest-nav-profile",
    isKycOnly: true, // Only shown if user has NOT completed KYC
    title: "Complete your verification",
    description:
      "Your identity verification helps keep the LUNEST community safer.\n\nTap here to continue your verification.",
    primaryButtonText: "Verify now",
    secondaryButtonText: "Later",
    preferredPosition: "top",
  },
];

export const HOST_TOUR_STEPS = [
  {
    id: "host-welcome",
    type: "modal",
    title: "Welcome to LUNEST Hosting 🏠",
    description:
      "You're all set. Let us quickly show you how to manage your listings, reservations, and earnings.",
    primaryButtonText: "Take a quick tour",
    secondaryButtonText: "Skip",
  },
  {
    id: "host-dashboard",
    anchorId: "tour-host-nav-dashboard",
    title: "Your Host Hub",
    description:
      "Track your overall hosting performance, upcoming guest check-ins, and key property activity.",
    preferredPosition: "top",
  },
  {
    id: "host-create-listing",
    anchorId: "tour-host-create-listing",
    title: "Add a property",
    description:
      "Create and publish new listings with photos, amenities, nightly rates, and custom house rules.",
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
      "Accept or decline booking requests, review guest details, and check reservation histories.",
    preferredPosition: "top",
  },
  {
    id: "host-earnings",
    anchorId: "tour-host-nav-earnings",
    title: "Track your earnings 💰",
    description:
      "Monitor your revenue, pending payouts, completed transactions, and payout bank accounts.",
    preferredPosition: "top",
  },
  {
    id: "host-profile",
    anchorId: "tour-host-nav-profile",
    title: "Host profile & settings",
    description:
      "Manage your host profile, bank accounts, payout preferences, and account security.",
    preferredPosition: "top",
  },
  {
    id: "host-kyc",
    anchorId: "tour-host-nav-profile",
    isKycOnly: true, // Only shown if host has NOT completed KYC
    title: "Complete your verification",
    description:
      "Host identity verification unlocks instant payouts and builds trust with prospective guests.",
    primaryButtonText: "Verify now",
    secondaryButtonText: "Later",
    preferredPosition: "top",
  },
];
