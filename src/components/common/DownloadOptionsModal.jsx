import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DownloadOptionsModal = ({ 
  visible, 
  onClose, 
  onSaveImage, 
  onDownloadReceipt, 
  onDownloadAgreement,
  loading = false
}) => {
  if (!visible) return null;

  return (
    <View style={styles.fullscreenOverlay}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Download Options</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>
            Choose a format to download your booking details.
          </Text>

          <View style={styles.optionsContainer}>
            {/* Save Image */}
            <TouchableOpacity 
              style={[styles.optionButton, styles.primaryButton, loading && { opacity: 0.7 }]} 
              onPress={() => {
                onClose();
                setTimeout(() => onSaveImage && onSaveImage(), 500);
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Save as Image</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Download Receipt */}
            <TouchableOpacity 
              style={[styles.optionButton, styles.secondaryButton, loading && { opacity: 0.7 }]} 
              onPress={() => {
                onClose();
                setTimeout(() => onDownloadReceipt && onDownloadReceipt(), 500);
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#010135" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#010135" />
                  <Text style={styles.secondaryButtonText}>Download Receipt (PDF)</Text>
                </>
              )}
            </TouchableOpacity>

             {/* Download Agreement */}
             <TouchableOpacity 
              style={[styles.optionButton, styles.secondaryButton, loading && { opacity: 0.7 }]} 
              onPress={() => {
                onClose();
                setTimeout(() => onDownloadAgreement && onDownloadAgreement(), 500);
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#010135" />
              ) : (
                <>
                  <Ionicons name="reader-outline" size={20} color="#010135" />
                  <Text style={styles.secondaryButtonText}>Rental Agreement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 2000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#010135',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#010135',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F7',
  },
  secondaryButtonText: {
    color: '#010135',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default DownloadOptionsModal;
