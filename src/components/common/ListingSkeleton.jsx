import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Skeleton from "./Skeleton";

/**
 * Property Listing Card Skeleton
 * Matches the layout of the real PropertyListingCard
 * Used for premium infinite scroll loading states
 */
const ListingSkeleton = () => {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Image Placeholder */}
      <Skeleton height={200} borderRadius={16} />
      
      <View style={styles.content}>
        {/* Title & Rating Row */}
        <View style={styles.row}>
          <Skeleton width="60%" height={22} />
          <Skeleton width="15%" height={22} />
        </View>

        {/* Location Row */}
        <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />

        {/* Price Row */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <Skeleton width="30%" height={24} />
          <Skeleton width="20%" height={20} borderRadius={10} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 24,
    alignSelf: "center",
    overflow: "hidden",
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default ListingSkeleton;
