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

// High-quality icons from property-type.jsx
const ApartmentIcon = ({ size = 32, color = "#292929" }) => (
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

const ShortletIcon = ({ size = 32, color = "#292929" }) => (
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

const StandardFlatIcon = ({ size = 32, color = "#292929" }) => (
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

const SelfContainIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25V20C3 20.5523 3.44772 21 4 21H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21H20C20.5523 21 21 20.5523 21 20V10.25M22 12L12.707 3.39C12.3166 3.01544 11.6834 3.01544 11.293 3.39L2 12"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HotelIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21M9 7H11M13 7H15M9 11H11M13 11H15M9 15H11M13 15H15"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OfficeIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DuplexIcon = ({ size = 32, color = "#292929" }) => (
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

const BungalowIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V10.25M22 12L12.707 3.39C12.3166 3.01544 11.6834 3.01544 11.293 3.39L2 12M8 21V15C8 14.4477 8.44772 14 9 14H15C15.5523 14 16 14.4477 16 15V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PenthouseIcon = ({ size = 28, color = "#292929" }) => (
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

const MansionIcon = ({ size = 28, color = "#292929" }) => (
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

const WarehouseIcon = ({ size = 28, color = "#292929" }) => (
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

const TerraceIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M3 21V10L12 3L21 10V21M9 21V15H15V21M7 9H10M14 9H17"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DetachedIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V9L12 3L19 9V21M9 13V13.01M15 13V13.01M12 21V17"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BQIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V12L12 7L19 12V21M9 21V17H15V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HostelIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V21M8 7H10M14 7H16M8 11H10M14 11H16M8 15H10M14 15H16"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CoWorkingIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EventIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V7L12 3L19 7V21M9 11H15M9 15H15"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlazaIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M4 21V3H10V21M14 21V3H20V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FactoryIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 21H22M3 21V10L10 14L10 7L17 11L17 4L21 8V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FarmIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21L21 21M5 21L5 10M19 21L19 10M12 21L12 14M5 10L12 6L19 10M8 10L8 14M16 10L16 14"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OtherIcon = ({ size = 28, color = "#292929" }) => (
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
  { id: 'terrace-house', label: 'Terrace House', icon: TerraceIcon },
  { id: 'detached-house', label: 'Detached House', icon: DetachedIcon },
  { id: 'semi-detached', label: 'Semi-Detached', icon: DuplexIcon },
  { id: 'studio', label: 'Studio', icon: StudioIcon },
  { id: 'mini-flat', label: 'Mini Flat', icon: MiniFlatIcon },
  { id: 'room-parlour', label: 'Room & Parlour', icon: MiniFlatIcon },
  { id: 'self-contain', label: 'Self-Contain', icon: SelfContainIcon },
  { id: 'boys-quarters', label: "Boys' Quarters (BQ)", icon: BQIcon },
  { id: 'hostel', label: 'Hostel / Student Housing', icon: HostelIcon },
  { id: 'purchase', label: 'Purchase', icon: PurchaseIcon },
  { id: 'luxury', label: 'Luxury Villa', icon: LuxuryIcon },
  { id: 'penthouse', label: 'Penthouse', icon: PenthouseIcon },
  { id: 'mansion', label: 'Mansion', icon: MansionIcon },
  { id: 'private-homes', label: 'Private Homes', icon: PrivateHomesIcon },
  { id: 'hotel', label: 'Hotel / Guest House', icon: HotelIcon },
  { id: 'office', label: 'Office Space', icon: OfficeIcon },
  { id: 'co-working', label: 'Co-working Space', icon: CoWorkingIcon },
  { id: 'event-center', label: 'Event Center / Hall', icon: EventIcon },
  { id: 'warehouse', label: 'Warehouse', icon: WarehouseIcon },
  { id: 'shopping-plaza', label: 'Shopping Plaza / Mall', icon: PlazaIcon },
  { id: 'factory', label: 'Factory / Industrial', icon: FactoryIcon },
  { id: 'land', label: 'Commercial Land', icon: LandIcon },
  { id: 'farm-land', label: 'Agricultural Land / Farm', icon: FarmIcon },
  { id: 'shop', label: 'Retail Shop', icon: ShopIcon },
  { id: 'duplex', label: 'Duplex', icon: DuplexIcon },
  { id: 'bungalow', label: 'Bungalow', icon: BungalowIcon },
  { id: 'others', label: 'Others', icon: OtherIcon },
];

/**
 * Category Option Component
 * Using the premium card styling from property-type.jsx
 */
const CategoryOption = ({ category, selected, onPress }) => {
  const IconComponent = category.icon;
  
  return (
    <Pressable
      style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
      onPress={onPress}
    >
      <IconComponent size={32} color={selected ? "#010135" : "#292929"} />
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

      // Navigate immediately to Intent (Step 2)
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
    paddingTop: 30,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 25,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  categoryOption: {
    width: (SCREEN_WIDTH - 55) / 2,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  categoryOptionSelected: {
    borderColor: '#010135',
    backgroundColor: '#F0F4FF',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#292929',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#010135',
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
