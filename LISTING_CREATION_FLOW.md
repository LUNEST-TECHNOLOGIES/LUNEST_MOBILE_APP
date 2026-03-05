# Listing Creation Flow - Complete Guide

## Overview

The Lunest mobile app has a comprehensive **10-step listing creation flow** that allows hosts to create property listings for rent or sale. The flow supports both draft saving (incomplete listings) and published listings (submitted for admin approval).

---

## Flow Steps

### **Step 1: Intent Selection**

**File:** `app/create-listing/intent.jsx`

**Purpose:** Determine if listing is for RENT or SALE

**User Actions:**

- Select "RENT" (for monthly/seasonal rentals)
- Select "SALE" (for property purchase)

**Data Saved:**

- `intent`: 'RENT' | 'SALE'
- `currentStep: 2`

**Validation:**

- Intent is required
- Must be one of the valid options

---

### **Step 2: Property Details**

**File:** `app/create-listing/property-details.jsx`

**Purpose:** Enter basic property information

**Fields:**

- Property Name (required)
- Property Type (Apartment, Villa, House, etc.)
- Bedrooms (number)
- Bathrooms (number)
- Guests (max occupancy)
- Description (property overview)

**Data Saved:**

- `propertyName`: string
- `propertyType`: string
- `bedrooms`: number
- `bathrooms`: number
- `guests`: number
- `description`: string
- `currentStep: 3`

**Validation:**

- Property name: min 5 characters
- Bedrooms/Bathrooms: valid numbers
- All fields required for published listings

---

### **Step 3: Location**

**File:** `app/create-listing/location.jsx`

**Purpose:** Specify property location and address details

**Fields:**

- Full Address (street, city, state)
- City/Town
- State/Province
- Country
- Postal Code
- Map coordinates (optional)

**Data Saved:**

- `propertyLocation`: {
  - `fullAddress`: string
  - `city`: string
  - `state`: string
  - `country`: string
  - `postalCode`: string
  - `coordinates`: { lat, lng }
    }
- `currentStep: 4`

**Validation:**

- Full address required
- City/State/Country required
- Postal code format validation

---

### **Step 4: Amenities**

**File:** `app/create-listing/amenities.jsx`

**Purpose:** Select available amenities in property

**Features:**

- Categorized amenities (WiFi, Kitchen, Parking, etc.)
- Search amenities
- Custom amenities (add your own)
- Tips overlay for selection guidance

**Data Saved:**

- `amenities`: [{
  - `label`: string
  - `category`: string
  - `selected`: boolean
    }]
- `customAmenities`: string[]
- `currentStep: 5`

**Validation:**

- At least 3 amenities recommended
- Can add custom amenities

---

### **Step 5: Photos**

**File:** `app/create-listing/photos.jsx`

**Purpose:** Upload property photos and videos

**Features:**

- Upload minimum 3 photos (max 10)
- Auto image compression
- Reorder photos
- Delete photos
- Optional video upload

**Data Saved:**

- `propertyImages`: string[] (photo URIs)
- `video`: string (optional video URI)
- `currentStep: 6`

**Technical Details:**

- Images auto-compressed using `imageCompressionService`
- Format: PNG, JPG
- Max 10MB per image
- Web: base64 data URLs
- Mobile: file:// URIs

**Validation:**

- Minimum 3 photos required
- Max 10 photos
- All photos required before next step

---

### **Step 6: Pricing**

**File:** `app/create-listing/pricing.jsx`

**Purpose:** Set property rental/sale price

**Fields:**

- Price (numeric)
- Currency (₦, $, €, etc.)
- Pricing Period (Night, Week, Month - for rentals)
- Pricing Tiers (optional premium pricing)

**Data Saved:**

- `propertyPrice`: {
  - `price`: number
  - `currency`: string
  - `pricingPeriod`: 'NIGHT' | 'WEEK' | 'MONTH'
    }
- `currentStep: 7`

**Validation:**

- Price must be > 0
- Currency required
- Pricing period required for rentals

---

### **Step 7: House Rules**

**File:** `app/create-listing/house-rules.jsx`

**Purpose:** Define house rules and check-in/out times

**Fields:**

- Pre-defined Rules (No smoking, No pets, etc.)
- Custom Rules (add your own)
- Check-in Time (HH:MM format)
- Check-out Time (HH:MM format)

**Data Saved:**

- `houseRules`: string[] (selected rules)
- `customRules`: string[] (added by host)
- `checkInTime`: string (HH:MM)
- `checkOutTime`: string (HH:MM)
- `currentStep: 8`

**Validation:**

- At least 1 rule required
- Valid time format required

---

### **Step 8: Terms & Agreement**

**File:** `app/create-listing/terms-agreement.jsx`

**Purpose:** Accept Lunest terms and conditions

**Fields:**

- Checkbox: Agree to Terms & Conditions
- Checkbox: Agree to Cancellation Policy
- Checkbox: Agree to House Rules

**Data Saved:**

- `termsAccepted`: boolean
- `cancellationPolicyAccepted`: boolean
- `houseRulesAccepted`: boolean
- `currentStep: 9`

**Validation:**

- All checkboxes must be checked
- Required before publishing

---

### **Step 9: Pricing Tiers (Optional)**

**File:** `app/create-listing/pricing-tiers.jsx`

**Purpose:** Set optional tiered pricing for bulk bookings

**Fields:**

- Weekly discount (%)
- Monthly discount (%)
- Seasonal pricing adjustments
- Early bird discounts

**Data Saved:**

- `pricingTiers`: {
  - `weekly`: number (discount %)
  - `monthly`: number (discount %)
  - `seasonal`: array of seasonal prices
    }
- `currentStep: 10`

**Validation:**

- Discounts must be 0-100%
- All optional fields

---

### **Step 10: Review & Publish**

**File:** `app/create-listing/review.jsx`

**Purpose:** Final review and submit listing for approval

**Features:**

- Display all entered information
- Edit fields (navigate back to specific steps)
- Preview listing as guests would see it
- Submit for admin approval
- Save as draft option

**Process:**

1. Collect all draft data
2. Merge with form data
3. Upload images (convert to URLs)
4. Submit to backend
5. Clear draft data
6. Navigate to confirmation screen

**Data Sent to Backend:**

```javascript
{
  host: userId,
  intent: 'RENT' | 'SALE',
  propertyName: string,
  propertyType: string,
  bedrooms: number,
  bathrooms: number,
  guests: number,
  description: string,
  propertyLocation: {...},
  amenities: [...],
  propertyImages: [...],
  propertyPrice: {...},
  houseRules: [...],
  checkInTime: string,
  checkOutTime: string,
  termsAccepted: boolean,
  status: 'PENDING' (for approval)
}
```

**Response:**

```javascript
{
  success: true,
  message: "Listing created successfully. Awaiting admin approval.",
  listing: {...}
}
```

---

## Draft Saving

### How Drafts Work

Drafts allow hosts to save incomplete listings and continue later.

**Draft Service:** `src/services/draftListingService.js`

**Features:**

- Auto-save on navigation back
- Save to AsyncStorage
- Manual save option
- Resume from any step

**Draft Data Structure:**

```javascript
{
  draftId: string (unique),
  propertyName: string,
  intent: string,
  propertyType: string,
  bedrooms: number,
  bathrooms: number,
  guests: number,
  description: string,
  propertyLocation: {...},
  amenities: [...],
  photos: [...],
  video: string,
  propertyPrice: {...},
  houseRules: [...],
  customRules: [...],
  checkInTime: string,
  checkOutTime: string,
  pricingTiers: {...},
  currentStep: number,
  lastEditedAt: timestamp
}
```

### Resuming a Draft

1. Host navigates to **Listings** tab
2. Selects **Drafts** filter
3. Taps on draft to edit
4. System calculates current step from `draftData.currentStep`
5. Navigates to appropriate step
6. Pre-fills all data from draft

---

## API Endpoints

### Create Listing

```
POST /v1/listings/listing/create
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body: {listing data}

Response:
{
  success: true,
  message: string,
  body: {listing object}
}
```

### Status Workflow

**Draft → Pending Review → Available**

1. **DRAFT** - Incomplete, saved locally
2. **PENDING** - Submitted, awaiting admin approval
3. **AVAILABLE** - Approved, visible to guests
4. **BOOKED** - Currently rented/sold (unavailable)
5. **REJECTED** - Not approved by admin
6. **SUSPENDED** - Violates policies

---

## Navigation Flow

```
Intent Selection
    ↓
Property Details
    ↓
Location
    ↓
Amenities
    ↓
Photos
    ↓
Pricing
    ↓
House Rules
    ↓
Terms & Agreement
    ↓
Pricing Tiers
    ↓
Review & Publish
    ↓
Confirmation
```

**Back Navigation:**

- Can go back to previous steps
- Data preserved in draft
- Can jump to any previous step from Review screen

---

## State Management

### Draft Hook

**File:** `src/hooks/useDraftListing.js`

```javascript
const { draftData, saveDraftData, clearDraftData } = useDraftListing();

// Save draft
await saveDraftData({
  propertyName: "My Property",
  intent: "RENT",
  currentStep: 3,
  draftId: "unique-id",
});

// Clear draft
await clearDraftData();
```

### Form State

Each step manages its own state with `useState`:

```javascript
const [propertyName, setPropertyName] = useState("");
const [bedrooms, setBedrooms] = useState(0);
// ... other fields
```

---

## Image Handling

### Image Compression Service

**File:** `src/services/imageCompressionService.js`

**Features:**

- Auto compress on upload
- Reduce file size
- Maintain quality
- Convert to base64 (web) or file URIs (mobile)

**Usage:**

```javascript
const compressedImage = await imageCompressionService.compressImage(imageUri);
```

---

## Error Handling

### Validation Errors

- Display inline error messages
- Prevent progression with invalid data
- Highlight problem fields

### Network Errors

- Show error alert
- Allow retry
- Save as draft automatically

### Backend Errors

- Display specific error message
- Suggest corrective action
- Log error for support

---

## Testing Checklist

- [ ] Create listing from Step 1 to 10
- [ ] Save as draft and resume editing
- [ ] Upload minimum 3 photos
- [ ] Navigate back and forth between steps
- [ ] Submit listing and see pending approval
- [ ] View confirmation screen
- [ ] Test on iOS Simulator
- [ ] Test on Physical iPhone
- [ ] Test on Android Emulator
- [ ] Test network error handling
- [ ] Test image compression
- [ ] Verify all data sent to backend

---

## Performance Tips

1. **Image Optimization**: Compress before upload
2. **Draft Auto-Save**: Save frequently to avoid data loss
3. **Progress Indicator**: Show progress bar clearly
4. **Smooth Transitions**: Use proper animations
5. **Error Messages**: Clear, actionable feedback
6. **Loading States**: Show while uploading images

---

## Known Issues & Workarounds

| Issue                   | Cause              | Workaround             |
| ----------------------- | ------------------ | ---------------------- |
| Large image upload slow | Network speed      | Compress images more   |
| Draft not loading       | AsyncStorage error | Clear cache, try again |
| Amenities not saving    | JSON parse error   | Ensure valid format    |
| Navigation stuck        | State sync issue   | Refresh app            |

---

## Future Enhancements

- [ ] AI-powered photo suggestions
- [ ] Auto-fill location from map
- [ ] Bulk photo upload
- [ ] Video support
- [ ] Calendar-based pricing
- [ ] Template listings (copy existing)
- [ ] Price recommendations based on market

---

## Related Files

- `src/services/listingService.js` - API calls
- `src/services/draftListingService.js` - Draft management
- `src/services/imageCompressionService.js` - Image handling
- `src/hooks/useDraftListing.js` - Draft state
- `app/create-listing/*` - All step components
- Backend: `src/controller/listing_controller.ts`
- Backend: `src/model/listing_model.ts`

---

**Last Updated:** January 29, 2026  
**Version:** 1.0.0
