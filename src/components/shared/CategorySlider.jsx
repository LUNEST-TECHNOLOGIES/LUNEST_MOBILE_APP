import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import React, { useMemo } from "react";
import Svg, { Path } from "react-native-svg";

// Import custom category icons from category_icon folder
import ShortletIcon from "../../assets/icons/category_icon/Component 54-1.svg";
import StandardFlatIcon from "../../assets/icons/category_icon/Component 54.svg";
import PurchaseIcon from "../../assets/icons/category_icon/Component 55-1.svg";
import LuxuryIcon from "../../assets/icons/category_icon/Component 55-2.svg";
import OthersIcon from "../../assets/icons/category_icon/Component 55.svg";
import HotelIcon from "../../assets/icons/category_icon/guest-house.svg";
import DuplexIcon from "../../assets/icons/category_icon/house-01.svg";
import {
    default as BungalowIcon,
    default as SelfContainIcon,
} from "../../assets/icons/category_icon/house-02.svg";
import PrivateHomesIcon from "../../assets/icons/category_icon/house-04.svg";
import OfficeIcon from "../../assets/icons/category_icon/office-chair.svg";

// All Categories Icon (grid icon)
const AllIcon = ({ width = 18, height = 18, stroke = "#3D3D3D" }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3H10V10H3V3ZM14 3H21V10H14V3ZM14 14H21V21H14V14ZM3 14H10V21H3V14Z"
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * CategorySlider Component
 * Horizontal scrollable category filter with icons (Lunest design)
 * Located just below the search bar
 * Categories are aligned with host listing creation property types
 */

const CATEGORIES = [
  { key: "all", label: "All", Icon: AllIcon },
  { key: "shortlet", label: "Shortlet", Icon: ShortletIcon },
  { key: "standard-flat", label: "Standard Flat", Icon: StandardFlatIcon },
  { key: "apartment", label: "Apartment", Icon: StandardFlatIcon },
  { key: "studio", label: "Studio", Icon: SelfContainIcon },
  { key: "mini-flat", label: "Mini Flat", Icon: StandardFlatIcon },
  { key: "room-parlour", label: "Room & Parlour", Icon: SelfContainIcon },
  { key: "self-contain", label: "Self-Contain", Icon: SelfContainIcon },
  { key: "purchase", label: "Purchase", Icon: PurchaseIcon },
  { key: "luxury", label: "Luxury", Icon: LuxuryIcon },
  { key: "penthouse", label: "Penthouse", Icon: LuxuryIcon },
  { key: "mansion", label: "Mansion", Icon: DuplexIcon },
  { key: "private-homes", label: "Private Homes", Icon: PrivateHomesIcon },
  { key: "hotel", label: "Hotel", Icon: HotelIcon },
  { key: "office", label: "Office", Icon: OfficeIcon },
  { key: "warehouse", label: "Warehouse", Icon: OfficeIcon },
  { key: "land", label: "Land", Icon: PrivateHomesIcon },
  { key: "shop", label: "Shop", Icon: OfficeIcon },
  { key: "duplex", label: "Duplex", Icon: DuplexIcon },
  { key: "bungalow", label: "Bungalow", Icon: BungalowIcon },
  { key: "others", label: "Others", Icon: OthersIcon },
];

const CategorySlider = ({ activeCategory = "all", onCategoryPress, availableListings = [] }) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 414;

  // Filter categories to only show those with listings available
  const filteredCategories = useMemo(() => {
    if (!availableListings || availableListings.length === 0) {
      // Fallback: show first few if no data or loading
      return CATEGORIES.slice(0, 8); 
    }
    
    return CATEGORIES.filter(category => {
      // Always show 'All'
      if (category.key === "all") return true;
      
      // Match category against propertyType in available listings
      return availableListings.some(listing => {
        const listingType = (listing.propertyType || "").toLowerCase().replace(/\s+/g, '-');
        return listingType === category.key.toLowerCase();
      });
    });
  }, [availableListings]);

  // Responsive values
  const containerHeight = isSmallScreen ? 65 : isMediumScreen ? 72 : 80;
  const iconSize = isSmallScreen ? 14 : isMediumScreen ? 16 : 18;
  const fontSize = isSmallScreen ? 10 : isMediumScreen ? 11 : 12;
  const gap = isSmallScreen ? 20 : isMediumScreen ? 25 : 30;
  // Increased left padding for better visibility and easier tap on "All" category
  const paddingHorizontal = isSmallScreen ? 20 : isMediumScreen ? 24 : 28;

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal, gap },
        ]}
      >
        {filteredCategories.map((category) => {
          const isActive = activeCategory === category.key;
          const IconComponent = category.Icon;
          const iconColor = isActive ? "#192DFF" : "#3D3D3D";

          return (
            <Pressable
              key={category.key}
              onPress={() => onCategoryPress(category.key)}
              style={styles.categoryItem}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { width: iconSize, height: iconSize },
                ]}
              >
                <IconComponent
                  width={iconSize}
                  height={iconSize}
                  stroke={iconColor}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  { fontSize },
                  isActive && styles.categoryLabelActive,
                ]}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 4px 15px rgba(190, 187, 187, 0.3)",
    elevation: 15,
    marginBottom: 16, // Add space below the slider
  },
  scrollContent: {
    alignItems: "center",
    height: "100%",
  },
  categoryItem: {
    paddingHorizontal: 2.99,
    paddingVertical: 8.98,
    alignItems: "center",
    justifyContent: "center",
    gap: 7.48,
  },
  iconWrapper: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3D3D3D",
    textAlign: "center",
  },
  categoryLabelActive: {
    color: "#192DFF",
    fontWeight: "600",
  },
});

export default CategorySlider;
