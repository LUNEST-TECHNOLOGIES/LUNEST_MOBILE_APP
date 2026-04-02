# Lunest Mobile App — Development Guide

**Version:** 1.3.0 | **Last Updated:** April 2026  
**Stack:** Expo SDK 54 · React Native 0.81.5 · Expo Router v4 · NativeWind v4

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Running the App](#2-running-the-app)
3. [Network & Environment Configuration](#3-network--environment-configuration)
4. [Project Structure](#4-project-structure)
5. [Key Features](#5-key-features)
6. [Services Overview](#6-services-overview)
7. [Backend Integration](#7-backend-integration)
8. [Common Issues & Solutions](#8-common-issues--solutions)
9. [Testing & Debugging](#9-testing--debugging)
10. [Building for Production](#10-building-for-production)
11. [Git Workflow](#11-git-workflow)
12. [Useful Commands](#12-useful-commands)
13. [Resources](#13-resources)

---

## 1. Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or yarn
- **Expo Go** app on physical device (iOS App Store / Google Play)
- Backend server running on port 3000

### Installation

```bash
# Navigate to the project
cd "c:\Users\AkintayoPC\Documents\Lunest_app\lunest-mobile"

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your local backend IP (see Section 3)

# Start the dev server
npx expo start --clear
```

---

## 2. Running the App

### Start Dev Server

```bash
npx expo start --clear       # Recommended — clears Metro cache first
```

### Platform-Specific Launch

```bash
npm run android              # Android emulator
npm run ios                  # iOS simulator (macOS only)
npm run web                  # Web browser (localhost:8081)
```

### Interactive Commands (while server is running)

| Key | Action |
|-----|--------|
| `a` | Open Android emulator |
| `i` | Open iOS simulator |
| `w` | Open web browser |
| `r` | Reload app |
| `c` | Clear cache and restart |
| `j` | Open JS debugger |
| `?` | Show all commands |

### Testing on Physical Devices

1. Install **Expo Go** from App Store or Google Play
2. Run `npx expo start`
3. **iOS**: Scan QR code with the Camera app
4. **Android**: Scan QR code inside the Expo Go app
5. Ensure your device and computer are on the **same WiFi network**

---

## 3. Network & Environment Configuration

### `.env` File Setup

```env
# Backend URL — set this to your machine's local IP for physical device testing
EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000

# Request timeout in milliseconds
EXPO_PUBLIC_API_TIMEOUT=60000

# Debug mode
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_VERSION=1.3.0
```

### Platform-Specific URL Reference

| Platform             | `.env` value                               | Notes                          |
| -------------------- | ------------------------------------------ | ------------------------------ |
| Web browser          | Not required                               | Auto-detects `localhost:3000`  |
| iOS Simulator        | `EXPO_PUBLIC_API_URL=http://localhost:3000`| Same as web                    |
| Android Emulator     | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` | Android's localhost alias      |
| Physical device (any)| `EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000`| Must be on same WiFi           |

### Find Your Machine's IP

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet "
```

### Runtime URL Override (In-App)

Navigate to **Settings → Backend Configuration** to manually set or override the backend URL at runtime. This is powered by `configService.js`.

---

## 4. Project Structure

```
lunest-mobile/
├── app/                              # Expo Router — file-based routing
│   ├── _layout.jsx                   # Root layout: auth guard + session check
│   ├── index.jsx                     # Entry: redirects to tabs or auth
│   ├── (tabs)/                       # Guest tab navigator (authenticated)
│   ├── (host-tabs)/                  # Host tab navigator (host role required)
│   ├── create-listing/               # 10-step listing creation wizard
│   └── [40+ route files]             # Individual screen wrappers
├── src/
│   ├── screens/                      # Screen implementations
│   │   ├── auth/                     # Login, signup, OTP, password
│   │   ├── host/                     # Host dashboard, earnings, listings, bookings
│   │   ├── guest/                    # Guest home, explore
│   │   ├── booking/                  # Booking details
│   │   ├── payment/                  # Payment screens
│   │   ├── profile/                  # Profile management
│   │   ├── properties/               # Property detail views
│   │   ├── messages/                 # Messaging
│   │   ├── notifications/            # Notification history
│   │   └── account/                  # Account settings
│   ├── services/                     # 22 services (API, auth, storage, etc.)
│   ├── context/                      # UserModeContext (Guest ↔ Host switching)
│   └── hooks/                        # Custom React hooks
├── components/                       # Shared/global UI components
├── hooks/                            # Global hooks
├── constants/                        # App-wide constants
├── assets/                           # Images, fonts, icons
├── .env                              # Local environment variables (not in git)
├── .env.example                      # Template — copy to .env
├── app.json                          # Expo app configuration
├── package.json                      # Dependencies & scripts
├── babel.config.js                   # Babel config (NativeWind + Expo preset)
├── metro.config.js                   # Metro bundler config (SVG support)
├── tailwind.config.js                # NativeWind/Tailwind config
├── reset-cache.ps1                   # Windows: full cache reset + validation
└── reset-cache.sh                    # macOS/Linux: full cache reset + validation
```

---

## 5. Key Features

### Guest Features
- Browse and search property listings
- View full property details (images, video, amenities, rules)
- Select booking dates and guest count
- Pay via wallet (Paystack top-up) or card
- Track bookings and statuses
- Save/bookmark favourite listings
- Coupon code redemption
- Loyalty points tracking
- Referral programme

### Host Features
- 10-step listing creation with auto-save drafts
- Listing preview before publishing
- Manage listings (edit, pause, delete)
- View and respond to booking requests
- Host earnings dashboard (wallet + transaction history)
- Availability calendar management
- Caution fee dispute resolution
- KYC verification for host onboarding

### Platform Features
- Guest ↔ Host mode switching (single account)
- Support chat (live)
- Push notification history
- Inactivity session timeout
- Device session management
- Wallet: top-up, withdraw, transaction history

---

## 6. Services Overview

All services live in `src/services/`. There are **22 services** in total.

| Service | Purpose |
|---------|---------|
| `apiClient.js` | HTTP client — GET/POST/PUT/PATCH/DELETE with auth headers |
| `authService.js` | Full auth lifecycle: login, register, logout, token refresh |
| `configService.js` | Dynamic platform URL detection + runtime override |
| `storageService.js` | AsyncStorage abstraction |
| `secureStorageService.js` | Expo SecureStore for tokens and credentials |
| `listingService.js` | Listing CRUD, image/video upload |
| `bookingService.js` | Booking creation and management |
| `dashboardService.js` | Host dashboard stats aggregation |
| `draftListingService.js` | Auto-save for 10-step listing creation |
| `paymentService.js` | Paystack payment init, wallet top-up, withdrawal |
| `bookmarkService.js` | Saved listings management |
| `profileService.js` | User profile read/update |
| `imageCompressionService.js` | Client-side image compression before upload |
| `locationService.js` | Google Places Autocomplete + geocoding |
| `notificationService.js` | Push notification registration and handling |
| `deviceSessionService.js` | Active session tracking (single-session enforcement) |
| `inactivityTimeoutService.js` | Auto-logout after idle period |
| `referralService.js` | Referral code generation and rewards |
| `kycService.js` | KYC flow for host onboarding |
| `hostService.js` | Host profile + listings summary |
| `networkErrorHandler.js` | Centralized network error translation |
| `userDataService.js` | Quick user data access helper |

---

## 7. Backend Integration

### Start the Backend

```bash
cd "c:\Users\AkintayoPC\Documents\ReactApp\lunest back\lunest_backend"
npm start
# or
npm run dev   # if nodemon is configured
```

Backend runs on **port 3000** by default.

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/users/login` | Login |
| POST | `/v1/users/register` | Register |
| POST | `/v1/users/refresh` | Token refresh |
| GET | `/v1/users/profile` | Get profile |
| GET | `/v1/listings` | Browse listings |
| POST | `/v1/listings` | Create listing |
| POST | `/v1/bookings` | Create booking |
| POST | `/v1/wallet` | Wallet balance |
| GET | `/v1/my-transactions` | Transaction history |
| POST | `/v1/wallet/fund` | Fund wallet |
| POST | `/v1/wallet/withdraw` | Withdraw |

### Response Format

All endpoints return:
```json
{
  "body": { /* data */ },
  "message": "Human-readable status message"
}
```

---

## 8. Common Issues & Solutions

### Metro Cache / Stale Code

```bash
npx expo start --clear
# or run the full reset:
.\reset-cache.ps1      # Windows (PowerShell)
./reset-cache.sh       # macOS/Linux
```

The reset scripts also validate that key files (`authService.js`, `listingService.js`, `review.jsx`) are correctly exporting.

### "Network request failed"

1. Confirm backend is running on port 3000
2. Check `.env` has the correct `EXPO_PUBLIC_API_URL`
3. Physical device? Must be on the same WiFi as your machine
4. Windows? Check Firewall allows port 3000 through

### "Request timeout"

- Increase `EXPO_PUBLIC_API_TIMEOUT` in `.env` (default: 60000ms)
- Check backend server logs for slow queries

### Port 8081 Already in Use

```bash
# Windows: kill the process using port 8081
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Reinstall Dependencies

```bash
# Windows
rd /s /q node_modules
del package-lock.json
npm install

# macOS/Linux
rm -rf node_modules package-lock.json
npm install
```

### NativeWind / Emoji Crash

Avoid using emoji characters directly inside `<Text>` components when using NativeWind. This causes a `TypeError: Cannot call a class as a function` crash in `react-native-css-interop`.

---

## 9. Testing & Debugging

### Console Logs

- **Mobile**: Terminal running the dev server
- **Web**: Browser DevTools → Console (F12)

### Key Log Prefixes

| Prefix | Source |
|--------|--------|
| `[APIClient]` | HTTP requests and URL initialization |
| `[AuthService]` | Login, logout, token events |
| `[ConfigService]` | URL detection |
| `[HostEarnings]` | Earnings screen data |
| `[BookingPayment]` | Payment processing |
| `[DraftListing]` | Auto-save events |

### Expo Dev Tools

```bash
npx expo start
# Press 'j' to open the JavaScript debugger
# Press 'm' to toggle the Expo DevTools menu
```

### Check Project Health

```bash
npx expo doctor      # Checks for known issues with your setup
npm audit            # Security scan on dependencies
```

---

## 10. Building for Production

### EAS Build (Recommended)

```bash
# Setup (first time only)
npm install -g eas-cli
eas login
eas init

# Build
eas build --platform ios
eas build --platform android
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Web Export

```bash
npx expo export --platform web
```

### Pre-Build Checklist

- [ ] `.env` has production API URL
- [ ] `EXPO_PUBLIC_ENABLE_DEBUG_MODE=false`
- [ ] `app.json` version is bumped
- [ ] All console.log statements reviewed
- [ ] `npx expo doctor` passes cleanly

---

## 11. Git Workflow

### `.gitignore` Highlights

```
node_modules/
.expo/
.env
*.local
android/
ios/
dist/
web-build/
```

### Branching Convention

```
main          → production-ready code
develop       → integration branch
feature/xxx   → new feature
fix/xxx       → bug fix
```

### Commit Messages

```bash
git commit -m "feat: add caution fee earnings filter"
git commit -m "fix: exclude ON_HOLD security deposits from total earnings"
git commit -m "docs: update development guide to v1.3.0"
```

---

## 12. Useful Commands

```bash
# Start with clean cache
npx expo start --clear

# Full cache + process reset (Windows)
.\reset-cache.ps1

# Full cache + process reset (macOS/Linux)
./reset-cache.sh

# Check Expo project health
npx expo doctor

# Lint the codebase
npm run lint

# List installed packages (top-level)
npm list --depth=0

# Check for outdated packages
npm outdated

# Security audit
npm audit
```

---

## 13. Resources

### Official Documentation

- [Expo Docs](https://docs.expo.dev)
- [Expo Router](https://docs.expo.dev/routing/introduction/)
- [React Native Docs](https://reactnative.dev)
- [NativeWind Docs](https://www.nativewind.dev)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Useful Tools

- [Expo Go App](https://expo.dev/client) — for physical device testing
- [EAS Build](https://docs.expo.dev/build/introduction/) — for production builds
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)

---

## Version History

| Version | Date       | Summary |
|---------|------------|---------|
| 1.3.0   | April 2026 | Financial accuracy patches, documentation rewrite, 11 files cleaned up |
| 1.2.0   | March 2026 | Listing creation flow, draft auto-save, payment integration, 22 services |
| 1.1.0   | July 2025  | Comprehensive audit — fonts, hardcoded IPs, emoji crash fix |
| 1.0.0   | Jan 2026   | Initial release |

---

**Maintained by:** Lunest Development Team
