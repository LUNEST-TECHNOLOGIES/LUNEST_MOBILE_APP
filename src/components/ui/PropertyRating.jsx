import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/**
 * PropertyRating Component
 * Reusable rating display for property cards
 * 
 * @param {number} rating - Property rating value (default: null for unrated)
 * @param {number} size - Star icon size (default: 12)
 * @param {string} variant - Display style: 'compact' | 'detailed' (default: 'compact')
 * @param {boolean} showBackground - Whether to show background (default: false)
 * @param {string} textColor - Text color (default: '#292929')
 * @param {string} starColor - Star color (default: '#FFD700')
 * @param {string} unratedText - Text to show for unrated properties (default: 'N/A')
 * @param {string} unratedColor - Color for unrated state (default: '#9CA3AF')
 */
const PropertyRating = ({
  rating = null,
  size = 12,
  variant = 'compact',
  showBackground = false,
  textColor = '#292929',
  starColor = '#FFD700',
  unratedText = 'N/A',
  unratedColor = '#9CA3AF'
}) => {
  // Check if property is unrated (null, undefined, 0, or invalid)
  const isUnrated = rating === null || rating === undefined || isNaN(rating);
  
  // For rated properties, format to 1 decimal place
  const formattedRating = !isUnrated && typeof rating === 'number' 
    ? rating.toFixed(1) 
    : null;

  const containerStyle = [
    styles.container,
    variant === 'detailed' && styles.detailedContainer,
    showBackground && styles.backgroundContainer
  ];

  // Show unrated state
  if (isUnrated) {
    return (
      <View style={containerStyle}>
        <Ionicons 
          name="star-outline" 
          size={variant === 'detailed' ? size + 2 : size} 
          color={unratedColor} 
        />
        <Text style={[
          styles.rating,
          variant === 'detailed' ? styles.detailedRating : styles.compactRating,
          styles.unratedText,
          { color: unratedColor }
        ]}>
          {unratedText}
        </Text>
      </View>
    );
  }

  // Show rated state
  return (
    <View style={containerStyle}>
      <Ionicons 
        name="star" 
        size={variant === 'detailed' ? size + 2 : size} 
        color="#FFD700" 
      />
      <Text style={[
        styles.rating,
        variant === 'detailed' ? styles.detailedRating : styles.compactRating,
        { color: textColor }
      ]}>
        {formattedRating}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailedContainer: {
    gap: 4,
  },
  backgroundContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  rating: {
    fontWeight: '500',
  },
  compactRating: {
    fontSize: 12,
  },
  detailedRating: {
    fontSize: 12,
    fontWeight: '600',
  },
  unratedText: {
    // No longer italic to match standard rating style
  },
});

export default PropertyRating;
