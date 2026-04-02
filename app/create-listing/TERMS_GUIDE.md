# Terms Configuration Guide

## Overview
The terms and conditions in the create listing flow are now easily configurable and replaceable. This guide explains how to update the terms content.

## File Structure

### 1. Terms Configuration
**File**: `src/constants/termsConfig.js`

This file contains all the demo terms content and can be easily updated with actual legal terms.

### 2. Terms Modal Component
**File**: `src/components/create-listing/TermsModal.jsx`

Reusable modal component for displaying individual terms.

### 3. Terms Agreement Screen
**File**: `app/create-listing/terms-agreement.jsx`

Main screen that displays the terms list and handles user agreement.

## How to Update Terms

### Step 1: Edit the Terms Configuration
Open `src/constants/termsConfig.js` and update the `DEMO_TERMS` object:

```javascript
export const DEMO_TERMS = {
  termsOfService: {
    title: "Terms of Service", // Update title if needed
    lastUpdated: "March 25, 2026", // Update date
    sections: [
      {
        title: "Section Title",
        content: "Your actual terms content here..."
      },
      // Add more sections as needed
    ]
  },
  // Update listingAgreement and cancellationPolicy similarly
};
```

### Step 2: Add New Terms (Optional)
If you need to add additional terms:

1. Add the new term to `DEMO_TERMS` in `termsConfig.js`
2. Add a new term item in `terms-agreement.jsx` JSX:

```jsx
<View style={styles.tosItem}>
  <View style={styles.tosRow}>
    <Text style={styles.tosLabel}>New Term Title</Text>
    <Pressable style={styles.previewButton} onPress={() => handleViewTerm('newTermId')}>
      <Text style={styles.previewButtonText}>View</Text>
    </Pressable>
  </View>
</View>
```

### Step 3: Update Terms IDs
The following term IDs are currently used:
- `termsOfService` - Terms of Service
- `listingAgreement` - Listing Agreement  
- `cancellationPolicy` - Cancellation Policy

## Features

### ✅ Easily Replaceable
- All terms content is in one configuration file
- No need to modify component code for content updates
- Clean separation of content and presentation

### ✅ Modal Display
- Each term opens in a full-screen modal
- Scrollable content for long terms
- Professional styling with headers and sections

### ✅ Version Tracking
- Each term includes a "last updated" date
- Easy to track when terms were modified

### ✅ Responsive Design
- Works on both iOS and Android
- Handles different screen sizes
- Touch-friendly interface

## Styling

### Modal Styling
The modal uses consistent styling with the app design:
- Header with close button
- Last updated date display
- Scrollable content area
- Footer with close button

### Button Styling
- Light blue background for "View" buttons
- Consistent with app color scheme
- Touch-friendly sizing

## Future Enhancements

### Possible Improvements
1. **Dynamic Terms Loading**: Load terms from API/backend
2. **Multi-language Support**: Add translations for different languages
3. **Terms Versioning**: Track different versions of terms
4. **Acceptance Tracking**: Log when users accept specific terms
5. **PDF Export**: Allow users to download terms as PDF

### Integration with Backend
When ready to integrate with actual legal terms:

1. Create API endpoints for terms content
2. Update `termsConfig.js` to fetch from API
3. Add caching for performance
4. Include terms acceptance in user agreements

## Testing

### Manual Testing Checklist
- [ ] All three terms open correctly in modal
- [ ] Modal content is scrollable
- [ ] Close button works properly
- [ ] Terms agreement checkbox functions
- [ ] Navigation works after agreement

### Content Validation
- [ ] All terms content is accurate
- [ ] Dates are current
- [ ] Legal language is appropriate
- [ ] No placeholder content remains

## Support

For issues or questions about the terms configuration:
1. Check this documentation first
2. Verify the termsConfig.js file format
3. Test modal functionality separately
4. Review component imports and exports
