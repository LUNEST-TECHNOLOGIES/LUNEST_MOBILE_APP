import { Platform } from "react-native";
import configService from "../services/configService";

const hasEmbeddedTemporaryMediaUrl = (value) => /^https?:\/\/.*\/(?:blob:|data:|file:|content:)/i.test(String(value || '').trim());

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
  
  // Reject paths that contain "undefined" after string conversion
  if (stringPath === "undefined" || stringPath.includes("/undefined")) {
    return null;
  }

  if (hasEmbeddedTemporaryMediaUrl(stringPath)) {
    return null;
  }

  // Strip hardcoded localhost / local network IPs for backend attachments if they match private IP patterns
  const isOutdatedHost = (url) => {
    return url.includes('localhost') || 
           url.includes('127.0.0.1') || 
           url.includes('192.168.') || 
           url.includes('10.') || 
           url.includes('172.') ||
           (url.includes('lunest.app') && baseUrl && !url.startsWith(baseUrl));
  };

  if (stringPath.startsWith("http") && stringPath.includes("/uploads/") && isOutdatedHost(stringPath)) {
    const uploadIndex = stringPath.indexOf("/uploads/");
    stringPath = stringPath.substring(uploadIndex);
    console.log(`[ImageUtils] Stripped outdated host from: ${path} -> ${stringPath}`);
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
  
  // Reject paths that contain "undefined" after string conversion
  if (stringPath === "undefined" || stringPath.includes("/undefined")) {
    return null;
  }

  if (hasEmbeddedTemporaryMediaUrl(stringPath)) {
    return null;
  }

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

  const isS3Path = stringPath.includes("reviews/") || 
                   stringPath.includes("listings/") || 
                   stringPath.includes("avatars/") || 
                   stringPath.includes("applications/");

  // If we have a path but no baseUrl, try to get it from configService
  if (!baseUrl) {
    baseUrl = configService.getBaseURLSync();
    if (!baseUrl) {
      console.warn(`[ImageUtils] No baseUrl available for path: ${stringPath}`);
      return null;
    }
  }

  const cfUrl = configService.getCloudFrontURLSync();
  const cleanBase = baseUrl.replace(/\/$/, "");
  
  // Smart routing: Use CloudFront for S3-based paths in production
  if (isS3Path && cfUrl && !cleanBase.includes("localhost") && !cleanBase.includes("10.0.2.2")) {
    const pathWithoutUploads = stringPath.replace(/^\/uploads\//, "").replace(/^uploads\//, "").replace(/^\//, "");
    const finalUrl = `${cfUrl.replace(/\/$/, "")}/${pathWithoutUploads}`;
    return finalUrl;
  }

  const cleanPath = stringPath.startsWith("/") ? stringPath : `/${stringPath}`;
  const finalUrl = `${cleanBase}${cleanPath}`;
  return finalUrl;
};
