/**
 * Create Listing - Step 1: Select Property Category
 * Choose the type of property to list
 */

import { 
  Building, 
  Hotel, 
  Home, 
  DoorOpen, 
  Briefcase, 
  Landmark, 
  Building2, 
  Warehouse, 
  Rows, 
  Bed, 
  Users, 
  PartyPopper, 
  Store, 
  Factory, 
  Trees, 
  Map as MapIcon, 
  ShoppingBag, 
  Image as ImageIcon, 
  Coins, 
  Diamond, 
  X,
  ChevronRight,
  Castle,
  LayoutGrid
} from "lucide-react-native";
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



// Categories lookup - migrated to Lucide Icons
const PROPERTY_CATEGORIES = [
  // Residential
  { id: 'apartment', label: 'Apartment', icon: Building, color: '#F0F4FF' },
  { id: 'shortlet', label: 'Shortlet', icon: Hotel, color: '#FFF0F0' },
  { id: 'standard-flat', label: 'Standard Flat', icon: Home, color: '#F0FFF4' },
  { id: 'self-contain', label: 'Self-Contain', icon: DoorOpen, color: '#FFF9F0' },
  { id: 'duplex', label: 'Duplex', icon: Landmark, color: '#F4F0FF' },
  { id: 'bungalow', label: 'Bungalow', icon: Home, color: '#FFF0F5' },
  { id: 'penthouse', label: 'Penthouse', icon: Building2, color: '#F0FFFF' },
  { id: 'mansion', label: 'Mansion', icon: Castle, color: '#FFF5F0' },
  { id: 'terrace', label: 'Terrace House', icon: Rows, color: '#F5F5FF' },
  { id: 'detached', label: 'Detached', icon: Home, color: '#F0F5F5' },
  { id: 'semi-detached', label: 'Semi-Detached', icon: Home, color: '#F5F0F5' },
  { id: 'bq', label: 'Boys Quarter', icon: Home, color: '#FBFAF0' },
  { id: 'hostel', label: 'Hostel', icon: Bed, color: '#F0FAFB' },
  { id: 'studio', label: 'Studio Apartment', icon: ImageIcon, color: '#FAF0FF' },
  { id: 'private-homes', label: 'Private Home', icon: Home, color: '#F0FBF0' },

  // Commercial
  { id: 'office', label: 'Office Space', icon: Briefcase, color: '#F0F4FF' },
  { id: 'shop', label: 'Shop/Retail', icon: ShoppingBag, color: '#FFF0F0' },
  { id: 'co-working', label: 'Co-working', icon: Users, color: '#F0FFF4' },
  { id: 'event-center', label: 'Event Center', icon: PartyPopper, color: '#FFF9F0' },
  { id: 'shopping-plaza', label: 'Shopping Plaza', icon: Store, color: '#F4F0FF' },
  { id: 'hotel', label: 'Hotel Space', icon: Hotel, color: '#FFF0F5' },

  // Industrial & Land
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse, color: '#F0FFFF' },
  { id: 'factory', label: 'Factory', icon: Factory, color: '#FFF5F0' },
  { id: 'farm-land', label: 'Farm Land', icon: Trees, color: '#F5F5FF' },
  { id: 'land', label: 'Vacant Land', icon: MapIcon, color: '#F0F5F5' },

  // Premium / Other
  { id: 'luxury', label: 'Luxury Listing', icon: Diamond, color: '#FAF0FF' },
  { id: 'purchase', label: 'Full Purchase', icon: Coins, color: '#F0FBF0' },
];



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



/**
 * Category Option Component
 * Using the premium card styling from property-type.jsx
 */
const CategoryOption = ({ category, selected, onPress, width }) => {
  const IconComponent = category.icon;
  
  return (
    <Pressable
      style={[styles.categoryOption, selected && styles.categoryOptionSelected, { width }]}
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
  
  // Grid Calculation
  const { width: windowWidth } = Dimensions.get('window');
  const padding = 20; // scrollContent paddingHorizontal
  const gap = 15;
  const itemWidth = (windowWidth - (padding * 2) - gap) / 2;
  
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
            <X size={24} color="#000000" />
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
              width={itemWidth}
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
    justifyContent: 'space-between',
    gap: 15,
  },
  categoryOption: {
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
