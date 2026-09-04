import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import SearchIcon from "../../assets/icons/home/SearchIcon.svg";
import FilterIcon from "../../assets/icons/navbar/vuesax/outline/setting-4.svg";
import { TourAnchor } from "../tour";


const SearchFilter = ({
  placeholder = "Search apartments, hotels, location...",
  value,
  onChangeText,
  onFilterPress,
  onSubmit,
  activeFilterCount = 0,
  activeFilters = {},
  onClearFilter,
}) => {
  // Format filter chips from activeFilters
  const getFilterChips = () => {
    const chips = [];
    
    if (activeFilters.location) {
      chips.push({ key: 'location', label: `📍 ${activeFilters.location}` });
    }
    if (activeFilters.bedrooms) {
      chips.push({ key: 'bedrooms', label: `${activeFilters.bedrooms} BR` });
    }
    if (activeFilters.bathrooms) {
      chips.push({ key: 'bathrooms', label: `${activeFilters.bathrooms} BA` });
    }
    if (activeFilters.minPrice || activeFilters.maxPrice) {
      const min = activeFilters.minPrice ? `₦${(activeFilters.minPrice / 1000).toFixed(0)}k` : '';
      const max = activeFilters.maxPrice ? `₦${(activeFilters.maxPrice / 1000).toFixed(0)}k` : '';
      if (min && max) {
        chips.push({ key: 'price', label: `${min} - ${max}` });
      } else if (min) {
        chips.push({ key: 'price', label: `From ${min}` });
      } else if (max) {
        chips.push({ key: 'price', label: `Up to ${max}` });
      }
    }
    if (activeFilters.categories?.length > 0) {
      chips.push({ key: 'categories', label: activeFilters.categories[0] });
    }
    if (activeFilters.amenities?.length > 0) {
      chips.push({ key: 'amenities', label: `${activeFilters.amenities.length} amenities` });
    }
    if (activeFilters.furnished) {
      chips.push({ key: 'furnished', label: 'Furnished' });
    }
    if (activeFilters.verifiedOnly) {
      chips.push({ key: 'verified', label: '✓ Verified' });
    }
    
    return chips;
  };

  const filterChips = getFilterChips();

  return (
    <View style={styles.container}>
      {/* Search Input Row */}
      <TourAnchor id="tour-search-bar">
        <View style={styles.searchRow}>
          <Pressable style={styles.searchInputWrapper} onPress={onSubmit}>
            <SearchIcon width={20} height={20} color="#9E9E9E" />
            <TextInput
              style={styles.textInput}
              placeholder={placeholder}
              placeholderTextColor="#9E9E9E"
              value={value}
              onChangeText={onChangeText}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
            />
          </Pressable>

          {/* Filter Button */}
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.filterButtonPressed,
            ]}
            onPress={onFilterPress}
          >
            <FilterIcon width={20} height={20} color="#7C7C7C" />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </TourAnchor>


      {/* Filter Chips Row */}
      {filterChips.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContainer}
        >
          {filterChips.map((chip) => (
            <Pressable
              key={chip.key}
              style={styles.chip}
              onPress={() => onClearFilter?.(chip.key)}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
              <Text style={styles.chipClose}>×</Text>
            </Pressable>
          ))}
          {filterChips.length > 1 && (
            <Pressable style={styles.clearAllChip} onPress={() => onClearFilter?.('all')}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 30,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#7C7C7C",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
  },
  filterButton: {
    borderRadius: 12,
    padding: 12,
    position: "relative",
  },
  filterButtonPressed: {
    opacity: 0.8,
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#010135",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chipsScrollView: {
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF0FF",
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    color: "#010135",
    fontWeight: "500",
  },
  chipClose: {
    fontSize: 14,
    color: "#010135",
    fontWeight: "600",
    marginLeft: 2,
  },
  clearAllChip: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearAllText: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
});

export default SearchFilter;
