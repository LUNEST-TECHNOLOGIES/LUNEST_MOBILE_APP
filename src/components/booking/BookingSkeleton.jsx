import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Skeleton from "../common/Skeleton";

/**
 * Booking Card Skeleton
 * Matches the layout of the BookingCard
 */
const BookingSkeleton = () => {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Property Info Row */}
      <View style={styles.row}>
        <Skeleton width={80} height={80} borderRadius={12} />
        <View style={styles.textContainer}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />
          <Skeleton width="50%" height={16} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Footer Row */}
      <View style={styles.footer}>
        <Skeleton width="30%" height={24} />
        <Skeleton width="25%" height={32} borderRadius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default BookingSkeleton;
