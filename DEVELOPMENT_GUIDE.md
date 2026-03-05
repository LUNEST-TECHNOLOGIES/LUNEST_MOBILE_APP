# Lunest Mobile App - Development Guide

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or physical iOS device
- Android Emulator or physical Android device

### Installation

```bash
# Install dependencies
npm install

# Install required packages
npm install react-native-css-interop

# Clear cache if needed
npx expo start -c
```

---

## Running the App

### Development Server

```bash
# Start Expo dev server
cd "c:\Users\AkintayoPC\Documents\Lunest_app\lunest-mobile"
npx expo start

# Available commands while running:
# 'a' - Open Android
# 'i' - Open iOS Simulator
# 'w' - Open web version
# 'r' - Reload app
# 'c' - Clear cache and restart
# 'j' - Open debugger
# 'm' - Toggle menu
# 'o' - Open in code editor
# '?' - Show all commands
```

### Testing on Devices

#### iOS Simulator

- Requires macOS with Xcode installed
- Press `i` when dev server is running

#### Physical iOS Device

1. Install Expo Go app from App Store
2. Run `npx expo start`
3. Scan QR code with Camera app
4. Opens in Expo Go

#### Android Emulator

- Requires Android SDK
- Press `a` when dev server is running

#### Physical Android Device

1. Install Expo Go from Google Play
2. Run `npx expo start`
3. Scan QR code with Expo Go app

---

## Network Configuration

### Backend URL Setup

The app auto-detects backend URL based on environment:

#### iOS Simulator

- Default: `http://127.0.0.1:3000`
- Custom: Settings → Backend Configuration → Enter IP

#### Physical iOS Device

- Requires: Computer IP (same WiFi)
- Enter via: Settings → Backend Configuration

#### Android Emulator

- Automatic: `http://10.0.2.2:3000`

#### Android Physical Device

- Requires: Computer IP (same WiFi)
- Enter via: Settings → Backend Configuration

### Get Your Computer IP

```bash
# Windows
ipconfig | findstr IPv4

# macOS/Linux
ifconfig | grep "inet "
```

---

## Key Features

### Authentication

- Email/password login
- OTP verification
- Password reset flow
- Session persistence (AsyncStorage)

### Listings

- Browse available listings
- View listing details with images
- Host information display
- Status indicators (AVAILABLE, BOOKED)
- Create new listings (hosts)

### Bookings

- Search and filter listings
- Select dates and details
- Make bookings
- View booking history
- Track booking status

### User Profiles

- Edit personal information
- Manage host applications
- View transaction history
- Manage payment methods

---

## Project Structure

```
lunest-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tabbed navigation screens
│   ├── (host-tabs)/       # Host-specific screens
│   ├── create-listing/    # Listing creation flow
│   ├── login.jsx          # Login screen
│   ├── signup.jsx         # Sign up screen
│   ├── index.jsx          # Home screen
│   └── ...
├── src/                   # Custom code
│   ├── api/              # API client setup
│   ├── services/         # Service layers
│   ├── hooks/            # Custom hooks
│   ├── constants/        # App constants
│   └── utils/            # Utility functions
├── components/            # Reusable components
│   └── ui/               # UI component library
├── assets/               # Images, fonts, etc.
│   ├── images/
│   └── fonts/
├── package.json          # Dependencies
├── app.json              # Expo configuration
├── tailwind.config.js    # Tailwind CSS config
└── metro.config.js       # Metro bundler config
```

---

## Environment Variables

Create `.env` file with:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
EXPO_PUBLIC_API_TIMEOUT=30000

# App Configuration
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_VERSION=1.0.0

# Debug Options
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
```

---

## Backend Service

Backend must be running for full functionality.

### Start Backend

```bash
cd "c:\Users\AkintayoPC\Documents\ReactApp\lunest back\lunest_backend"
npm start
```

### Backend Endpoints (Key)

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `GET /listings` - Fetch listings
- `POST /listings` - Create listing
- `GET /listings/:id` - Get listing details
- `POST /bookings` - Create booking
- `GET /users/:id` - Get user profile

### Test Credentials

- **Email:** `tayobabafemi@gmail.com`
- **Password:** See backend `.env`

---

## Common Issues & Solutions

### Metro Cache Issues

```bash
npx expo start -c
# or
npx expo start --clear
```

### Port Already in Use

```bash
# If port 8081 is in use, Expo will ask to use another port
# Type 'y' to proceed with alternate port
```

### Network Connection Failed

1. Verify backend is running: `http://localhost:3000`
2. Check your computer IP: `ipconfig | findstr IPv4`
3. Use Settings → Backend Configuration to manually set URL
4. Ensure device and computer on same WiFi

### Dependencies Issues

```bash
# Reinstall all dependencies
rm -r node_modules package-lock.json
npm install
```

### React Native CSS Interop Error

```bash
npm install react-native-css-interop
```

---

## Testing & Debugging

### Debug Menu

- Press `j` while app is running to open debugger
- Use browser DevTools for web version

### Console Logs

- Mobile: Check terminal running dev server
- Web: Browser console (F12)

### Network Logs

- Check ConfigService logs in console
- Look for `📱 iOS` or `🤖 Android` platform detection
- Verify `[APIClient] initialized with: http://...` message

---

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

### Web

```bash
npx expo export --platform web
```

---

## Deployment

### EAS (Expo Application Services)

1. Setup account at expo.dev
2. Link project: `eas init`
3. Build: `eas build`
4. Submit: `eas submit`

---

## Git Workflow

### Ignored Files

- `/node_modules` - Dependencies
- `/.expo` - Expo cache
- `/ios` - Native iOS build
- `/android` - Native Android build
- `.env.local` - Local environment overrides
- Documentation files (added to .gitignore)

### Commit Changes

```bash
git add .
git commit -m "Feature: Description of changes"
git push origin branch-name
```

---

## Performance Tips

1. **Image Optimization** - Compress images before upload
2. **Lazy Loading** - Use dynamic imports for heavy components
3. **Memoization** - Use React.memo for expensive components
4. **Cache Strategy** - AsyncStorage for persistent data

---

## Useful Commands

```bash
# Clear all caches
npx expo start -c

# Clean build
rm -r .expo dist web-build

# Check dependencies
npm list

# Update dependencies
npm update

# Audit security
npm audit

# Check project status
npx expo doctor
```

---

## Support & Resources

### Official Docs

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Expo Router](https://docs.expo.dev/routing/introduction/)

### Community

- GitHub Issues
- Expo Forums
- Stack Overflow

---

## Version History

| Version | Date     | Changes         |
| ------- | -------- | --------------- |
| 1.0.0   | Jan 2026 | Initial release |

---

**Last Updated:** January 29, 2026  
**Maintained By:** Development Team
