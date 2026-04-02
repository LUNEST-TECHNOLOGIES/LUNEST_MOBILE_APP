# Lunest Mobile App - Software Documentation

**Version:** 1.3.0  
**Last Updated:** April 2026  
**Platform:** Expo SDK 54 (React Native)  
**Audit Status:** ✅ Comprehensive audit + financial accuracy patches applied

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Network Configuration](#4-network-configuration)
5. [Authentication Flow](#5-authentication-flow)
6. [Services Documentation](#6-services-documentation)
7. [Navigation Structure](#7-navigation-structure)
8. [Financial System](#8-financial-system)
9. [Host Earnings & Caution Fee Logic](#9-host-earnings--caution-fee-logic)
10. [Listing Creation Flow](#10-listing-creation-flow)
11. [Known Issues & Recommendations](#11-known-issues--recommendations)
12. [Development Setup](#12-development-setup)
13. [Troubleshooting Guide](#13-troubleshooting-guide)
14. [Backend API Reference](#14-backend-api-reference)
15. [Changelog](#15-changelog)

---

## 1. Overview

Lunest is a property rental mobile application that allows users to:

- **Guests**: Browse, search, and book short/long-stay properties, manage bookings, pay via wallet
- **Hosts**: List and manage rental properties, track earnings, resolve caution fee disputes, manage availability

### Tech Stack

| Component        | Technology                 |
| ---------------- | -------------------------- |
| Framework        | React Native (Expo SDK 54) |
| Navigation       | Expo Router v4             |
| Styling          | NativeWind (Tailwind CSS)  |
| State Management | React Context API + Hooks  |
| Storage          | AsyncStorage + SecureStore |
| HTTP Client      | Native Fetch API           |
| Backend          | Express.js (Node.js)       |
| Database         | MongoDB                    |

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LUNEST MOBILE APP                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Screens   │  │  Components │  │     Context     │ │
│  │  (app/*.jsx)│  │(src/comp..) │  │(UserModeContext)│ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          │                              │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │                     SERVICES                       │  │
│  ├────────────┬────────────┬───────────┬─────────────┤  │
│  │authService │apiClient   │configServ │dashboardServ│  │
│  │listingServ │bookingServ │storageServ│draftListServ│  │
│  │profileServ │paymentServ │locationSv │imageCompServ│  │
│  │bookmarkSrv │notifServ   │deviceSess │inactivitySv │  │
│  │referralSrv │hostService │kycService │userDataServ │  │
│  └────────────┴─────┬──────┴───────────┴─────────────┘  │
│                     │                                    │
└─────────────────────┼────────────────────────────────────┘
                      │ HTTP/HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  LUNEST BACKEND API                      │
│              (Express.js + MongoDB)                      │
│                  Port: 3000                              │
│              Routes: /v1/users, /v1/listings,           │
│              /v1/bookings, /v1/wallet, etc.             │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
lunest-mobile/
├── app/                              # Expo Router pages (file-based routing)
│   ├── _layout.jsx                   # Root layout with auth check + session guard
│   ├── index.jsx                     # Entry point with routing logic
│   ├── onboarding.jsx                # Onboarding screen
│   ├── login.jsx                     # Login page wrapper
│   ├── signup.jsx                    # Signup page wrapper
│   ├── forgot-password.jsx           # Password reset flow
│   ├── verify-code.jsx               # OTP verification
│   ├── reset-password.jsx            # New password entry
│   ├── landlord-request.jsx          # Host application / KYC
│   ├── host-request-pending.jsx      # Pending host request status
│   ├── listing-preview.jsx           # Draft listing preview
│   ├── search-results.jsx            # Property search results
│   ├── property-details.jsx          # Guest property view wrapper
│   ├── host-information.jsx          # Host profile view
│   ├── guest-information.jsx         # Guest profile view (for hosts)
│   ├── host-booking-details.jsx      # Host's view of a booking
│   ├── full-details.jsx              # Full property detail view
│   ├── select-booking-details.jsx    # Date/guest selection
│   ├── booking-summary.jsx           # Booking confirmation
│   ├── booking-confirmation.jsx      # Post-booking success
│   ├── booking-details.jsx           # Guest booking details
│   ├── add-funds.jsx                 # Wallet top-up
│   ├── pay-with-wallet.jsx           # Wallet payment flow
│   ├── payment-callback.jsx          # Paystack callback handler
│   ├── payment-settings.jsx          # Payment settings
│   ├── withdraw.jsx                  # Withdrawal screen
│   ├── transaction-detail.jsx        # Single transaction detail
│   ├── transaction-history.jsx       # Full transaction history
│   ├── coupons.jsx                   # Coupon management
│   ├── notifications.jsx             # Push notification history
│   ├── support-chat.jsx              # Live support chat
│   ├── referrals.jsx                 # Referral program
│   ├── point-history.jsx             # Loyalty points log
│   ├── kyc-verification.jsx          # KYC verification flow
│   ├── personal-info-edit.jsx        # Profile editing
│   ├── update-password.jsx           # Password change
│   ├── login-security.jsx            # Security settings
│   ├── deactivate-account.jsx        # Account deactivation
│   ├── modal.jsx                     # Global modal overlay
│   ├── +not-found.jsx                # 404 screen
│   ├── (tabs)/                       # Guest tab navigator
│   │   ├── _layout.jsx               # Tab layout configuration
│   │   ├── index.jsx                 # Home/Explore screen
│   │   ├── bookings.jsx              # User bookings
│   │   ├── saved.jsx                 # Saved/bookmarked listings
│   │   ├── messages.jsx              # Chat/messages
│   │   └── profile/                  # Guest profile group
│   ├── (host-tabs)/                  # Host tab navigator
│   │   ├── _layout.jsx               # Host tab configuration
│   │   ├── index.jsx                 # Host dashboard
│   │   ├── listings.jsx              # Host's listings
│   │   ├── bookings.jsx              # Received bookings
│   │   ├── earnings.jsx              # Earnings overview
│   │   ├── calendar.jsx              # Availability calendar
│   │   ├── messages.jsx              # Host messages
│   │   └── profile/                  # Host profile group
│   └── create-listing/               # 10-step listing creation flow
│       ├── _layout.jsx               # Creation flow layout
│       ├── index.jsx                 # Step 1: Start listing
│       ├── property-type.jsx         # Step 2: Property type
│       ├── property-details.jsx      # Step 3: Details entry
│       ├── location.jsx              # Step 4: Location picker (Maps)
│       ├── amenities.jsx             # Step 5: Amenities selection
│       ├── photos.jsx                # Step 6: Photo/video upload
│       ├── pricing.jsx               # Step 7: Pricing setup
│       ├── availability.jsx          # Step 8: Availability calendar
│       ├── house-rules.jsx           # Step 9: House rules
│       └── review.jsx                # Step 10: Review & publish
├── src/
│   ├── components/                   # Reusable UI components
│   │   ├── shared/                   # Cross-screen components
│   │   ├── forms/                    # Form components
│   │   └── cards/                    # Card components
│   ├── screens/                      # Screen implementations
│   │   ├── auth/                     # Auth screens
│   │   ├── guest/                    # Guest-specific screens
│   │   ├── host/                     # Host-specific screens
│   │   │   ├── HostDashboardScreen.jsx
│   │   │   ├── HostEarningsScreen.jsx      # Wallet + transaction history
│   │   │   ├── HostListingsScreen.jsx      # Listing management
│   │   │   ├── HostBookingsScreen.jsx
│   │   │   ├── HostBookingDetailsScreen.jsx
│   │   │   ├── HostCalendarScreen.jsx
│   │   │   ├── HostMessagesScreen.jsx
│   │   │   ├── GuestInformationScreen.jsx
│   │   │   ├── HostInformation.jsx
│   │   │   └── HostBookingConfirmationScreen.jsx
│   │   ├── booking/
│   │   ├── home/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── onboarding/
│   │   ├── payment/
│   │   ├── profile/
│   │   ├── properties/
│   │   ├── saved/
│   │   └── account/
│   ├── services/                     # Business logic & API calls (22 services)
│   ├── context/                      # React Context providers
│   │   └── UserModeContext.jsx       # Guest/Host mode switching
│   ├── hooks/                        # Custom React hooks
│   └── constants/                    # App-wide constants
├── hooks/                            # Global hooks
├── components/                       # Global components
├── constants/                        # Global constants
├── assets/                           # Fonts, images, icons
├── .env                              # Environment variables
├── app.json                          # Expo configuration
├── package.json                      # Dependencies
├── metro.config.js                   # Metro bundler config
├── babel.config.js                   # Babel configuration
└── tailwind.config.js                # Tailwind/NativeWind config
```

---

## 4. Network Configuration

### Platform-Specific URLs

| Platform             | URL                     | Notes                             |
| -------------------- | ----------------------- | --------------------------------- |
| **Web Browser**      | `http://localhost:3000` | Auto-detected                     |
| **iOS Simulator**    | `http://localhost:3000` | Same as web                       |
| **Android Emulator** | `http://10.0.2.2:3000`  | Special Android localhost mapping |
| **Physical Device**  | `http://<YOUR_IP>:3000` | Must be on same WiFi network      |

### Environment Variables

```env
EXPO_PUBLIC_API_URL=http://10.35.46.46:3000
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
```

### URL Detection Logic (configService.js)

```javascript
async detectEnvironmentURL() {
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  if (envURL) return envURL;
  return "http://localhost:3000";
}
```

---

## 5. Authentication Flow

### Login Flow

```
User → LoginScreen → authService.login() → POST /v1/users/login
                                         ← { token, refreshToken, user }
                                         → SecureStore (tokens)
                                         → Navigate to (tabs) or (host-tabs)
```

### Token Storage

| Data          | Storage      | Key                    |
| ------------- | ------------ | ---------------------- |
| Auth Token    | SecureStore  | `auth_token_secure`    |
| Refresh Token | SecureStore  | `refresh_token_secure` |
| Token Expiry  | SecureStore  | `token_expiry`         |
| User Data     | AsyncStorage | `userData`             |

### Security Features

1. **Rate Limiting**: Max 5 failed login attempts, 15-minute lockout
2. **Secure Storage**: Tokens stored in encrypted storage (expo-secure-store)
3. **Token Auto-Refresh**: Tokens refreshed 5 minutes before expiry
4. **Inactivity Timeout**: `inactivityTimeoutService` logs out idle users
5. **Device Session Tracking**: `deviceSessionService` tracks active device sessions
6. **KYC Verification**: Hosts must pass KYC via `kycService` before listing

---

## 6. Services Documentation

### Core Services

#### `apiClient.js`
Central HTTP client with auth headers, timeout, and retry logic.
```javascript
await apiClient.get(endpoint, options);
await apiClient.post(endpoint, data);
await apiClient.put(endpoint, data);
await apiClient.patch(endpoint, data);
await apiClient.delete(endpoint);
```

#### `authService.js`
Full authentication lifecycle management.
```javascript
await authService.login(credentials);
await authService.register(userData);
await authService.logout();
await authService.forgotPassword(email);
await authService.resetPassword(token, password);
await authService.isLoggedIn();
await authService.getToken();
await authService.refreshToken();
await authService.getUserData();
```

#### `configService.js`
Dynamic platform and URL configuration. Supports runtime override.
```javascript
await configService.getBaseURL();
await configService.setCustomBackendURL(url);
await configService.clearCustomBackendURL();
await configService.testConnection();
```

#### `storageService.js` / `secureStorageService.js`
Abstractions over AsyncStorage and Expo SecureStore respectively.

### Feature Services

#### `listingService.js`
All listing CRUD operations, image/video upload, draft management.

#### `bookingService.js`
Guest booking creation, host booking management, status transitions.

#### `dashboardService.js`
Aggregated host dashboard metrics (total bookings, earnings, occupancy rate).

#### `draftListingService.js`
Auto-save and persistence layer for the 10-step listing creation flow. Persists drafts to AsyncStorage and syncs with the backend.

#### `paymentService.js`
Paystack payment initialization, wallet top-up, withdrawal requests.

#### `bookmarkService.js`
Guest saved/bookmarked listings management.

#### `imageCompressionService.js`
Client-side image compression before upload to reduce payload size.

#### `locationService.js`
Google Places Autocomplete integration, geocoding, and reverse geocoding.

#### `notificationService.js`
Push notification registration and handling via Expo Notifications.

#### `deviceSessionService.js`
Tracks and manages concurrent device sessions. Enforces single-session policy.

#### `inactivityTimeoutService.js`
Monitors user activity and triggers logout after a configurable idle period.

#### `referralService.js`
Referral code generation, tracking, and reward distribution.

#### `kycService.js`
Triggers KYC verification flow for host onboarding.

#### `hostService.js`
Host-specific operations: fetching host profile, listings summary.

#### `networkErrorHandler.js`
Centralized error translation for network failures and API errors.

---

## 7. Navigation Structure

### Full Route Map

```
/                              → index.jsx (auth redirect logic)
├── /onboarding                → Onboarding carousel
├── /login                     → Login
├── /signup                    → Register
├── /forgot-password           → Password reset request
├── /verify-code               → OTP entry
├── /reset-password            → New password
├── /landlord-request          → Host application form + KYC
├── /host-request-pending      → Pending approval status screen
├── /(tabs)                    → Guest navigator (requires auth)
│   ├── /                      → Home / Explore listings
│   ├── /bookings              → My Bookings
│   ├── /saved                 → Saved Listings
│   ├── /messages              → Guest Messages
│   └── /profile               → Guest Profile
├── /(host-tabs)               → Host navigator (requires host role)
│   ├── /                      → Host Dashboard
│   ├── /listings              → Manage Listings
│   ├── /bookings              → Received Bookings
│   ├── /earnings              → HostEarningsScreen (wallet + history)
│   ├── /calendar              → Availability Calendar
│   ├── /messages              → Host Messages
│   └── /profile               → Host Profile
├── /create-listing/*          → 10-step creation flow
├── /listing-preview           → Preview before publishing
├── /search-results            → Search results page
├── /property-details          → Guest view of a listing
├── /full-details              → Full property detail
├── /host-information          → Host public profile
├── /guest-information         → Guest profile (hosts view)
├── /select-booking-details    → Date + guest picker
├── /booking-summary           → Booking review
├── /booking-confirmation      → Booking success
├── /booking-details           → Guest booking details
├── /host-booking-details      → Host's view of a booking
├── /add-funds                 → Wallet top-up
├── /pay-with-wallet           → Wallet payment
├── /payment-callback          → Paystack return handler
├── /payment-settings          → Payment method settings
├── /withdraw                  → Payout / withdrawal
├── /transaction-detail        → Single transaction view
├── /transaction-history       → Full transaction log
├── /coupons                   → Coupon codes
├── /notifications             → Notification history
├── /support-chat              → Live support chat
├── /referrals                 → Referral program
├── /point-history             → Loyalty points history
├── /kyc-verification          → KYC document upload
├── /personal-info-edit        → Edit profile
├── /update-password           → Change password
├── /login-security            → Security settings
├── /deactivate-account        → Account deactivation
└── /modal                     → Global modal overlay
```

---

## 8. Financial System

### Wallet Architecture

Each user (guest and host) has a single wallet with the following balance fields:

| Field              | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `availableBalance` | Spendable funds; shown in the host's "Available Balance" card |
| `pendingBalance`   | Funds in escrow (caution fees + new host earnings in hold) |
| `inflow`           | Lifetime total credited                                 |
| `outflow`          | Lifetime total debited                                  |

### Transaction Categories

| Category             | Party  | Type   | Description                              |
| -------------------- | ------ | ------ | ---------------------------------------- |
| `RENT`               | Host   | CREDIT | Rental income component                  |
| `SERVICE_CHARGE`     | Host   | CREDIT | Cleaning/service fee income              |
| `HOST_EARNING`       | Host   | CREDIT | Summary credit (internal, hidden)        |
| `PLATFORM_FEE`       | Both   | DEBIT  | Lunest app service charge                |
| `VAT`                | Both   | DEBIT  | 7.5% VAT on platform fee                 |
| `SECURITY_DEPOSIT`   | Both   | CREDIT | Caution fee — held in escrow on booking  |
| `RENT_AND_SERVICE`   | Guest  | DEBIT  | Combined rent + service charge           |
| `BOOKING`            | Guest  | DEBIT  | Summary booking debit (internal, hidden) |
| `WITHDRAWAL`         | Host   | DEBIT  | Payout to bank                           |
| `TOP_UP`             | Guest  | CREDIT | Wallet funding via Paystack              |
| `REFUND`             | Guest  | CREDIT | General refund                           |
| `CANCELLATION_PENALTY` | Either | DEBIT | Cancellation fee charged                |
| `CANCELLATION_REFUND`  | Either | CREDIT | Refund on cancellation                  |
| `COUPON_PAYMENT`     | Guest  | CREDIT | Discount from coupon code               |

### Pricing Model

```
Guest Pays:
  guestTotal = (rent + serviceCharge + cautionFee) + guestFee(5%) + VAT(7.5% of guestFee)

Host Receives:
  hostEarnings = (rent + serviceCharge) - hostFee(3%) - VAT(7.5% of hostFee)

Caution Fee in Escrow:
  Held in both guest's pendingBalance and host's pendingBalance until resolved
  Fee on release: 5% (released to guest) or 3% (released to host) + 7.5% VAT
```

---

## 9. Host Earnings & Caution Fee Logic

### HostEarningsScreen Aggregation (Frontend)

The `HostEarningsScreen.jsx` fetches the host's transactions from `/v1/my-transactions` and computes summary figures with the following rules:

```javascript
// SECURITY_DEPOSIT on hold is NOT counted as earnings — it's escrow
if (txn.status === "ON_HOLD" || txn.status === "PENDING") {
  if (txn.displayType !== "SECURITY_DEPOSIT") {
    pendingEarnings += val;
    totalEarnings += val;
  }
} else if (txn.status === "COMPLETED") {
  paidOut += val;
  totalEarnings += val;
}
// CANCELLED transactions are excluded entirely
```

> **Why this matters**: Without this guard, every booking would immediately inflate the host's "Total Earnings" by the caution fee amount, even though those funds belong to the guest until a dispute is resolved.

### Caution Fee Resolution — Backend

When an admin resolves a caution fee dispute in `resolveSecurityDepositInternal`:

| Resolution            | Guest `SECURITY_DEPOSIT` transaction | Host `SECURITY_DEPOSIT` transaction |
| --------------------- | ------------------------------------- | ------------------------------------ |
| `RELEASED_TO_HOST`    | `COMPLETED`                           | `COMPLETED`                          |
| `RELEASED_TO_GUEST`   | `COMPLETED` ("Caution fee released to you") | `CANCELLED` ("Caution fee released to guest") |

This ensures the host dashboard **never shows a `COMPLETED` caution fee earning for funds they didn't actually receive**.

### Transaction Status Lifecycle

```
Booking created    → SECURITY_DEPOSIT status: ON_HOLD  (both host & guest)
Dispute resolved   → RELEASED_TO_HOST:  both → COMPLETED
                   → RELEASED_TO_GUEST: guest → COMPLETED, host → CANCELLED
Host earnings      → ON_HOLD (released 24h after check-out) → COMPLETED
```

---

## 10. Listing Creation Flow

The listing creation is a **10-step wizard** with auto-save at each step via `draftListingService.js`. Drafts persist across app restarts.

| Step | Route                          | Screen                  | Description                        |
| ---- | ------------------------------ | ----------------------- | ---------------------------------- |
| 1    | `/create-listing/`             | index.jsx               | Start: choose property base type   |
| 2    | `/create-listing/property-type`| property-type.jsx       | Property category selection        |
| 3    | `/create-listing/property-details` | property-details.jsx | Bedrooms, bathrooms, guests, title |
| 4    | `/create-listing/location`     | location.jsx            | Google Maps + autocomplete         |
| 5    | `/create-listing/amenities`    | amenities.jsx           | Amenities multi-select             |
| 6    | `/create-listing/photos`       | photos.jsx              | Photo & video upload               |
| 7    | `/create-listing/pricing`      | pricing.jsx             | Rent, caution fee, service charge  |
| 8    | `/create-listing/availability` | availability.jsx        | Availability calendar              |
| 9    | `/create-listing/house-rules`  | house-rules.jsx         | Rules & additional info            |
| 10   | `/create-listing/review`       | review.jsx              | Review all + publish               |

**Preview**: After review, hosts can view `/listing-preview` before submitting.

---

## 11. Known Issues & Recommendations

### Open Issues

| Issue                              | Severity | Description                                      | Recommendation                    |
| ---------------------------------- | -------- | ------------------------------------------------ | --------------------------------- |
| No Global Error Boundary           | High     | Unhandled errors can crash the app               | Add React ErrorBoundary to layout |
| No Offline Support                 | Medium   | App shows no feedback when disconnected          | Add NetInfo + offline banner      |
| Period Filter Not Wired            | Medium   | Period selector (week/month/year) in Earnings doesn't filter transactions | Connect to date-range query      |
| No Biometric Auth                  | Low      | Login requires password every session            | Integrate expo-local-authentication |
| react-native-css-interop Emoji Bug | Low      | Emojis in styled Text components can crash app   | Avoid emojis in NativeWind Text  |

### Recommendations

#### High Priority
1. **Global Error Boundary** — wrap `_layout.jsx` in an ErrorBoundary
2. **Wire period filter** in `HostEarningsScreen` to pass `startDate`/`endDate` to the API

#### Medium Priority
3. **Offline detection** via `@react-native-community/netinfo`
4. **Request caching** for listings and host dashboard data

#### Low Priority
5. **Biometric login** for returning users
6. **Push notifications** for booking events
7. **Analytics** (Mixpanel / Amplitude)

---

## 12. Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (iOS/Android) for physical testing
- Backend running on port 3000

### Installation

```bash
# Navigate to project
cd lunest-mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend IP
```

### Running the App

```bash
# Start Expo dev server (recommended)
npx expo start --clear

# Platform-specific
npx expo start --web
npx expo start --ios
npx expo start --android
```

### Environment by Platform

| Platform         | `.env` value                               |
| ---------------- | ------------------------------------------ |
| Web              | Not needed (auto-detects localhost)        |
| iOS Simulator    | `EXPO_PUBLIC_API_URL=http://localhost:3000` |
| Android Emulator | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` |
| Physical Device  | `EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000`|

### Finding Your IP

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet "
```

---

## 13. Troubleshooting Guide

### Common Issues

#### "Network request failed"
1. Ensure backend is running on port 3000
2. Verify `.env` has correct `EXPO_PUBLIC_API_URL`
3. On physical devices: confirm same WiFi network
4. Check Windows Firewall allows port 3000

#### "Request timeout"
1. Increase `EXPO_PUBLIC_API_TIMEOUT` in `.env`
2. Check backend server logs for slowness

#### "Invalid authentication response"
1. Confirm backend returns `{ body: { token, user } }`
2. Check JWT secret is configured in the backend

#### "Too many failed attempts"
1. Wait 15 minutes for rate-limit reset
2. Or clear AsyncStorage to reset the counter

### Cache Reset

```bash
npx expo start --clear
npx expo start --reset-cache
```

---

## 14. Backend API Reference

### Authentication

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/v1/users/register`        | User registration      |
| POST   | `/v1/users/login`           | User login             |
| POST   | `/v1/users/logout`          | User logout            |
| POST   | `/v1/users/refresh`         | Token refresh          |
| GET    | `/v1/users/profile`         | Get user profile       |
| POST   | `/v1/users/forgot-password` | Request password reset |
| POST   | `/v1/users/reset-password`  | Reset password         |

### Listings

| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| GET    | `/v1/listings`              | Browse all listings          |
| GET    | `/v1/listings/:id`          | Get single listing           |
| POST   | `/v1/listings`              | Create listing (host)        |
| PATCH  | `/v1/listings/:id`          | Update listing               |
| DELETE | `/v1/listings/:id`          | Delete listing               |

### Bookings

| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/v1/bookings`              | Create booking               |
| GET    | `/v1/bookings/my`           | Guest's bookings             |
| GET    | `/v1/bookings/host`         | Host's received bookings     |
| PATCH  | `/v1/bookings/:id/status`   | Update booking status        |

### Wallet & Transactions

| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/v1/wallet`                | Fetch wallet balance         |
| GET    | `/v1/my-transactions`       | Fetch user transactions      |
| POST   | `/v1/wallet/fund`           | Initiate wallet top-up       |
| POST   | `/v1/wallet/withdraw`       | Request withdrawal           |

### Standard Response Format

```json
{
  "body": { /* response data */ },
  "message": "Success message"
}
```

---

## 15. Changelog

### v1.3.0 (April 2026) — Financial Accuracy Patches

**Bug Fixes:**
- ✅ Fixed `HostEarningsScreen`: Excluded `ON_HOLD` security deposits from `totalEarnings` and `pendingEarnings` — caution fees in escrow no longer inflate the dashboard
- ✅ Fixed backend `resolveSecurityDepositInternal`: Split `updateMany` to correctly mark host's `ON_HOLD` caution fee as `CANCELLED` (labeled "Caution fee released to guest") when released to a guest, instead of incorrectly marking it as `COMPLETED`
- ✅ Cleaned up 11 unnecessary files from the root directory (`null.txt`, `npx`, `Switch`, `tmp_replace.js`, and 7 stale documentation files)

**Documentation:**
- ✅ Full documentation rewrite to reflect the actual current state of the codebase
- ✅ Added Host Earnings & Caution Fee Logic section
- ✅ Added complete Financial System section
- ✅ Added all 22 services to the services documentation
- ✅ Updated navigation structure with all current routes

---

### v1.2.0 (March 2026) — Listing & Dashboard Stability

**Features & Fixes:**
- ✅ Implemented 10-step listing creation flow with auto-save (`draftListingService`)
- ✅ Added `imageCompressionService` for client-side upload optimization
- ✅ Granular transaction splitting (RENT, SERVICE_CHARGE, PLATFORM_FEE, VAT, SECURITY_DEPOSIT) for Admin Dashboard accuracy
- ✅ Added `deviceSessionService` and `inactivityTimeoutService`
- ✅ Listing preview screen before publishing
- ✅ Support chat integration

---

### v1.1.0 (July 2025) — Comprehensive Audit

**Fixes:**
- ✅ Removed 100+ hardcoded `fontFamily: "Aeonik Pro"` references
- ✅ Fixed hardcoded IP `192.168.0.200` in `networkErrorHandler.js`
- ✅ Removed emoji from Text components (NativeWind crash fix)
- ✅ Removed 8 unnecessary test/diagnostic files

---

### v1.0.0 (January 2025) — Initial Release

- Initial Expo app setup
- Guest + Host navigation structure
- Auth flow with SecureStore
- Platform-specific URL detection

---

_Documentation maintained by the development team._  
_Last updated: April 2026 (v1.3.0)_
