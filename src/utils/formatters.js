/**
 * Format price with commas
 * @param {number|string} price 
 * @returns {string}
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined) return "0";
  const num = parseFloat(String(price).replace(/,/g, "")) || 0;
  return num.toLocaleString("en-NG");
};

/**
 * Format price with abbreviations (k, M, B)
 * @param {number|string} price 
 * @returns {string}
 */
export const abbreviatePrice = (price) => {
  if (price === null || price === undefined) return "0";
  const num = parseFloat(String(price).replace(/,/g, "")) || 0;
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

/**
 * Smart price formatter that uses abbreviations for large numbers or specific UI needs
 * @param {number|string} price 
 * @param {boolean} abbreviate 
 * @returns {string}
 */
export const smartFormatPrice = (price, abbreviate = false) => {
  if (abbreviate) return abbreviatePrice(price);
  return formatPrice(price);
};
