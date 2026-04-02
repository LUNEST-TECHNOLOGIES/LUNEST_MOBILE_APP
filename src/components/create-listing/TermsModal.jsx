/**
 * Terms Modal Component
 * Reusable modal for displaying individual terms with scrollable content
 */

import {
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Close Icon
const CloseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TermsModal = ({ visible, term, onClose }) => {
  if (!term) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <CloseIcon size={20} color="#666666" />
          </Pressable>
          <Text style={styles.headerTitle}>{term.title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          Last updated: {term.lastUpdated}
        </Text>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {term.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.closeButtonFooter} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 22,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  closeButtonFooter: {
    backgroundColor: '#192DFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TermsModal;
