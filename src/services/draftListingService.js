/**
 * Draft Listing Service
 * Handles saving and retrieving draft listings
 * Auto-saves locally and syncs to database when authenticated
 * Drafts are stored per-user to ensure privacy and data isolation
 */

import authService from "./authService";
import listingService from "./listingService";
import storageService from "./storageService";

const DRAFTS_KEY_PREFIX = "listingDrafts_";

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
   * Save a listing as draft
   * Saves locally first (fast), then syncs to database in background
   * @param {Object} listingData - The listing data to save
   * @returns {Promise<string>} The draft ID
   */
  async saveDraft(listingData) {
    try {
      const draftsKey = await this.getDraftsKey();
      const drafts = await this.getAllDrafts();
      // If editing a published listing, use a stable edit_{listingId} draftId so wen      // don't create multiple edit-drafts for the same listing when the user
      // navigates back-and-forth.
      const draftId =
        listingData.draftId ||
        (listingData.editingListingId
          ? `edit_${listingData.editingListingId}`
          : `draft_${Date.now()}`);

      const draft = {
        ...listingData,
        draftId,
        lastModified: new Date().toISOString(),
        status: "draft",
      };

      // Update existing draft or add new one
      const existingIndex = drafts.findIndex((d) => d.draftId === draftId);
      if (existingIndex >= 0) {
        drafts[existingIndex] = draft;
      } else {
        drafts.unshift(draft); // Add to beginning
      }

      // Save locally first (fast) - use user-specific key
      await storageService.setItem(draftsKey, drafts);
      console.log("💾 Draft saved locally:", draftId);

      // Sync to database (await to get _id back and prevent duplicate creation)
      try {
        await this.syncToDatabase(draft);
      } catch (err) {
        console.log("⚠️ Database sync failed (will retry later):", err.message);
      }

      return draftId;
    } catch (error) {
      console.error("Error saving draft:", error);
      throw error;
    }
  }

  /**
   * Sync a draft to the database
   * @param {Object} draftData - The draft data to sync
   * @returns {Promise<void>}
   */
  async syncToDatabase(draftData) {
    try {
      const result = await listingService.saveDraftToDatabase(draftData);
      if (result.success) {
        console.log("✅ Draft synced to database:", draftData.draftId);
        if (
          result.draft &&
          result.draft._id &&
          draftData._id !== result.draft._id
        ) {
          try {
            const draftsKey = await this.getDraftsKey();
            const drafts = await this.getAllDrafts();
            const existingIndex = drafts.findIndex(
              (d) => d.draftId === draftData.draftId,
            );
            if (existingIndex >= 0) {
              // Store the MongoDB _id but preserve the local draftId for routing continuity
              drafts[existingIndex]._id = result.draft._id;
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
      const drafts = await storageService.getItem(draftsKey);
      return drafts || [];
    } catch (error) {
      console.error("Error getting drafts:", error);
      return [];
    }
  }

  /**
   * Get a specific draft by ID
   * @param {string} draftId - The draft ID
   * @returns {Promise<Object|null>} The draft listing or null
   */
  async getDraft(draftId) {
    try {
      const drafts = await this.getAllDrafts();
      return drafts.find((d) => d.draftId === draftId) || null;
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
  async deleteDraft(draftId) {
    try {
      // Delete locally first - use user-specific key
      const draftsKey = await this.getDraftsKey();
      const drafts = await this.getAllDrafts();

      const targetDraft = drafts.find((d) => d.draftId === draftId);
      const backendIdToDelete =
        targetDraft && targetDraft._id ? targetDraft._id : draftId;

      const filteredDrafts = drafts.filter((d) => d.draftId !== draftId);
      await storageService.setItem(draftsKey, filteredDrafts);
      console.log("💾 Draft deleted locally:", draftId);

      // Delete from database in background using the explicit Mongo ID if observed
      listingService.deleteDraftFromDatabase(backendIdToDelete).catch((err) => {
        console.log("⚠️ Could not delete draft from database:", err.message);
      });
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
      bedrooms: params.bedrooms || "0",
      bathrooms: params.bathrooms || "0",
      guestCapacity: params.guestCapacity || "0",
      titleType: params.titleType || "",
      // Step 4
      address: params.address || "",
      city: params.city || "",
      state: params.state || "",
      country: params.country || "Nigeria",
      postalCode: params.postalCode || "",
      landmarks: params.landmarks || "[]",
      // Step 5
      amenities: params.amenities || "[]",
      customAmenities: params.customAmenities || "[]",
      // Step 6
      photos: params.photos || "[]",
      propertyVideos: params.propertyVideos || params.video || "[]",
      video: params.video || params.propertyVideos || "[]",
      // Step 7
      price: params.price || "",
      pricingPeriod: params.pricingPeriod || "night",
      securityDeposit: params.securityDeposit || "",
      cleaningFee: params.cleaningFee || "",
      serviceCharge: params.serviceCharge || "",
      // Step 8
      instantBooking: params.instantBooking || "false",
      minStay: params.minStay || "1",
      maxStay: params.maxStay || "30",
      advanceNotice: params.advanceNotice || "1",
      availableNow: params.availableNow || "true",
      // Step 9
      houseRules: params.houseRules || "{}",
      checkInTime: params.checkInTime || "14:00",
      checkOutTime: params.checkOutTime || "11:00",
      additionalRules: params.additionalRules || "",
    };
  }
}

export default new DraftListingService();
