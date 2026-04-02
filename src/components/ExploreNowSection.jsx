import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import PropertyListingCard from "./PropertyListingCard";
import SectionHeader from "./SectionHeader";

// Sample data for demonstration
const SAMPLE_PROPERTIES = [
  {
    id: "1",
    images: [require("../assets/images/prop_image.png")],
    title: "Spacious 3-Bedroom Duplex",
    location: "Ikeja, Lagos",
    price: 1200000,
    rating: 5.0,
    isVerified: true,
    isAvailable: true,
    isFavorite: false,
    amenities: ["1 Bedroom", "Free Wifi", "Private Balcony"],
  },
  {
    id: "2",
    images: [require("../assets/images/prop_image.png")],
    title: "Modern Apartment",
    location: "Lekki Phase 1, Lagos",
    price: 950000,
    rating: 4.8,
    isVerified: true,
    isAvailable: true,
    isFavorite: true,
    amenities: ["2 Bedroom", "Pool", "Gym"],
  },
  {
    id: "3",
    images: [require("../assets/images/prop_image.png")],
    title: "Luxury Villa",
    location: "Maitama, Abuja",
    price: 2500000,
    rating: null, // Unrated property
    isVerified: true,
    isAvailable: false,
    isFavorite: false,
    amenities: ["4 Bedroom", "Garden", "Garage"],
  },
];

const ExploreNowSection = ({
  properties = SAMPLE_PROPERTIES,
  onPropertyPress,
  onFavoritePress,
  onSeeAllPress,
}) => {
  const router = useRouter();

  const handlePropertyPress = (property) => {
    // Navigate to property details screen
    console.log("[ExploreNowSection] Navigating to property:", property.id);
    router.push({
      pathname: "/property-details",
      params: {
        listingId: property.id,
      },
    });

    if (onPropertyPress) {
      onPropertyPress(property);
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Explore now"
        icon="compass"
        showSeeAll={false}
        onSeeAllPress={onSeeAllPress}
      />
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PropertyListingCard
            {...item}
            onPress={() => handlePropertyPress(item)}
            onFavoritePress={onFavoritePress}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
});

export default ExploreNowSection;
