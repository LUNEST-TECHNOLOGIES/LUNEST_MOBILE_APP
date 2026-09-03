/**
 * Centralized utility for normalizing, resolving, and formatting property amenities.
 * Ensures consistent, human-readable labels across Create Listing, Preview, Review, and Detail screens.
 */

export const AMENITIES_DICTIONARY = {
  // Comfort & Living Essentials
  walk_in_closet: "Walk-In Closet",
  balcony: "Balcony",
  ac: "Air Conditioning (AC)",
  air_conditioning: "Air Conditioning (AC)",
  heating: "Heating System",
  washer: "Washer/Dryer",
  washing_machine: "Washer/Dryer",
  laundry: "Washer/Dryer",
  kitchen: "Full Kitchen",
  full_kitchen: "Full Kitchen",
  furnished: "Fully Furnished",
  fully_furnished: "Fully Furnished",
  refrigerator: "Refrigerator",
  fridge: "Refrigerator",
  microwave: "Microwave",
  coffee_maker: "Coffee Maker",
  dishwasher: "Dishwasher",

  // Security & Access
  security_24_7: "24/7 Security",
  "24_7_security": "24/7 Security",
  security: "24/7 Security",
  cctv: "CCTV Surveillance",
  cctv_surveillance: "CCTV Surveillance",
  gated: "Gated Compound",
  gated_compound: "Gated Compound",
  electronic_lock: "Electronic Door Lock",
  intercom: "Intercom System",
  intercom_system: "Intercom System",
  fire_extinguisher: "Fire Extinguisher",
  smoke_alarm: "Smoke Alarm",

  // Power & Utilities
  inverter: "Inverter",
  generator: "Generator",
  solar: "Solar Power",
  solar_power: "Solar Power",
  borehole: "Borehole Water",
  borehole_water: "Borehole Water",
  water_heater: "Water Heater",
  ev_charger: "EV Charging",
  gas_supply: "Gas Supply",

  // Tech & Connectivity
  wifi: "WiFi",
  internet: "WiFi",
  smart_tv: "Smart TV",
  cable: "Cable/Satellite TV",
  cable_tv: "Cable/Satellite TV",
  workspace: "Dedicated Workspace",
  dedicated_workspace: "Dedicated Workspace",
  fiber_optics: "Fiber Optics",
  printer: "Printer/Scanner",
  playstation_4: "PlayStation 4",
  playstation_5: "PlayStation 5",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",

  // Lifestyle & Luxury
  pool: "Swimming Pool",
  swimming_pool: "Swimming Pool",
  gym: "Gym/Fitness Center",
  fitness: "Gym/Fitness Center",
  fitness_center: "Gym/Fitness Center",
  garden: "Garden/Lawn",
  lawn: "Garden/Lawn",
  rooftop: "Rooftop Access",
  rooftop_access: "Rooftop Access",
  parking: "Parking Space",
  parking_space: "Parking Space",
  garage: "Parking Space",
  bbq: "BBQ Grill",
  bbq_grill: "BBQ Grill",
  sauna: "Sauna/Steam Room",
  steam_room: "Sauna/Steam Room",

  // Commercial & Professional
  loading_bay: "Loading Bay",
  high_ceilings: "High Ceilings",
  meeting_rooms: "Meeting Rooms",
  receptionist: "Reception Area",
  reception_area: "Reception Area",
  elevator: "Elevator",
  lift: "Elevator",
  cold_storage: "Cold Storage",

  // Location Benefits
  supermarket: "Proximity to Supermarket",
  hospital: "Near Hospital",
  school: "Near Schools",
  transport: "Public Transport Access",
  public_transport: "Public Transport Access",
  restaurant: "Near Restaurants",
};

/**
 * Resolves an individual amenity item (ID, object, or string) to a human-readable label.
 * Resolves custom_* IDs using customAmenities where available.
 * Strips raw unresolved custom_* strings so technical IDs never leak to the UI.
 *
 * @param {string|object} item - The amenity identifier or object
 * @param {Array} customAmenities - Array of custom amenity objects [{ id, label, name }]
 * @returns {string} Formatted label or empty string
 */
export const formatAmenityLabel = (item, customAmenities = []) => {
  if (!item) return "";

  // If item is already an object, extract label/name/title
  if (typeof item === "object" && item !== null) {
    if (item.label && typeof item.label === "string") return item.label.trim();
    if (item.name && typeof item.name === "string") return item.name.trim();
    if (item.title && typeof item.title === "string") return item.title.trim();
    if (item.value && typeof item.value === "string") return item.value.trim();
    if (item.id) return formatAmenityLabel(item.id, customAmenities);
    return "";
  }

  const str = String(item).trim();
  if (!str) return "";

  // If it's a custom ID (e.g. custom_1788439042998_gpx8di)
  if (str.startsWith("custom_")) {
    // Try to find matching custom amenity object in customAmenities
    if (Array.isArray(customAmenities) && customAmenities.length > 0) {
      const match = customAmenities.find(
        (c) => c && (c.id === str || (typeof c === "object" && c.label === str))
      );
      if (match) {
        const label = match.label || match.name || match.title || match.value;
        if (label && !String(label).startsWith("custom_")) {
          return String(label).trim();
        }
      }
    }
    // If it starts with custom_ and cannot be resolved to a human name, hide it completely
    return "";
  }

  // Check direct match in dictionary
  const key = str.toLowerCase().replace(/[\s-]+/g, "_");
  if (AMENITIES_DICTIONARY[key]) {
    return AMENITIES_DICTIONARY[key];
  }
  if (AMENITIES_DICTIONARY[str]) {
    return AMENITIES_DICTIONARY[str];
  }

  // If it already looks like a formatted English label (has spaces or uppercase)
  if (/[A-Z]/.test(str) && /\s/.test(str)) {
    return str;
  }

  // If it's snake_case or kebab-case without dictionary match, convert to Title Case
  if (str.includes("_") || str.includes("-")) {
    return str
      .split(/[_-]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  // Fallback: Capitalize first letter
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Normalizes and formats an entire array of amenities.
 * Converts IDs to readable labels, resolves custom amenities, and eliminates duplicates and custom_* hashes.
 *
 * @param {Array} rawAmenities - Array of amenity strings or objects
 * @param {Array} customAmenities - Array of custom amenity objects
 * @returns {Array<string>} Clean, human-friendly array of amenity labels
 */
export const formatAmenitiesList = (rawAmenities = [], customAmenities = []) => {
  const safeRaw = Array.isArray(rawAmenities)
    ? rawAmenities
    : typeof rawAmenities === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(rawAmenities);
          return Array.isArray(parsed) ? parsed : [rawAmenities];
        } catch (_) {
          return rawAmenities.includes(",")
            ? rawAmenities.split(",").map((s) => s.trim())
            : [rawAmenities];
        }
      })()
    : [];

  const safeCustom = Array.isArray(customAmenities) ? customAmenities : [];

  const labels = [];
  const seen = new Set();

  // 1. Process items from rawAmenities
  safeRaw.forEach((item) => {
    const label = formatAmenityLabel(item, safeCustom);
    if (label && !label.startsWith("custom_") && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      labels.push(label);
    }
  });

  // 2. Process any customAmenities that weren't included yet
  safeCustom.forEach((customItem) => {
    const label = formatAmenityLabel(customItem);
    if (label && !label.startsWith("custom_") && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      labels.push(label);
    }
  });

  return labels;
};

export default {
  AMENITIES_DICTIONARY,
  formatAmenityLabel,
  formatAmenitiesList,
};
