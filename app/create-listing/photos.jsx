/**
 * Create Listing - Step 6: Photos & Videos
 * Resilient background uploading with network glitch recovery and seamless back/forth navigation.
 */

import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Plus,
  RefreshCw,
  Video,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import draftListingService from "../../src/services/draftListingService";
import mediaUploadService from "../../src/services/mediaUploadService";
import toastService from "../../src/services/toastService";

// Fallback for ActivityIndicator
const RNActivityIndicator = ActivityIndicator;

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
              index < currentStep ? styles.progressFilled : styles.progressEmpty,
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

// Safe JSON parse helper
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

  const currentDraftId = useMemo(() => {
    return (draftData && draftData.draftId) || draftId || params?.draftId || "temp_draft";
  }, [draftData, draftId, params]);

  // State
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeUploads, setActiveUploads] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("SUCCESS");

  useEffect(() => {
    const unsubscribe = toastService.subscribe(({ message, type }) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    });
    return unsubscribe;
  }, []);

  // Initial load from draft/params
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const paramsPhotos = params?.photos;

  useEffect(() => {
    if (draftId && !draftData) return;
    if (initialLoadDone) return;

    let loadedPhotos = [];
    if (draftData?.photos) {
      loadedPhotos = Array.isArray(draftData.photos)
        ? draftData.photos
        : safeParseArray(draftData.photos);
    } else if (paramsPhotos) {
      loadedPhotos = safeParseArray(paramsPhotos);
    }

    const validPhotos = loadedPhotos
      .map((p) => (typeof p === "string" ? p : p?.url || p?.uri || p?.path || null))
      .filter(Boolean);

    setPhotos(validPhotos);

    let loadedVideos = [];
    if (draftData?.propertyVideos || draftData?.video) {
      const vids = draftData.propertyVideos || draftData.video;
      loadedVideos = Array.isArray(vids) ? vids : safeParseArray(vids);
    }
    setVideos(loadedVideos);

    setInitialLoadDone(true);
  }, [draftData, draftId, initialLoadDone, paramsPhotos]);

  // Subscribe to MediaUploadService background queue updates
  useEffect(() => {
    if (!currentDraftId) return;

    const unsubscribe = mediaUploadService.subscribe(currentDraftId, (tasks) => {
      setActiveUploads(tasks || []);

      // If any task completed, sync local photos/videos state
      tasks.forEach((task) => {
        if (task.status === "completed" && task.serverUrl) {
          if (task.type === "photo") {
            setPhotos((prev) => {
              const hasUrl = prev.includes(task.serverUrl);
              if (!hasUrl) {
                const localIndex = prev.findIndex((p) => p === task.localUri);
                if (localIndex !== -1) {
                  const updated = [...prev];
                  updated[localIndex] = task.serverUrl;
                  return updated;
                }
                return [...prev, task.serverUrl].slice(0, 10);
              }
              return prev;
            });
          } else if (task.type === "video") {
            setVideos((prev) => {
              const hasUrl = prev.includes(task.serverUrl);
              if (!hasUrl) {
                const localIndex = prev.findIndex((v) => v === task.localUri);
                if (localIndex !== -1) {
                  const updated = [...prev];
                  updated[localIndex] = task.serverUrl;
                  return updated;
                }
                return [...prev, task.serverUrl].slice(0, 3);
              }
              return prev;
            });
          }
        }
      });
    });

    return unsubscribe;
  }, [currentDraftId]);

  // Auto-save photos helper
  const updatePhotos = useCallback(
    (newPhotos) => {
      const photosArray = Array.isArray(newPhotos) ? newPhotos : [];
      setPhotos(photosArray);
      if (currentDraftId) {
        saveDraftData({
          photos: photosArray,
          video: videos,
          propertyVideos: videos,
          currentStep: 6,
        }).catch((err) => console.error("Error auto-saving photos:", err));
      }
    },
    [currentDraftId, videos, saveDraftData]
  );

  // Auto-save videos helper
  const updateVideos = useCallback(
    (newVideos) => {
      const videosArray = Array.isArray(newVideos) ? newVideos : [];
      setVideos(videosArray);
      if (currentDraftId) {
        saveDraftData({
          photos: photos,
          video: videosArray,
          propertyVideos: videosArray,
          currentStep: 6,
        }).catch((err) => console.error("Error auto-saving videos:", err));
      }
    },
    [currentDraftId, photos, saveDraftData]
  );

  // Check if any uploads are actively in progress
  const isAnyPhotoUploading = useMemo(() => {
    return activeUploads.some(
      (t) => t.type === "photo" && (t.status === "uploading" || t.status === "compressing" || t.status === "retrying")
    );
  }, [activeUploads]);

  const isAnyVideoUploading = useMemo(() => {
    return activeUploads.some(
      (t) => t.type === "video" && (t.status === "uploading" || t.status === "compressing" || t.status === "retrying")
    );
  }, [activeUploads]);

  // Pick Image(s) with resilient background queue
  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toastService.showError("Please allow access to your photo library to upload images.");
        return;
      }
    }

    const remainingSlots = Math.max(0, 10 - (photos ? photos.length : 0));
    if (remainingSlots <= 0) {
      toastService.showError("Maximum 10 photos allowed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.min(10, remainingSlots),
      base64: Platform.OS === "web",
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets = result.assets.slice(0, remainingSlots);

      // Immediately add local preview URIs so user sees them right away
      const newLocalUris = selectedAssets.map((a) => a.uri);
      const updatedPhotos = [...photos, ...newLocalUris].slice(0, 10);
      setPhotos(updatedPhotos);

      // Enqueue to background MediaUploadService
      await mediaUploadService.enqueuePhotos(currentDraftId, selectedAssets, photos);

      // Auto-save draft with preview URIs immediately
      saveDraftData({
        photos: updatedPhotos,
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
      }).catch(console.error);
    }
  };

  // Pick Video with resilient background queue
  const pickVideo = async () => {
    if ((videos || []).length >= 3) {
      toastService.showError("Maximum 3 videos allowed.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: Platform.OS !== "web",
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAssets = result.assets.slice(0, 1);
        const newLocalUris = selectedAssets.map((a) => a.uri);
        const updatedVideos = [...videos, ...newLocalUris].slice(0, 3);
        setVideos(updatedVideos);

        // Enqueue to background MediaUploadService
        await mediaUploadService.enqueueVideos(currentDraftId, selectedAssets, videos);

        // Auto-save draft
        saveDraftData({
          photos: photos,
          video: updatedVideos,
          propertyVideos: updatedVideos,
          currentStep: 6,
        }).catch(console.error);
      }
    } catch (pickerError) {
      console.error("Error picking video:", pickerError);
      toastService.showError("Failed to select video. Please try again.");
    }
  };

  const removePhoto = (index) => {
    const photoToRemove = photos[index];
    const newPhotos = (photos || []).filter((_, i) => i !== index);
    updatePhotos(newPhotos);

    // Also remove from mediaUploadService queue if pending
    const matchingTask = activeUploads.find(
      (t) => t.localUri === photoToRemove || t.serverUrl === photoToRemove
    );
    if (matchingTask) {
      mediaUploadService.removeTask(matchingTask.id);
    }
  };

  const removeVideo = (index) => {
    const videoToRemove = videos[index];
    const newVideos = (videos || []).filter((_, i) => i !== index);
    updateVideos(newVideos);

    const matchingTask = activeUploads.find(
      (t) => t.localUri === videoToRemove || t.serverUrl === videoToRemove
    );
    if (matchingTask) {
      mediaUploadService.removeTask(matchingTask.id);
    }
  };

  const handleBack = async () => {
    // Save draft and navigate back immediately — background uploads continue!
    await saveDraftData(
      {
        photos: Array.isArray(photos) ? photos : safeParseArray(photos),
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
        draftId: currentDraftId,
      },
      { background: true }
    );

    router.replace({
      pathname: "/create-listing/amenities",
      params: { draftId: currentDraftId },
    });
  };

  const handleNext = async () => {
    if (photos && photos.length >= 3) {
      // Save draft and advance to pricing — background uploads continue!
      await saveDraftData(
        {
          photos: Array.isArray(photos) ? photos : safeParseArray(photos),
          video: videos,
          propertyVideos: videos,
          currentStep: 6,
          draftId: currentDraftId,
        },
        { background: true }
      );

      router.push({
        pathname: "/create-listing/pricing",
        params: { draftId: currentDraftId },
      });
    } else {
      toastService.showError("Please upload at least 3 photos of your property.");
    }
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      await saveDraftData({
        ...draftData,
        photos: Array.isArray(photos) ? photos : safeParseArray(photos),
        video: videos,
        propertyVideos: videos,
        currentStep: 6,
        draftId: currentDraftId,
      });

      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  // Helper to get active upload status for a photo URI
  const getPhotoUploadTask = (uri) => {
    return activeUploads.find((t) => t.type === "photo" && (t.localUri === uri || t.serverUrl === uri));
  };

  // Helper to get active upload status for a video URI
  const getVideoUploadTask = (uri) => {
    return activeUploads.find((t) => t.type === "video" && (t.localUri === uri || t.serverUrl === uri));
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Photos Section */}
        <Text style={styles.sectionTitle}>Add photos of your property</Text>
        <Text style={styles.subtitle}>
          Upload at least 3 photos (max 10) <Text style={styles.requiredText}>*Required</Text>
        </Text>

        {/* Photos Grid & Upload Area */}
        {photos.length === 0 ? (
          <Pressable style={styles.uploadArea} onPress={pickImage}>
            <Camera size={40} color="#010135" strokeWidth={1.5} />
            <Text style={styles.uploadTitle}>Tap to upload photos</Text>
            <Text style={styles.uploadSubtitle}>PNG, JPG up to 10MB each</Text>
          </Pressable>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photoUri, index) => {
              const task = getPhotoUploadTask(photoUri);
              const isUploading = task && task.status !== "completed";
              const isRetrying = task && task.status === "retrying";
              const isFailed = task && task.status === "failed";
              const progress = task ? task.progress : 100;

              return (
                <View key={`${photoUri}_${index}`} style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photo} />

                  {/* Uploading / Retrying / Progress Micro-Overlay */}
                  {isUploading && (
                    <View style={styles.uploadOverlay}>
                      {isRetrying ? (
                        <View style={styles.retryingBox}>
                          <RefreshCw size={14} color="#FFFFFF" />
                          <Text style={styles.overlayText}>Reconnecting...</Text>
                        </View>
                      ) : isFailed ? (
                        <Pressable
                          style={styles.failedBox}
                          onPress={() => mediaUploadService.retryTask(task.id)}
                        >
                          <AlertCircle size={14} color="#FFFFFF" />
                          <Text style={styles.overlayText}>Tap to Retry</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.progressBox}>
                          <RNActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.overlayText}>
                            {task.status === "compressing" ? "Optimizing" : `${progress}%`}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Completed Checkmark Indicator */}
                  {task && task.status === "completed" && (
                    <View style={styles.completedBadge}>
                      <CheckCircle2 size={12} color="#10B981" />
                    </View>
                  )}

                  {/* Delete Button */}
                  <Pressable style={styles.removeButton} onPress={() => removePhoto(index)}>
                    <X size={12} color="#FFFFFF" />
                  </Pressable>

                  {/* Cover Badge */}
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverText}>Cover</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {photos.length < 10 && (
              <Pressable style={styles.addMoreButton} onPress={pickImage}>
                <Plus size={24} color="#010135" strokeWidth={2} />
                <Text style={styles.addMoreText}>Add More</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.photoCount}>{photos.length}/10 photos selected</Text>

        {/* Video Section */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Add a video tour</Text>
          <Text style={styles.subtitle}>Optional - showcase your property with up to 3 videos</Text>

          {videos.length === 0 ? (
            <Pressable style={styles.videoUploadArea} onPress={pickVideo}>
              <Video size={40} color="#010135" />
              <Text style={styles.uploadTitle}>Tap to upload video</Text>
              <Text style={styles.uploadSubtitle}>MP4, MOV up to 100MB</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 10, marginTop: 15 }}>
              {videos.map((vidUri, index) => {
                const task = getVideoUploadTask(vidUri);
                const isUploading = task && task.status !== "completed";
                const isRetrying = task && task.status === "retrying";
                const isFailed = task && task.status === "failed";
                const progress = task ? task.progress : 100;

                return (
                  <View key={`${vidUri}_${index}`} style={styles.videoItemContainer}>
                    <View style={styles.videoPreview}>
                      <Video size={26} color="#010135" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.videoFileName} numberOfLines={1}>
                          Video Tour {index + 1}
                        </Text>
                        {isUploading && (
                          <View style={styles.videoProgressRow}>
                            <Text style={styles.videoProgressText}>
                              {isRetrying
                                ? "Reconnecting..."
                                : isFailed
                                ? "Upload paused. Tap to retry."
                                : task.status === "compressing"
                                ? "Preparing video tour..."
                                : `Uploading video tour (${progress}%)...`}
                            </Text>
                            <View style={styles.videoProgressBarBg}>
                              <View style={[styles.videoProgressBarFill, { width: `${progress}%` }]} />
                            </View>
                            <Text style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                              Upload runs in background • You can tap Next to continue
                            </Text>
                          </View>
                        )}
                        {task && task.status === "completed" && (
                          <Text style={styles.videoCompleteText}>Video tour ready</Text>
                        )}
                      </View>
                    </View>

                    {isFailed ? (
                      <Pressable
                        style={styles.retryButton}
                        onPress={() => mediaUploadService.retryTask(task.id)}
                      >
                        <RefreshCw size={14} color="#010135" />
                      </Pressable>
                    ) : null}

                    <Pressable style={styles.removeVideoButton} onPress={() => removeVideo(index)}>
                      <X size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                );
              })}

              {videos.length < 3 && (
                <Pressable
                  style={[styles.videoUploadArea, { height: 75, marginTop: 5 }]}
                  onPress={pickVideo}
                >
                  <Text style={[styles.uploadTitle, { fontSize: 14 }]}>+ Add another video</Text>
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
          style={[styles.nextButton, photos.length < 3 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={photos.length < 3}
        >
          <Text
            style={[styles.nextButtonText, photos.length < 3 && styles.nextButtonTextDisabled]}
          >
            Next
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
    fontWeight: "600",
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
    paddingTop: 20,
    paddingBottom: 24,
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
    height: 180,
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
    width: "30.5%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 1, 53, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  progressBox: {
    alignItems: "center",
    gap: 4,
  },
  retryingBox: {
    alignItems: "center",
    gap: 4,
  },
  failedBox: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  completedBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  coverBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#010135",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  coverText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addMoreButton: {
    width: "30.5%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
  },
  photoCount: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  requiredText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  videoSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  videoUploadArea: {
    height: 110,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  videoItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  videoPreview: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoFileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010135",
  },
  videoProgressRow: {
    marginTop: 4,
    gap: 3,
  },
  videoProgressText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  videoProgressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  videoProgressBarFill: {
    height: "100%",
    backgroundColor: "#010135",
    borderRadius: 2,
  },
  videoCompleteText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 2,
  },
  retryButton: {
    padding: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
  },
  removeVideoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "android" ? 44 : 20,
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  backButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#010135",
  },
  nextButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#94A3B8",
  },
});

export default Photos;
