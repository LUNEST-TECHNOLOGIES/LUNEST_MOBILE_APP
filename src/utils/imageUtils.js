import configService from "../services/configService";

/**
 * Resolves an image path to a full URL
 * Works with relative paths, http URLs, and file:// URIs
 * @param {string} path - The relative path or full URL of the image
 * @param {string} baseUrl - Optional base URL (defaults to configService.getBaseURL)
 * @returns {Promise<string|null>} - Full URL or null
 */
export const resolveImageUrl = async (path, baseUrl = null) => {
  if (!path || path === "null" || path === "undefined") return null;

  let stringPath = String(path);

  // Strip hardcoded localhost / local network IPs for backend attachments
  if (stringPath.startsWith("http") && stringPath.includes("/uploads/")) {
    const uploadIndex = stringPath.indexOf("/uploads/");
    stringPath = stringPath.substring(uploadIndex);
  }

  // If it's already a full URL or local file, return it
  if (stringPath.startsWith("http") || stringPath.startsWith("file://")) {
    return stringPath;
  }

  const base = baseUrl || (await configService.getBaseURL());
  if (!base) return stringPath; // Return path as is if no base URL available

  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = stringPath.startsWith("/") ? stringPath : `/${stringPath}`;

  return `${cleanBase}${cleanPath}`;
};

/**
 * Synchronous version of resolveImageUrl (requires baseUrl to be passed)
 * Useful in map/loop operations where async is difficult
 * @param {string} path - The relative path or full URL of the image
 * @param {string} baseUrl - The base URL to use
 * @returns {string|null} - Full URL or null
 */
export const resolveImageUrlSync = (path, baseUrl) => {
  if (!path || path === "null" || path === "undefined") return null;

  let stringPath = String(path);

  // Strip hardcoded localhost / local network IPs for backend attachments
  if (stringPath.startsWith("http") && stringPath.includes("/uploads/")) {
    const uploadIndex = stringPath.indexOf("/uploads/");
    stringPath = stringPath.substring(uploadIndex);
  }

  // If it's already a full URL or no baseUrl, return it
  if (
    stringPath.startsWith("http") ||
    stringPath.startsWith("file://") ||
    !baseUrl
  ) {
    return stringPath;
  }

  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = stringPath.startsWith("/") ? stringPath : `/${stringPath}`;

  return `${cleanBase}${cleanPath}`;
};
