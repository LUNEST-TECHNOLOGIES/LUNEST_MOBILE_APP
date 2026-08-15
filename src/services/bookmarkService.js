/**
 * Bookmark Service
 * Handles fetching and managing user bookmarks/saved listings
 */

import authService from "./authService";
import configService from "./configService";

class BookmarkService {
  constructor() {
    this.baseURL = null;
    this.isInitialized = false;
    this.localStorageKeyPrefix = "lunest_bookmarks_";
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      this.baseURL = await configService.getBaseURL();
      this.isInitialized = true;
    } catch (error) {
      console.error("[BookmarkService] Initialize error:", error);
    }
  }

  /**
   * Get user-specific local storage key
   */
  async getLocalStorageKey() {
    try {
      const userData = await authService.getUserData();
      let userId = "anonymous";
      if (userData && userData.id) {
        userId = userData.id;
      } else if (userData && userData._id) {
        userId = userData._id;
      }
      return this.localStorageKeyPrefix + userId;
    } catch (error) {
      return this.localStorageKeyPrefix + "anonymous";
    }
  }

  async getLocalBookmarks() {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const key = await this.getLocalStorageKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error("[BookmarkService] Error reading local bookmarks:", error);
      return [];
    }
  }

  async saveLocalBookmarks(bookmarks) {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const key = await this.getLocalStorageKey();
      await AsyncStorage.setItem(key, JSON.stringify(bookmarks));
    } catch (error) {
      console.error("[BookmarkService] Error saving local bookmarks:", error);
    }
  }

  async cleanupDuplicateBookmarks() {
    try {
      const bookmarks = await this.getLocalBookmarks();
      const seenListings = new Set();
      const uniqueBookmarks = [];

      for (const bookmark of bookmarks) {
        if (!bookmark || !bookmark.listing) continue; // Skip deleted listing entries
        let listingId = bookmark.listing;
        if (bookmark.listing && bookmark.listing._id) {
          listingId = bookmark.listing._id;
        }
        if (listingId && !seenListings.has(listingId)) {
          seenListings.add(listingId);
          uniqueBookmarks.push(bookmark);
        }
      }

      if (uniqueBookmarks.length !== bookmarks.length) {
        console.log(
          "[BookmarkService] Cleaned up " +
            (bookmarks.length - uniqueBookmarks.length) +
            " duplicate/invalid bookmarks",
        );
        await this.saveLocalBookmarks(uniqueBookmarks);
      }

      return uniqueBookmarks;
    } catch (error) {
      console.error("[BookmarkService] Error cleaning up duplicates:", error);
      return [];
    }
  }

  async fetchBookmarks(options = {}) {
    try {
      await this.initialize();
      const user = await authService.getUserData();
      if (!user) {
        return { success: false, bookmarks: [] };
      }

      let url = this.baseURL + "/v1/bookmarks/bookmark";

      if (options.refresh) {
        url += "?refresh=true";
      }

      const token = await authService.getToken();
      if (!token) {
        const localBookmarks = await this.cleanupDuplicateBookmarks();
        return { success: true, bookmarks: localBookmarks };
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const localBookmarks = await this.cleanupDuplicateBookmarks();
        return { success: true, bookmarks: localBookmarks };
      }

      const result = await response.json();

      if (result.body && Array.isArray(result.body)) {
        const seenListings = new Set();
        const uniqueBookmarks = result.body.filter(function (bookmark) {
          if (!bookmark || !bookmark.listing) return false; // Exclude deleted property entries
          let listingId = bookmark.listing;
          if (bookmark.listing && bookmark.listing._id) {
            listingId = bookmark.listing._id;
          }
          if (listingId && !seenListings.has(listingId)) {
            seenListings.add(listingId);
            return true;
          }
          return false;
        });

        if (uniqueBookmarks.length > 0) {
          await this.saveLocalBookmarks(uniqueBookmarks);
        }
        return { success: true, bookmarks: uniqueBookmarks };
      }

      const localBookmarks = await this.cleanupDuplicateBookmarks();
      return { success: true, bookmarks: localBookmarks };
    } catch (error) {
      console.error("[BookmarkService] Error fetching bookmarks:", error);
      const localBookmarks = await this.cleanupDuplicateBookmarks();
      return { success: true, bookmarks: localBookmarks };
    }
  }

  async createBookmark(listingId) {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        return { success: false, message: "Not authenticated" };
      }

      const existingStatus = await this.isListingBookmarked(listingId);
      if (existingStatus.isBookmarked) {
        return { success: true, message: "Property already saved" };
      }

      const response = await fetch(
        this.baseURL + "/v1/bookmarks/bookmark/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ listing: listingId }),
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          const bookmarks = await this.getLocalBookmarks();
          const existingLocal = bookmarks.find(function (b) {
            return (
              b.listing === listingId ||
              (b.listing && b.listing._id === listingId)
            );
          });
          if (existingLocal) {
            return { success: true, message: "Property already saved" };
          }
          const newBookmark = {
            _id: "local_" + Date.now(),
            listing: listingId,
            createdAt: new Date().toISOString(),
          };
          bookmarks.push(newBookmark);
          await this.saveLocalBookmarks(bookmarks);
          return { success: true, message: "Property saved successfully" };
        }
      }

      const result = await response.json();

      if (result.success) {
        const bookmarks = await this.getLocalBookmarks();
        let bookmarkId = "local_" + Date.now();
        if (result.body && result.body._id) {
          bookmarkId = result.body._id;
        }
        const existingLocal = bookmarks.find(function (b) {
          return (
            b._id === bookmarkId ||
            b.listing === listingId ||
            (b.listing && b.listing._id === listingId)
          );
        });
        if (!existingLocal) {
          const newBookmark = {
            _id: bookmarkId,
            listing: listingId,
            createdAt: new Date().toISOString(),
          };
          bookmarks.push(newBookmark);
          await this.saveLocalBookmarks(bookmarks);
        }
        return {
          success: true,
          message: result.message || "Property saved successfully",
        };
      }

      return {
        success: false,
        message: result.message || "Failed to save property",
      };
    } catch (error) {
      console.error("[BookmarkService] Error creating bookmark:", error);
      const bookmarks = await this.getLocalBookmarks();
      const existingLocal = bookmarks.find(function (b) {
        return (
          b.listing === listingId || (b.listing && b.listing._id === listingId)
        );
      });
      if (existingLocal) {
        return { success: true, message: "Property already saved" };
      }
      const newBookmark = {
        _id: "local_" + Date.now(),
        listing: listingId,
        createdAt: new Date().toISOString(),
      };
      bookmarks.push(newBookmark);
      await this.saveLocalBookmarks(bookmarks);
      return { success: true, message: "Property saved successfully" };
    }
  }

  async deleteBookmark(bookmarkId) {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        return { success: false, message: "Not authenticated" };
      }

      const response = await fetch(
        this.baseURL + "/v1/bookmarks/bookmark/" + bookmarkId,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          const bookmarks = await this.getLocalBookmarks();
          const filtered = bookmarks.filter(function (b) {
            return b._id !== bookmarkId;
          });
          await this.saveLocalBookmarks(filtered);
          return { success: true, message: "Property removed from saved" };
        }
      }

      const result = await response.json();

      if (result.success) {
        const bookmarks = await this.getLocalBookmarks();
        const filtered = bookmarks.filter(function (b) {
          return b._id !== bookmarkId;
        });
        await this.saveLocalBookmarks(filtered);
        return {
          success: true,
          message: result.message || "Property removed from saved",
        };
      }

      return {
        success: false,
        message: result.message || "Failed to remove property",
      };
    } catch (error) {
      console.error("[BookmarkService] Error deleting bookmark:", error);
      const bookmarks = await this.getLocalBookmarks();
      const filtered = bookmarks.filter(function (b) {
        return b._id !== bookmarkId;
      });
      await this.saveLocalBookmarks(filtered);
      return { success: true, message: "Property removed from saved" };
    }
  }

  async isListingBookmarked(listingId) {
    try {
      const result = await this.fetchBookmarks();
      if (result.success && result.bookmarks) {
        const bookmark = result.bookmarks.find(function (b) {
          let bookmarkListingId = b.listing;
          if (b.listing && b.listing._id) {
            bookmarkListingId = b.listing._id;
          }
          return bookmarkListingId === listingId;
        });

        return {
          isBookmarked: !!bookmark,
          bookmarkId: bookmark ? bookmark._id : null,
        };
      }
      return { isBookmarked: false, bookmarkId: null };
    } catch (error) {
      console.error("[BookmarkService] Error checking bookmark status:", error);
      return { isBookmarked: false, bookmarkId: null };
    }
  }

  async toggleBookmark(listingId, isCurrentlyBookmarked, bookmarkId) {
    try {
      if (isCurrentlyBookmarked && bookmarkId) {
        const result = await this.deleteBookmark(bookmarkId);
        return Object.assign({}, result, { action: "removed" });
      } else {
        const result = await this.createBookmark(listingId);
        return Object.assign({}, result, { action: "added" });
      }
    } catch (error) {
      console.error("[BookmarkService] Error toggling bookmark:", error);
      return {
        success: false,
        action: isCurrentlyBookmarked ? "remove_failed" : "add_failed",
        message: "Failed to update bookmark",
      };
    }
  }

  async clearLocalBookmarks() {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const key = await this.getLocalStorageKey();
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("[BookmarkService] Error clearing local bookmarks:", error);
    }
  }

  /**
   * Batch check bookmark statuses for a list of listing IDs
   * @param {Array} listingIds - Array of listing IDs to check
   * @returns {Object} result - Success status and map of results
   */
  async checkBatchBookmarks(listingIds) {
    try {
      if (!listingIds || listingIds.length === 0) {
        return { success: true, statuses: {} };
      }

      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        // Handle unauthenticated case by checking local bookmarks
        const localBookmarks = await this.getLocalBookmarks();
        const statuses = {};
        
        listingIds.forEach(id => {
          const bookmark = localBookmarks.find(b => 
            b.listing === id || (b.listing && b.listing._id === id)
          );
          statuses[id] = {
            isBookmarked: !!bookmark,
            bookmarkId: bookmark ? bookmark._id : null
          };
        });
        
        return { success: true, statuses };
      }

      const response = await fetch(this.baseURL + "/v1/bookmarks/bookmark/batch-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ listingIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to check batch bookmarks");
      }

      const result = await response.json();
      return { 
        success: true, 
        statuses: result.body || {} 
      };
    } catch (error) {
      console.error("[BookmarkService] Error in batch check:", error);
      return { success: false, statuses: {} };
    }
  }
}

const bookmarkService = new BookmarkService();
export default bookmarkService;
