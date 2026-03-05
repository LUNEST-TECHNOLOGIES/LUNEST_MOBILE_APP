/**
 * Currency formatting utilities
 * Ensures consistent 2 decimal place formatting for all monetary values
 */

/**
 * Format amount as Nigerian Naira with 2 decimal places
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "₦1,234.56")
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return "₦0.00";
    }

    // Ensure 2 decimal places and format with commas
    const numAmount = Number(amount);
    const formatted = numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    return `₦${formatted}`;
};

/**
 * Format amount without currency symbol, just the number with 2 decimal places
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number string (e.g., "1,234.56")
 */
export const formatAmount = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return "0.00";
    }

    const numAmount = Number(amount);
    return numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};