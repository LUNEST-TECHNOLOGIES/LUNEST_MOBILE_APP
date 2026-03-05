// userDataService.js
// Handles getting and setting user data for both authService and profileService

import storageService from "./storageService";

const STORAGE_KEYS = {
  USER_DATA: "userData",
};

export async function getUserData() {
  try {
    return await storageService.getItem(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

export async function setUserData(userData) {
  try {
    await storageService.setItem(STORAGE_KEYS.USER_DATA, userData);
    return true;
  } catch (error) {
    console.error("Error setting user data:", error);
    return false;
  }
}
