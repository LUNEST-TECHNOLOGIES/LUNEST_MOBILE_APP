/**
 * Create Listing - Step 6: Photos
 * Upload property photos with automatic compression
 * Supports both native and web platforms
 */

import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  Plus,
  Video,
  X
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ToastNotification from "../../src/components/common/ToastNotification";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import useDraftListing from "../../src/hooks/useDraftListing";
import configService from "../../src/services/configService";
import draftListingService from "../../src/services/draftListingService";
import imageCompressionService from "../../src/services/imageCompressionService";
import listingService from "../../src/services/listingService";
import toastService from "../../src/services/toastService";

// Fallback for ActivityIndicator if needed (React 19 / RN 0.81 compatibility)
const RNActivityIndicator = ActivityIndicator;

// Only import file system on native platforms
let LegacyFileSystem = null;
if (Platform.OS !== "web") {
  LegacyFileSystem = require("expo-file-system/legacy");
}

// Icons migrated to Lucide

// Progress Bar Component
const ProgressBar = ({ currentStep, totalSteps }) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBars}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index < currentStep
                ? styles.progressFilled
                : styles.progressEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// Legacy icons migrated to Lucide

// Safe JSON parse helper - defined outside component
const safeParseArray = (value) => {
  if (!value || value === "" || value === "[]") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Error parsing JSON:", e);
    return [];
  }
};

const Photos = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draftData, draftId, saveDraftData } = useDraftListing();

  // Initialize from draft or params
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCompressingVideo, setIsCompressingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0); // Add progress state
  const [imageProgress, setImageProgress] = useState(0); // Add image progress state
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("SUCCESS");

  // Subscribe to toast service
  useEffect(() => {
    const unsubscribe = toastService.subscribe(({ message, type }) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    });
    return unsubscribe;
  }, []);

  // Flag to ensure we only load from draft/params once on mount
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  // Stable reference to params.photos
  const paramsPhotos = params?.photos;

  useEffect(() => {
    // If we have a draftId but draftData isn't loaded yet, wait for it
    if (draftId && !draftData) return;

    // Once load is done, don't re-run this logic
    if (initialLoadDone) return;

    const resolveAllImages = async () => {
      console.log('📂 [Photos] Loading photos for draft:', draftId);
      console.log('📊 [Photos] Draft data available:', !!draftData);
      
      let loadedPhotos = [];
      if (draftData?.photos) {
        loadedPhotos = Array.isArray(draftData.photos)
          ? draftData.photos
          : safeParseArray(draftData.photos);
        console.log('📸 [Photos] Found photos in draft:', loadedPhotos.length);
      } else if (paramsPhotos) {
        loadedPhotos = safeParseArray(paramsPhotos);
        console.log('📸 [Photos] Found photos in params:', loadedPhotos.length);
      } else {
        console.log('📸 [Photos] No photos found in draft or params');
      }

      // Filter and validate photos - only keep S3 URLs, discard local paths
      const validPhotos = loadedPhotos.filter(p => {
        const uri = typeof p === "string" ? p : (p?.url || p?.uri);
        if (!uri) return false;
        
        // Accept: Full HTTP(S) URLs (S3), data URLs (web)
        // Reject: Local file paths that won't persist
        const isValidUrl = uri.startsWith('http') || uri.startsWith('data:');
        const isLocalPath = uri.includes('file://') || uri.includes('documentDirectory') || uri.includes('cache');
        
        if (isLocalPath) {
          console.warn('⚠️ [Photos] Discarding local path (will not persist):', uri.substring(0, 50));
          return false;
        }
        
        return isValidUrl;
      });
      
      console.log(`📝 [Photos] Valid S3 URLs: ${validPhotos.length}/${loadedPhotos.length}`);
      setPhotos(validPhotos);

      let loadedVideos = [];
      if (draftData?.propertyVideos || draftData?.video) {
        const vids = draftData.propertyVideos || draftData.video;
        loadedVideos = Array.isArray(vids) ? vids : safeParseArray(vids);
        console.log('🎬 [Photos] Found videos in draft:', loadedVideos.length);
      }
      console.log('📝 [Photos] Setting videos state:', loadedVideos.length);
      setVideos(loadedVideos);

      setInitialLoadDone(true);
    };

    resolveAllImages();
  }, [draftData, draftId, initialLoadDone, paramsPhotos]);

  // Auto-save when photos change
  const updatePhotos = (newPhotos) => {
    const photosArray = Array.isArray(newPhotos) ? newPhotos : [];
    setPhotos(photosArray);
    if (draftId) {
      saveDraftData({
        photos: photosArray,
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
      }).catch((err) => console.error("Error auto-saving photos:", err));
    }
  };

  // Auto-save when videos change
  const updateVideos = (newVideos) => {
    const videosArray = Array.isArray(newVideos) ? newVideos : [];
    setVideos(videosArray);
    if (draftId) {
      saveDraftData({
        photos: photos,
        video: videosArray,
        propertyVideos: videosArray,
        currentStep: 6,
      }).catch((err) => console.error("Error auto-saving videos:", err));
    }
  };

  const handleClose = () => {
    // Close button always works - show modal
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    // Yes, Cancel - save draft and go to listings
    try {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();

      await saveDraftData({
        ...draftData,
        photos: Array.isArray(photos) ? photos : safeParseArray(photos),
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
        draftId: finalDraftId,
      });

      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft:", error);
      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    // No, Continue - close modal and keep editing
    setShowCancelModal(false);
  };

  const handleBack = async () => {
    // Save current photos before navigating back
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      photos: Array.isArray(photos) ? photos : safeParseArray(photos),
      video: videos,
      propertyVideos: videos,
      currentStep: 6,
      draftId: finalDraftId,
    }, { background: true });

    router.replace({
      pathname: "/create-listing/amenities",
      params: { draftId: finalDraftId },
    });
  };

  const pickImage = async () => {
    // On web, permissions work differently
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        toastService.showError("Please allow access to your photo library to upload images.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.min(10, 20 - (photos ? photos.length : 0)),
      // For web, use base64 to ensure we can access the image data
      base64: Platform.OS === "web",
    });

    if (!result.canceled && result.assets) {
      setIsCompressing(true);
      setImageProgress(0); // Add Image Progress Block
      const currentPhotos = photos || [];

      try {
        // For native platforms, set up permanent storage directory
        let permanentDir = null;
        if (Platform.OS !== "web" && LegacyFileSystem) {
          permanentDir = `${LegacyFileSystem.documentDirectory}listing_photos/`;
          const dirInfo = await LegacyFileSystem.getInfoAsync(permanentDir);
          if (!dirInfo.exists) {
            await LegacyFileSystem.makeDirectoryAsync(permanentDir, {
              intermediates: true,
            });
          }
        }

        // Process and save each image immediately for fast saving
        for (const asset of result.assets) {
          // Yield to UI thread to prevent freezing
          await new Promise((resolve) => setTimeout(resolve, 10));
          try {
            let finalUri;

            if (Platform.OS === "web") {
              // For web: compress the image using canvas and use the data URL
              console.log("🌐 [Photos] Processing web image...");
              const compressionResult =
                await imageCompressionService.compressImage(asset.uri, 10);
              finalUri = compressionResult.uri;
              console.log("✅ [Photos] Web image compressed");
            } else {
              // For native: compress and copy to permanent storage
              const compressionResult =
                await imageCompressionService.compressImage(asset.uri, 10);
              const compressedUri = compressionResult.uri;

              const fileName = `listing_photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
              const permanentUri = `${permanentDir}${fileName}`;

              await LegacyFileSystem.copyAsync({
                from: compressedUri,
                to: permanentUri,
              });

              finalUri = permanentUri;
            }

            // Inline backend upload for immediate URL persistence - REQUIRED for retention
            let serverUrl = null;
            let uploadAttempts = 0;
            const maxUploadAttempts = 3;
            
            while (!serverUrl && uploadAttempts < maxUploadAttempts) {
              uploadAttempts++;
              try {
                console.log(
                  `📸 [Photos] Uploading image to S3 (attempt ${uploadAttempts}/${maxUploadAttempts})...`,
                );
                const uploadImgRes = await listingService.uploadImages([finalUri]);
                
                if (uploadImgRes.success && uploadImgRes.images && uploadImgRes.images.length > 0) {
                  const uploadedImg = uploadImgRes.images[0];
                  let url = uploadedImg.url || uploadedImg;
                  
                  if (typeof url === "string") {
                    // Ensure full URL
                    if (url.startsWith("/")) {
                      const baseURL = await configService.getBaseURL();
                      url = `${baseURL}${url}`;
                    }
                    
                    // Validate it's an S3 URL (contains s3 or our domain)
                    if (url.includes('s3') || url.includes('lunest') || url.startsWith('http')) {
                      serverUrl = url;
                      console.log("✅ [Photos] Image uploaded to S3:", serverUrl);
                    } else {
                      throw new Error("Invalid URL format returned from server");
                    }
                  }
                } else {
                  throw new Error(uploadImgRes.message || "Upload returned no images");
                }
              } catch (upErr) {
                console.warn(
                  `⚠️ [Photos] Upload attempt ${uploadAttempts} failed:`,
                  upErr.message || upErr
                );
                
                if (uploadAttempts >= maxUploadAttempts) {
                  // Show error to user - don't save local URI
                  toastService.showError(`Could not upload photo to server after ${maxUploadAttempts} attempts. Please check your connection and try again.`);
                  throw new Error("Failed to upload to S3 after multiple attempts");
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
              }
            }

            // Only use S3 URL, never local URI
            finalUri = serverUrl || finalUri;

            // Add to photos array
            const newPhotos = [...currentPhotos, finalUri].slice(0, 10);
            setPhotos(newPhotos);
            currentPhotos.push(finalUri);

            // Auto-save immediately after each photo
            if (draftId) {
              await saveDraftData({
                photos: newPhotos,
                video: videos,
                propertyVideos: videos,
                currentStep: 6,
              });
              console.log(
                `✅ Photo ${currentPhotos.length} saved${Platform.OS === "web" ? " (web)" : " to permanent storage"}`,
              );
            }
            // Update progress for each processed image
            const currentImgProgress = Math.round(
              ((currentPhotos.length - photos.length + 1) /
                result.assets.length) *
                100,
            );
            setImageProgress(currentImgProgress);
          } catch (error) {
            console.error("Error compressing/saving image:", error);
            // Use original on error and still save
            const newPhotos = [...currentPhotos, asset.uri].slice(0, 10);
            setPhotos(newPhotos);
            currentPhotos.push(asset.uri);

            if (draftId) {
              await saveDraftData({
                photos: newPhotos,
                video: videos,
                propertyVideos: videos,
                currentStep: 6,
              });
            }
          }
        }

        console.log(
          `✅ All ${result.assets.length} photo(s) uploaded and saved${Platform.OS === "web" ? " (web)" : " to permanent storage"}`,
        );
      } catch (error) {
        console.error("Error processing images:", error);
        toastService.showError("Failed to process images. Please try again.");
      } finally {
        setIsCompressing(false);
        setImageProgress(0);
      }
    }
  };

  const removePhoto = (index) => {
    const newPhotos = (photos || []).filter((_, i) => i !== index);
    updatePhotos(newPhotos);
  };

  const handleNext = async () => {
    if (photos && photos.length >= 3) {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();

      // OPTIMIZATION: Trigger save in background and navigate immediately
      // CRITICAL: We await the local save to ensure data is in cache for next screen
      await saveDraftData({
        photos: Array.isArray(photos) ? photos : safeParseArray(photos),
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
        draftId: finalDraftId,
      }, { background: true });

      router.push({
        pathname: "/create-listing/pricing",
        params: { draftId: finalDraftId },
      });
    } else {
      toastService.showError("Please upload at least 3 photos of your property.");
    }
  };

  // Pick video function
  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        toastService.showError("Please allow access to your media library to upload videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: true,
        selectionLimit: 3 - (videos ? videos.length : 0),
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setIsCompressingVideo(true);
        setVideoProgress(0);
        const currentVideos = videos || [];

        try {
          const newDocVideos = [...currentVideos];
          let successCount = 0;
          let errorCount = 0;

          for (const asset of result.assets) {
            // Yield to UI thread to prevent freezing
            await new Promise((resolve) => setTimeout(resolve, 10));
            try {
              console.log("🎬 [Photos] Processing video...");
              const originalSize = await imageCompressionService.getFileSize(asset.uri);
              const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

              if (originalSize > MAX_VIDEO_SIZE) {
                console.log(
                  `⚠️ [Photos] Video exceeds 50MB (${(originalSize / 1024 / 1024).toFixed(1)}MB). Attempting compression...`,
                );
              }

              // Compress video
              const compressionResult = await imageCompressionService.compressVideo(
                asset.uri,
                (progress) => setVideoProgress(Math.round(progress * 100)),
                50,
              );

              // Check if still too large after compression
              if (compressionResult && compressionResult.size > MAX_VIDEO_SIZE) {
                toastService.showError(`Video is ${(compressionResult.size / 1024 / 1024).toFixed(1)}MB after compression. Max is 50MB. Please choose a shorter video.`);
                errorCount++;
                continue;
              }

              let compressedUri = compressionResult ? compressionResult.uri : asset.uri;
              console.log("✅ [Photos] Video processed successfully");

              // Upload to server
              try {
                console.log("🎬 [Photos] Uploading video to server...");
                const uploadVidRes = await listingService.uploadVideos([compressedUri]);
                
                if (uploadVidRes.success && uploadVidRes.videos && uploadVidRes.videos.length > 0) {
                  const uploadedVid = uploadVidRes.videos[0];
                  let serverUrl = uploadedVid.url || uploadedVid;
                  
                  if (typeof serverUrl === "string") {
                    if (serverUrl.startsWith("/")) {
                      const baseURL = await configService.getBaseURL();
                      serverUrl = `${baseURL}${serverUrl}`;
                    }
                    compressedUri = serverUrl;
                    console.log("✅ [Photos] Video uploaded to S3:", compressedUri);
                  }
                  
                  newDocVideos.push(compressedUri);
                  successCount++;
                } else {
                  throw new Error(uploadVidRes.message || "Upload failed");
                }
              } catch (upErr) {
                console.warn("⚠️ [Photos] Video upload failed:", upErr);
                toastService.showError(`Failed to upload video: ${upErr.message || "Please check your connection"}`);
                errorCount++;
              }
            } catch (compressError) {
              console.error("❌ [Photos] Video processing failed:", compressError);
              toastService.showError(`Failed to process video: ${compressError.message || "Please try a different video"}`);
              errorCount++;
            }
          }

          const finalVideos = newDocVideos.slice(0, 3);
          updateVideos(finalVideos);
          
          if (successCount > 0) {
            toastService.showSuccess(`${successCount} video(s) added successfully`);
          }
          if (errorCount > 0) {
            console.log(`⚠️ [Photos] ${errorCount} video(s) failed to process`);
          }
        } catch (e) {
          console.error("Error handling videos:", e);
          toastService.showError("An error occurred while processing videos. Please try again.");
        } finally {
          setIsCompressingVideo(false);
          setVideoProgress(0);
        }
      }
    } catch (pickerError) {
      console.error("Error picking video:", pickerError);
      toastService.showError("Failed to select video. Please try again.");
    }
  };

  const removeVideo = (index) => {
    const newVideos = (videos || []).filter((_, i) => i !== index);
    updateVideos(newVideos);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={6} totalSteps={10} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Photos Section */}
        <Text style={styles.sectionTitle}>Add photos of your property</Text>
        <Text style={styles.subtitle}>
          Upload at least 3 photos (max 10){" "}
          <Text style={styles.requiredText}>*Required</Text>
        </Text>

        {/* Photo Upload Area */}
        {isCompressing ? (
          <View style={[styles.uploadArea, { gap: 10 }]}>
            <RNActivityIndicator size="large" color="#010135" />
            <Text style={styles.uploadTitle}>
              Processing and Uploading Photos... {imageProgress}%
            </Text>
            <View
              style={{
                width: "80%",
                height: 6,
                backgroundColor: "#E0E0E0",
                borderRadius: 3,
                marginTop: 10,
              }}
            >
              <View
                style={{
                  width: `${imageProgress}%`,
                  height: "100%",
                  backgroundColor: "#010135",
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        ) : photos.length === 0 ? (
          <Pressable style={styles.uploadArea} onPress={pickImage}>
            <Camera size={40} color="#010135" strokeWidth={1.5} />
            <Text style={styles.uploadTitle}>Tap to upload photos</Text>
            <Text style={styles.uploadSubtitle}>PNG, JPG up to 10MB each</Text>
          </Pressable>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                >
                  <X size={12} color="#FFFFFF" />
                </Pressable>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            {photos.length < 10 && (
              <Pressable style={styles.addMoreButton} onPress={pickImage}>
                <Plus size={24} color="#010135" strokeWidth={2} />
                <Text style={styles.addMoreText}>Add More</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.photoCount}>
          {photos.length}/10 photos uploaded
        </Text>

        {/* Video Section */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Add a video tour</Text>
          <Text style={styles.subtitle}>
            Optional - showcase your property with up to 3 videos
          </Text>

          {isCompressingVideo ? (
            <View style={[styles.videoUploadArea, { gap: 10 }]}>
              <RNActivityIndicator size="large" color="#010135" />
              <Text style={styles.uploadTitle}>
                Processing videos... {videoProgress}%
              </Text>

              <View
                style={{
                  width: "80%",
                  height: 6,
                  backgroundColor: "#E0E0E0",
                  borderRadius: 3,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: `${videoProgress}%`,
                    height: "100%",
                    backgroundColor: "#010135",
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          ) : videos.length === 0 ? (
            <Pressable style={styles.videoUploadArea} onPress={pickVideo}>
              <Video size={40} color="#010135" />
              <Text style={styles.uploadTitle}>Tap to upload video</Text>
              <Text style={styles.uploadSubtitle}>MP4, MOV up to 100MB</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 10, marginTop: 15 }}>
              {videos.map((vid, index) => (
                <View key={index} style={styles.videoItemContainer}>
                  <View style={styles.videoPreview}>
                    <Video size={30} color="#010135" />
                    <Text style={styles.videoFileName} numberOfLines={1}>
                      Video {index + 1}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.removeVideoButton}
                    onPress={() => removeVideo(index)}
                  >
                    <X size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
              {videos.length < 3 && (
                <Pressable
                  style={[styles.videoUploadArea, { height: 80, marginTop: 5 }]}
                  onPress={pickVideo}
                >
                  <Text style={[styles.uploadTitle, { fontSize: 14 }]}>
                    + Add another video
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.nextButton,
            (photos.length < 3 || isCompressing || isCompressingVideo) &&
              styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={photos.length < 3 || isCompressing || isCompressingVideo}
        >
          <Text
            style={[
              styles.nextButtonText,
              (photos.length < 3 || isCompressing || isCompressingVideo) &&
                styles.nextButtonTextDisabled,
            ]}
          >
            {isCompressing || isCompressingVideo ? "Uploading..." : "Next"}
          </Text>
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onConfirm={handleCancelConfirm}
        onDismiss={handleCancelDismiss}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    zIndex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBars: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    marginRight: 15,
  },
  progressSegment: {
    height: 5,
    flex: 1,
    borderRadius: 2,
  },
  progressFilled: {
    backgroundColor: "#0E2F5D",
  },
  progressEmpty: {
    backgroundColor: "#20A4FF",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  subtitle: {
    fontSize: 14,

    color: "#666666",
  },
  uploadArea: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#010135",
    borderStyle: "dashed",
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "600",

    color: "#010135",
  },
  uploadSubtitle: {
    fontSize: 12,

    color: "#666666",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  photoContainer: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  coverBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#010135",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  coverText: {
    fontSize: 10,
    fontWeight: "600",

    color: "#FFFFFF",
  },
  addMoreButton: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#010135",
  },
  photoCount: {
    fontSize: 14,

    color: "#666666",
    textAlign: "center",
    marginTop: 10,
  },
  requiredText: {
    color: "#FD3131",
    fontWeight: "600",
  },
  videoSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  videoUploadArea: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  videoItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
  },
  videoPreview: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoFileName: {
    fontSize: 14,

    color: "#333333",
    flex: 1,
  },
  removeVideoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FD3131",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 48 : 20,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#999999",
  },
});

export default Photos;
