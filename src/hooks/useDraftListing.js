/**
 * Hook: useDraftListing
 * Loads draft data from storage when editing a draft listing
 * Provides full draft data + utilities for saving and managing drafts
 * Ensures all user selections are retained across navigation
 */

import { useLocalSearchParams } from 'expo-router';
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
  const saveDraftData = useCallback(async (updates) => {
    setIsSavingDraft(true);

    try {
      // If we have draftId in updates, use it
      const draftId = updates?.draftId || draftData?.draftId || params.draftId;
      
      if (!draftId) {
        console.error('❌ [useDraftListing] No draftId provided in updates or params');
        setIsSavingDraft(false);
        return false;
      }

      const updatedDraft = {
        ...draftData,
        ...updates,
        draftId,
        lastModified: new Date().toISOString(),
      };

      console.log('💾 [useDraftListing] Saving draft:', draftId);
      console.log('📊 [useDraftListing] Draft data:', updatedDraft);
      await draftListingService.saveDraft(updatedDraft);
      setDraftData(updatedDraft);
      console.log('✅ [useDraftListing] Draft saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [useDraftListing] Error saving draft:', error);
      setDraftError(error.message);
      return false;
    } finally {
      setIsSavingDraft(false);
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
