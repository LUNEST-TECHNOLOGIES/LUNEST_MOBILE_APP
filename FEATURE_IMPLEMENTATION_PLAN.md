# Lunest Mobile App - Feature Implementation Plan

## Overview

This document outlines the implementation of enhanced features for the guest and host booking experience.

---

## 1. USER PROFILE PAGE - Data Preloading

**Status:** ✅ ALREADY IMPLEMENTED

**File:** `src/screens/profile/PersonalInfoEditScreen.jsx`

**Implementation Details:**

- Data loads before displaying (`useEffect` with `loadProfileData`)
- Fetches from:
  - `authService.getUserData()` - Login data
  - `authService.fetchProfile()` - Server profile data (includes NIN from signup)
  - `profileService.getProfileData()` - Local saved data
- Server data takes priority over local data
- Displays loading indicator while data is being fetched
- Verification percentage calculated based on completed fields

**Key Features:**

- Prevents confusion by preloading all user data
- Shows loading state with spinner
- Handles missing data gracefully with fallbacks

---

## 2. GUEST BOOKING SELECTION - Host Rules Integration

**File:** `src/screens/booking/SelectBookingDetailsScreen.jsx`

**Required Changes:**

### 2.1 Data Structure

```javascript
// Add host listing rules to state
const [hostRules, setHostRules] = useState({
  petsFriendly: false,
  smokingAllowed: false,
  partiesAllowed: false,
  childrenAllowed: true,
  petsDescription: "Not specified",
});

// Load from host listing data
useEffect(() => {
  loadHostListingRules();
}, []);

const loadHostListingRules = async () => {
  try {
    // Get listing ID from route params
    const listingId = route.params?.listingId;
    const listing = await listingService.getListingDetails(listingId);

    if (listing && listing.rules) {
      setHostRules({
        petsFriendly: listing.rules.petsFriendly || false,
        smokingAllowed: listing.rules.smokingAllowed || false,
        partiesAllowed: listing.rules.partiesAllowed || false,
        childrenAllowed: listing.rules.childrenAllowed !== false,
        petsDescription: listing.rules.petsDescription || "Not specified",
      });
    }
  } catch (error) {
    console.warn("Failed to load host rules:", error);
  }
};
```

### 2.2 Conditional Field Rendering

```javascript
// Disable pets field if host doesn't allow pets
const isPetsDisabled = !hostRules.petsFriendly;

// Disable parties/events option if not allowed
const isPartiesDisabled = !hostRules.partiesAllowed;

// Show warning if children but host prefers no children
const shouldShowChildrenWarning = children > 0 && !hostRules.childrenAllowed;
```

### 2.3 UI Implementation

- Grey out disabled fields
- Show tooltip/message explaining why field is disabled
- Display host rules summary at top
- Add warning alert if booking conflicts with rules

---

## 3. BOOKING SUMMARY - Pricing Breakdown

**File:** `src/screens/booking/BookingSummary.jsx`

**Required Implementation:**

### 3.1 Pricing Structure

```javascript
const bookingSummary = {
  pricing: {
    // Host's original rental price per period
    rentalPrice: 1200000, // From listing
    pricingPeriod: "per_night", // or 'per_week', 'per_month'
    numberOfNights: 4,
    numberOfWeeks: 0,
    numberOfMonths: 0,

    // Subtotal: Rental fees based on period
    subtotal: 4800000, // rentalPrice × numberOfNights

    // Service charge (host's fee)
    serviceCharge: 480000, // 10% of subtotal (configurable)

    // Security deposit (set by host)
    securityDeposit: 600000, // From listing

    // App charge for guest (5% of subtotal)
    appCharge: 240000, // 5% of subtotal

    // Coupon/discount (optional)
    discount: 0,

    // Final total
    total: 6120000, // subtotal + serviceCharge + securityDeposit + appCharge - discount
  },
};
```

### 3.2 Pricing Breakdown Display

```
PRICING BREAKDOWN
────────────────────────────────
Rental Price
  ₦1,200,000 × 4 nights          ₦4,800,000

Service Charge
  (10% of rental)                  ₦480,000

Security Deposit
  (Refundable)                     ₦600,000

Subtotal                           ₦5,880,000

App Charge (Guest Fee)
  (5% of rental)                   ₦240,000

────────────────────────────────
TOTAL AMOUNT DUE                   ₦6,120,000
────────────────────────────────
```

### 3.3 Implementation Details

- Load listing details to get host's pricing and rules
- Calculate based on selected booking period
- Service charge percentage from host settings
- App charge always 5% for guest
- Show breakdown in expandable/collapsible section
- Include refund policy for security deposit

---

## 4. FULL DETAILS SCREEN - Enhanced Guest View

**File:** `src/screens/properties/FullDetailsScreen.jsx`

**Required Enhancements:**

### 4.1 House Rules Section

```javascript
const houseRulesSection = {
  allowed: ["Guests", "Families with children"],
  notAllowed: ["Smoking", "Parties/Events"],
  petPolicy: {
    allowed: true,
    description: "Small dogs only, max 2",
    fee: "₦50,000 per stay",
  },
};
```

**UI Placement:**

- Display prominently in scrollable details
- Use visual indicators (✓ for allowed, ✗ for not allowed)
- Color coding (green for allowed, red for not allowed)
- Expandable section with full details

### 4.2 Host Information Section

```javascript
const hostInfo = {
  name: "Mr. Akintayo A.",
  profileImage: url,
  rating: 4.8,
  totalReviews: 125,
  totalListings: 23,
  isVerified: true,
  responseRate: 95,
  responseTime: "within 1 hour",
  joinedDate: "Jan 2023",

  // Additional details
  bio: "Professional property manager with 5+ years experience",
  languages: ["English", "Yoruba"],

  // Contact option
  contactButton: "Message Host",
};
```

**UI Components:**

- Host avatar with verification badge
- Key stats: Rating, reviews, listings count
- Response rate and time
- Bio/description
- "Message Host" button
- "View Host Profile" link

### 4.3 Reviews Section

```javascript
const reviews = [
  {
    id: 1,
    guestName: "Bolaji O.",
    guestImage: url,
    rating: 5,
    date: "Dec 2024",
    text: "Clean, calm area. The landlord was professional and transparent. Easy to settle in with my family.",
    helpful: 12,
    unhelpful: 0,
  },
  // ... more reviews
];
```

**UI Implementation:**

- Display top 3-5 reviews by default
- "View All Reviews" link for expanded view
- Star ratings visible
- Guest photo and name
- Review date
- Filter by rating (5⭐, 4⭐, etc.)
- Sort options (Most recent, Most helpful, Lowest rating)

### 4.4 Complete Information Layout

```
╔════════════════════════════╗
║  Property Images & Gallery ║
╚════════════════════════════╝

Title & Location

"What You Get" (Features)

Amenities List

HOUSE RULES
  ✓ Families welcome
  ✗ No smoking
  ✓ Pet friendly (small dogs)

HOST INFORMATION
  [Avatar] Mr. Akintayo A.
  ⭐ 4.8 (125 reviews)
  📍 23 listings
  ✓ Verified host
  Response: 95% within 1hr
  [Message Host Button]

GUEST REVIEWS
  ⭐⭐⭐⭐⭐ "Clean and comfortable..."
  ⭐⭐⭐⭐ "Great location..."
  [View All Reviews]

Landmarks/Nearby

[Book Now Button]
```

---

## 5. Data Flow & Services

### Required Service Methods

**listingService.js**

```javascript
// Get complete listing with host rules
getListingDetails(listingId) → {
  title, price, pricingPeriod, rules, host, reviews, amenities, etc.
}

// Get pricing breakdown
calculatePricingBreakdown(listingId, bookingParams) → {
  rentalPrice, serviceCharge, securityDeposit, appCharge, total
}
```

**hostService.js**

```javascript
// Get host complete profile
getHostProfile(hostId) → {
  name, avatar, rating, reviews, listing count, response rate, bio, etc.
}

// Get host reviews
getHostReviews(hostId, filters) → [reviews]
```

**bookingService.js**

```javascript
// Calculate final booking cost
calculateBookingCost(listingId, dates, guests, specialRequests) → {
  pricing breakdown
}
```

---

## 6. Implementation Priority

### Phase 1 (Immediate)

1. ✅ User Profile - Data preloading (DONE)
2. 📋 Booking Selection - Host rules integration
3. 📊 Booking Summary - Pricing breakdown

### Phase 2 (Next)

4. 🏠 Full Details Screen - Complete information layout

### Phase 3 (Enhancement)

5. Reviews filtering and sorting
6. Analytics and tracking
7. Accessibility improvements

---

## 7. Validation & Testing

### User Profile

- [ ] Data loads before render
- [ ] No blank fields on initial load
- [ ] Edit changes persist
- [ ] Loading state shows

### Booking Selection

- [ ] Disabled fields show correctly
- [ ] Host rules load from listing
- [ ] Warnings display for conflicts
- [ ] Summary shows selected rules

### Booking Summary

- [ ] Pricing calculated correctly
- [ ] All line items shown
- [ ] Breakdown matches expectations
- [ ] App charge is 5%
- [ ] Total is accurate

### Full Details

- [ ] Host info displays correctly
- [ ] Reviews show with all details
- [ ] Rules clearly marked
- [ ] All sections responsive
- [ ] Images load properly

---

## 8. Notes

- Ensure all data loads before rendering to prevent UI flickering
- Use loading skeletons for better UX during data fetch
- Cache host and listing data locally for faster subsequent loads
- Validate pricing calculations on backend
- Add error boundaries for failed data loads
- Implement proper error messages for users
- Test with various booking periods (daily, weekly, monthly)
