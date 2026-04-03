import { Platform } from "react-native";
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

  let stringPath = typeof path === 'object' && path?.url ? path.url : String(path);

  // Strip hardcoded localhost / local network IPs for backend attachments if they match private IP patterns
  const isOutdatedHost = (url) => {
    return url.includes('localhost') || 
           url.includes('127.0.0.1') || 
           url.includes('192.168.') || 
           url.includes('10.') || 
           url.includes('172.') ||
           (url.includes('lunest.app') && !url.startsWith(baseUrl || ''));
  };

  if (stringPath.startsWith("http") && stringPath.includes("/uploads/") && isOutdatedHost(stringPath)) {
    const uploadIndex = stringPath.indexOf("/uploads/");
    stringPath = stringPath.substring(uploadIndex);
    if (typeof path === 'string') console.log(`[ImageUtils] Stripped outdated host from: ${path} -> ${stringPath}`);
  }

  // If it's already a full URL, return it
  if (stringPath.startsWith("http")) {
    return stringPath;
  }

  // Handle blob URLs - they are valid on web but shouldn't leak to native
  if (stringPath.startsWith("blob:")) {
    return Platform.OS === 'web' ? stringPath : null;
  }

  // Handle local file URIs - browsers block file:// for security
  if (stringPath.startsWith("file://")) {
    return Platform.OS === 'web' ? null : stringPath;
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

  let stringPath = typeof path === 'object' && path?.url ? path.url : String(path);

  // Strip hardcoded localhost / local network IPs for backend attachments if they match private IP patterns
  const isLocalOrPrivateIP = (url) => {
    return url.includes('localhost') || 
           url.includes('127.0.0.1') || 
           url.includes('192.168.') || 
           url.includes('10.') || 
           url.includes('172.');
  };

  if (stringPath.startsWith("http") && stringPath.includes("/uploads/") && isLocalOrPrivateIP(stringPath)) {
    const uploadIndex = stringPath.indexOf("/uploads/");
    stringPath = stringPath.substring(uploadIndex);
  }

  // If it's already a full URL or no baseUrl, return it
  if (stringPath.startsWith("http") || !baseUrl) {
    return stringPath;
  }

  // Handle blob URLs - they are valid on web but shouldn't leak to native
  if (stringPath.startsWith("blob:")) {
    return Platform.OS === 'web' ? stringPath : null;
  }

  // Handle local file URIs - browsers block file:// for security
  if (stringPath.startsWith("file://")) {
    return Platform.OS === 'web' ? null : stringPath;
  }

  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = stringPath.startsWith("/") ? stringPath : `/${stringPath}`;

  return `${cleanBase}${cleanPath}`;
};
