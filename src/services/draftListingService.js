/**
 * Draft Listing Service
 * Handles saving and retrieving draft listings
 * Auto-saves locally and syncs to database when authenticated
 * Drafts are stored per-user to ensure privacy and data isolation
 */

import authService from "./authService";
import listingService from "./listingService";
import storageService from "./storageService";
import logService from "./logService";

const DRAFTS_KEY_PREFIX = "listingDrafts_";

// Track which drafts are currently being synced to prevent duplicates
const syncingDrafts = new Set();
const pendingSyncs = new Map();
const syncTimers = new Map();
const SYNC_DEBOUNCE_MS = 750;
// In-memory cache for the most recently saved/accessed draft to prevent race conditions during navigation
const draftCache = new Map();

class DraftListingService {
  /**
   * Get the user-specific drafts storage key
   * @returns {Promise<string>} The storage key for current user's drafts
   */
  async getDraftsKey() {
    try {
      const userData = await authService.getUserData();
      const userId = userData && (userData.id || userData._id);
      const userEmail = userData && (userData.email || userData.emailAddress);
      if (userId || userEmail) {
        // Use user ID or email as unique identifier
        const identifier = userId || userEmail;
        return `${DRAFTS_KEY_PREFIX}${identifier}`;
      }
      // Fallback to guest key if not logged in (drafts won't persist across logins)
      return `${DRAFTS_KEY_PREFIX}guest`;
    } catch (error) {
      console.warn("Could not get user for drafts key:", error);
      return `${DRAFTS_KEY_PREFIX}guest`;
    }
  }

  /**
   * Filter out blob URLs from listing data
   * Blob URLs are temporary browser URLs and should not be stored in database
   * @param {Object} data - The listing data to filter
   * @returns {Object} Filtered data without blob URLs
   */
  filterTemporaryMediaUrls(data, { allowDeviceUris = true } = {}) {
    if (!data || typeof data !== 'object') return data;

    const filtered = { ...data };
    const temporaryPattern = allowDeviceUris
      ? /(?:^|\/)(?:blob:|data:)/i
      : /(?:^|\/)(?:blob:|data:|file:|content:)/i;

    const filterValue = (value) => {
      if (Array.isArray(value)) {
        return value.map(filterValue).filter((item) => item !== null);
      }
      if (typeof value === 'string') {
        return temporaryPattern.test(value.trim()) ? null : value;
      }
      if (typeof value === 'object' && value !== null) {
        const url = value.url || value.uri || value.src || value.location || value.path || value.storagePath;
        if (url && typeof url === 'string' && temporaryPattern.test(url.trim())) {
          return null;
        }
        return Object.fromEntries(
          Object.entries(value)
            .map(([key, nestedValue]) => [key, filterValue(nestedValue)])
            .filter(([, nestedValue]) => nestedValue !== null),
        );
      }
      return value;
    };

    const mediaFields = ['photos', 'images', 'propertyImages', 'video', 'videos', 'propertyVideos'];

    for (const field of mediaFields) {
      if (filtered[field] !== undefined) {
        filtered[field] = filterValue(filtered[field]);
      }
    }

    if (filtered.rawData && typeof filtered.rawData === 'object') {
      filtered.rawData = { ...filtered.rawData };
      for (const field of mediaFields) {
        if (filtered.rawData[field] !== undefined) {
          filtered.rawData[field] = filterValue(filtered.rawData[field]);
        }
      }
    }

    return filtered;
  }

  /**
   * Save a listing as draft
   * Saves locally first (fast), then syncs to database in background
   * @param {Object} listingData - The listing data to save
   * @returns {Promise<string>} The draft ID
   */
  async saveDraft(listingData, options = {}) {
    // Stage 1: Absolute defensive entry
    if (!listingData || typeof listingData !== 'object') {
      const errorMsg = "Invalid draft data: data is null or not an object";
      console.error("❌ [DraftListingService] Invalid listingData provided:", listingData);
      logService.logError(errorMsg, { data: typeof listingData });
      throw new Error(errorMsg);
    }

    try {
      // Stage 2: Capture all values immediately to local variables to avoid closure issues
      const inputDraftId = listingData?.draftId;
      const editingId = listingData?.editingListingId;
      const mongoId = listingData?._id || listingData?.id;
      const timestamp = new Date().toISOString();
      
      // Robust ID resolution:
      // 1. Use inputDraftId if already set
      // 2. If it's a valid MongoDB ObjectId, use it (crucial for updating existing records)
      // 3. If we're editing a specific listing ID, use that
      // 4. Fallback to a new temporary draft ID
      const isValidObjectId = mongoId && /^[a-fA-F0-9]{24}$/.test(String(mongoId));
      
      const resolvedDraftId =
        inputDraftId ||
        (isValidObjectId ? String(mongoId) : null) ||
        (editingId ? `edit_${editingId}` : `draft_${Date.now()}`);

      if (!resolvedDraftId) {
        console.error("❌ [DraftListingService] Could not resolve a draftId from:", listingData);
        throw new Error("Draft ID resolution failed");
      }

      // Stage 3: Prepare the final draft object safely
      const filteredListingData = this.filterTemporaryMediaUrls(listingData, {
        allowDeviceUris: true,
      });
      
      const draftToSave = {
        ...filteredListingData,
        draftId: resolvedDraftId,
        lastModified: timestamp,
        status: "draft",
      };

      // Stage 4: Local Storage Operations
      const draftsKey = await this.getDraftsKey();
      
      const existingDrafts = (await this.getAllDrafts()) || [];
      const updatedDraftsList = [...existingDrafts];
      
      const existingIndex = updatedDraftsList.findIndex((d) => 
        (d?.draftId === resolvedDraftId) || 
        (d?._id && d?._id === listingData?._id) ||
        (d?.draftId && d?.draftId === (listingData?._id || listingData?.id))
      );
      
      let finalDraftToSave = draftToSave;
      
      if (existingIndex >= 0) {
        // Merge new data with existing draft to preserve previously set fields
        // Only replace fields that are explicitly provided in the new data
        const existingDraft = updatedDraftsList[existingIndex];
        finalDraftToSave = {
          ...existingDraft, // Keep all existing fields
          ...draftToSave, // Overwrite with new data
          // Preserve critical fields that shouldn't be overwritten
          draftId: existingDraft.draftId || draftToSave.draftId,
          lastModified: timestamp,
          status: "draft",
        };
        updatedDraftsList[existingIndex] = finalDraftToSave;
      } else {
        updatedDraftsList.unshift(draftToSave);
      }
      
      // Update in-memory cache with the final draft
      draftCache.set(resolvedDraftId, finalDraftToSave);

      await storageService.setItem(draftsKey, updatedDraftsList);
      console.log("💾 [DraftListingService] Local save complete:", resolvedDraftId);

      // Stage 5: Background Database Sync (Heavily Guarded)
      // We don't await this to keep the UI snappy, but we catch all errors
      logService.logInfo("Saving draft locally", { draftId: resolvedDraftId });
      const syncPromise = options.syncImmediately
        ? this.syncToDatabase(finalDraftToSave)
        : this.scheduleDatabaseSync(finalDraftToSave);
      syncPromise.catch(err => {
        console.warn("⚠️ [DraftListingService] Background sync failed:", err.message);
        logService.logError("Draft background sync failed", { draftId: resolvedDraftId, message: err.message });
      });
      
      return finalDraftToSave;
    } catch (error) {
      console.error("❌ [DraftListingService] CRITICAL save error:", error);
      throw error;
    }
  }

  scheduleDatabaseSync(draftData) {
    pendingSyncs.set(draftData.draftId, draftData);

    const existingTimer = syncTimers.get(draftData.draftId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      syncTimers.delete(draftData.draftId);
      this.syncToDatabase(draftData).catch((error) => {
        console.warn("⚠️ [DraftListingService] Scheduled sync failed:", error.message);
      });
    }, SYNC_DEBOUNCE_MS);
    syncTimers.set(draftData.draftId, timer);

    return Promise.resolve();
  }

  /**
   * Sync a draft to the database
   * @param {Object} draftData - The draft data to sync
   * @returns {Promise<void>}
   */
  async syncToDatabase(draftData) {
    const scheduledTimer = syncTimers.get(draftData.draftId);
    if (scheduledTimer) {
      clearTimeout(scheduledTimer);
      syncTimers.delete(draftData.draftId);
    }

    const sanitizedDraft = this.filterTemporaryMediaUrls(draftData, {
      allowDeviceUris: false,
    });
    pendingSyncs.set(draftData.draftId, sanitizedDraft);

    if (syncingDrafts.has(draftData.draftId)) {
      return;
    }

    syncingDrafts.add(draftData.draftId);

    try {
      while (pendingSyncs.has(draftData.draftId)) {
        const nextDraft = pendingSyncs.get(draftData.draftId);
        pendingSyncs.delete(draftData.draftId);

        const result = await listingService.saveDraftToDatabase({
          ...nextDraft,
          isDraft: true,
        });
        if (!result.success) continue;

        console.log("✅ Draft synced to database:", nextDraft.draftId);
        logService.logInfo("Draft synced to database", { draftId: nextDraft.draftId });
        if (
          result.draft &&
          result.draft._id &&
          nextDraft._id !== result.draft._id
        ) {
          try {
            const draftsKey = await this.getDraftsKey();
            const drafts = await this.getAllDrafts();
            const existingIndex = drafts.findIndex(
              (d) => d.draftId === nextDraft.draftId,
            );
            if (existingIndex >= 0) {
              // Store the MongoDB _id but preserve the local draftId for routing continuity
              const updatedDraft = {
                ...drafts[existingIndex],
                _id: result.draft._id,
                // Ensure synchronization of any fields updated by server (like defaults)
                ...(result.draft.propertyName ? { propertyName: result.draft.propertyName } : {}),
              };
              drafts[existingIndex] = updatedDraft;
              await storageService.setItem(draftsKey, drafts);
              console.log(
                "🔄 Local draft appended with MongoDB ID:",
                result.draft._id,
              );
            }
          } catch (storageError) {
            console.log(
              "⚠️ Could not update local draft with MongoDB ID:",
              storageError.message,
            );
          }
        }
      }
    } catch (error) {
      console.log("⚠️ Could not sync draft to database:", error.message);
    } finally {
      // Always remove from syncing set when done
      syncingDrafts.delete(draftData.draftId);
    }
  }

  /**
   * Sync all local drafts to database
   * Call this on app start or login
   * @returns {Promise<void>}
   */
  async syncAllDraftsToDatabase() {
    try {
      const localDrafts = await this.getAllDrafts();
      console.log("🔄 Syncing", localDrafts.length, "drafts to database...");

      for (const draft of localDrafts) {
        await this.syncToDatabase(draft);
      }

      console.log("✅ All drafts synced to database");
    } catch (error) {
      console.log("⚠️ Could not sync all drafts:", error.message);
    }
  }

  /**
   * Merge local and remote drafts
   * Uses most recent version based on lastModified
   * @returns {Promise<Array>} Merged drafts array
   */
  async mergeWithRemoteDrafts() {
    try {
      const localDrafts = await this.getAllDrafts();
      const remoteResult = await listingService.fetchDraftsFromDatabase();

      if (!remoteResult.success) {
        return localDrafts;
      }

      const remoteDrafts = remoteResult.drafts || [];
      const remoteIds = new Set(remoteDrafts.map((d) => d._id).filter(Boolean));
      const mergedMap = new Map();

      // Add local drafts first
      for (const draft of localDrafts) {
        // If local draft has a MongoDB _id, it was previously synced.
        // If it's no longer in the remote database, it was deleted, so we drop it
        if (draft._id && !remoteIds.has(draft._id)) {
          continue;
        }

        // Keep the local draft and key it by both draftId and _id
        mergedMap.set(draft.draftId, draft);
        if (draft._id) {
          mergedMap.set(draft._id, draft);
        }
      }

      // Merge remote drafts (use newer version)
      for (const remoteDraft of remoteDrafts) {
        // Ensure remoteDraft has a draftId
        if (!remoteDraft.draftId && remoteDraft._id) {
          remoteDraft.draftId = `remote_${remoteDraft._id}`;
        }

        // Use either _id or draftId to match with local drafts
        const localDraft =
          mergedMap.get(remoteDraft._id) || mergedMap.get(remoteDraft.draftId);

        if (!localDraft) {
          mergedMap.set(remoteDraft.draftId, remoteDraft);
          if (remoteDraft._id) {
            mergedMap.set(remoteDraft._id, remoteDraft);
          }
        } else {
          // Keep the newer one
          const localDate = new Date(
            localDraft.lastModified || localDraft.updatedAt || 0,
          );
          const remoteDate = new Date(
            remoteDraft.lastModified || remoteDraft.updatedAt || 0,
          );
          if (remoteDate > localDate) {
            // Retain local 'draftId' if it starts with special prefixes (edit_, draft_)
            if (
              localDraft.draftId &&
              (localDraft.draftId.startsWith("edit_") ||
                localDraft.draftId.startsWith("draft_"))
            ) {
              remoteDraft.draftId = localDraft.draftId;
            }
            mergedMap.set(remoteDraft.draftId, remoteDraft);
            if (remoteDraft._id) {
              mergedMap.set(remoteDraft._id, remoteDraft);
            }
          }
        }
      }

      // De-duplicate maps when converting to array
      const tempSet = new Set();
      const mergedDrafts = [];
      for (const draft of mergedMap.values()) {
        if (!tempSet.has(draft.draftId)) {
          tempSet.add(draft.draftId);
          mergedDrafts.push(draft);
        }
      }

      // Save merged drafts locally - use user-specific key
      const draftsKey = await this.getDraftsKey();
      await storageService.setItem(draftsKey, mergedDrafts);
      console.log(
        "✅ Merged",
        mergedDrafts.length,
        "drafts from local and remote",
      );

      return mergedDrafts;
    } catch (error) {
      console.log("⚠️ Could not merge drafts:", error.message);
      return this.getAllDrafts();
    }
  }

  /**
   * Get all draft listings for the current user
   * @returns {Promise<Array>} Array of draft listings
   */
  async getAllDrafts() {
    try {
      const draftsKey = await this.getDraftsKey();
      let drafts = await storageService.getItem(draftsKey);
      
      // If local drafts are missing/empty and user is logged in, attempt remote merge automatically
      if ((!drafts || drafts.length === 0) && (await authService.getToken())) {
        console.log("⚡ [DraftListingService] No local drafts found. Pulling remote drafts from database...");
        try {
          const remoteResult = await listingService.fetchDraftsFromDatabase();
          if (remoteResult?.success && Array.isArray(remoteResult.drafts) && remoteResult.drafts.length > 0) {
            drafts = remoteResult.drafts.map(d => ({
              ...d,
              draftId: d.draftId || `remote_${d._id}`,
              lastModified: d.lastModified || d.updatedAt || new Date().toISOString()
            }));
            await storageService.setItem(draftsKey, drafts);
            console.log("✅ [DraftListingService] Hydrated", drafts.length, "remote drafts into local storage");
          }
        } catch (remoteErr) {
          console.warn("⚠️ [DraftListingService] Remote draft pull error:", remoteErr.message);
        }
      }

      return drafts || [];
    } catch (error) {
      console.error("Error getting drafts:", error);
      return [];
    }
  }

  /**
   * Get a specific draft by ID synchronously from cache
   * Use this for immediate merging during navigation
   * @param {string} draftId - The draft ID
   * @returns {Object|null} The cached draft listing or null
   */
  getDraftSync(draftId) {
    if (draftCache.has(draftId)) {
      return draftCache.get(draftId);
    }
    return null;
  }

  /**
   * Get a specific draft by ID
   * @param {string} draftId - The draft ID
   * @returns {Promise<Object|null>} The draft listing or null
   */
  async getDraft(draftId) {
    try {
      // Check in-memory cache first for maximum speed during transitions
      if (draftCache.has(draftId)) {
        console.log("🚀 [DraftListingService] Returning draft from cache:", draftId);
        return draftCache.get(draftId);
      }

      const drafts = await this.getAllDrafts();
      const draft = drafts.find((d) => 
        d.draftId === draftId || 
        d._id === draftId || 
        (d._id && d._id === draftId.replace('edit_', ''))
      ) || null;
      
      // Seed cache if found in storage
      if (draft) {
        draftCache.set(draftId, draft);
      }
      
      return draft;
    } catch (error) {
      console.error("Error getting draft:", error);
      return null;
    }
  }

  /**
   * Delete a draft by ID
   * Deletes locally and from database
   * @param {string} draftId - The draft ID to delete
   * @returns {Promise<void>}
   */
  async deleteDraft(draftId, localOnly = false) {
    try {
      // Delete locally first - use user-specific key
      const draftsKey = await this.getDraftsKey();
      const drafts = await this.getAllDrafts();

      const targetDraft = drafts.find((d) => d.draftId === draftId);
      
      // Only delete from backend if draft has been synced (has _id)
      // Local-only drafts (without _id) don't exist on backend
      const backendIdToDelete = targetDraft?._id;

      const filteredDrafts = drafts.filter((d) => 
        d.draftId !== draftId && 
        d._id !== draftId &&
        !(d._id && d._id === draftId.replace('edit_', ''))
      );
      await storageService.setItem(draftsKey, filteredDrafts);
      console.log("💾 Draft deleted locally:", draftId);

      // Delete from database only if it was synced (has _id) and not localOnly
      if (backendIdToDelete && !localOnly) {
        listingService.deleteDraftFromDatabase(backendIdToDelete).catch((err) => {
          console.log("⚠️ Could not delete draft from database:", err.message);
        });
      } else {
        console.log("📝 Draft was local-only or delete was localOnly, no backend deletion needed");
      }
    } catch (error) {
      console.error("Error deleting draft:", error);
      throw error;
    }
  }

  /**
   * Delete a draft associated with a specific published listing ID
   * Use this when a published listing is deleted to remove any "edit drafts"
   * @param {string} listingId - The published listing ID
   * @returns {Promise<void>}
   */
  async deleteDraftByListingId(listingId) {
    try {
      if (!listingId) return;

      const drafts = await this.getAllDrafts();
      // Find drafts that are either edit drafts for this listing or reference it
      const draftToDelete = drafts.find(
        (d) =>
          d.editingListingId === listingId ||
          d.draftId === `edit_${listingId}` ||
          d._id === listingId, // Just in case listing ID was used as draft ID
      );

      if (draftToDelete) {
        console.log(
          `🧹 Found matching draft for listing ${listingId}, deleting:`,
          draftToDelete.draftId,
        );
        await this.deleteDraft(draftToDelete.draftId);
      }
    } catch (error) {
      console.error("Error deleting draft by listing ID:", error);
    }
  }

  /**
   * Clear all drafts for the current user
   * @returns {Promise<void>}
   */
  async clearAllDrafts() {
    try {
      const draftsKey = await this.getDraftsKey();
      await storageService.setItem(draftsKey, []);
      console.log("All drafts cleared for current user");
    } catch (error) {
      console.error("Error clearing drafts:", error);
      throw error;
    }
  }

  /**
   * Remove all local drafts for the current user (used on logout)
   * @returns {Promise<void>}
   */
  async clearAllDraftsForCurrentUser() {
    try {
      const draftsKey = await this.getDraftsKey();
      await storageService.removeItem(draftsKey);
      console.log("🧹 Cleared all local drafts for user key:", draftsKey);
    } catch (error) {
      console.error("Error clearing drafts on logout:", error);
    }
  }

  /**
   * Generate a unique draft ID
   * @returns {string} Unique draft ID
   */
  generateDraftId() {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build draft data from params
   * @param {Object} params - Navigation params
   * @param {number} currentStep - Current step number
   * @returns {Object} Draft data object
   */
  buildDraftFromParams(params, currentStep) {
    return {
      draftId: params.draftId || this.generateDraftId(),
      currentStep,
      // Step 1
      propertyType: params.propertyType || "",
      // Step 2
      intent: params.intent || "",
      // Step 3
      propertyTitle: params.propertyTitle || "",
      propertyHighlight: params.propertyHighlight || "",
      furnishing: params.furnishing || "",
      rentalPurpose: params.rentalPurpose || "",
      bedrooms: params.bedrooms || 0,
      bathrooms: params.bathrooms || 0,
      sittingRooms: params.sittingRooms || 0,
      lounges: params.lounges || 0,
      workspaces: params.workspaces || 0,
      guestCapacity: params.guestCapacity || 0,
      titleType: params.titleType || "",
      roomSizes: params.roomSizes || [],
      totalSquareFootage: params.totalSquareFootage || "",
      usageType: params.usageType || "",
      // Step 4
      address: params.address || "",
      city: params.city || "",
      state: params.state || "",
      country: params.country || "Nigeria",
      postalCode: params.postalCode || "",
      landmarks: params.landmarks || "[]",
      propertyLocation: params.propertyLocation || {
        coordinates: [0, 0],
        fullAddress: "",
      },
      // Step 5
      amenities: params.amenities || params.selectedAmenities || "[]",
      selectedAmenities: params.selectedAmenities || params.amenities || "[]",
      customAmenities: params.customAmenities || "[]",
      // Step 6
      photos: params.photos || params.images || "[]",
      images: params.images || params.photos || "[]",
      propertyVideos: params.propertyVideos || params.video || "[]",
      video: params.video || params.propertyVideos || "[]",
      // Step 7
      price: params.price || "",
      pricingPeriod: params.pricingPeriod || "night",
      securityDeposit: params.securityDeposit || "",
      cleaningFee: params.cleaningFee || "",
      serviceCharge: params.serviceCharge || "",
      acceptRefund: params.acceptRefund !== undefined ? params.acceptRefund : true,
      // Step 8
      instantBooking: params.instantBooking || "false",
      minStay: params.minStay || "1",
      maxStay: params.maxStay || "30",
      advanceNotice: params.advanceNotice || "1",
      availableNow: params.availableNow || "true",
      availabilityStatus: params.availabilityStatus || "available",
      // Step 9
      houseRules: params.houseRules || "[]", // Standardize as array from UI
      checkInTime: params.checkInTime || "14:00",
      checkOutTime: params.checkOutTime || "11:00",
      additionalRules: params.additionalRules || "",
    };
  }
}

// Prevent redeclaration errors during Fast Refresh
if (globalThis.__draftListingServiceInstance) {
  module.exports = globalThis.__draftListingServiceInstance;
} else {
  const instance = new DraftListingService();
  globalThis.__draftListingServiceInstance = instance;
  module.exports = instance;
}

export default globalThis.__draftListingServiceInstance || new DraftListingService();
