/**
 * Hook: useDraftListing
 * Loads draft data from storage when editing a draft listing
 * Provides full draft data + utilities for saving and managing drafts
 * Ensures all user selections are retained across navigation
 */

import { useLocalSearchParams } from 'expo-router';
import { AppState } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import draftListingService from '../services/draftListingService';

export const useDraftListing = () => {
  const params = useLocalSearchParams();
  const [draftData, setDraftData] = useState(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState(null);

  // Load draft data from storage
  const loadDraftData = useCallback(async (draftId) => {
    if (!draftId) {
      setDraftData(null);
      return null;
    }

    setIsLoadingDraft(true);
    setDraftError(null);

    try {
      console.log('📂 [useDraftListing] Loading draft:', draftId);
      const draft = await draftListingService.getDraft(draftId);
      
      if (draft) {
        console.log('✅ [useDraftListing] Draft loaded successfully');
        console.log('📊 [useDraftListing] Draft step:', draft.currentStep);
        setDraftData(draft);
        return draft;
      } else {
        console.warn('⚠️ [useDraftListing] Draft not found:', draftId);
        setDraftError('Draft not found');
        setDraftData(null);
        return null;
      }
    } catch (error) {
      console.error('❌ [useDraftListing] Error loading draft:', error);
      setDraftError(error.message);
      setDraftData(null);
      return null;
    } finally {
      setIsLoadingDraft(false);
    }
  }, []);

  // Save draft data to storage (merges with existing data)
  const saveDraftData = useCallback(async (updates, options = { background: false }) => {
    // Only show loading indicator if not saving in background
    if (!options.background) {
      setIsSavingDraft(true);
    }

    try {
      // If we have draftId in updates, use it
      const draftId = updates?.draftId || draftData?.draftId || params.draftId;
      
      if (!draftId) {
        console.error('❌ [useDraftListing] No draftId provided in updates or params');
        if (!options.background) setIsSavingDraft(false);
        return false;
      }

      const updatedDraft = {
        ...draftData,
        ...updates,
        draftId,
        lastModified: new Date().toISOString(),
      };

      console.log('💾 [useDraftListing] Saving draft:', draftId, options.background ? '(background)' : '(foreground)');
      
      // Update local state IMMEDIATELY for perfect consistency during rapid navigation
      setDraftData(updatedDraft);

      // Call service
      const savingPromise = draftListingService.saveDraft(updatedDraft);
      
      // If background, we don't await the promise for the UI state update
      if (options.background) {
        savingPromise.then(saved => {
          if (saved) {
            // Re-sync with service-resolved version (might have updated timestamps/_ids)
            setDraftData(saved);
          }
        }).catch(err => {
          console.warn('⚠️ [useDraftListing] Background save failed:', err.message);
        });
        return true; 
      }

      // Foreground save: await and update state
      const savedDraft = await savingPromise;
      
      // If the service returned a draft (which might have a new draftId or _id), use it
      const finalDraft = savedDraft || updatedDraft;
      setDraftData(finalDraft);
      console.log('✅ [useDraftListing] Draft saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [useDraftListing] Error saving draft:', error);
      setDraftError(error.message);
      return false;
    } finally {
      if (!options.background) {
        setIsSavingDraft(false);
      }
    }
  }, [draftData, params.draftId]);

  // Update draft field without saving immediately
  const updateDraftField = useCallback((fieldName, fieldValue) => {
    setDraftData(prev => ({
      ...prev,
      [fieldName]: fieldValue,
      lastModified: new Date().toISOString(),
    }));
  }, []);

  // Background Auto-Save: Sync current draft whenever the app is hidden/backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // 'inactive' = iOS app switcher, 'background' = Android/Home button
      if (nextAppState.match(/inactive|background/) && draftData) {
        console.log('📱 [useDraftListing] App backgrounded/closed - syncing current draft state');
        // Directly call the service to avoid re-triggering state updates during backgrounding
        draftListingService.saveDraft(draftData).catch(err => {
          console.warn('[useDraftListing] Auto-save failed on background:', err.message);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [draftData]);

  // Auto-load draft when draftId in params changes
  useEffect(() => {
    const draftId = params.draftId;
    if (draftId) {
      loadDraftData(draftId);
    } else {
      setDraftData(null);
    }
  }, [params.draftId, loadDraftData]);

  return {
    // Data
    draftData,
    draftId: params.draftId || null,
    
    // Loading states
    isLoadingDraft,
    isSavingDraft,
    draftError,
    
    // Actions
    loadDraftData,
    saveDraftData,
    updateDraftField,
  };
};

export default useDraftListing;
