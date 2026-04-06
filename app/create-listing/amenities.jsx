/**
 * Create Listing - Step 5: Amenities
 * Select available amenities with categorized layout
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import { useDraftListing } from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';

// Close X Icon - with explicit dimensions for web
const CloseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Search Icon
const SearchIcon = ({ size = 20, color = '#9B9B9B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Info Circle Icon for Tips
const InfoIcon = ({ size = 18, color = '#FD3131' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
    <Path d="M12 16V12M12 8H12.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// Check Circle Icon for Tips
const CheckCircleIcon = ({ size = 18, color = '#23C16B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Checkmark Icon
const CheckIcon = ({ size = 10, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron Down Icon
const ChevronDownIcon = ({ size = 16, color = '#666666', rotation = 0 }) => (
  <Svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    style={{ width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }}
  >
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
      <Text style={styles.progressText}>{currentStep} of {totalSteps}</Text>
    </View>
  );
};

// Categorized Amenities Data
const AMENITIES_CATEGORIES = [
  {
    id: 'comfort',
    title: 'Comfort & Living Essentials',
    amenities: [
      { id: 'walk_in_closet', label: 'Walk-In Closet' },
      { id: 'balcony', label: 'Balcony' },
      { id: 'ac', label: 'Air Conditioning (AC)' },
      { id: 'heating', label: 'Heating System' },
      { id: 'washer', label: 'Washer/Dryer' },
      { id: 'kitchen', label: 'Full Kitchen' },
      { id: 'furnished', label: 'Fully Furnished' },
    ],
  },
  {
    id: 'security',
    title: 'Security & Access',
    amenities: [
      { id: 'security_24_7', label: '24/7 Security' },
      { id: 'cctv', label: 'CCTV Surveillance' },
      { id: 'gated', label: 'Gated Compound' },
      { id: 'electronic_lock', label: 'Electronic Door Lock' },
      { id: 'intercom', label: 'Intercom System' },
    ],
  },
  {
    id: 'power',
    title: 'Power & Utilities',
    amenities: [
      { id: 'inverter', label: 'Inverter' },
      { id: 'generator', label: 'Generator' },
      { id: 'solar', label: 'Solar Power' },
      { id: 'borehole', label: 'Borehole Water' },
      { id: 'water_heater', label: 'Water Heater' },
    ],
  },
  {
    id: 'tech',
    title: 'Tech & Connectivity',
    amenities: [
      { id: 'wifi', label: 'WiFi' },
      { id: 'smart_tv', label: 'Smart TV' },
      { id: 'cable', label: 'Cable/Satellite TV' },
      { id: 'workspace', label: 'Dedicated Workspace' },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle & Luxury',
    amenities: [
      { id: 'pool', label: 'Swimming Pool' },
      { id: 'gym', label: 'Gym/Fitness Center' },
      { id: 'garden', label: 'Garden/Lawn' },
      { id: 'rooftop', label: 'Rooftop Access' },
      { id: 'parking', label: 'Parking Space' },
    ],
  },
  {
    id: 'location',
    title: 'Location Benefits',
    amenities: [
      { id: 'supermarket', label: 'Proximity to Supermarket' },
      { id: 'hospital', label: 'Near Hospital' },
      { id: 'school', label: 'Near Schools' },
      { id: 'transport', label: 'Public Transport Access' },
      { id: 'restaurant', label: 'Near Restaurants' },
    ],
  },
];

// Amenity Tag Component - small pill style
const AmenityTag = ({ amenity, selected, onToggle }) => (
  <Pressable
    style={[styles.amenityTag, selected && styles.amenityTagSelected]}
    onPress={onToggle}
  >
    {selected && (
      <View style={styles.tagCheckIcon}>
        <CheckIcon size={10} color="#FFFFFF" />
      </View>
    )}
    <Text style={[styles.amenityTagText, selected && styles.amenityTagTextSelected]}>
      {amenity.label}
    </Text>
  </Pressable>
);

// Category Section Component
const CategorySection = ({ category, selectedAmenities = [], onToggle, isExpanded, onToggleExpand }) => {
  // Ensure selectedAmenities is always an array
  const safeSelectedAmenities = Array.isArray(selectedAmenities) ? selectedAmenities : [];
  // Ensure category.amenities is always an array
  const categoryAmenities = Array.isArray(category?.amenities) ? category.amenities : [];
  const selectedCount = categoryAmenities.filter(a => safeSelectedAmenities.includes(a.id)).length;
  
  return (
    <View style={styles.categorySection}>
      <Pressable style={styles.categoryHeader} onPress={onToggleExpand}>
        <View style={styles.categoryTitleRow}>
          <Text style={styles.categoryTitle}>{category?.title || 'Category'}</Text>
          {selectedCount > 0 && (
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountText}>{selectedCount}</Text>
            </View>
          )}
        </View>
        <ChevronDownIcon size={16} color="#666666" rotation={isExpanded ? 180 : 0} />
      </Pressable>
      
      {isExpanded && (
        <View style={styles.amenitiesRow}>
          {categoryAmenities.map((amenity) => (
            <AmenityTag
              key={amenity.id}
              amenity={amenity}
              selected={safeSelectedAmenities.includes(amenity.id)}
              onToggle={() => onToggle(amenity.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Safe helper to ensure value is always an array
const ensureArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const Amenities = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();
  
  // Initialize with empty/default values
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenities, setCustomAmenities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTipsOverlay, setShowTipsOverlay] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(
    AMENITIES_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  // Flatten all standard IDs for easy lookup
  const ALL_STANDARD_IDS = AMENITIES_CATEGORIES.reduce((acc, cat) => {
    return [...acc, ...cat.amenities.map(a => a.id)];
  }, []);

  // Load draft data on mount
  useEffect(() => {
    console.log('📂 [Amenities] Loading draft data:', draftData?.draftId);
    if (draftData) {
      const storedSelected = ensureArray(draftData.selectedAmenities);
      const storedCustom = ensureArray(draftData.customAmenities);
      
      console.log('📊 [Amenities] Found amenities in draft:', {
        selectedCount: storedSelected.length,
        customCount: storedCustom.length,
        selected: storedSelected,
        custom: storedCustom
      });
      
      const standard = [];
      const customFromSelected = [];
      const customIds = [];

      storedSelected.forEach(item => {
        if (ALL_STANDARD_IDS.includes(item)) {
          standard.push(item);
        } else {
          // Check if it's an existing custom ID already in storedCustom
          const existingById = storedCustom.find(c => c.id === item);
          if (existingById) {
            customIds.push(item);
          } else if (!item.startsWith('custom_')) {
            // It's a raw string label (legacy/different source)
            const alreadyByLabel = storedCustom.find(c => c.label === item);
            if (alreadyByLabel) {
              customIds.push(alreadyByLabel.id);
            } else {
              // Truly new custom label, normalize into an object
              const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              customFromSelected.push({
                id: newId,
                label: item,
                isCustom: true
              });
              customIds.push(newId);
            }
          }
          // If it IS a custom ID (starts with custom_) but NOT in storedCustom, 
          // we ignore it to prevent showing the ID string in the UI.
        }
      });

      const finalSelected = [...standard, ...customIds];
      const finalCustom = [...storedCustom, ...customFromSelected];
      
      console.log('📝 [Amenities] Setting amenities state:', {
        selected: finalSelected,
        custom: finalCustom
      });

      setSelectedAmenities(finalSelected);
      setCustomAmenities(finalCustom);
    } else {
      console.log('📂 [Amenities] No draft data found, using empty state');
      setSelectedAmenities([]);
      setCustomAmenities([]);
    }
  }, [draftData]);

  // Auto-save function
  const updateAmenities = (updates) => {
    // Always ensure arrays before saving
    const nextSelected = updates.selectedAmenities !== undefined ? ensureArray(updates.selectedAmenities) : selectedAmenities;
    const nextCustom = updates.customAmenities !== undefined ? ensureArray(updates.customAmenities) : customAmenities;
    const finalUpdates = {
      selectedAmenities: nextSelected,
      customAmenities: nextCustom,
      currentStep: 5,
    };

    if (updates.selectedAmenities !== undefined) setSelectedAmenities(nextSelected);
    if (updates.customAmenities !== undefined) setCustomAmenities(nextCustom);

    saveDraftData(finalUpdates);
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
      
      await saveDraftData({
        selectedAmenities,
        customAmenities,
        currentStep: 5,
        draftId: finalDraftId,
      });

      setShowCancelModal(false);
      router.dismissAll();
      router.replace('/(host-tabs)/listings?filter=drafts&showDraftSaved=true');
    } catch (error) {
      console.error('Error saving draft:', error);
      setShowCancelModal(false);
      router.dismissAll();
      router.replace('/(host-tabs)/listings?filter=drafts&showDraftSaved=true');
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleBack = () => {
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    saveDraftData({
      selectedAmenities,
      customAmenities,
      currentStep: 5,
      draftId: finalDraftId,
    }).then(() => {
      router.replace({
        pathname: '/create-listing/location',
        params: { draftId: finalDraftId },
      });
    }).catch(() => {
      router.replace({
        pathname: '/create-listing/location',
        params: { draftId: finalDraftId },
      });
    });
  };

  const toggleAmenity = (amenityId) => {
    const updatedAmenities = selectedAmenities.includes(amenityId)
      ? selectedAmenities.filter((id) => id !== amenityId)
      : [...selectedAmenities, amenityId];
    updateAmenities({ selectedAmenities: updatedAmenities });
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Add custom amenity
  const addCustomAmenity = () => {
    if (searchQuery.trim() && !customAmenities.some(a => a.label.toLowerCase() === searchQuery.toLowerCase())) {
      const newAmenity = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: searchQuery.trim(),
        isCustom: true,
      };
      const updatedCustomAmenities = [...customAmenities, newAmenity];
      const updatedSelectedAmenities = [...selectedAmenities, newAmenity.id];
      updateAmenities({ 
        customAmenities: updatedCustomAmenities,
        selectedAmenities: updatedSelectedAmenities,
      });
      setSearchQuery('');
    }
  };

  const removeCustomAmenity = (amenityId) => {
    const updatedCustomAmenities = customAmenities.filter(a => a.id !== amenityId);
    const updatedSelectedAmenities = selectedAmenities.filter(id => id !== amenityId);
    updateAmenities({ 
      customAmenities: updatedCustomAmenities,
      selectedAmenities: updatedSelectedAmenities,
    });
  };

  const handleNext = () => {
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    // Always ensure arrays before saving
    const safeSelected = Array.isArray(selectedAmenities) ? selectedAmenities : [];
    const safeCustom = Array.isArray(customAmenities) ? customAmenities : [];
    saveDraftData({
      selectedAmenities: safeSelected,
      customAmenities: safeCustom,
      currentStep: 5,
      draftId: finalDraftId,
    }).then(() => {
      router.push({
        pathname: '/create-listing/photos',
        params: { draftId: finalDraftId },
      });
    }).catch(() => {
      router.push({
        pathname: '/create-listing/photos',
        params: { draftId: finalDraftId },
      });
    });
  };

  // Filter amenities based on search query - with extensive logging
  console.log('=== Computing filteredCategories ===');
  console.log('AMENITIES_CATEGORIES:', AMENITIES_CATEGORIES ? 'defined' : 'undefined');
  console.log('AMENITIES_CATEGORIES length:', AMENITIES_CATEGORIES?.length);
  console.log('searchQuery:', searchQuery);
  
  let filteredCategories = [];
  try {
    if (!Array.isArray(AMENITIES_CATEGORIES)) {
      console.error('AMENITIES_CATEGORIES is not an array!');
      filteredCategories = [];
    } else {
      filteredCategories = AMENITIES_CATEGORIES.map(category => {
        console.log('Processing category:', category?.id, 'amenities:', category?.amenities?.length);
        return {
          ...category,
          amenities: (category.amenities || []).filter(amenity =>
            amenity && amenity.label && amenity.label.toLowerCase().includes((searchQuery || '').toLowerCase())
          ),
        };
      }).filter(category => category.amenities && category.amenities.length > 0);
    }
    console.log('filteredCategories computed successfully, count:', filteredCategories.length);
  } catch (filterError) {
    console.error('=== Error computing filteredCategories ===');
    console.error('Error message:', filterError.message);
    console.error('Error stack:', filterError.stack);
    filteredCategories = [];
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <View style={styles.closeButtonBg} />
          <CloseIcon size={14} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={5} totalSteps={10} />

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Section Header with Tips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Key Amenities</Text>
          <Pressable style={styles.tipsButton} onPress={() => setShowTipsOverlay(true)}>
            <View style={styles.tipsIconContainer}>
              <InfoIcon size={18} color="#FD3131" />
            </View>
            <Text style={styles.tipsText}>Tips</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Select all amenities that apply to your property</Text>
        
        {/* Search Input with Add Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <SearchIcon size={20} color="#9B9B9B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or add amenity"
              placeholderTextColor="#9B9B9B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={addCustomAmenity}
              returnKeyType="done"
            />
          </View>
          {searchQuery.trim() && filteredCategories.every(cat => cat.amenities.length === 0) && (
            <Pressable style={styles.addAmenityButton} onPress={addCustomAmenity}>
              <Text style={styles.addAmenityButtonText}>Add</Text>
            </Pressable>
          )}
        </View>

        {/* Custom Amenities */}
        {customAmenities.length > 0 && (
          <View style={styles.customAmenitiesSection}>
            <Text style={styles.customAmenitiesTitle}>Custom Amenities</Text>
            <View style={styles.customAmenitiesGrid}>
              {customAmenities.map((amenity) => (
                <View key={amenity.id} style={styles.customAmenityTag}>
                  <Text style={styles.customAmenityText}>{amenity.label}</Text>
                  <Pressable 
                    style={styles.removeCustomButton}
                    onPress={() => removeCustomAmenity(amenity.id)}
                  >
                    <CloseIcon size={10} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          {filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              selectedAmenities={selectedAmenities}
              onToggle={toggleAmenity}
              isExpanded={expandedCategories[category.id]}
              onToggleExpand={() => toggleCategory(category.id)}
            />
          ))}
        </View>

        {/* Selected Count Summary */}
        {selectedAmenities && selectedAmenities.length > 0 && (
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedSummaryText}>
              {selectedAmenities.length} amenities selected
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Tips Overlay */}
      {showTipsOverlay && (
        <Pressable
          style={styles.tipsOverlay}
          onPress={() => setShowTipsOverlay(false)}
        >
          <Pressable 
            style={styles.tipsModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tipsModalHeader}>
              <Text style={styles.tipsModalTitle}>Key Amenities Tips?</Text>
              <Pressable 
                style={styles.tipsCloseButton}
                onPress={() => setShowTipsOverlay(false)}
              >
                <CloseIcon size={14} color="#000000" />
              </Pressable>
            </View>
            <View style={styles.tipsContent}>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>These help your listing show up in searches</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>Highlight unique amenities to stand out</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>More amenities can increase bookings</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      )}

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onCancel={handleCancelConfirm}
        onContinue={handleCancelDismiss}
        onClose={handleCancelDismiss}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    
    color: '#000000',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonBg: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBars: {
    flexDirection: 'row',
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
    backgroundColor: '#0E2F5D',
  },
  progressEmpty: {
    backgroundColor: '#20A4FF',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    
    color: '#666666',
    marginTop: -8,
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipsIconContainer: {
    width: 18,
    height: 18,
  },
  tipsText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#FD3131',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    
    color: '#000000',
    padding: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addAmenityButton: {
    backgroundColor: '#010135',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addAmenityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#FFFFFF',
  },
  customAmenitiesSection: {
    marginTop: 16,
    gap: 12,
  },
  customAmenitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#000000',
  },
  customAmenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customAmenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#010135',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  customAmenityText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#FFFFFF',
  },
  removeCustomButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    gap: 16,
  },
  categorySection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#010135',
  },
  selectedCountBadge: {
    backgroundColor: '#010135',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '600',
    
    color: '#FFFFFF',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  amenityTagSelected: {
    borderColor: '#010135',
    backgroundColor: '#F0F4FF',
  },
  tagCheckIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityTagText: {
    fontSize: 13,
    fontWeight: '400',
    
    color: '#666666',
  },
  amenityTagTextSelected: {
    color: '#010135',
    fontWeight: '500',
  },
  selectedSummary: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  selectedSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#010135',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 48 : 20,
    gap: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
  tipsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1001,
    elevation: 1001,
  },
  tipsModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  tipsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  tipsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
    textAlign: 'center',
  },
  tipsCloseButton: {
    position: 'absolute',
    right: 20,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tipCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
    flex: 1,
  },
});

export default Amenities;
