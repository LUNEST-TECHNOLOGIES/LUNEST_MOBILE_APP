import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import PropertyListingCard from "./PropertyListingCard";
import SectionHeader from "./SectionHeader";

// Sample data for demonstration
const SAMPLE_PROPERTIES = [];

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
