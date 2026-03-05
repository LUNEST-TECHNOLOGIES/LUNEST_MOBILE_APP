/**
 * FilterModal - Professional filter overlay for guest home
 * Responsive and feature-rich filtering for property listings
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import locationService from "../../services/locationService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Property categories
const PROPERTY_CATEGORIES = [
  "Shortlet",
  "Duplex",
  "Guest House",
  "Hotel/Suite",
  "Serviced Homes",
  "Shared Apartment",
  "Bungalow",
  "Self-Contain",
  "Mini-Flat",
  "Penthouse",
  "Private Homes",
  "Detached House",
  "Hostel",
  "Commercial Space",
  "Office",
  "Warehouse",
  "Factory",
  "Luxury",
  "Others",
];

// Rental durations
const RENTAL_DURATIONS = ["Daily/Weekly", "Monthly", "Annually/Yearly"];

// Amenities list
const AMENITIES = [
  "Free WiFi",
  "Air Conditioning",
  "Swimming Pool",
  "Parking",
  "24/7 Security",
  "Generator Backup",
  "Smart TV",
  "Fitted Kitchen",
  "Balcony",
  "Gym/Fitness",
  "Water Heater",
  "CCTV Surveillance",
  "Inverter System",
  "Solar System",
  "Prepaid Meter",
  "Laundry Area",
  "Game Room",
  "Lounge",
];

const FilterModal = ({ visible, onClose, onApply, initialFilters = {} }) => {
  const insets = useSafeAreaInsets();

  // Filter state
  const [location, setLocation] = useState(initialFilters.location || "");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice || "");
  const [availability, setAvailability] = useState(
    initialFilters.availability || "Available",
  );
  const [selectedDurations, setSelectedDurations] = useState(
    initialFilters.durations || [],
  );
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms || 0);
  const [bathrooms, setBathrooms] = useState(initialFilters.bathrooms || 0);
  const [guests, setGuests] = useState(initialFilters.guests || 0);
  const [selectedCategories, setSelectedCategories] = useState(
    initialFilters.categories || [],
  );
  const [selectedAmenities, setSelectedAmenities] = useState(
    initialFilters.amenities || [],
  );
  const [verifiedOnly, setVerifiedOnly] = useState(
    initialFilters.verifiedOnly || false,
  );
  const [furnished, setFurnished] = useState(initialFilters.furnished || false);
  const [petFriendly, setPetFriendly] = useState(
    initialFilters.petFriendly || false,
  );

  // Use current location handler
  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      console.log("[FilterModal] Getting current location...");

      const locationData =
        await locationService.getCurrentLocationWithAddress();

      if (locationData && locationData.address) {
        // Use city from address if available
        const cityLocation =
          locationData.address.city ||
          locationData.address.district ||
          locationData.address.region ||
          "";
        setLocation(cityLocation);
        console.log("[FilterModal] Location set to:", cityLocation);
      } else {
        console.log("[FilterModal] Could not get location address");
      }
    } catch (error) {
      console.error("[FilterModal] Error getting location:", error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Toggle selection for multi-select items
  const toggleSelection = useCallback(
    (item, selectedItems, setSelectedItems) => {
      setSelectedItems((prev) =>
        prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
      );
    },
    [],
  );

  // Increment/decrement counters
  const increment = useCallback((value, setValue, max = 10) => {
    if (value < max) setValue(value + 1);
  }, []);

  const decrement = useCallback((value, setValue, min = 0) => {
    if (value > min) setValue(value - 1);
  }, []);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setAvailability("Available");
    setSelectedDurations([]);
    setBedrooms(0);
    setBathrooms(0);
    setGuests(0);
    setSelectedCategories([]);
    setSelectedAmenities([]);
    setVerifiedOnly(false);
    setFurnished(false);
    setPetFriendly(false);
  }, []);

  // Apply filters
  const handleApply = useCallback(() => {
    const filters = {
      location,
      minPrice: minPrice ? parseInt(minPrice) : null,
      maxPrice: maxPrice ? parseInt(maxPrice) : null,
      availability,
      durations: selectedDurations,
      bedrooms,
      bathrooms,
      guests,
      categories: selectedCategories,
      amenities: selectedAmenities,
      verifiedOnly,
      furnished,
      petFriendly,
    };
    onApply(filters);
    onClose();
  }, [
    location,
    minPrice,
    maxPrice,
    availability,
    selectedDurations,
    bedrooms,
    bathrooms,
    guests,
    selectedCategories,
    selectedAmenities,
    verifiedOnly,
    furnished,
    petFriendly,
    onApply,
    onClose,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (location) count++;
    if (minPrice || maxPrice) count++;
    if (availability !== "Available") count++;
    if (selectedDurations.length > 0) count++;
    if (bedrooms > 0) count++;
    if (bathrooms > 0) count++;
    if (guests > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedAmenities.length > 0) count++;
    if (verifiedOnly) count++;
    if (furnished) count++;
    if (petFriendly) count++;
    return count;
  }, [
    location,
    minPrice,
    maxPrice,
    availability,
    selectedDurations,
    bedrooms,
    bathrooms,
    guests,
    selectedCategories,
    selectedAmenities,
    verifiedOnly,
    furnished,
    petFriendly,
  ]);

  // Render checkbox item
  const renderCheckbox = (item, isSelected, onToggle) => (
    <Pressable
      key={item}
      style={styles.checkboxItem}
      onPress={() => onToggle(item)}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
      </View>
      <Text style={styles.checkboxLabel}>{item}</Text>
    </Pressable>
  );

  // Render counter control
  const renderCounter = (label, value, setValue) => (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterControls}>
        <Pressable
          style={[
            styles.counterButton,
            value === 0 && styles.counterButtonDisabled,
          ]}
          onPress={() => decrement(value, setValue)}
          disabled={value === 0}
        >
          <Ionicons
            name="remove"
            size={20}
            color={value === 0 ? "#CCC" : "#192DFF"}
          />
        </Pressable>
        <Text style={styles.counterValue}>{value}</Text>
        <Pressable
          style={styles.counterButton}
          onPress={() => increment(value, setValue)}
        >
          <Ionicons name="add" size={20} color="#192DFF" />
        </Pressable>
      </View>
    </View>
  );

  // Render toggle switch
  const renderToggle = (label, value, setValue) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: "#E5E7EB", true: "#192DFF" }}
        thumbColor={value ? "#FFF" : "#F4F4F5"}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modalContainer,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              maxHeight: SCREEN_HEIGHT * 0.9,
              minHeight: SCREEN_HEIGHT * 0.6,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Filter</Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  placeholder="City or Area"
                  placeholderTextColor="#9CA3AF"
                  value={location}
                  onChangeText={setLocation}
                />
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#192DFF" />
                ) : (
                  <Pressable
                    onPress={handleUseCurrentLocation}
                    style={styles.useLocationButton}
                  >
                    <Ionicons name="navigate" size={18} color="#192DFF" />
                  </Pressable>
                )}
              </View>
              <Pressable
                style={styles.useLocationLink}
                onPress={handleUseCurrentLocation}
                disabled={isLoadingLocation}
              >
                <Text style={styles.useLocationText}>
                  {isLoadingLocation
                    ? "Getting location..."
                    : "Use my current location"}
                </Text>
              </Pressable>
            </View>

            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range (₦)</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Any"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>
            </View>

            {/* Availability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.chipRow}>
                {["Available", "Booked"].map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.chip,
                      availability === status && styles.chipSelected,
                    ]}
                    onPress={() => setAvailability(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        availability === status && styles.chipTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Rental Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rental Duration</Text>
              <View style={styles.checkboxGrid}>
                {RENTAL_DURATIONS.map((duration) =>
                  renderCheckbox(
                    duration,
                    selectedDurations.includes(duration),
                    (item) =>
                      toggleSelection(
                        item,
                        selectedDurations,
                        setSelectedDurations,
                      ),
                  ),
                )}
              </View>
            </View>

            {/* Room Counts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rooms & Guests</Text>
              <View style={styles.countersContainer}>
                {renderCounter("Bedrooms", bedrooms, setBedrooms)}
                {renderCounter("Bathrooms", bathrooms, setBathrooms)}
                {renderCounter("No. of Guests", guests, setGuests)}
              </View>
            </View>

            {/* Property Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Category</Text>
              <View style={styles.checkboxGridWrap}>
                {PROPERTY_CATEGORIES.map((category) =>
                  renderCheckbox(
                    category,
                    selectedCategories.includes(category),
                    (item) =>
                      toggleSelection(
                        item,
                        selectedCategories,
                        setSelectedCategories,
                      ),
                  ),
                )}
              </View>
            </View>

            {/* Toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.togglesContainer}>
                {renderToggle("Verified Only", verifiedOnly, setVerifiedOnly)}
                {renderToggle("Furnished", furnished, setFurnished)}
                {renderToggle("Pet Friendly", petFriendly, setPetFriendly)}
              </View>
            </View>

            {/* Amenities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.checkboxGridWrap}>
                {AMENITIES.map((amenity) =>
                  renderCheckbox(
                    amenity,
                    selectedAmenities.includes(amenity),
                    (item) =>
                      toggleSelection(
                        item,
                        selectedAmenities,
                        setSelectedAmenities,
                      ),
                  ),
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Pressable style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.85,
    maxHeight: SCREEN_HEIGHT * 0.85,
    flex: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  filterBadge: {
    backgroundColor: "#192DFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
    height: SCREEN_HEIGHT * 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  useLocationButton: {
    padding: 4,
  },
  useLocationLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  useLocationText: {
    fontSize: 13,
    color: "#192DFF",
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  priceInput: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  priceDivider: {
    width: 16,
    height: 2,
    backgroundColor: "#D1D5DB",
  },
  chipRow: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    borderColor: "#192DFF",
    backgroundColor: "#EEF2FF",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  chipTextSelected: {
    color: "#192DFF",
  },
  checkboxGrid: {
    gap: 12,
  },
  checkboxGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: "45%",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    backgroundColor: "#192DFF",
    borderColor: "#192DFF",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
  },
  countersContainer: {
    gap: 16,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  counterButtonDisabled: {
    borderColor: "#E5E7EB",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    minWidth: 24,
    textAlign: "center",
  },
  togglesContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  clearButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  applyButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#192DFF",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default FilterModal;
