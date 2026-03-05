# Lunest Mobile App - Software Documentation

**Version:** 1.1.0  
**Last Updated:** July 2025  
**Platform:** Expo SDK 54 (React Native)
**Audit Status:** ✅ Comprehensive audit completed

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Network Configuration](#4-network-configuration)
5. [Authentication Flow](#5-authentication-flow)
6. [Services Documentation](#6-services-documentation)
7. [Navigation Structure](#7-navigation-structure)
8. [Issues Fixed](#8-issues-fixed)
9. [Known Issues & Recommendations](#9-known-issues--recommendations)
10. [Development Setup](#10-development-setup)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Audit Report & Fixes Applied](#12-audit-report--fixes-applied)

---

## 1. Overview

Lunest is a property rental mobile application that allows users to:

- **Guests**: Browse and book properties
- **Hosts**: List and manage rental properties

### Tech Stack

| Component        | Technology                 |
| ---------------- | -------------------------- |
| Framework        | React Native (Expo SDK 54) |
| Navigation       | Expo Router v6             |
| Styling          | NativeWind (Tailwind CSS)  |
| State Management | React Context API          |
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
│  ┌───────────────────────┴────────────────────────┐    │
│  │                   SERVICES                      │    │
│  ├─────────────┬─────────────┬────────────────────┤    │
│  │ authService │ apiClient   │ configService      │    │
│  │ listingServ │ bookingServ │ storageService     │    │
│  │ profileServ │ dashboardSv │ secureStorageServ  │    │
│  └─────────────┴──────┬──────┴────────────────────┘    │
│                       │                                 │
└───────────────────────┼─────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  LUNEST BACKEND API                      │
│              (Express.js + MongoDB)                      │
│                  Port: 3000                              │
│              Routes: /v1/users, /v1/listings, etc.      │
└─────────────────────────────────────────────────────────┘
```

### Service Layer Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Service Layer                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ apiClient   │◄───│ authService │───►│configService│  │
│  │             │    │             │    │             │  │
│  │ - GET/POST  │    │ - login()   │    │ - getBaseURL│  │
│  │ - PUT/PATCH │    │ - register()│    │ - detect    │  │
│  │ - DELETE    │    │ - logout()  │    │   Platform  │  │
│  │ - timeout   │    │ - refresh() │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │          │
│         ▼                  ▼                  ▼          │
│  ┌─────────────────────────────────────────────────────┐│
│  │              storageService / secureStorageService  ││
│  │  - AsyncStorage (general data)                      ││
│  │  - SecureStore (tokens, credentials)                ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
lunest-mobile/
├── app/                          # Expo Router pages (file-based routing)
│   ├── _layout.jsx               # Root layout with auth check
│   ├── index.jsx                 # Entry point with routing logic
│   ├── onboarding.jsx            # Onboarding screen
│   ├── login.jsx                 # Login page wrapper
│   ├── signup.jsx                # Signup page wrapper
│   ├── forgot-password.jsx       # Password reset flow
│   ├── verify-code.jsx           # OTP verification
│   ├── reset-password.jsx        # New password entry
│   ├── (tabs)/                   # Guest tab navigator
│   │   ├── _layout.jsx           # Tab layout configuration
│   │   ├── index.jsx             # Home/Explore screen
│   │   ├── bookings.jsx          # User bookings
│   │   ├── saved.jsx             # Saved/bookmarked listings
│   │   ├── messages.jsx          # Chat/messages
│   │   └── profile.jsx           # User profile
│   ├── (host-tabs)/              # Host tab navigator
│   │   ├── _layout.jsx           # Host tab configuration
│   │   ├── index.jsx             # Host dashboard
│   │   ├── listings.jsx          # Host's listings
│   │   ├── bookings.jsx          # Received bookings
│   │   ├── earnings.jsx          # Earnings overview
│   │   ├── calendar.jsx          # Availability calendar
│   │   ├── messages.jsx          # Host messages
│   │   └── profile.jsx           # Host profile
│   └── create-listing/           # Listing creation flow
│       ├── _layout.jsx           # Creation flow layout
│       ├── index.jsx             # Start listing
│       ├── property-type.jsx     # Property type selection
│       ├── property-details.jsx  # Details entry
│       ├── location.jsx          # Location picker
│       ├── amenities.jsx         # Amenities selection
│       ├── photos.jsx            # Photo upload
│       ├── pricing.jsx           # Pricing setup
│       ├── availability.jsx      # Calendar setup
│       ├── house-rules.jsx       # Rules entry
│       └── review.jsx            # Review & publish
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── shared/               # Cross-screen components
│   │   ├── forms/                # Form components
│   │   └── cards/                # Card components
│   ├── screens/                  # Screen implementations
│   │   ├── auth/                 # Auth screens (LoginScreen, SignupScreen)
│   │   ├── guest/                # Guest-specific screens
│   │   └── host/                 # Host-specific screens
│   ├── services/                 # Business logic & API calls
│   │   ├── apiClient.js          # HTTP client wrapper
│   │   ├── authService.js        # Authentication logic
│   │   ├── configService.js      # Dynamic configuration
│   │   ├── storageService.js     # AsyncStorage wrapper
│   │   ├── secureStorageService.js # SecureStore wrapper
│   │   ├── listingService.js     # Listing operations
│   │   ├── bookingService.js     # Booking operations
│   │   ├── profileService.js     # Profile operations
│   │   └── networkErrorHandler.js # Error handling
│   ├── context/                  # React Context providers
│   │   ├── index.js              # Context exports
│   │   └── UserModeContext.jsx   # Guest/Host mode switching
│   ├── constants/                # App constants
│   ├── utils/                    # Utility functions
│   └── assets/                   # Static assets
├── assets/                       # Public assets
│   ├── fonts/                    # Custom fonts
│   └── images/                   # Images & icons
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── metro.config.js               # Metro bundler config
├── babel.config.js               # Babel configuration
└── tailwind.config.js            # Tailwind/NativeWind config
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

### Environment Configuration

```env
# .env file
EXPO_PUBLIC_API_URL=http://10.35.46.46:3000
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
```

### URL Detection Logic (configService.js)

```javascript
async detectEnvironmentURL() {
  // 1. Web platform always uses localhost
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  // 2. Check for explicit ENV variable
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  if (envURL) {
    return envURL;
  }

  // 3. Fallback
  return "http://localhost:3000";
}
```

---

## 5. Authentication Flow

### Login Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│   User      │     │ LoginScreen  │     │ authService │     │  Backend │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
       │                   │                    │                  │
       │ Enter credentials │                    │                  │
       │──────────────────►│                    │                  │
       │                   │                    │                  │
       │                   │ login(credentials) │                  │
       │                   │───────────────────►│                  │
       │                   │                    │                  │
       │                   │                    │ POST /v1/users/login
       │                   │                    │─────────────────►│
       │                   │                    │                  │
       │                   │                    │ {token, refreshToken, user}
       │                   │                    │◄─────────────────│
       │                   │                    │                  │
       │                   │                    │ _storeTokens()   │
       │                   │                    │ (SecureStore)    │
       │                   │                    │                  │
       │                   │ {success: true}    │                  │
       │                   │◄───────────────────│                  │
       │                   │                    │                  │
       │ Navigate to (tabs)│                    │                  │
       │◄──────────────────│                    │                  │
```

### Token Storage

| Data          | Storage      | Location               |
| ------------- | ------------ | ---------------------- |
| Auth Token    | SecureStore  | `auth_token_secure`    |
| Refresh Token | SecureStore  | `refresh_token_secure` |
| Token Expiry  | SecureStore  | `token_expiry`         |
| User Data     | AsyncStorage | `userData`             |

### Security Features

1. **Rate Limiting**: Max 5 failed login attempts, 15-minute lockout
2. **Secure Storage**: Tokens stored in encrypted storage (expo-secure-store)
3. **Token Validation**: JWT structure and expiry validation
4. **Auto-refresh**: Tokens refreshed 5 minutes before expiry
5. **Input Sanitization**: All inputs sanitized before API calls

---

## 6. Services Documentation

### apiClient.js

**Purpose**: Cross-platform HTTP client with automatic timeout and retry logic.

```javascript
// Methods
await apiClient.initialize(); // Initialize with correct URL
await apiClient.get(endpoint, options); // GET request
await apiClient.post(endpoint, data); // POST request
await apiClient.put(endpoint, data); // PUT request
await apiClient.patch(endpoint, data); // PATCH request
await apiClient.delete(endpoint); // DELETE request
apiClient.setBaseURL(url); // Change base URL
```

### authService.js

**Purpose**: Complete authentication management.

```javascript
// Public Methods
await authService.initialize(); // Initialize service
await authService.login(credentials); // User login
await authService.register(userData); // User registration
await authService.logout(); // User logout
await authService.forgotPassword(email); // Request password reset
await authService.resetPassword(token, pw); // Reset password
await authService.isLoggedIn(); // Check auth status
await authService.getToken(); // Get current token
await authService.refreshToken(); // Refresh auth token
await authService.getUserData(); // Get stored user data
```

### configService.js

**Purpose**: Dynamic platform detection and URL configuration.

```javascript
// Methods
await configService.getBaseURL(); // Get detected URL
await configService.setCustomBackendURL(url); // Override URL
await configService.clearCustomBackendURL(); // Clear override
await configService.testConnection(); // Test backend connectivity
await configService.reset(); // Reset to defaults
```

### storageService.js

**Purpose**: Cross-platform storage abstraction.

```javascript
// Methods
await storageService.setItem(key, value); // Store data
await storageService.getItem(key); // Retrieve data
await storageService.removeItem(key); // Remove data
await storageService.clear(); // Clear all data
await storageService.getAllKeys(); // List all keys
```

---

## 7. Navigation Structure

### Route Hierarchy

```
/                           → index.jsx (redirect logic)
├── /onboarding            → Onboarding screens
├── /login                 → Login screen
├── /signup                → Signup screen
├── /forgot-password       → Password reset request
├── /verify-code           → OTP verification
├── /reset-password        → New password entry
├── /(tabs)                → Guest navigation (authenticated)
│   ├── /                  → Home/Explore
│   ├── /bookings          → My Bookings
│   ├── /saved             → Saved Listings
│   ├── /messages          → Messages
│   └── /profile           → Profile
├── /(host-tabs)           → Host navigation (host users)
│   ├── /                  → Dashboard
│   ├── /listings          → My Listings
│   ├── /bookings          → Received Bookings
│   ├── /earnings          → Earnings
│   ├── /calendar          → Calendar
│   ├── /messages          → Messages
│   └── /profile           → Profile
├── /create-listing/*      → Listing creation flow
├── /property-details      → Property detail view
├── /select-booking-details → Booking date selection
├── /booking-summary       → Booking confirmation
└── /booking-confirmation  → Success modal
```

### Protected Routes

Routes under `/(tabs)` and `/(host-tabs)` are protected and require authentication. The root `_layout.jsx` handles auth checking and redirects.

---

## 8. Issues Fixed

### 8.1 Network Connection Timeout Error

**Problem**: `Token refresh failed: [Error: Request timeout - please check your connection]`

**Root Cause**: Hardcoded fallback IP `192.168.0.200` was unreachable.

**Fix Applied**:

1. Removed all hardcoded IPs from services
2. Changed fallback to `localhost:3000`
3. Added proper platform detection
4. Increased default timeout to 60 seconds

**Files Modified**:

- `src/services/apiClient.js`
- `src/services/authService.js`
- `src/services/configService.js`
- `.env`

### 8.2 Platform URL Detection

**Problem**: Web, iOS Simulator, and Android Emulator needed different URLs.

**Fix Applied**: Implemented automatic platform detection in `apiClient.js` and `configService.js`.

### 8.3 Test Files with Hardcoded IPs

**Problem**: Debug scripts had hardcoded IPs that wouldn't work in other environments.

**Fix Applied**: Changed to use environment variables with localhost fallback.

**Files Modified**:

- `test-login-debug.js`
- `test-login-complete.js`

---

## 9. Known Issues & Recommendations

### 9.1 Current Issues

| Issue                              | Severity | Description                                   | Recommendation               |
| ---------------------------------- | -------- | --------------------------------------------- | ---------------------------- |
| No Token Auto-Refresh Trigger      | Medium   | Token refresh only happens on request failure | Add background refresh check |
| No Offline Support                 | Medium   | App doesn't work offline                      | Implement offline queue      |
| No Error Boundary                  | Medium   | Unhandled errors crash app                    | Add React error boundaries   |
| react-native-css-interop Emoji Bug | Low      | Emojis in Text components can crash app       | Avoid emoji in styled Text   |

### 9.2 Recommendations

#### High Priority

1. **Add Global Error Boundary**

   ```jsx
   // Wrap app in ErrorBoundary component
   <ErrorBoundary fallback={<ErrorScreen />}>
     <App />
   </ErrorBoundary>
   ```

2. **Implement Token Auto-Refresh**

   ```javascript
   // Add periodic token check (every 5 minutes)
   useEffect(() => {
     const interval = setInterval(
       () => {
         authService.checkAndRefreshToken();
       },
       5 * 60 * 1000,
     );
     return () => clearInterval(interval);
   }, []);
   ```

3. **Add Network Status Listener**

   ```javascript
   import NetInfo from "@react-native-community/netinfo";

   NetInfo.addEventListener((state) => {
     if (!state.isConnected) {
       // Show offline banner
     }
   });
   ```

#### Medium Priority

4. **Add Loading States for All API Calls**
5. **Implement Request Caching**
6. **Add Pull-to-Refresh on Lists**
7. **Implement Deep Linking**

#### Low Priority

8. **Add Analytics Integration**
9. **Implement Push Notifications**
10. **Add App Rating Prompt**

---

## 10. Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (iOS/Android) for testing
- Backend running on port 3000

### Installation

```bash
# Clone repository
cd lunest-mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL
```

### Running the App

```bash
# Start Expo development server
npx expo start --clear

# Or with specific platform
npx expo start --web        # Web browser
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
```

### Environment Setup by Platform

| Platform         | .env Configuration                          |
| ---------------- | ------------------------------------------- |
| Web              | Not needed (auto-detects localhost)         |
| iOS Simulator    | `EXPO_PUBLIC_API_URL=http://localhost:3000` |
| Android Emulator | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`  |
| Physical Device  | `EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000` |

### Finding Your IP Address

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet "
```

---

## 11. Troubleshooting Guide

### Common Issues

#### "Network request failed"

**Cause**: Cannot connect to backend  
**Solutions**:

1. Ensure backend is running: `http://localhost:3000/v1/`
2. Check `.env` has correct `EXPO_PUBLIC_API_URL`
3. For physical devices, ensure same WiFi network
4. Check Windows Firewall allows port 3000

#### "Request timeout"

**Cause**: Backend took too long to respond  
**Solutions**:

1. Increase `EXPO_PUBLIC_API_TIMEOUT` in `.env`
2. Check backend isn't overloaded
3. Check network connection quality

#### "Invalid authentication response"

**Cause**: Backend returned unexpected format  
**Solutions**:

1. Check backend is returning `{ body: { token, user } }`
2. Verify backend JWT secret is configured

#### "Too many failed attempts"

**Cause**: Rate limiting triggered  
**Solutions**:

1. Wait 15 minutes
2. Or clear AsyncStorage to reset counter

### Debug Commands

```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Check package issues
npm ls --depth=0

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Logs to Check

1. **Expo Console**: Shows React Native logs
2. **Browser DevTools**: For web testing
3. **Backend Logs**: Docker logs or terminal output

---

## Backend API Reference

### Endpoints Used

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/v1/users/register`        | User registration      |
| POST   | `/v1/users/login`           | User login             |
| POST   | `/v1/users/logout`          | User logout            |
| POST   | `/v1/users/refresh`         | Token refresh          |
| GET    | `/v1/users/profile`         | Get user profile       |
| POST   | `/v1/users/forgot-password` | Request password reset |
| POST   | `/v1/users/reset-password`  | Reset password         |
| GET    | `/v1/listings`              | Get listings           |
| POST   | `/v1/bookings`              | Create booking         |

### Response Format

```json
{
  "body": {
    /* response data */
  },
  "message": "Success message"
}
```

---

## Changelog

### v1.1.0 (July 2025) - Comprehensive Audit

**Fixes Applied:**

- ✅ Removed 100+ hardcoded `fontFamily: "Aeonik Pro"` and `fontFamily: "Aeonik TRIAL"` references (fonts were missing)
- ✅ Fixed hardcoded IP `192.168.0.200` in `networkErrorHandler.js` - now uses env variable
- ✅ Removed emoji characters from Text components (caused react-native-css-interop crash)
- ✅ Updated `tailwind.config.js` to use system fonts instead of missing Aeonik fonts
- ✅ Removed unnecessary files: test-login-debug.js, test-login-complete.js, diagnose-network.sh
- ✅ Removed outdated documentation: PROFILE_DATA_PERSISTENCE_FIX.md, NIN_SIGNUP_VALIDATION.md, NIN_FEATURE_IMPLEMENTATION.md, NGROK_SETUP.md, NETWORK_FIX_GUIDE.md

**Files Cleaned:**

- 8 unnecessary files removed
- 100+ font references removed from 15+ files
- 2 hardcoded IPs fixed

### v1.0.0 (January 2025)

- Initial documentation
- Fixed network connection issues
- Removed hardcoded IP addresses
- Added platform-specific URL detection
- Increased default timeout to 60 seconds

---

## 12. Audit Report & Fixes Applied

### Audit Summary

A comprehensive codebase audit was performed to ensure error-free Expo connectivity across:

- Web browser
- iOS Expo Go
- Android Expo Go

### Critical Fixes

#### 1. Missing Font Files (HIGH PRIORITY - FIXED)

**Problem:** 100+ components referenced `fontFamily: "Aeonik Pro"` and `fontFamily: "Aeonik TRIAL"` but the `assets/fonts/` directory only contained a README.md with instructions - no actual font files.

**Impact:** Would cause styling inconsistencies and potential font-related warnings.

**Solution:** Removed all custom font references, now using system fonts.

**Files Affected:**

- PropertyDetailsScreen.jsx
- FullDetailsScreen.jsx
- ProfileScreen.jsx
- PersonalInfoEditScreen.jsx
- OnboardingScreen.jsx
- HostMessagesScreen.jsx
- HostListingsScreen.jsx
- HostInformation.jsx
- And 7+ more files

#### 2. Hardcoded IPs (HIGH PRIORITY - FIXED)

**Problem:** `networkErrorHandler.js` contained hardcoded IP `192.168.0.200:3000` which wouldn't work on different networks.

**Solution:** Changed to use `process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"`.

#### 3. Emoji Crash Bug (MEDIUM PRIORITY - FIXED)

**Problem:** Using emoji characters (✨, 🔍) inside `<Text>` components with NativeWind/react-native-css-interop caused a crash: `TypeError: Cannot call a class as a function`.

**Solution:** Removed emoji from empty state components in TopPicksSection.jsx.

#### 4. Cleanup of Unnecessary Files (LOW PRIORITY - FIXED)

**Removed Files:**

- `test-login-debug.js` - Test script with hardcoded IPs in comments
- `test-login-complete.js` - Test script, not needed for production
- `diagnose-network.sh` - Diagnostic script with hardcoded IPs
- `PROFILE_DATA_PERSISTENCE_FIX.md` - Completed fix log
- `NIN_SIGNUP_VALIDATION.md` - Feature implementation log
- `NIN_FEATURE_IMPLEMENTATION.md` - Feature implementation log
- `NGROK_SETUP.md` - Redundant with main docs
- `NETWORK_FIX_GUIDE.md` - Redundant with main docs

### Remaining Recommendations

| Priority | Recommendation                    | Rationale                                   |
| -------- | --------------------------------- | ------------------------------------------- |
| High     | Add Error Boundaries              | Prevent app crashes from unhandled errors   |
| High     | Implement token auto-refresh      | Currently only refreshes on request failure |
| Medium   | Add NetInfo for offline detection | Better UX when offline                      |
| Medium   | Implement request caching         | Improve performance and offline support     |
| Low      | Add analytics                     | Track user behavior and errors              |
| Low      | Configure push notifications      | User engagement                             |

### Testing Checklist

To verify the app works correctly after the audit:

1. **Web Testing:**

   ```bash
   npx expo start --web
   ```

   - Login should work
   - Navigation between tabs works
   - No font-related warnings in console

2. **iOS Expo Go Testing:**
   - Update `.env`: `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:3000`
   - Ensure backend is running
   - Scan QR code with Expo Go app
   - Test login, navigation, listing creation

3. **Android Expo Go Testing:**
   - Same as iOS
   - For emulator use: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`

---

_Documentation maintained by the development team._
_Last audit: July 2025_
