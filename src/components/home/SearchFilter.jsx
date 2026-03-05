import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import SearchIcon from "../../assets/icons/home/SearchIcon.svg";
import FilterIcon from "../../assets/icons/navbar/vuesax/outline/setting-4.svg";

const SearchFilter = ({
  placeholder = "Search apartments, hotels, location...",
  value,
  onChangeText,
  onFilterPress,
  onSubmit,
  activeFilterCount = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* Search Input */}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
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
    backgroundColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default SearchFilter;
