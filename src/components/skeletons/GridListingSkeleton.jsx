import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Skeleton from "../common/Skeleton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

/**
 * Grid Listing Skeleton
 * Matches the 2-column layout of the Search Results cards
 */
const GridListingSkeleton = () => {
  return (
    <View style={styles.card}>
      {/* Image Placeholder */}
      <Skeleton height={150} borderRadius={10} />
      
      <View style={styles.content}>
        {/* Title */}
        <Skeleton width="90%" height={16} />
        
        {/* Location Row */}
        <View style={styles.row}>
           <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>

        {/* Info Row */}
        <Skeleton width="80%" height={10} style={{ marginTop: 8 }} />

        {/* Price Row */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <Skeleton width="40%" height={18} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#BEBBB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

export default GridListingSkeleton;
