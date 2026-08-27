/**
 * Create Listing - Step 4: Location
 * Enter property address and location
 */

import { 
  X, 
  MapPin, 
  Plus, 
  PlusCircle, 
  Trash2 
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import { GooglePlacesAutocomplete } from "../../src/components/GooglePlacesWrapper";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../src/components/MapViewWrapper";
import { APP_CONFIG } from "../../src/config/appConfig";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import draftListingService from "../../src/services/draftListingService";
import locationService from "../../src/services/locationService";
import toastService from "../../src/services/toastService";
import ToastNotification from "../../src/components/common/ToastNotification";

// Legacy icon definitions removed

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
              index < currentStep
                ? styles.progressFilled
                : styles.progressEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

const Location = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } =
    useDraftListing();

  const googlePlacesRef = useRef(null);
  const mapRef = useRef(null);
  const geocodeTimerRef = useRef(null);

  // Initialize from draft
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [postalCode, setPostalCode] = useState("");
  const [landmarks, setLandmarks] = useState([""]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [propertyCoords, setPropertyCoords] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

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
  const countries = [
    "Nigeria",
    "Ghana",
    "Kenya",
    "United Kingdom",
    "United States",
  ];
  const nigeriaStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
    "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
    "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
    "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
    "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT",
  ];
  // Debounce the draft save to prevent input lag
  const debouncedSaveDraft = useCallback(
    debounce((data) => {
      saveDraftData(data);
    }, 1000),
    [saveDraftData]
  );

  // Load draft data on mount
  const isInitialized = useRef(false);
  useEffect(() => {
    let timeoutId;
    if (draftData && !isInitialized.current) {
      const savedAddress = draftData.address || "";
      setAddress(savedAddress);
      setCity(draftData.city || "");
      setState(draftData.state || "");
      setCountry(draftData.country || "Nigeria");
      setPostalCode(draftData.postalCode || "");

      // Use a small timeout to ensure the ref is available
      timeoutId = setTimeout(() => {
        if (googlePlacesRef.current && savedAddress) {
          googlePlacesRef.current.setAddressText(savedAddress);
        }
      }, 500);

      let parsedLandmarks = [""];
      if (draftData.landmarks) {
        try {
          if (typeof draftData.landmarks === "string") {
            const parsed = JSON.parse(draftData.landmarks);
            parsedLandmarks =
              Array.isArray(parsed) && parsed.length > 0 ? parsed : [""];
          } else if (Array.isArray(draftData.landmarks)) {
            parsedLandmarks =
              draftData.landmarks.length > 0 ? draftData.landmarks : [""];
          }
        } catch (e) {
          console.warn("Error parsing landmarks:", e);
        }
      }
      setLandmarks(parsedLandmarks);
      
      // Load any saved coords from draft
      if (draftData && draftData.latitude && draftData.longitude) {
        setPropertyCoords({
          lat: Number(draftData.latitude),
          lon: Number(draftData.longitude),
        });
      }

      isInitialized.current = true;
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [draftData]);

  // Auto-save function
  const updateLocation = (updates) => {
    const currentLat = updates.latitude !== undefined ? updates.latitude : (propertyCoords?.lat || (draftData && draftData.latitude) || 0);
    const currentLon = updates.longitude !== undefined ? updates.longitude : (propertyCoords?.lon || (draftData && draftData.longitude) || 0);
    const finalAddress = updates.address !== undefined ? updates.address : address;

    const finalUpdates = {
      address: finalAddress,
      city: updates.city !== undefined ? updates.city : city,
      state: updates.state !== undefined ? updates.state : state,
      country: updates.country !== undefined ? updates.country : country,
      postalCode:
        updates.postalCode !== undefined ? updates.postalCode : postalCode,
      landmarks:
        updates.landmarks !== undefined
          ? JSON.stringify(updates.landmarks.filter((l) => l.trim()))
          : JSON.stringify(landmarks.filter((l) => l.trim())),
      latitude: currentLat,
      longitude: currentLon,
      propertyLocation: {
        coordinates: [currentLat, currentLon],
        fullAddress: finalAddress,
      },
      currentStep: 4,
    };

    if (updates.address !== undefined) setAddress(updates.address);
    if (updates.city !== undefined) setCity(updates.city);
    if (updates.state !== undefined) setState(updates.state);
    if (updates.country !== undefined) setCountry(updates.country);
    if (updates.postalCode !== undefined) setPostalCode(updates.postalCode);
    if (updates.landmarks !== undefined) setLandmarks(updates.landmarks);
    if (updates.latitude !== undefined && updates.longitude !== undefined) {
      setPropertyCoords({ lat: updates.latitude, lon: updates.longitude });
    }

    debouncedSaveDraft(finalUpdates);
  };

  // Geocode an address string using Google Geocoding API with Nominatim Fallback
  const geocodeAddress = useCallback(async (query) => {
    try {
      // Build a comprehensive query string
      const fullQuery = [query, city, state, country].filter(v => v && v.trim()).join(', ');
      const q = encodeURIComponent(fullQuery);
      
      const apiKey = APP_CONFIG.GOOGLE_MAPS_API_KEY;
      let geocoded = false;

      // 1. Try Google Maps API if configured
      if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${apiKey}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const loc = result.geometry.location;
            const newCoords = { lat: loc.lat, lon: loc.lng };
            setPropertyCoords(newCoords);
            
            // Extract components to smart-fill fields
            let extractedCity = "";
            let extractedState = "";
            let extractedCountry = "";
            
            result.address_components.forEach((comp) => {
              const types = comp.types;
              if (types.includes("locality") || types.includes("sublocality"))
                extractedCity = comp.long_name;
              if (types.includes("administrative_area_level_1"))
                extractedState = comp.long_name;
              if (types.includes("country"))
                extractedCountry = comp.long_name;
            });

            if (extractedCity) setCity(extractedCity);
            if (extractedState) setState(extractedState);
            if (extractedCountry) setCountry(extractedCountry);

            saveDraftData({ 
              latitude: loc.lat, 
              longitude: loc.lng, 
              city: extractedCity || city,
              state: extractedState || state,
              country: extractedCountry || country,
              currentStep: 4 
            });

            // Animate map to new location
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: loc.lat,
                longitude: loc.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 1000);
            }
            geocoded = true;
          }
        } catch (gErr) {
          console.warn('Google geocode error, falling back to OSM:', gErr);
        }
      }

      // 2. Fallback to OpenStreetMap (Nominatim) search if Google didn't succeed
      if (!geocoded) {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&limit=1&addressdetails=1`;
          const osmRes = await fetch(osmUrl, {
            headers: {
              'User-Agent': 'LUNEST-App/1.0',
              'Accept': 'application/json',
            }
          });
          const osmResults = await osmRes.json();
          if (Array.isArray(osmResults) && osmResults.length > 0) {
            const first = osmResults[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);
            const newCoords = { lat, lon };
            setPropertyCoords(newCoords);

            const addr = first.address || {};
            const extractedCity = addr.city || addr.town || addr.village || addr.suburb || "";
            const extractedState = addr.state || addr.state_district || "";
            const extractedCountry = addr.country || "Nigeria";

            if (extractedCity) setCity(extractedCity);
            if (extractedState) setState(extractedState);
            if (extractedCountry) setCountry(extractedCountry);

            saveDraftData({ 
              latitude: lat, 
              longitude: lon, 
              city: extractedCity || city,
              state: extractedState || state,
              country: extractedCountry || country,
              currentStep: 4 
            });

            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 1000);
            }
          }
        } catch (osmErr) {
          console.warn('OSM geocode error:', osmErr);
        }
      }
    } catch (e) {
      console.warn('Geocode failed:', e);
    }
  }, [city, state, country, saveDraftData]);

  // Auto-geocode when address changes (debounced 1.5s)
  useEffect(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (address && address.trim().length >= 5) {
      geocodeTimerRef.current = setTimeout(() => {
        geocodeAddress(address);
      }, 1500);
    }
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, [address, geocodeAddress]);






  const handleUseCurrentLocation = async () => {
    try {
      setDetectingLocation(true);
      const location = await locationService.getCurrentLocationWithAddress();
      
      if (location && location.address) {
        const addr = location.address;
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        
        // Construct a clean, short street address
        // Priority: streetNumber + street > subLocality + street > street > name (if short) > formatted (truncated)
        let finalAddress = "";
        
        const streetPart = [addr.streetNumber, addr.street].filter(Boolean).join(" ");
        const neighborhoodPart = addr.subLocality || addr.locality || addr.district || "";
        
        if (streetPart) {
          // Best case: we have street number and name
          finalAddress = streetPart;
        } else if (neighborhoodPart && addr.street) {
          // Fallback: neighborhood + street (e.g., "Downtown Main Street")
          finalAddress = `${neighborhoodPart} ${addr.street}`.trim();
        } else if (addr.street) {
          // Fallback: just street name
          finalAddress = addr.street;
        } else if (addr.name && addr.name.length < 40 && !addr.name.includes(",")) {
          // Use name only if it's short and simple (not a full address with commas)
          finalAddress = addr.name;
        } else if (addr.formatted && addr.formatted.length < 50) {
          // Last resort: truncated formatted address
          finalAddress = addr.formatted.split(",").slice(0, 2).join(", ");
        } else {
          // Absolute fallback: build from city/region
          finalAddress = addr.city || addr.region || "Unknown Location";
        }
        
        // Clean up and limit length
        finalAddress = finalAddress
          .replace(/\s+/g, " ")  // Remove extra spaces
          .replace(/,\s*,/g, ",") // Remove double commas
          .trim();
        
        // Hard limit of 80 characters for display
        if (finalAddress.length > 80) {
          finalAddress = finalAddress.substring(0, 77) + "...";
        }
        
        setAddress(finalAddress);
        setCity(addr.city || city);
        setState(addr.region || state);
        setPostalCode(addr.postalCode || postalCode);
        setCountry(addr.country || "Nigeria");
        setPropertyCoords({ lat, lon });
        
        // Sync the search input text
        if (googlePlacesRef.current) {
          googlePlacesRef.current.setAddressText(finalAddress);
        }
        
        // Save to draft
        updateLocation({
          address: finalAddress,
          city: addr.city || city,
          state: addr.region || state,
          postalCode: addr.postalCode || postalCode,
          country: addr.country || "Nigeria",
          latitude: lat,
          longitude: lon,
        });
        
        // Animate map
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        }
      } else {
        toastService.showError("Could not detect your current location. Please ensure location services are enabled.");
      }
    } catch (error) {
      console.error("[Location] Error detecting location:", error);
      toastService.showError("An error occurred while trying to get your location.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const addLandmark = () => {
    if (landmarks.length < 5) {
      const newLandmarks = [...landmarks, ""];
      setLandmarks(newLandmarks);
      saveDraftData({
        landmarks: JSON.stringify(newLandmarks),
        currentStep: 4,
      });
    }
  };

  const removeLandmark = (index) => {
    if (landmarks.length > 1) {
      const newLandmarks = landmarks.filter((_, i) => i !== index);
      setLandmarks(newLandmarks);
      saveDraftData({
        landmarks: JSON.stringify(newLandmarks),
        currentStep: 4,
      });
    }
  };

  const updateLandmark = (index, value) => {
    const newLandmarks = [...landmarks];
    newLandmarks[index] = value;
    setLandmarks(newLandmarks);
    debouncedSaveDraft({
      landmarks: JSON.stringify(newLandmarks),
      currentStep: 4,
    });
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();
      
      const lat = propertyCoords?.lat || (draftData && draftData.latitude) || 0;
      const lon = propertyCoords?.lon || (draftData && draftData.longitude) || 0;

      const savePayload = {
        address,
        city,
        state,
        country,
        postalCode,
        landmarks: JSON.stringify(landmarks),
        latitude: lat,
        longitude: lon,
        propertyLocation: {
          coordinates: [lat, lon],
          fullAddress: address,
        },
        currentStep: 4,
        draftId: finalDraftId,
      };

      await saveDraftData(savePayload);

      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft:", error);
      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  // Validation - require at least address and city
  const isValid = address.trim().length > 0 && city.trim().length > 0;

  const handleBack = async () => {
    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    const lat = propertyCoords?.lat || (draftData && draftData.latitude) || 0;
    const lon = propertyCoords?.lon || (draftData && draftData.longitude) || 0;

    const savePayload = {
      address,
      city,
      state,
      country,
      postalCode,
      landmarks: JSON.stringify(landmarks),
      latitude: lat,
      longitude: lon,
      propertyLocation: {
        coordinates: [lat, lon],
        fullAddress: address,
      },
      currentStep: 4,
      draftId: finalDraftId,
    };

    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData(savePayload, { background: true });

    router.replace({
      pathname: "/create-listing/property-details",
      params: { draftId: finalDraftId },
    });
  };

  const handleNext = () => {
    if (address.trim() && city.trim()) {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();

      const lat = propertyCoords?.lat || (draftData && draftData.latitude) || 0;
      const lon = propertyCoords?.lon || (draftData && draftData.longitude) || 0;

      const savePayload = {
        address,
        city,
        state,
        country,
        postalCode,
        landmarks: JSON.stringify(landmarks),
        latitude: lat,
        longitude: lon,
        propertyLocation: {
          coordinates: [lat, lon],
          fullAddress: address,
        },
        currentStep: 4,
        draftId: finalDraftId,
      };

      // OPTIMIZATION: Trigger save in background and navigate immediately
      saveDraftData(savePayload, { background: true });

      router.push({
        pathname: "/create-listing/amenities",
        params: { draftId: finalDraftId },
      });
    } else {
      toastService.showError("Please enter address and city.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TouchableWithoutFeedback 
        onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} 
        accessible={false}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create a Listing</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <View style={styles.closeButtonBg} />
              <View style={{ zIndex: 5 }}>
                <X size={14} color="#000000" />
              </View>
            </Pressable>
          </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={4} totalSteps={10} />

      {/* Content with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
        <View style={styles.titleRow}>
                <MapPin size={24} color="#010135" />
                <Text style={styles.sectionTitle}>
                  Where is your property located?
                </Text>
              </View>

              {/* Current Location Helper */}
              <Pressable 
                style={styles.currentLocationButton} 
                onPress={handleUseCurrentLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#010135" />
                ) : (
                  <MapPin size={16} color="#010135" />
                )}
                <Text style={styles.currentLocationText}>
                  {detectingLocation ? "Detecting..." : "Use my current location"}
                </Text>
              </Pressable>

              {/* Address Input - Search and Manual Entry */}
              <View style={{ marginBottom: 20, zIndex: 10 }}>
                <Text style={styles.inputLabel}>Property Address *</Text>
                
                <View style={styles.addressSearchContainer}>
                  <GooglePlacesAutocomplete
                    ref={googlePlacesRef}
                    placeholder="Search for your address..."
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                    if (details) {
                      const { lat, lng } = details.geometry.location;
                      setPropertyCoords({ lat: lat, lon: lng });
                      const components = details.address_components;
                      let streetNumber = "";
                      let route = "";
                      let extractedCity = "";
                      let extractedState = "";
                      let extractedPostalCode = "";
                      let extractedCountry = "";

                      components.forEach((comp) => {
                        const types = comp.types;
                        if (types.includes("street_number"))
                          streetNumber = comp.long_name;
                        if (types.includes("route")) route = comp.long_name;
                        if (
                          types.includes("locality") ||
                          types.includes("sublocality")
                        )
                          extractedCity = comp.long_name;
                        if (types.includes("administrative_area_level_1"))
                          extractedState = comp.long_name;
                        if (types.includes("postal_code"))
                          extractedPostalCode = comp.long_name;
                        if (types.includes("country"))
                          extractedCountry = comp.long_name;
                      });

                      const fullStreet = `${streetNumber} ${route}`.trim();
                      const finalAddress = data.description || fullStreet;

                      setAddress(finalAddress);
                      setCity(extractedCity || city);
                      setState(extractedState || state);
                      setPostalCode(extractedPostalCode || postalCode);
                      setCountry(extractedCountry || country);

                      updateLocation({
                        address: finalAddress,
                        city: extractedCity || city,
                        state: extractedState || state,
                        postalCode: extractedPostalCode || postalCode,
                        country: extractedCountry || country,
                        latitude: lat,
                        longitude: lng,
                      });

                      if (mapRef.current) {
                        mapRef.current.animateToRegion(
                          {
                            latitude: lat,
                            longitude: lng,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                          },
                          1000,
                        );
                      }
                    } else {
                      setAddress(data.description);
                      updateLocation({ address: data.description });
                    }
                  }}
                  query={{
                    key: APP_CONFIG.GOOGLE_MAPS_API_KEY,
                    language: "en",
                    components: country === "Nigeria" ? "country:ng" : undefined,
                  }}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  onFail={(error) => {
                    console.log('GooglePlaces Error: ', error);
                    if (Platform.OS !== 'web') {
                      Alert.alert('Location Suggestions Error', typeof error === 'string' ? error : JSON.stringify(error));
                    }
                  }}
                  textInputProps={{
                    placeholderTextColor: "#999999",
                    style: styles.googlePlacesInput,
                    selectionColor: "#010135",
                    multiline: false,
                    numberOfLines: 1,
                    clearButtonMode: 'while-editing',
                    returnKeyType: 'search',
                    onBlur: () => {
                      const text = googlePlacesRef.current?.getAddressText();
                      if (text) {
                        setAddress(text);
                        updateLocation({ address: text });
                      }
                    }
                  }}
                  enablePoweredByContainer={false}
                  keyboardShouldPersistTaps="always"
                  listUnderlayColor="transparent"
                  disableScroll={true}                 // Disable internal FlatList scrolling
                  renderRow={(data) => (
                    <View style={styles.suggestionRow}>
                      <MapPin size={20} color="#010135" />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText} numberOfLines={1}>
                          {data.main_text || data.description}
                        </Text>
                        {data.secondary_text ? (
                          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                            {data.secondary_text}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                  styles={{
                    container: { 
                      flex: 0,
                      width: '100%',
                      marginTop: 8,
                      zIndex: 9999,
                      position: 'relative',
                      elevation: 5,
                    },
                    textInputContainer: {
                      padding: 0,
                      height: 50,
                      borderWidth: 0,
                      backgroundColor: "transparent",
                    },
                    textInput: {
                      height: 50,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: "#E5E5E5",
                      paddingHorizontal: 16,
                      paddingVertical: 0,
                      fontSize: 14,
                      color: "#000000",
                      backgroundColor: "#FAFAFA",
                      margin: 0,
                      lineHeight: 50,
                    },
                    listView: {
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E5E5E5",
                      borderTopWidth: 0,
                      borderRadius: 0,
                      borderBottomLeftRadius: 12,
                      borderBottomRightRadius: 12,
                      marginTop: -1,
                      elevation: 10,
                      position: "absolute",
                      top: 50, // Adjusted from 45 to align better with 50height input
                      left: 0,
                      right: 0,
                      width: "100%",
                      zIndex: 1000,
                      maxHeight: 280,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      overflow: "visible",
                    },
                    row: {
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      height: "auto",
                      minHeight: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: "#F0F0F0",
                    },
                    separator: {
                      height: 0,
                      backgroundColor: "#F0F0F0",
                    },
                    predefinedPlacesDescription: {
                      color: '#1faadb',
                    },
                  }}
                />
              </View>
            </View>

        {/* City and State Row */}
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Lagos"
              placeholderTextColor="#999999"
              value={city}
              onChangeText={(text) => updateLocation({ city: text })}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>State *</Text>
            <Pressable
              style={[styles.textInput, styles.countryPicker]}
              onPress={() => setShowStateModal(true)}
            >
              <Text style={{ color: state ? "#000000" : "#999999" }}>
                {state || "Select State"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Country and Postal Code Row */}
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Country</Text>
            <Pressable
              style={[styles.textInput, styles.countryPicker]}
              onPress={() => setShowCountryModal(true)}
            >
              <Text style={{ color: "#000000" }}>{country}</Text>
            </Pressable>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Postal Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Optional"
              placeholderTextColor="#999999"
              value={postalCode}
              onChangeText={(text) => updateLocation({ postalCode: text })}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Map Preview */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Map Preview</Text>
          <View style={styles.mapContainer}>
            {propertyCoords && MapView ? (
              <MapView
                key={`map-${propertyCoords.lat}-${propertyCoords.lon}`}
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                loadingEnabled={true}
                initialRegion={{
                  latitude: propertyCoords.lat,
                  longitude: propertyCoords.lon,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: propertyCoords.lat,
                    longitude: propertyCoords.lon,
                  }}
                  title="Property Location"
                  description={address}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPropertyCoords({ lat: latitude, lon: longitude });
                    saveDraftData({ latitude, longitude, currentStep: 4 });
                  }}
                />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <MapPin size={32} color="#999" />
                <Text style={styles.mapPlaceholderText}>
                  Enter an address to see the map
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.mapHelpText}>
            You can drag the marker to fine-tune the property location
          </Text>
        </View>

        {/* Landmark Section */}
        <View style={styles.landmarkSection}>
          <View style={styles.landmarkHeader}>
            <Text style={styles.landmarkTitle}>Landmark:</Text>
            {landmarks.length < 5 && (
              <Pressable style={styles.addLandmarkButton} onPress={addLandmark}>
                <Plus size={16} color="#010135" />
                <Text style={styles.addLandmarkText}>Add</Text>
              </Pressable>
            )}
          </View>

          {landmarks.map((landmark, index) => (
            <View key={index} style={styles.landmarkInputRow}>
              <View style={styles.landmarkInputContainer}>
                <TextInput
                  style={styles.landmarkInput}
                  placeholder={`Landmark ${index + 1}`}
                  placeholderTextColor="#999999"
                  value={landmark}
                  onChangeText={(text) => updateLandmark(index, text)}
                />
              </View>
              <Pressable
                style={styles.removeLandmarkButton}
                onPress={() => removeLandmark(index)}
              >
                <Trash2 size={18} color="#FD3131" />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Country selection modal */}
        <Modal visible={showCountryModal} transparent animationType="slide">
          <Pressable
            style={styles.deleteModalOverlay}
            onPress={() => setShowCountryModal(false)}
          >
            <Pressable
              style={styles.countryModalContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ padding: 16 }}>
                {countries.map((c) => (
                  <Pressable
                    key={c}
                    style={{ paddingVertical: 12 }}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* State selection modal */}
        <Modal visible={showStateModal} transparent animationType="slide">
          <Pressable
            style={styles.deleteModalOverlay}
            onPress={() => setShowStateModal(false)}
          >
            <Pressable
              style={[styles.countryModalContainer, { maxHeight: 400 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView style={{ padding: 16 }} nestedScrollEnabled>
                {nigeriaStates.map((s) => (
                  <Pressable
                    key={s}
                    style={{
                      paddingVertical: 12,
                      backgroundColor: state === s ? "#F0F0FF" : "transparent",
                      paddingHorizontal: 8,
                      borderRadius: 6,
                    }}
                    onPress={() => {
                      updateLocation({ state: s });
                      setShowStateModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: state === s ? "700" : "400" }}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text
            style={[
              styles.nextButtonText,
              !isValid && styles.nextButtonTextDisabled,
            ]}
          >
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
        </View>
      </TouchableWithoutFeedback>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    zIndex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBars: {
    flexDirection: "row",
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
    backgroundColor: "#0E2F5D",
  },
  progressEmpty: {
    backgroundColor: "#20A4FF",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#292929",
  },
  textInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    fontSize: 14,

    color: "#000000",
    backgroundColor: "#FAFAFA",
  },
  textInputDisabled: {
    backgroundColor: "#F0F0F0",
    color: "#666666",
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    marginTop: 10,
    gap: 10,
  },
  mapPlaceholderText: {
    fontSize: 14,

    color: "#999999",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 48 : 20,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#999999",
  },
  landmarkSection: {
    gap: 12,
  },
  landmarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  landmarkTitle: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
  },
  addLandmarkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addLandmarkText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#010135",
  },
  landmarkInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  landmarkInputContainer: {
    flex: 1,
    height: 40,
    borderRadius: 25,
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#B0B0B0",
    paddingHorizontal: 19,
    justifyContent: "center",
  },
  landmarkInput: {
    fontSize: 12,

    color: "#000000",
  },
  removeLandmarkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFEBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  countryModalContainer: {
    width: "85%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  countryPicker: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  detectLocationButton: {
    marginTop: 10,
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F8F9FA",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHelpText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  modeToggleButtonActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  modeToggleTextActive: {
    color: "#010135",
    fontWeight: "700",
  },
  addressSearchContainer: {
    position: 'relative',
    zIndex: 1,
  },
  googlePlacesInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#FAFAFA",
    width: '100%',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 46,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionTextContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  suggestionMainText: {
    fontSize: 13,
    fontWeight: '500',
    color: "#000000",
    lineHeight: 16,
  },
  suggestionSecondaryText: {
    fontSize: 11,
    fontWeight: '400',
    color: "#666666",
    lineHeight: 14,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    gap: 6,
  },
  currentLocationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#010135",
  },
});

export default Location;
