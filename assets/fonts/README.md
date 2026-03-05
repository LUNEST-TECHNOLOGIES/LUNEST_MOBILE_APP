# Aeonik Font Files

Place your Aeonik font files in this directory.

## Required Font Files:
- `Aeonik-Regular.otf` (or `.ttf`)
- `Aeonik-Medium.otf` (or `.ttf`)
- `Aeonik-Bold.otf` (or `.ttf`)

## Font Variants (Optional):
If you have additional weights, you can add:
- `Aeonik-Light.otf`
- `Aeonik-SemiBold.otf`
- `Aeonik-Black.otf`

## Setup Instructions:

1. **Add Font Files**: Copy your Aeonik font files to this directory (`assets/fonts/`)

2. **Update File Extensions** (if needed): 
   - If your fonts are `.ttf` instead of `.otf`, update `app/_layout.jsx`:
     ```jsx
     'Aeonik-Regular': require('../assets/fonts/Aeonik-Regular.ttf'),
     ```

3. **Update Font Names** (if different):
   - If your font files have different names, update both:
     - `app/_layout.jsx` (font loading)
     - `src/constants/theme.js` (font constants)

4. **Restart Expo**: After adding fonts, restart your Expo dev server:
   ```bash
   npx expo start --clear
   ```

## Current Configuration:
- Fonts are loaded in: `app/_layout.jsx`
- Font constants are in: `src/constants/theme.js`
- Tailwind config includes: `tailwind.config.js`

## Fallback:
If font files are not found, the app will automatically fall back to system fonts.
