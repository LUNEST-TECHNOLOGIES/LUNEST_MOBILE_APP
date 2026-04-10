import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import * as Linking from "expo-linking";
import apiClient from "../services/apiClient";

/**
 * Universal Download Utility
 * Handles Web, iOS, and Android file saving/sharing
 */
export const downloadFile = async (url, filename, mimeType = "application/pdf") => {
  if (!url) {
    throw new Error("Invalid URL provided for download");
  }

  // Ensure URL is absolute for Native
  const baseURL = apiClient.baseURL || "https://api.lunest.app";
  const absoluteUrl = url.startsWith('http') ? url : `${baseURL}/${url.startsWith('/') ? url.substring(1) : url}`;

  console.log(`[DownloadUtils] Starting download: ${absoluteUrl} (${filename})`);

  try {
    // 1. WEB SUPPORT
    if (Platform.OS === "web") {
      // In web, we can use a direct anchor download or window.open
      // Better to use an anchor for forced download naming
      const link = document.createElement('a');
      link.href = absoluteUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true, platform: 'web' };
    }

    // 2. IOS SUPPORT (Share Sheet is best)
    if (Platform.OS === "ios") {
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(absoluteUrl, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType,
          UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.image",
          dialogTitle: `Download ${filename}`,
        });
        return { success: true, platform: 'ios' };
      } else {
        throw new Error("Sharing is not available on this device");
      }
    }

    // 3. ANDROID SUPPORT (Storage Access Framework or Sharing)
    if (Platform.OS === "android") {
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(absoluteUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Android: Sharing.shareAsync triggers the system's "Complete action using" or download view
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType,
          dialogTitle: `Download ${filename}`,
        });
        return { success: true, platform: 'android' };
      } else {
        // Fallback for older android/specific builds
        await Linking.openURL(absoluteUrl);
        return { success: true, platform: 'android-fallback' };
      }
    }

    return { success: false, error: 'Unsupported platform' };
  } catch (error) {
    console.error("[DownloadUtils] Error:", error);
    Alert.alert("Download Failed", error.message || "An unexpected error occurred during the download.");
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
