import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/**
 * Password Requirement Component
 * Displays password requirement validation status (met/unmet)
 * Used in password reset/change forms
 *
 * @param {boolean} met - Whether the requirement is met
 * @param {string} text - Requirement description text
 * @returns {JSX.Element} Requirement row with status indicator
 */
const PasswordRequirement = ({ met, text }) => (
  <View style={styles.requirementRow}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={met ? '#28a745' : '#999'}
    />
    <Text style={[styles.requirementText, met && styles.requirementMet]}>
      {text}
    </Text>
  </View>
);

const styles = {
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
  requirementMet: {
    color: '#28a745',
    fontWeight: '500',
  },
};

export default PasswordRequirement;
