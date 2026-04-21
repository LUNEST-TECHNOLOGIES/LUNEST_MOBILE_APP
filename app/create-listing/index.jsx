/**
 * Create Listing - Step 1: Select Property Category
 * Choose the type of property to list
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import useDraftListing from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';
import toastService from '../../src/services/toastService';
import ToastNotification from '../../src/components/common/ToastNotification';

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

const ShortletIcon = ({ size = 28, color = '#292929' }) => (
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

const StandardFlatIcon = ({ size = 28, color = '#292929' }) => (
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

const MiniFlatIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth={1.5} />
    <Path d="M3 10H21M12 10V20" stroke={color} strokeWidth={1.5} />
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

const PenthouseIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V7L12 3L19 7V21M9 7V9M15 7V9M9 12V14M15 12V14M12 21V17"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MansionIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 21H22M4 21V9L12 3L20 9V21M8 21V16H16V21M7 12H9M15 17H17M15 12H17"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarehouseIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V10L12 5L20 10V21M9 21V15H15V21M12 5V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShopIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V12H20V21M4 12L6 8H18L20 12M10 21V17H14V21M8 8V4H16V8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StudioIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
    <Path d="M12 8V16M8 12H16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const PurchaseIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const LuxuryIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L4 9L12 15L20 9L12 3Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M4 15L12 21L20 15" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PrivateHomesIcon = ({ size = 28, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12L12 3L21 12M5 12V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V12"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
  { id: 'shortlet', label: 'Shortlet', icon: ShortletIcon },
  { id: 'standard-flat', label: 'Standard Flat', icon: StandardFlatIcon },
  { id: 'apartment', label: 'Apartment', icon: ApartmentIcon },
  { id: 'studio', label: 'Studio', icon: StudioIcon },
  { id: 'mini-flat', label: 'Mini Flat', icon: MiniFlatIcon },
  { id: 'room-parlour', label: 'Room & Parlour', icon: MiniFlatIcon },
  { id: 'self-contain', label: 'Self-Contain', icon: MiniFlatIcon },
  { id: 'purchase', label: 'Purchase', icon: PurchaseIcon },
  { id: 'luxury', label: 'Luxury', icon: LuxuryIcon },
  { id: 'penthouse', label: 'Penthouse', icon: PenthouseIcon },
  { id: 'mansion', label: 'Mansion', icon: MansionIcon },
  { id: 'private-homes', label: 'Private Homes', icon: PrivateHomesIcon },
  { id: 'hotel', label: 'Hotel', icon: HotelIcon },
  { id: 'office', label: 'Office', icon: CommercialIcon },
  { id: 'warehouse', label: 'Warehouse', icon: WarehouseIcon },
  { id: 'land', label: 'Land', icon: LandIcon },
  { id: 'shop', label: 'Shop', icon: ShopIcon },
  { id: 'duplex', label: 'Duplex', icon: DuplexIcon },
  { id: 'bungalow', label: 'Bungalow', icon: BungalowIcon },
  { id: 'others', label: 'Others', icon: OtherIcon },
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

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("SUCCESS");

  // Subscribe to toast service
  useEffect(() => {
    const unsubscribe = toastService.subscribe(({ message, type }) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    });
    return unsubscribe;
  }, []);

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
  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    if (draftId) {
      // Immediately save user selection
      try {
        await saveDraftData({
          propertyType: category,
          currentStep: 1,
        });
      } catch (err) {
        console.error('Error auto-saving category:', err);
      }
    }
  };

  const handleClose = () => {
    if (selectedCategory) {
      setShowCancelModal(true);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(host-tabs)/listings");
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

  const handleNext = async () => {
    if (selectedCategory) {
      // Get or create draftId
      const finalDraftId = (draftData && draftData.draftId) || 
                           draftId || 
                           draftListingService.generateDraftId();
      
      // OPTIMIZATION: Trigger save in background and navigate immediately
      // CRITICAL: We await the local save to ensure data is in cache for next screen
      await saveDraftData({
        propertyType: selectedCategory,
        currentStep: 1,
        draftId: finalDraftId,
      }, { background: true });

      // Navigate immediately without waiting for API
      router.push({
        pathname: '/create-listing/intent',
        params: { draftId: finalDraftId },
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
          <View style={{ zIndex: 5 }}>
            <CloseIcon size={14} color="#000000" />
          </View>
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
      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
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
    zIndex: 10,
  },
  closeButtonBg: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 1,
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
