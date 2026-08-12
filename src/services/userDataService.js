// userDataService.js
// Handles getting and setting user data for both authService and profileService

import storageService from "./storageService";

const STORAGE_KEYS = {
  USER_DATA: "userData",
};

let memoryUserDataCache = null;

export function getUserDataSync() {
  return memoryUserDataCache;
}

export async function getUserData() {
  try {
    if (memoryUserDataCache) return memoryUserDataCache;
    const data = await storageService.getItem(STORAGE_KEYS.USER_DATA);
    if (data) memoryUserDataCache = data;
    return data;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

export async function setUserData(userData) {
  try {
    memoryUserDataCache = userData;
    await storageService.setItem(STORAGE_KEYS.USER_DATA, userData);
    return true;
  } catch (error) {
    console.error("Error setting user data:", error);
    return false;
  }
}
