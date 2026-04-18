import { File, Paths } from "expo-file-system";
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
      // In web, fetch the file as a Blob then download to improve Safari compatibility
      try {
        const response = await fetch(absoluteUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL after a short delay
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        return { success: true, platform: 'web' };
      } catch (fetchError) {
        console.warn("[DownloadUtils] Blob fetch failed, falling back to direct link:", fetchError);
        // Fallback to direct link if fetch fails (e.g., CORS)
        const link = document.createElement('a');
        link.href = absoluteUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, platform: 'web', method: 'fallback' };
      }
    }

    // 2. NATIVE SUPPORT (iOS/Android) using modern FileSystem API
    if (Platform.OS !== "web") {
        let uniqueFilename = safeFilename;
        let counter = 1;
        let file = new File(Paths.cache, uniqueFilename);

        // Loop to find a unique filename if it already exists
        while (file.exists) {
            const lastDotIndex = safeFilename.lastIndexOf('.');
            const namePart = lastDotIndex !== -1 ? safeFilename.substring(0, lastDotIndex) : safeFilename;
            const extensionPart = lastDotIndex !== -1 ? safeFilename.substring(lastDotIndex) : '';
            uniqueFilename = `${namePart} (${counter})${extensionPart}`;
            file = new File(Paths.cache, uniqueFilename);
            counter++;
        }

        console.log(`[DownloadUtils] Downloading to: ${file.uri}`);

        await File.downloadFileAsync(absoluteUrl, file);
        
        // Verify the file was created
        if (!file.exists) {
            throw new Error(`Download failed: File not created at ${file.uri}`);
        }

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
            await Sharing.shareAsync(file.uri, {
                mimeType,
                UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.content",
                dialogTitle: `Download ${safeFilename}`,
            });
            return { success: true, platform: Platform.OS };
        } else if (Platform.OS === "android") {
            // Fallback for android
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
