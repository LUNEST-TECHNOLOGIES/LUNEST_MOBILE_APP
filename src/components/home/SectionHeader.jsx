import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SectionHeader Component
 * Reusable section header with title and optional icon/action
 * 
 * @param {string} title - Section title text
 * @param {string} icon - Optional Ionicons name
 * @param {function} onPress - Optional callback for the entire header
 * @param {function} onIconPress - Optional callback for icon press
 * @param {boolean} showSeeAll - Show "See all" link
 * @param {function} onSeeAllPress - Callback for "See all" press
 */
const SectionHeader = ({ 
  title, 
  icon = 'flame',
  onPress,
  onIconPress,
  showSeeAll = false,
  onSeeAllPress,
}) => {
  const HeaderContent = () => (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <Pressable onPress={onIconPress} style={styles.iconContainer}>
            <Ionicons name={icon} size={22} color="#292929" />
          </Pressable>
        )}
      </View>
      
      {showSeeAll && (
        <Pressable onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        <HeaderContent />
      </Pressable>
    );
  }

  return <HeaderContent />;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leftContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    color: '#292929',
    fontSize: 14,
    fontWeight: '600',
  },
  iconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#010135',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SectionHeader;
