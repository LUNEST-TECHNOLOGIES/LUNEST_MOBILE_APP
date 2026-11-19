# Landlord listing flow review — 19 November 2026

Added Power of Attorney to title types. All six property counters use immediate updates, enforce 0–20 limits under repeated taps, expose accessible increase/decrease labels, and have 44px touch targets. Counter tests cover Residential and Commercial purposes, rapid taps, bounds, and disabled controls.

Reviewed category, intent, property details, location, amenities, photos/videos, pricing, availability/rules, terms, review/submission, and shared draft/API persistence.

Fixed active-editor restoration overwriting typed/deleted values; unstable delayed saves; concurrent storage read-modify-write operations; stale whole-draft spreads across screens; remote-ID reconciliation writing over newer local storage; and background flushes choosing stale mounted-screen snapshots. Property-details and location edits enter the shared cache immediately, local writes serialize across drafts, and remote sync remains debounced. Failed background saves populate the shared draft error state.

Fixed the undefined pricing-period variable in the draft API mapper, dropped property-title/description mappings, cleared deposits falling back to legacy positive fees, and a sale price being replaced when another field changes. Currency inputs keep editable digits without reinserting commas during deletion. Zero prices cannot proceed.

Refund selection starts empty. Both radios use explicit boolean checks and expose radio accessibility state. Close, local autosave, API sync, and draft reload preserve true/false/null without choosing a policy. Rentals require a selection in Pricing, at final submission, and in backend publishing. Previously saved boolean policies remain selected. Existing legacy records with a boolean default cannot distinguish a former default from a deliberate choice.

Removed the second photo-restoration effect that could reintroduce deleted media. Added the missing native filesystem import and removed an earlier overridden duplicate upload method, preserving the implementation that was already active at runtime. Review no longer assumes terms consent or a refundable policy, validates essential steps before uploading/submitting, and describes non-refundable earnings consistently with the check-in conditions.

Validation: isolated component-handler tests exercise title, room sizes, description, city, postal code, landmarks, and price typing/deletion across rerenders, plus initial empty and mutually exclusive refund radios. Persistence tests execute the actual hook/service/API mapper with mocked storage/network and cover concurrent writes, cleared values, all refund states, title/description and period mappings. These are not native keyboard or device tests. Run the three `scripts/check-listing-*.cjs` scripts from the project root.

Remaining live checks: authenticated full-flow navigation on iOS/Android and web; Google Places/geocoding; real image/video uploads; MongoDB draft reload across devices; admin approval and publication. The analytics backend implementation and setup are documented in `../Lunest_backend/docs/website-analytics.md`.
