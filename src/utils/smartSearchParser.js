/**
 * Smart Search Parser - Extracts filters from natural language search queries
 * 
 * Examples:
 *   "3 bedroom apartment in Lagos" -> { bedrooms: 3, location: "Lagos" }
 *   "2 bed 2 bath house with wifi" -> { bedrooms: 2, bathrooms: 2, amenities: ["Free WiFi"] }
 *   "furnished duplex in Abuja under 500k" -> { location: "Abuja", maxPrice: 500000, furnished: true }
 */

// Bedroom patterns
const BEDROOM_PATTERNS = [
  // Matches: "3 bedroom", "3 bedrooms", "3 bed", "3 beds", "3-bed", "3br", "3 bd", "3 room", "3 rooms"
  /(\d+)\s*(?:bedroom|bedrooms|bed|beds|bed-room|bed-rooms|br|bd|room|rooms)s?/i,
  // Matches: "three bedroom", "three bed" (word numbers)
  /(?:one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bedroom|bed|br|room|rooms)s?/i,
];

// Bathroom patterns
const BATHROOM_PATTERNS = [
  // Matches: "2 bathroom", "2 bathrooms", "2 bath", "2 baths", "2-ba", "2bt"
  /(\d+)\s*(?:bathroom|bathrooms|bath|baths|ba|bt)s?/i,
  // Matches: "two bathroom", "two bath" (word numbers)
  /(?:one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bathroom|bath|ba)s?/i,
];

// Guest patterns
const GUEST_PATTERNS = [
  // Matches: "4 guests", "for 4 people", "sleeps 4"
  /(\d+)\s*(?:guest|guests|person|people|traveler|travelers)/i,
  /(?:for|sleeps?)\s*(\d+)\s*(?:guest|guests|person|people)?/i,
];

// Price patterns
const PRICE_PATTERNS = [
  // Matches: "under 500k", "below 500000", "less than 500k"
  /(?:under|below|less than|cheaper than)\s*(?:₦|N|NGN|\\$)?\s*(\d+[kKmM]?)/i,
  // Matches: "over 300k", "above 300000", "more than 300k"
  /(?:over|above|more than|above)\s*(?:₦|N|NGN|\\$)?\s*(\d+[kKmM]?)/i,
  // Matches: "300k to 500k", "300000-500000", "between 300k and 500k"
  /(?:between)?\s*(?:₦|N|NGN|\\$)?\s*(\d+[kKmM]?)\s*(?:to|-)\s*(?:₦|N|NGN|\\$)?\s*(\d+[kKmM]?)/i,
  // Matches: "500k", "500000" (standalone price hints)
  /(?:₦|N|NGN|\\$)\s*(\d+[kKmM]?)/i,
];

// Word to number mapping
const WORD_TO_NUMBER = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

// Property type keywords
const PROPERTY_TYPE_KEYWORDS = {
  apartment: ['apartment', 'apt', 'flat', 'condo', 'condominium'],
  house: ['house', 'home', 'detached', 'bungalow', 'duplex'],
  'guest-house': ['guest house', 'guesthouse', 'bnb', 'b&b', 'bed and breakfast'],
  hostel: ['hostel', 'dorm', 'dormitory', 'shared room'],
  hotel: ['hotel', 'motel', 'inn', 'lodge'],
  'short-let': ['short let', 'shortlet', 'short-term', 'short term'],
  'studio-apartment': ['studio', 'studio apartment', 'bachelor pad'],
  land: ['land', 'plot', 'acre', 'hectare'],
  office: ['office', 'workspace', 'work space', 'commercial'],
  shop: ['shop', 'store', 'retail', 'boutique'],
  warehouse: ['warehouse', 'storage', 'godown', 'depot'],
};

// Amenity keywords mapping
const AMENITY_KEYWORDS = {
  'Free WiFi': ['wifi', 'wi-fi', 'internet', 'broadband', 'fiber'],
  'Air Conditioning': ['ac', 'air condition', 'air conditioning', 'aircon', 'cooling'],
  'Swimming Pool': ['pool', 'swimming pool', 'swimming'],
  'Parking': ['parking', 'car park', 'garage', 'driveway'],
  '24/7 Security': ['security', 'guard', 'secured', 'safe', 'gated'],
  'Generator Backup': ['generator', 'gen', 'power backup', 'nepa backup'],
  'Smart TV': ['tv', 'television', 'smart tv', 'cable', 'dstv', 'netflix'],
  'Fitted Kitchen': ['kitchen', 'fitted kitchen', 'modern kitchen'],
  'Balcony': ['balcony', 'terrace', 'patio', 'veranda'],
  'Gym/Fitness': ['gym', 'fitness', 'workout', 'exercise', 'gymnasium'],
  'Water Heater': ['water heater', 'hot water', 'geyser', 'shower heater'],
  'CCTV Surveillance': ['cctv', 'camera', 'surveillance', 'monitored'],
  'Inverter System': ['inverter', 'solar inverter', 'backup power'],
  'Solar System': ['solar', 'solar panels', 'solar power'],
  'Prepaid Meter': ['prepaid meter', 'meter', 'individual meter'],
  'Laundry Area': ['laundry', 'washing machine', 'washer', 'dryer'],
  'Game Room': ['game room', 'games room', 'play room', 'arcade'],
  'Lounge': ['lounge', 'living room', 'sitting room', 'common area'],
  Furnished: ['furnished', 'fully furnished', 'semi-furnished', 'furnish'],
  'Pet Friendly': ['pet', 'pets', 'dog', 'cat', 'pet friendly', 'pets allowed'],
};

// Nigerian states and major cities for location extraction
const NIGERIAN_LOCATIONS = [
  // States
  'Lagos', 'Abuja', 'FCT', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 'PH',
  'Benin', 'Maiduguri', 'Zaria', 'Aba', 'Jos', 'Ilorin', 'Oyo', 'Enugu',
  'Abeokuta', 'Onitsha', 'Warri', 'Sokoto', 'Calabar', 'Katsina', 'Akure',
  'Osogbo', 'Bauchi', 'Iseyin', 'Minna', 'Makurdi', 'Ondo', 'Ado Ekiti',
  'Lokoja', 'Gombe', 'Uyo', 'Owerri', 'Ile Ife', 'Bida', 'Awka', 'Ife',
  'Birnin Kebbi', 'Yenagoa', 'Nsukka', 'Okene', 'Sapele', 'Ijebu Ode',
  'Ede', 'Effon Alaiye', 'Ila Orangun', 'Owo', 'Ikirun', 'Odeomu',
  'Agbamu', 'Inisa', 'Shagamu', 'Ijero', 'Sango Otta', 'Lafiagi',
  'Okrika', 'Amaigbo', 'Ugep', 'Ilobu', 'Ekpoma', 'Degema',
  'Egbe', 'Uromi', 'Funtua', 'Igboho', 'Gashua', 'Bama', 'Umuahia',
  'Eket', 'Gboko', 'Ikare', 'Ikot Ekpene', 'Ilawe Ekiti', 'Ikot Abasi',
  'Emuoha', 'Kumo', 'Ishinagbo', 'Dutse', 'Ogbomoso', 'Ikorodu',
  // Major areas in Lagos
  'Victoria Island', 'VI', 'Ikoyi', 'Lekki', 'Ajah', 'Ikeja', 'Yaba',
  'Surulere', 'Ilupeju', 'Gbagada', 'Maryland', 'Oshodi', 'Mushin',
  'Isolo', 'Ejigbo', 'Satelite Town', 'Festac', 'Amuwo Odofin',
  'Ojo', 'Iba', 'Igando', 'Egbeda', 'Ikotun', 'Idimu', 'Agege',
  'Alimosho', 'Ipaja', 'Ayobo', 'Bariga', 'Shomolu', 'Onipanu',
  'Palm Groove', 'Anthony', 'Ogba', 'Aguda', 'Surulere', 'Ojuelegba',
  'Magodo', 'Omole', 'Ojodu', 'Berger', 'Ketu', 'Mile 12', 'Oshodi',
  'Apapa', 'Tinubu', 'Trade Fair', 'Badagry', 'Epe', 'Ikorodu',
  // Major areas in Abuja
  'Wuse', 'Maitama', 'Asokoro', 'Garki', 'Jabi', 'Utako', 'Gwarinpa',
  'Kubwa', 'Nyanya', 'Karu', 'Lugbe', 'Jukwoyi', 'Gwagwalada',
  'Bwari', 'Kuje', 'Abaji', 'Dawaki', 'Dutse', 'Jabi', 'Life Camp',
  'Katampe', 'Mabushi', 'Wuye', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4',
  // Major areas in Port Harcourt
  'GRA', 'Trans Amadi', 'Rumukrushi', 'Rumukalagbo', 'Eleme', 'Oyigbo',
  'Obio Akpor', 'Ikwerre', 'Etche', 'Okrika', 'Ogu Bolo', 'Opobo',
];

// Furnishing keywords
const FURNISHING_KEYWORDS = [
  'furnished', 'fully furnished', 'semi-furnished', 'partly furnished',
  'unfurnished', 'not furnished', 'empty',
];

// Verified keywords
const VERIFIED_KEYWORDS = [
  'verified', 'confirmed', 'certified', 'vetted', 'trusted', 'official',
];

/**
 * Parse price string with k/m suffixes
 * @param {string} priceStr
 * @returns {number|null}
 */
function parsePrice(priceStr) {
  if (!priceStr) return null;
  
  const cleanStr = priceStr.toLowerCase().replace(/,/g, '');
  
  // Handle k/m suffixes
  if (cleanStr.includes('k')) {
    return parseInt(cleanStr.replace('k', '')) * 1000;
  }
  if (cleanStr.includes('m')) {
    return parseInt(cleanStr.replace('m', '')) * 1000000;
  }
  
  return parseInt(cleanStr) || null;
}

/**
 * Extract number from text (handles word numbers)
 * @param {string} text
 * @returns {number|null}
 */
function extractNumber(text) {
  if (!text) return null;
  
  // Check for word numbers
  const lowerText = text.toLowerCase();
  for (const [word, num] of Object.entries(WORD_TO_NUMBER)) {
    if (lowerText.includes(word)) {
      return num;
    }
  }
  
  // Check for digit numbers
  const match = text.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return null;
}

/**
 * Parse search query and extract filters
 * @param {string} query
 * @returns {Object} Parsed filters
 */
export function parseSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { cleanQuery: '', filters: {} };
  }
  
  const filters = {};
  let cleanQuery = query.trim();
  
  // Extract bedrooms
  for (const pattern of BEDROOM_PATTERNS) {
    const match = cleanQuery.match(pattern);
    if (match) {
      const num = extractNumber(match[0]);
      if (num !== null && num > 0 && num <= 10) {
        filters.bedrooms = num;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }
  }
  
  // Extract bathrooms
  for (const pattern of BATHROOM_PATTERNS) {
    const match = cleanQuery.match(pattern);
    if (match) {
      const num = extractNumber(match[0]);
      if (num !== null && num > 0 && num <= 10) {
        filters.bathrooms = num;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }
  }
  
  // Extract guests
  for (const pattern of GUEST_PATTERNS) {
    const match = cleanQuery.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num <= 50) {
        filters.guests = num;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }
  }
  
  // Extract price range
  const priceMatch = cleanQuery.match(PRICE_PATTERNS[0]); // under/below
  if (priceMatch) {
    filters.maxPrice = parsePrice(priceMatch[1]);
    cleanQuery = cleanQuery.replace(priceMatch[0], '').trim();
  } else {
    const priceMatch2 = cleanQuery.match(PRICE_PATTERNS[1]); // over/above
    if (priceMatch2) {
      filters.minPrice = parsePrice(priceMatch2[1]);
      cleanQuery = cleanQuery.replace(priceMatch2[0], '').trim();
    } else {
      const priceMatch3 = cleanQuery.match(PRICE_PATTERNS[2]); // range
      if (priceMatch3) {
        filters.minPrice = parsePrice(priceMatch3[1]);
        filters.maxPrice = parsePrice(priceMatch3[3] || priceMatch3[2]);
        cleanQuery = cleanQuery.replace(priceMatch3[0], '').trim();
      }
    }
  }
  
  // Extract property types
  const lowerQuery = cleanQuery.toLowerCase();
  for (const [type, keywords] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        filters.propertyType = type;
        cleanQuery = cleanQuery.replace(new RegExp(keyword, 'gi'), '').trim();
        break;
      }
    }
    if (filters.propertyType) break;
  }
  
  // Extract amenities
  const foundAmenities = [];
  for (const [amenity, keywords] of Object.entries(AMENITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        foundAmenities.push(amenity);
        cleanQuery = cleanQuery.replace(new RegExp(keyword, 'gi'), '').trim();
        break;
      }
    }
  }
  if (foundAmenities.length > 0) {
    filters.amenities = [...new Set(foundAmenities)]; // Remove duplicates
  }
  
  // Extract location (Nigerian cities/states/areas)
  for (const location of NIGERIAN_LOCATIONS) {
    const locationRegex = new RegExp(`\\b${location}\\b`, 'i');
    if (locationRegex.test(cleanQuery)) {
      filters.location = location;
      cleanQuery = cleanQuery.replace(locationRegex, '').trim();
      break;
    }
  }
  
  // Extract furnished status
  for (const keyword of FURNISHING_KEYWORDS) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      filters.furnished = !keyword.includes('un') && !keyword.includes('not') && !keyword.includes('empty');
      cleanQuery = cleanQuery.replace(new RegExp(keyword, 'gi'), '').trim();
      break;
    }
  }
  
  // Extract verified status
  for (const keyword of VERIFIED_KEYWORDS) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      filters.verifiedOnly = true;
      cleanQuery = cleanQuery.replace(new RegExp(keyword, 'gi'), '').trim();
      break;
    }
  }
  
  // Clean up extra whitespace and normalize
  cleanQuery = cleanQuery
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
  
  // Remove common filler words at the start
  cleanQuery = cleanQuery.replace(/^(in|at|near|by|with|for)\s+/i, '').trim();
  
  return {
    cleanQuery: cleanQuery || query, // Fallback to original if everything was parsed
    filters,
    hasFilters: Object.keys(filters).length > 0,
  };
}

/**
 * Format parsed filters for display
 * @param {Object} filters
 * @returns {string}
 */
export function formatParsedFilters(filters) {
  const parts = [];
  
  if (filters.bedrooms) parts.push(`${filters.bedrooms} bed`);
  if (filters.bathrooms) parts.push(`${filters.bathrooms} bath`);
  if (filters.guests) parts.push(`${filters.guests} guests`);
  if (filters.location) parts.push(filters.location);
  if (filters.propertyType) parts.push(filters.propertyType.replace(/-/g, ' '));
  if (filters.minPrice && filters.maxPrice) {
    parts.push(`₦${(filters.minPrice / 1000).toFixed(0)}k-${(filters.maxPrice / 1000).toFixed(0)}k`);
  } else if (filters.minPrice) {
    parts.push(`>₦${(filters.minPrice / 1000).toFixed(0)}k`);
  } else if (filters.maxPrice) {
    parts.push(`<₦${(filters.maxPrice / 1000).toFixed(0)}k`);
  }
  if (filters.amenities?.length) parts.push(`${filters.amenities.length} amenity${filters.amenities.length > 1 ? 'ies' : 'y'}`);
  if (filters.furnished) parts.push('furnished');
  if (filters.verifiedOnly) parts.push('verified');
  
  return parts.join(' • ');
}

/**
 * Build API filters from parsed search query
 * @param {Object} parsedResult
 * @returns {Object} API-compatible filters
 */
export function buildAPIFilters(parsedResult) {
  const { cleanQuery, filters } = parsedResult;
  
  return {
    query: cleanQuery,
    ...filters,
    // Map to existing filter structure
    bedrooms: filters.bedrooms || null,
    bathrooms: filters.bathrooms || null,
    guests: filters.guests || null,
    location: filters.location || null,
    minPrice: filters.minPrice || null,
    maxPrice: filters.maxPrice || null,
    categories: filters.propertyType ? [filters.propertyType] : [],
    amenities: filters.amenities || [],
    furnished: filters.furnished || false,
    verifiedOnly: filters.verifiedOnly || false,
  };
}

export default {
  parseSearchQuery,
  formatParsedFilters,
  buildAPIFilters,
};
