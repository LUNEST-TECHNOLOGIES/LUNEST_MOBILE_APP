/**
 * Create Listing - Step 1: Select Property Category
 * Choose the type of property to list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import draftListingService from '../../src/services/draftListingService';
import useDraftListing from '../../src/hooks/useDraftListing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Close X Icon - with explicit dimensions for web
const CloseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, minWidth: size, minHeight: size }}>
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Property Category Icons
const ApartmentIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V7L13 3V21M13 21V7L19 10V21M9 9V9.01M9 13V13.01M9 17V17.01"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ServicedApartmentIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21H21M19 21H14M5 21H3M5 21H10M10 21V17C10 15.8954 10.8954 15 12 15C13.1046 15 14 15.8954 14 17V21M10 21H14M9 7H10M14 7H15M9 11H10M14 11H15"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShortletIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 4H6C4.89543 4 4 4.89543 4 6V8M8 4V2M8 4H16M16 4H18C19.1046 4 20 4.89543 20 6V8M16 4V2M4 8V18C4 19.1046 4.89543 20 5 20H19C19.1046 20 20 19.1046 20 18V8M4 8H20M8 12H10M14 12H16M8 16H10"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GuestHouseIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V11L12 4L20 11V21M9 21V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="10" r="1" fill={color} />
  </Svg>
);

const DuplexIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3V21M3 21H21M5 21V10L8.5 7M19 21V10L15.5 7M12 7L8.5 10V21M12 7L15.5 10V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HostelIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect x="7" y="7" width="4" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    <Rect x="13" y="7" width="4" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    <Rect x="7" y="12" width="4" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    <Rect x="13" y="12" width="4" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
  </Svg>
);

const BungalowIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 22H22M4 22V12L12 5L20 12V22M9 22V17C9 16.4477 9.44772 16 10 16H14C14.5523 16 15 16.4477 15 17V22M8 12H10M14 12H16"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CoLivingIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="2.5" stroke={color} strokeWidth={1.5} />
    <Circle cx="15" cy="7" r="2.5" stroke={color} strokeWidth={1.5} />
    <Path
      d="M5 21V19C5 16.7909 6.79086 15 9 15H15C17.2091 15 19 16.7909 19 19V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const MiniFlatIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth={1.5} />
    <Path d="M3 10H21M12 10V20" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const SharedRoomIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M3 21V14M21 21V14M3 14H21M3 14V10C3 8.89543 3.89543 8 5 8H7M21 14V10C21 8.89543 20.1046 8 19 8H17M7 8V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V8M7 8H17"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HotelIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 20H22M4 20V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V20"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path d="M12 4V8M9 8H15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Rect x="8" y="11" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    <Rect x="13" y="11" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    <Path d="M10 20V17C10 16.4477 10.4477 16 11 16H13C13.5523 16 14 16.4477 14 17V20" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const CommercialIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 21H22M6 21V8L12 4L18 8V21M10 12H14M10 16H14M12 8V10"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LandIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21L9 15L13 19L21 11M21 11V17M21 11H15"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M3 7L8 12L12 8L17 13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const OtherIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
    <Circle cx="8" cy="12" r="1" fill={color} />
    <Circle cx="12" cy="12" r="1" fill={color} />
    <Circle cx="16" cy="12" r="1" fill={color} />
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

// Property categories data
const PROPERTY_CATEGORIES = [
  { id: 'apartment', label: 'Apartment / Flat', icon: ApartmentIcon },
  { id: 'serviced', label: 'Serviced Apartment', icon: ServicedApartmentIcon },
  { id: 'shortlet', label: 'Shortlet Apartment', icon: ShortletIcon },
  { id: 'guesthouse', label: 'Guest House', icon: GuestHouseIcon },
  { id: 'duplex', label: 'Duplex', icon: DuplexIcon },
  { id: 'hostel', label: 'Hostel', icon: HostelIcon },
  { id: 'bungalow', label: 'Bungalow', icon: BungalowIcon },
  { id: 'coliving', label: 'Co-living Space', icon: CoLivingIcon },
  { id: 'miniflat', label: 'Self-Contained (Mini Flat)', icon: MiniFlatIcon },
  { id: 'shared', label: "Shared Room / Boys' Quarters", icon: SharedRoomIcon },
  { id: 'hotel', label: 'Hotel Room / Suite', icon: HotelIcon },
  { id: 'commercial', label: 'Commercial Space', icon: CommercialIcon },
  { id: 'land', label: 'Land', icon: LandIcon },
  { id: 'other', label: 'Others', icon: OtherIcon },
];

// Category Option Component
const CategoryOption = ({ category, selected, onPress }) => {
  const IconComponent = category.icon;
  
  return (
    <Pressable
      style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
        <IconComponent size={28} color={selected ? '#6371F1' : '#292929'} />
      </View>
      <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]} numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
};

const SelectPropertyCategory = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draftData, draftId, saveDraftData } = useDraftListing();
  
  // Initialize from draft or params
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load property type from draft when available
  useEffect(() => {
    if (draftData?.propertyType) {
      console.log('✅ [PropertyCategory] Loaded from draft:', draftData.propertyType);
      setSelectedCategory(draftData.propertyType);
    } else if (params.propertyType) {
      console.log('✅ [PropertyCategory] Loaded from params:', params.propertyType);
      setSelectedCategory(params.propertyType);
    }
  }, [draftData, params.propertyType]);

  // Auto-save when category changes
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    if (draftId) {
      // Immediately save user selection
      saveDraftData({
        propertyType: category,
        currentStep: 1,
      }).catch(err => console.error('Error auto-saving category:', err));
    }
  };

  const handleClose = () => {
    if (selectedCategory) {
      setShowCancelModal(true);
    } else {
      router.back();
    }
  };

  const handleCancelConfirm = async () => {
    try {
      // Get draftId from draft or params
      const finalDraftId = (draftData && draftData.draftId) || 
                           draftId || 
                           draftListingService.generateDraftId();
      
      // Save final state
      const baseData = draftData || { ...params };
      await saveDraftData({
        ...baseData,
        propertyType: selectedCategory,
        currentStep: 1,
        draftId: finalDraftId,
      });
      
      setShowCancelModal(false);
      // Navigate to listings page with drafts tab and show toast
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

  const handleNext = () => {
    if (selectedCategory) {
      // Get or create draftId
      const finalDraftId = (draftData && draftData.draftId) || 
                           draftId || 
                           draftListingService.generateDraftId();
      
      // Save before navigation
      saveDraftData({
        propertyType: selectedCategory,
        currentStep: 1,
        draftId: finalDraftId,
      }).then(() => {
        router.push({
          pathname: '/create-listing/intent',
          params: { draftId: finalDraftId },
        });
      }).catch(err => {
        console.error('Error saving:', err);
        // Still navigate
        router.push({
          pathname: '/create-listing/intent',
          params: { draftId: finalDraftId },
        });
      });
    }
  };

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
      <ProgressBar currentStep={1} totalSteps={10} />

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Choose Property Category:</Text>
        
        <View style={styles.categoriesGrid}>
          {PROPERTY_CATEGORIES.map((category) => (
            <CategoryOption
              key={category.id}
              category={category}
              selected={selectedCategory === category.id}
              onPress={() => handleSelectCategory(category.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleClose}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.nextButton, !selectedCategory && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedCategory}
        >
          <Text style={[styles.nextButtonText, !selectedCategory && styles.nextButtonTextDisabled]}>
            Next
          </Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 15,
    columnGap: 15,
  },
  categoryOption: {
    width: (SCREEN_WIDTH - 55) / 2,
    backgroundColor: '#F6F6F7',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  categoryOptionSelected: {
    backgroundColor: 'rgba(180, 206, 255, 0.6)',
    borderWidth: 2,
    borderColor: '#6371F1',
  },
  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
    textAlign: 'center',
    width: 105,
  },
  categoryLabelSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 30 : 20,
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
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
  nextButtonTextDisabled: {
    color: '#999999',
  },
});

export default SelectPropertyCategory;
