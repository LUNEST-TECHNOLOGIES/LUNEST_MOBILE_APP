/**
 * Image Compression Service
 * Compresses images to maximum 10MB with optimized quality
 * Uses new expo-file-system File API with legacy fallback
 * Supports web platform with canvas-based compression
 */

import { Platform, Image as RNImage, NativeModules } from "react-native";

// Only import expo-file-system on native platforms
let LegacyFileSystem = null;
let FileAPI = null;

if (Platform.OS !== "web") {
  try {
    LegacyFileSystem = require("expo-file-system/legacy");
  } catch (e) {
    console.log("📁 [ImageCompression] Legacy FileSystem not available");
  }

  try {
    const nextFS = require("expo-file-system/next");
    FileAPI = nextFS.File;
  } catch (e) {
    console.log(
      "📁 [ImageCompression] New File API not available, using legacy",
    );
  }
}

class ImageCompressionService {
  /**
   * Get file size using new File API with legacy fallback
   * @param {string} uri - File URI
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(uri) {
    // On web, try to get file size from blob
    if (Platform.OS === "web") {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size || 0;
      } catch (e) {
        console.warn(
          "⚠️ [ImageCompression] Could not get file size on web:",
          e.message,
        );
        return 0;
      }
    }

    // Try new File API first if available (native only)
    if (FileAPI) {
      try {
        const file = new FileAPI(uri);
        if (file.exists) {
          return file.size || 0;
        }
      } catch (e) {
        // Fallback to legacy API
        console.log("📁 [ImageCompression] Using legacy file info API");
      }
    }

    // Fallback to legacy API (native only)
    if (LegacyFileSystem) {
      try {
        const info = await LegacyFileSystem.getInfoAsync(uri);
        return info.size || 0;
      } catch (e) {
        console.warn(
          "⚠️ [ImageCompression] Could not get file size:",
          e.message,
        );
        return 0;
      }
    }

    return 0;
  }

  /**
   * Compress image on web using canvas
   * @param {string} imageUri - URI of the image (blob URL or data URL)
   * @param {number} quality - Compression quality (0-1)
   * @returns {Promise<string>} - Compressed image data URL
   */
  async compressImageWeb(imageUri, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down if very large
          const MAX_DIMENSION = 2048;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(width, height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with specified quality
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => {
        reject(new Error("Failed to load image for compression"));
      };

      img.src = imageUri;
    });
  }

  /**
   * Compress image file to maximum 10MB
   * Automatically compresses without user prompts
   * @param {string} imageUri - URI of the image to compress
   * @param {number} maxSizeMB - Maximum size in MB (default: 10)
   * @returns {Promise<{uri: string, size: number, compressed: boolean}>}
   */
  async compressImage(imageUri, maxSizeMB = 10) {
    try {
      const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes

      // Web platform - use canvas-based compression
      if (Platform.OS === "web") {
        console.log("🌐 [ImageCompression] Using web canvas compression");
        try {
          // Get original size
          const originalSize = await this.getFileSize(imageUri);
          console.log(
            "🖼️ [ImageCompression] Original size:",
            this.formatBytes(originalSize),
          );

          // If already under limit, return as-is
          if (originalSize > 0 && originalSize <= maxSizeBytes) {
            console.log("✅ [ImageCompression] Image already under limit");
            return {
              uri: imageUri,
              size: originalSize,
              compressed: false,
            };
          }

          // Compress with canvas
          let quality = 0.8;
          let compressedUri = imageUri;
          let compressedSize = originalSize;

          // Try progressively lower quality
          while (
            (compressedSize > maxSizeBytes || compressedSize === 0) &&
            quality > 0.2
          ) {
            compressedUri = await this.compressImageWeb(imageUri, quality);

            // Estimate size from data URL (base64 is ~33% larger than binary)
            const base64Part = compressedUri.split(",")[1];
            const base64Length = base64Part ? base64Part.length : 0;
            compressedSize = Math.floor(base64Length * 0.75);

            console.log(
              `📊 [ImageCompression] Web quality ${quality.toFixed(1)}: ~${this.formatBytes(compressedSize)}`,
            );
            quality -= 0.1;
          }

          console.log("✅ [ImageCompression] Web compression successful");
          return {
            uri: compressedUri,
            size: compressedSize,
            compressed: true,
          };
        } catch (webError) {
          console.warn(
            "⚠️ [ImageCompression] Web compression failed, using original:",
            webError.message,
          );
          return {
            uri: imageUri,
            size: 0,
            compressed: false,
          };
        }
      }

      // Native platform - use expo-image-manipulator
      // Get original file size
      const originalSize = await this.getFileSize(imageUri);
      console.log(
        "🖼️ [ImageCompression] Original size:",
        this.formatBytes(originalSize),
      );

      // If already under limit, return as-is
      if (originalSize <= maxSizeBytes) {
        console.log("✅ [ImageCompression] Image already under 10MB limit");
        return {
          uri: imageUri,
          size: originalSize,
          compressed: false,
        };
      }

      // Need to compress - get image dimensions
      const dimensions = await this.getImageDimensions(imageUri);
      console.log("📐 [ImageCompression] Original dimensions:", dimensions);

      // Calculate compression quality needed
      let quality = 0.9;
      let compressedUri = imageUri;
      let compressedSize = originalSize;

      // Try progressively lower quality until under limit
      while (compressedSize > maxSizeBytes && quality > 0.1) {
        quality -= 0.1;

        // Compress image using ImageManipulator
        try {
          const manipulator = require("expo-image-manipulator");

          if (manipulator && manipulator.manipulateAsync) {
            // First try quality compression only
            let result = await manipulator.manipulateAsync(imageUri, [], {
              compress: Math.max(0.1, quality),
              format: manipulator.SaveFormat.JPEG,
            });
            compressedUri = result.uri;

            // Check new size
            compressedSize = await this.getFileSize(compressedUri);

            // If still too large, also resize
            if (compressedSize > maxSizeBytes && quality <= 0.5) {
              const scale = Math.sqrt(maxSizeBytes / originalSize) * 0.9;
              const newWidth = Math.floor(dimensions.width * scale);
              const newHeight = Math.floor(dimensions.height * scale);

              result = await manipulator.manipulateAsync(
                imageUri,
                [
                  {
                    resize: {
                      width: Math.max(800, newWidth),
                      height: Math.max(600, newHeight),
                    },
                  },
                ],
                {
                  compress: Math.max(0.1, quality),
                  format: manipulator.SaveFormat.JPEG,
                },
              );
              compressedUri = result.uri;
              compressedSize = await this.getFileSize(compressedUri);
            }
          }
        } catch (manipulatorError) {
          console.warn(
            "⚠️ [ImageCompression] Could not use ImageManipulator:",
            manipulatorError.message,
          );
          break;
        }

        console.log(
          `📊 [ImageCompression] Quality ${quality.toFixed(1)}: ${this.formatBytes(compressedSize)}`,
        );
      }

      // Final size check - silently return best effort (no warning to user)
      if (compressedSize > maxSizeBytes) {
        console.log(
          "ℹ️ [ImageCompression] Using best compression result available",
        );
        // Return the compressed version anyway (best effort)
        return {
          uri: compressedUri,
          size: compressedSize,
          compressed: true,
        };
      }

      console.log("✅ [ImageCompression] Compression successful");
      console.log("   Original:", this.formatBytes(originalSize));
      console.log("   Compressed:", this.formatBytes(compressedSize));
      console.log(
        "   Reduction:",
        ((1 - compressedSize / originalSize) * 100).toFixed(1) + "%",
      );

      return {
        uri: compressedUri,
        size: compressedSize,
        compressed: true,
      };
    } catch (error) {
      console.error("❌ [ImageCompression] Error compressing image:", error);
      // Return original URI silently on error (don't throw)
      return {
        uri: imageUri,
        size: 0,
        compressed: false,
      };
    }
  }

  /**
   * Compress multiple images
   * @param {string[]} imageUris - Array of image URIs
   * @param {number} maxSizeMB - Maximum size per image in MB
   * @returns {Promise<Array>}
   */
  async compressImages(imageUris, maxSizeMB = 10) {
    console.log(
      "🖼️ [ImageCompression] Compressing",
      imageUris.length,
      "images...",
    );

    const compressedImages = await Promise.all(
      imageUris.map((uri) => this.compressImage(uri, maxSizeMB)),
    );

    const totalOriginal = compressedImages.reduce(
      (sum, img) => sum + (img.originalSize || img.size),
      0,
    );
    const totalCompressed = compressedImages.reduce(
      (sum, img) => sum + img.size,
      0,
    );

    console.log("📊 [ImageCompression] Batch compression complete");
    console.log("   Total original:", this.formatBytes(totalOriginal));
    console.log("   Total compressed:", this.formatBytes(totalCompressed));

    return compressedImages;
  }

  /**
   * Get image dimensions
   * @param {string} imageUri - URI of the image
   * @returns {Promise<{width: number, height: number}>}
   */
  getImageDimensions(imageUri) {
    return new Promise((resolve, reject) => {
      RNImage.getSize(
        imageUri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          console.error("Error getting image dimensions:", error);
          // Return default dimensions if error
          resolve({ width: 1920, height: 1080 });
        },
      );
    });
  }

  /**
   * Format bytes to human readable size
   * @param {number} bytes - Size in bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Check if image exceeds size limit
   * @param {string} imageUri - URI of the image
   * @param {number} maxSizeMB - Maximum size in MB
   * @returns {Promise<boolean>}
   */
  async exceedsLimit(imageUri, maxSizeMB = 10) {
    try {
      const size = await this.getFileSize(imageUri);
      return size > maxSizeMB * 1024 * 1024;
    } catch (error) {
      console.error("Error checking image size:", error);
      return false;
    }
  }

  /**
   * Compress video
   * @param {string} videoUri - URI of the video
   * @param {function} onProgress - Callback for progression logging
   * @param {number} maxSizeMB - Maximum size in MB (default: 50)
   * @returns {Promise<{uri: string, size: number, compressed: boolean}>}
   */
  async compressVideo(videoUri, onProgress, maxSizeMB = 50) {
    try {
      if (Platform.OS === 'web') {
        console.log("🎬 [ImageCompression] Video compression skipped on web. Using original file.");
        const size = await this.getFileSize(videoUri);
        return {
          uri: videoUri,
          size: size,
          compressed: false,
        };
      }

      console.log(`🎬 [ImageCompression] Video compression requested (Max: ${maxSizeMB}MB)`);
      
      try {
        // Defensive check for unlinked package
        // First check NativeModules to avoid evaluation crash of unlinked native module
        const isLinked = !!NativeModules.Compressor || !!NativeModules.VideoCompressor;
        
        let compressor = null;
        if (isLinked) {
          try {
            compressor = require('react-native-compressor');
          } catch (e) {
            console.log("🎬 [ImageCompression] react-native-compressor package fail to load even if linked");
          }
        } else {
          console.log("🎬 [ImageCompression] react-native-compressor native module not found in NativeModules");
        }

        if (!compressor || !compressor.Video) {
           console.log("🎬 [ImageCompression] react-native-compressor.Video is unavailable (unlinked), skipping compression");
           const size = await this.getFileSize(videoUri);
           return {
             uri: videoUri,
             size: size,
             compressed: false,
           };
        }

        const { Video } = compressor;
        
        // Final sanity check before calling native methods
        if (typeof Video.compress !== 'function') {
           console.warn("🎬 [ImageCompression] Video.compress is not a function");
           throw new Error("Video.compress missing");
        }

        const compressedUri = await Video.compress(
            videoUri,
            {
              compressionMethod: 'auto',
              // We could add more options here if react-native-compressor supported target size directly
            },
            (progress) => {
               if (onProgress) onProgress(progress);
               console.log(`🎬 [ImageCompression] Video compression progress: ${Math.round(progress * 100)}%`);
            }
        );

        const size = await this.getFileSize(compressedUri);
        
        // If compressed size is still over limit, we can't do much more with this library accurately without manual bitrates
        // but we've at least tried.
        
        return {
          uri: compressedUri,
          size: size,
          compressed: true,
        };
      } catch (pkgError) {
        console.warn("⚠️ [ImageCompression] react-native-compressor runtime error:", pkgError.message);
        // Fallback to original
        const size = await this.getFileSize(videoUri);
        return {
          uri: videoUri,
          size: size,
          compressed: false,
        };
      }
    } catch (error) {
      console.error("❌ [ImageCompression] Critical error in compressVideo:", error);
      return {
        uri: videoUri,
        size: 0,
        compressed: false,
      };
    }
  }
}

export default new ImageCompressionService();
