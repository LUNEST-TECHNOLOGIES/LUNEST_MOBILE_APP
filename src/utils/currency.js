/**
 * Currency formatting utilities
 * Ensures consistent formatting for all monetary values across LUNEST
 */

/**
 * Format amount as Nigerian Naira with 2 decimal places
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "₦1,234.56")
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₦0.00";
  }

  const numAmount = Number(amount);
  const formatted = numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  return `₦${formatted}`;
};

/**
 * Format amount without currency symbol, just the number with 2 decimal places
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted number string (e.g., "1,234.56")
 */
export const formatAmount = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0.00";
  }

  const numAmount = Number(amount);
  return numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
};

/**
 * Format amount as compact Nigerian Naira with K (Thousands) and M (Millions) abbreviations
 * Handles:
 * - 0 -> ₦0
 * - < 1,000 -> ₦500
 * - 1,000 to 999,999 -> ₦1.2K, ₦50K, ₦450K
 * - 1,000,000+ -> ₦1.5M, ₦10M, ₦2.25M
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted compact currency string
 */
export const formatCompactCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₦0";
  }

  const rawNum = Number(amount);
  const sign = rawNum < 0 ? "-" : "";
  const num = Math.abs(rawNum);

  if (num >= 1000000) {
    const inMillions = num / 1000000;
    const formatted = inMillions % 1 === 0 ? inMillions.toFixed(0) : inMillions.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}₦${formatted}M`;
  }

  if (num >= 1000) {
    const inThousands = num / 1000;
    const formatted = inThousands % 1 === 0 ? inThousands.toFixed(0) : inThousands.toFixed(1).replace(/\.?0+$/, "");
    return `${sign}₦${formatted}K`;
  }

  return `${sign}₦${num.toLocaleString("en-NG")}`;
};

/**
 * Format earning label with full amount in brackets if compact is used
 * e.g. "₦1.5M"
 */
export const formatEarningLabel = (amount) => {
  return formatCompactCurrency(amount);
};