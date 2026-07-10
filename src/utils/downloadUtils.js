import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import * as Linking from "expo-linking";
import apiClient from "../services/apiClient";

/**
 * Sanitizes filename for Android/iOS filesystem compatibility
 */
const sanitizeFilename = (name) => {
  return name.replace(/[^\w\s.-]/gi, '').replace(/\s+/g, '_');
};

/**
 * Universal Download Utility
 * Handles Web, iOS, and Android file saving/sharing
 */
export const downloadFile = async (url, filename, mimeType = "application/pdf") => {
  if (!url) {
    throw new Error("Invalid URL provided for download");
  }

  const safeFilename = sanitizeFilename(filename);

  // Ensure URL is absolute for Native
  const baseURL = apiClient.baseURL || "https://api.lunest.app";
  const absoluteUrl = url.startsWith('http') ? url : `${baseURL}/${url.startsWith('/') ? url.substring(1) : url}`;

  console.log(`[DownloadUtils] Starting download: ${absoluteUrl} (${filename})`);

  try {
    // 1. WEB SUPPORT
    if (Platform.OS === "web") {
      // Direct window.open synchronously prevents Safari popup block and avoids S3 CORS errors
      window.open(absoluteUrl, '_blank');
      return { success: true, platform: 'web' };
    }

    // 2. NATIVE SUPPORT (iOS/Android) using standard stable FileSystem API
    if (Platform.OS !== "web") {
        let uniqueFilename = safeFilename;
        let counter = 1;
        
        const cacheDir = FileSystem.cacheDirectory;
        let localUri = `${cacheDir}${uniqueFilename}`;

        // Find a unique filename if it already exists in cache
        let fileInfo = await FileSystem.getInfoAsync(localUri);
        while (fileInfo.exists) {
            const lastDotIndex = safeFilename.lastIndexOf('.');
            const namePart = lastDotIndex !== -1 ? safeFilename.substring(0, lastDotIndex) : safeFilename;
            const extensionPart = lastDotIndex !== -1 ? safeFilename.substring(lastDotIndex) : '';
            uniqueFilename = `${namePart} (${counter})${extensionPart}`;
            localUri = `${cacheDir}${uniqueFilename}`;
            fileInfo = await FileSystem.getInfoAsync(localUri);
            counter++;
        }

        console.log(`[DownloadUtils] Downloading to: ${localUri}`);

        // Download using standard Expo FileSystem
        await FileSystem.downloadAsync(absoluteUrl, localUri);
        
        // Verify the file was created
        const verifyInfo = await FileSystem.getInfoAsync(localUri);
        if (!verifyInfo.exists) {
            throw new Error(`Download failed: File not created at ${localUri}`);
        }

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
            await Sharing.shareAsync(localUri, {
                mimeType,
                UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.content",
                dialogTitle: `Download ${safeFilename}`,
            });
            return { success: true, platform: Platform.OS };
        } else if (Platform.OS === "android") {
            // Fallback for Android
            await Linking.openURL(absoluteUrl);
            return { success: true, platform: 'android-fallback' };
        } else {
            throw new Error("Sharing is not available on this device");
        }
    }

    return { success: false, error: 'Unsupported platform' };
  } catch (error) {
    console.error("[DownloadUtils] Error:", error);
    const displayMessage = error.message?.includes("FileSystem") 
        ? "Storage access failed. Please check app permissions." 
        : (error.message || "An unexpected error occurred during the download.");
    
    Alert.alert("Download Failed", displayMessage);
    throw error;
  }
};

/**
 * Save an Image/Ref to Gallery (Native Only)
 */
export const saveRefAsImage = async (uri, filename) => {
    try {
        if (Platform.OS === 'web') {
            const link = document.createElement('a');
            link.href = uri;
            link.download = filename;
            link.click();
            return;
        }

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Save Image'
            });
        } else {
            Alert.alert("Saved", "Image generated successfully.");
        }
    } catch (e) {
        console.error("[DownloadUtils] Save image error:", e);
        Alert.alert("Error", "Failed to save image.");
    }
};
