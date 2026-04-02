import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Checkbox Component
 * Custom checkbox with label for auth forms (e.g., Terms and Conditions)
 *
 * @param {boolean} checked - Checkbox checked state
 * @param {function} onPress - Callback when checkbox is pressed
 * @param {string} label - Label text displayed next to checkbox
 * @param {object} checkboxStyle - Optional styles for checkbox container
 * @param {object} labelStyle - Optional styles for label text
 * @returns {JSX.Element} Checkbox component
 */
const Checkbox = ({ checked, onPress, label, checkboxStyle, labelStyle }) => (
  <TouchableOpacity 
    style={[styles.checkboxContainer, checkboxStyle]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && (
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 6L9 17L4 12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
    <Text style={[styles.checkboxLabel, labelStyle]}>{label}</Text>
  </TouchableOpacity>
);

const styles = {
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: '#6371F1',
    borderColor: '#6371F1',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
};

export default Checkbox;

























