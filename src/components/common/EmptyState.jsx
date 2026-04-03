import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * EmptyState - A full-page empty state component
 * Includes icon and Call to Action (CTA) buttons.
 */
const EmptyState = ({ 
  title = "No Listings Found", 
  message = "Try adjusting your filters or check back later.",
  icon: IconComponent,
  buttonTitle,
  onPress,
}) => {
  const handlePress = () => {
    if (onPress) onPress();
  };

  return (
    <View style={styles.container}>
      {/* Icon Placeholder */}
      <View style={styles.iconContainer}>
        {IconComponent ? (
          <IconComponent size={80} color="#010135" opacity={0.1} />
        ) : (
          <MaterialIcons name="search-off" size={80} color="#010135" style={{ opacity: 0.1 }} />
        )}
      </View>

      {/* Text Content */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* Optional CTA Button */}
      {buttonTitle && (
        <TouchableOpacity 
          onPress={handlePress}
          style={styles.button}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#010135',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Aeonik-Bold',
  },
  message: {
    fontSize: 15,
    color: '#6D6D6D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Aeonik-Regular',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: '#010135',
    borderRadius: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Aeonik-Bold',
  },
});

export default EmptyState;
