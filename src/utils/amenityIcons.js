/**
 * Utility for mapping amenity names/slugs to Ionicons.
 * Maintains consistency across PropertyCards, DetailScreens, and Search.
 */

const AMENITY_ICONS = {
  // Common Utilities
  wifi: "wifi",
  internet: "wifi",
  "air conditioning": "snow",
  ac: "snow",
  kitchen: "restaurant",
  fridge: "ice-cream", // closest to appliance
  "coffee maker": "cafe",
  
  // Bathroom / Hygiene
  bath: "shower-outline",
  bathroom: "shower-outline",
  shower: "shower-outline",
  "washing machine": "sync",
  laundry: "shirt",
  "iron": "id-card", // fallback
  
  // Entertainment / Lifestyle
  "tv": "tv",
  "television": "tv",
  pool: "water",
  swimming: "water",
  gym: "barbell",
  fitness: "barbell",
  spa: "leaf",
  balcony: "partly-sunny",
  terrace: "partly-sunny",
  
  // Safety / Access
  parking: "car",
  garage: "car",
  security: "shield-checkmark",
  cctv: "videocam",
  "fire extinguisher": "flame",
  "first aid": "medkit",
  
  // Misc
  workspace: "laptop",
  "desk": "laptop",
  pets: "paw",
  "pet friendly": "paw",
  smoking: "no-smoking", // usually check if allowed
  "no smoking": "no-smoking",
  "long term": "calendar",
  "24/7": "time",
  electricity: "flash",
  "power supply": "flash",
  inverter: "battery-charging",
  solar: "sunny",
};

/**
 * Normalizes a string to a format that matches AMENITY_ICONS keys.
 * Handles "custom_" prefixes, underscores, and extra whitespace.
 */
const normalizeName = (name) => {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/^custom_/, "")
    .replace(/_/g, " ")
    .trim();
};

/**
 * Returns a valid Ionicons name for a given amenity string.
 * @param {string} name - The amenity name from the backend.
 * @returns {string} - The Ionicons name (defaults to 'apps-outline' if not found).
 */
export const getAmenityIcon = (name) => {
  const cleanName = normalizeName(name);
  
  // Check for direct match
  if (AMENITY_ICONS[cleanName]) return AMENITY_ICONS[cleanName];
  
  // Check for partial matches (e.g. "high speed wifi" matches "wifi")
  const keyMatch = Object.keys(AMENITY_ICONS).find(key => cleanName.includes(key));
  if (keyMatch) return AMENITY_ICONS[keyMatch];
  
  // Default fallback icon
  return "apps-outline";
};

export default AMENITY_ICONS;
