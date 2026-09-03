/**
 * Media Upload Service (Background Upload Manager)
 * Manages resilient background photo & video compression and upload queues.
 * Survives screen navigation (back/forward) and automatically resumes on network reconnection.
 */

import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import configService from "./configService";
import draftListingService from "./draftListingService";
import imageCompressionService from "./imageCompressionService";
import listingService from "./listingService";

// Only import legacy file system on native
let LegacyFileSystem = null;
if (Platform.OS !== "web") {
  try {
    LegacyFileSystem = require("expo-file-system/legacy");
  } catch (e) {
    console.warn("LegacyFileSystem not available:", e);
  }
}

class MediaUploadService {
  constructor() {
    this.queue = new Map(); // taskId -> uploadTask
    this.subscribers = new Map(); // draftId -> Set of callbacks
    this.isOnline = true;
    this.networkListener = null;

    this.initNetworkListener();
  }

  get isConnected() {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return this.isOnline;
  }

  /**
   * Set up network connectivity monitoring for auto-retry on reconnection
   */
  initNetworkListener() {
    // 1. React Native NetInfo
    try {
      this.networkListener = NetInfo.addEventListener((state) => {
        const wasOffline = !this.isOnline;
        if (Platform.OS === "web") {
          this.isOnline = typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : true;
        } else {
          this.isOnline = state.isConnected && state.isInternetReachable !== false;
        }
        console.log(`🌐 [MediaUploadService] Network state changed: isOnline=${this.isOnline}`);

        if (wasOffline && this.isOnline) {
          console.log("🚀 [MediaUploadService] Internet restored! Resuming all pending/failed uploads...");
          this.resumeAllUploads();
        }
      });
    } catch (e) {
      console.warn("NetInfo listener init warning:", e);
    }

    // 2. Web browser online event
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("🚀 [MediaUploadService] Web window online event triggered!");
        this.isOnline = true;
        this.resumeAllUploads();
      });
      window.addEventListener("offline", () => {
        console.log("⚠️ [MediaUploadService] Web window offline event triggered!");
        this.isOnline = false;
      });
    }
  }

  /**
   * Subscribe to upload progress and state updates for a specific draft
   * @param {string} draftId
   * @param {function} callback
   * @returns {function} unsubscribe function
   */
  subscribe(draftId, callback) {
    if (!draftId || typeof callback !== "function") return () => {};

    if (!this.subscribers.has(draftId)) {
      this.subscribers.set(draftId, new Set());
    }
    this.subscribers.get(draftId).add(callback);

    // Initial callback with current state
    callback(this.getDraftUploads(draftId));

    return () => {
      const draftSubs = this.subscribers.get(draftId);
      if (draftSubs) {
        draftSubs.delete(callback);
        if (draftSubs.size === 0) {
          this.subscribers.delete(draftId);
        }
      }
    };
  }

  /**
   * Notify all subscribers of changes for a draft
   */
  notify(draftId) {
    this.subscribers.forEach((callbacks, subDraftId) => {
      if (!subDraftId || subDraftId === draftId || subDraftId === "temp_draft" || draftId === "temp_draft") {
        const uploads = this.getDraftUploads(subDraftId);
        callbacks.forEach((cb) => {
          try {
            cb(uploads);
          } catch (err) {
            console.error("Subscriber notification error:", err);
          }
        });
      }
    });
  }

  /**
   * Get all active and completed upload tasks for a draft
   * @param {string} draftId
   * @returns {Array} List of upload tasks
   */
  getDraftUploads(draftId) {
    const results = [];
    this.queue.forEach((task) => {
      if (!draftId || task.draftId === draftId || draftId === "temp_draft" || task.draftId === "temp_draft") {
        results.push({ ...task });
      }
    });
    return results;
  }

  /**
   * Check if any media is currently uploading for a draft
   * @param {string} draftId
   * @returns {boolean}
   */
  isUploading(draftId) {
    if (!draftId) return false;
    for (const task of this.queue.values()) {
      if (task.draftId === draftId && (task.status === "uploading" || task.status === "compressing" || task.status === "retrying")) {
        return true;
      }
    }
    return false;
  }

  /**
   * Enqueue photos for background upload
   * @param {string} draftId
   * @param {Array} assets - ImagePicker asset objects
   * @param {Array} currentPhotos - Current array of photo URLs/URIs
   */
  async enqueuePhotos(draftId, assets, currentPhotos = []) {
    if (!draftId || !Array.isArray(assets) || assets.length === 0) return [];

    console.log(`📸 [MediaUploadService] Enqueuing ${assets.length} photo(s) for draft: ${draftId}`);

    const newTasks = [];

    for (const asset of assets) {
      const taskId = `photo_${draftId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const task = {
        id: taskId,
        draftId,
        type: "photo",
        localUri: asset.uri,
        serverUrl: null,
        status: "compressing", // compressing -> uploading -> completed | failed | retrying
        progress: 10,
        error: null,
        retryCount: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      this.queue.set(taskId, task);
      newTasks.push(task);
    }

    this.notify(draftId);

    // Start processing in background without blocking UI
    for (const task of newTasks) {
      this.processPhotoUpload(task).catch((err) => {
        console.error(`[MediaUploadService] Unhandled photo task ${task.id} error:`, err);
      });
    }

    return newTasks;
  }

  /**
   * Enqueue videos for background upload
   * @param {string} draftId
   * @param {Array} assets - ImagePicker asset objects
   * @param {Array} currentVideos - Current array of video URLs/URIs
   */
  async enqueueVideos(draftId, assets, currentVideos = []) {
    if (!draftId || !Array.isArray(assets) || assets.length === 0) return [];

    console.log(`🎬 [MediaUploadService] Enqueuing ${assets.length} video(s) for draft: ${draftId}`);

    const newTasks = [];

    for (const asset of assets) {
      const taskId = `video_${draftId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const task = {
        id: taskId,
        draftId,
        type: "video",
        localUri: asset.uri,
        serverUrl: null,
        status: "compressing",
        progress: 15,
        error: null,
        retryCount: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      this.queue.set(taskId, task);
      newTasks.push(task);
    }

    this.notify(draftId);

    // Start processing in background
    for (const task of newTasks) {
      this.processVideoUpload(task).catch((err) => {
        console.error(`[MediaUploadService] Unhandled video task ${task.id} error:`, err);
      });
    }

    return newTasks;
  }

  /**
   * Process a single photo task with compression, S3 upload, and automatic network retries
   */
  async processPhotoUpload(task) {
    const { id, draftId, localUri } = task;

    try {
      task.status = "compressing";
      task.progress = 25;
      this.notify(draftId);

      let finalUri = localUri;

      if (Platform.OS === "web") {
        try {
          const compressionResult = await imageCompressionService.compressImage(localUri, 2);
          finalUri = compressionResult?.uri || localUri;
        } catch (webCompErr) {
          console.warn("[MediaUploadService] Web compression fallback:", webCompErr?.message);
          finalUri = localUri;
        }
      } else {
        let compressedUri = localUri;
        try {
          const compressionResult = await imageCompressionService.compressImage(localUri, 2);
          compressedUri = compressionResult?.uri || localUri;
        } catch (compErr) {
          console.warn("[MediaUploadService] Image compression fallback:", compErr?.message);
          compressedUri = localUri;
        }

        if (LegacyFileSystem && LegacyFileSystem.documentDirectory) {
          try {
            const permanentDir = `${LegacyFileSystem.documentDirectory}listing_photos/`;
            const dirInfo = await LegacyFileSystem.getInfoAsync(permanentDir);
            if (!dirInfo.exists) {
              await LegacyFileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
            }
            const fileName = `listing_photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const permanentUri = `${permanentDir}${fileName}`;
            await LegacyFileSystem.copyAsync({ from: compressedUri, to: permanentUri });
            finalUri = permanentUri;
          } catch (fsErr) {
            console.warn("[MediaUploadService] Permanent copy fallback:", fsErr?.message);
            finalUri = compressedUri;
          }
        } else {
          finalUri = compressedUri;
        }
      }

      task.status = "uploading";
      task.progress = 50;
      this.notify(draftId);

      // Perform upload with retry logic - high-speed direct presigned S3 path first
      const serverUrl = await this.uploadWithRetry(async () => {
        // Fast direct S3 PUT
        const fastRes = await listingService.uploadImageFast(finalUri, (pct) => {
          task.progress = Math.round(50 + pct * 0.45); // 50% to 95%
          this.notify(draftId);
        });

        if (fastRes.success && fastRes.url) {
          return fastRes.url;
        }

        // Fallback to backend multipart
        console.warn("⚠️ [MediaUploadService] Direct S3 image upload notice, trying multipart fallback...");
        task.progress = Math.min(task.progress + 10, 60);
        this.notify(draftId);

        const uploadImgRes = await listingService.uploadImages([finalUri], (pct) => {
          task.progress = Math.min(Math.round(50 + pct * 0.45), 98);
          this.notify(draftId);
        });
        if (uploadImgRes.success && uploadImgRes.images && uploadImgRes.images.length > 0) {
          const uploadedImg = uploadImgRes.images[0];
          let url = typeof uploadedImg === "string"
            ? uploadedImg
            : (uploadedImg?.url || uploadedImg?.location || uploadedImg?.storagePath || uploadedImg?.path || "");

          if (url) {
            if (typeof url === "string" && url.startsWith("/")) {
              const baseURL = await configService.getBaseURL();
              url = `${baseURL}${url}`;
            }
            return url;
          }
        }
        throw new Error(uploadImgRes.message || fastRes.message || "Upload did not return a valid URL");
      }, task);

      // Successfully completed
      task.status = "completed";
      task.progress = 100;
      task.serverUrl = serverUrl;
      task.error = null;
      console.log(`✅ [MediaUploadService] Photo ${id} upload complete:`, serverUrl);

      // Update draft automatically
      await this.syncDraftWithUploadedMedia(draftId);
    } catch (err) {
      console.warn(`⚠️ [MediaUploadService] Photo ${id} upload paused/failed:`, err.message);
      task.status = this.isConnected ? "failed" : "retrying";
      task.error = err.message;
      this.notify(draftId);
    }
  }

  /**
   * Process a single video task with compression, fast S3 upload, and automatic network retries
   */
  async processVideoUpload(task) {
    const { id, draftId, localUri } = task;

    try {
      task.status = "compressing";
      task.progress = 20;
      this.notify(draftId);

      // Video compression with safe fallback
      let compressedUri = localUri;
      if (Platform.OS !== "web") {
        try {
          const compressionResult = await imageCompressionService.compressVideo(
            localUri,
            50, // 50MB max for video
          );
          compressedUri = compressionResult?.uri || localUri;
        } catch (compErr) {
          console.warn("[MediaUploadService] Video compression fallback:", compErr?.message);
          compressedUri = localUri;
        }
      }

      task.status = "uploading";
      task.progress = 50;
      this.notify(draftId);

      // Perform upload with retry logic - direct presigned S3 PUT first
      const serverUrl = await this.uploadWithRetry(async () => {
        // Fast direct S3 PUT
        const fastRes = await listingService.uploadVideoFast(compressedUri, (pct) => {
          task.progress = Math.round(50 + pct * 0.45); // 50% to 95%
          this.notify(draftId);
        });

        if (fastRes.success && fastRes.url) {
          return fastRes.url;
        }

        // Fallback to backend multipart
        console.warn("⚠️ [MediaUploadService] Direct S3 video upload notice, trying multipart fallback...");
        task.progress = Math.min(task.progress + 10, 60);
        this.notify(draftId);

        const uploadVidRes = await listingService.uploadVideos([compressedUri], (pct) => {
          task.progress = Math.min(Math.round(50 + pct * 0.45), 98);
          this.notify(draftId);
        });

        if (uploadVidRes.success && uploadVidRes.videos && uploadVidRes.videos.length > 0) {
          const uploadedVid = uploadVidRes.videos[0];
          let url = typeof uploadedVid === "string"
            ? uploadedVid
            : (uploadedVid?.url || uploadedVid?.location || uploadedVid?.storagePath || uploadedVid?.path || "");

          if (url) {
            if (typeof url === "string" && url.startsWith("/")) {
              const baseURL = await configService.getBaseURL();
              url = `${baseURL}${url}`;
            }
            return url;
          }
        }

        throw new Error(uploadVidRes.message || fastRes.message || "Video upload did not return a valid URL");
      }, task);

      // Successfully completed
      task.status = "completed";
      task.progress = 100;
      task.serverUrl = serverUrl;
      task.error = null;
      console.log(`✅ [MediaUploadService] Video ${id} upload complete:`, serverUrl);

      // Update draft automatically
      await this.syncDraftWithUploadedMedia(draftId);
      this.notify(draftId);
    } catch (err) {
      console.warn(`⚠️ [MediaUploadService] Video ${id} upload paused/failed:`, err.message);
      task.status = this.isConnected ? "failed" : "retrying";
      task.error = err.message;
      this.notify(draftId);
    }
  }

  /**
   * Resilient upload helper with exponential backoff retry and glitch recovery
   */
  async uploadWithRetry(uploadFn, task) {
    let lastError = null;

    while (task.retryCount < task.maxRetries) {
      try {
        if (!this.isConnected) {
          task.status = "retrying";
          this.notify(task.draftId);
          console.log(`⏸️ [MediaUploadService] Device offline, pausing task ${task.id}...`);
          await this.waitForOnline();
        }

        return await uploadFn();
      } catch (err) {
        task.retryCount++;
        lastError = err;
        console.warn(
          `⚠️ [MediaUploadService] Upload attempt ${task.retryCount}/${task.maxRetries} failed for task ${task.id}:`,
          err.message
        );

        if (task.retryCount >= task.maxRetries) {
          task.status = "failed";
          task.error = err.message || "Upload failed";
          this.notify(task.draftId);
          break;
        }

        task.status = "retrying";
        this.notify(task.draftId);

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const backoffMs = Math.min(1000 * Math.pow(2, task.retryCount - 1), 6000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError || new Error("Upload failed after maximum retries");
  }

  /**
   * Wait until internet connection is restored
   */
  waitForOnline() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isConnected) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1500);
    });
  }

  /**
   * Resume all retrying or failed uploads across all drafts
   */
  resumeAllUploads() {
    this.queue.forEach((task) => {
      if (task.status === "retrying" || task.status === "failed") {
        console.log(`🔄 [MediaUploadService] Resuming task ${task.id} (${task.type})`);
        task.retryCount = 0; // reset retry counter on reconnection
        if (task.type === "photo") {
          this.processPhotoUpload(task).catch(console.error);
        } else if (task.type === "video") {
          this.processVideoUpload(task).catch(console.error);
        }
      }
    });
  }

  /**
   * Retry a specific failed task
   */
  retryTask(taskId) {
    const task = this.queue.get(taskId);
    if (task) {
      task.retryCount = 0;
      task.error = null;
      if (task.type === "photo") {
        this.processPhotoUpload(task).catch(console.error);
      } else if (task.type === "video") {
        this.processVideoUpload(task).catch(console.error);
      }
    }
  }

  /**
   * Remove a media item from the active queue
   */
  removeTask(taskId) {
    const task = this.queue.get(taskId);
    if (task) {
      this.queue.delete(taskId);
      this.notify(task.draftId);
      this.syncDraftWithUploadedMedia(task.draftId).catch(console.error);
    }
  }

  /**
   * Synchronize the draft listing with current uploaded URLs
   */
  async syncDraftWithUploadedMedia(draftId) {
    if (!draftId) return;

    try {
      const draft = await draftListingService.getDraft(draftId);
      if (!draft) return;

      const currentPhotos = Array.isArray(draft.photos) ? [...draft.photos] : [];
      const currentVideos = Array.isArray(draft.propertyVideos || draft.video)
        ? [...(draft.propertyVideos || draft.video)]
        : [];

      // Collect all completed URLs from queue
      this.queue.forEach((task) => {
        if (task.draftId === draftId && task.status === "completed" && task.serverUrl) {
          if (task.type === "photo") {
            // Replace localUri or add serverUrl
            const index = currentPhotos.findIndex(
              (p) => p === task.localUri || p === task.serverUrl || (typeof p === "object" && p.uri === task.localUri)
            );
            if (index !== -1) {
              currentPhotos[index] = task.serverUrl;
            } else if (!currentPhotos.includes(task.serverUrl)) {
              currentPhotos.push(task.serverUrl);
            }
          } else if (task.type === "video") {
            const index = currentVideos.findIndex(
              (v) => v === task.localUri || v === task.serverUrl || (typeof v === "object" && v.uri === task.localUri)
            );
            if (index !== -1) {
              currentVideos[index] = task.serverUrl;
            } else if (!currentVideos.includes(task.serverUrl)) {
              currentVideos.push(task.serverUrl);
            }
          }
        }
      });

      const validPhotos = currentPhotos.filter(Boolean);
      const validVideos = currentVideos.filter(Boolean);

      await draftListingService.saveDraft(
        {
          ...draft,
          draftId: draftId,
          photos: validPhotos,
          images: validPhotos,
          propertyImages: validPhotos,
          video: validVideos[0] || null,
          videos: validVideos,
          propertyVideos: validVideos,
        },
        { syncImmediately: true }
      );

      console.log(`💾 [MediaUploadService] Draft ${draftId} synced with uploaded media:`, {
        photosCount: validPhotos.length,
        videosCount: validVideos.length,
      });
    } catch (e) {
      console.error("Error syncing draft with media uploads:", e);
    }
  }
}

const mediaUploadService = new MediaUploadService();
export default mediaUploadService;
