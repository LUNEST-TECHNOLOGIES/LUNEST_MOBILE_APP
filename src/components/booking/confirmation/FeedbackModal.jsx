import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GalleryAddIcon from '../../../assets/icons/bookings/vuesax/linear/gallery-add.svg';

const FeedbackModal = ({ visible, onClose, onSubmit, guestName }) => {
  const [feedback, setFeedback] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      onSubmit({
        feedback,
        images: selectedImages,
      });
      setFeedback('');
      setSelectedImages([]);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header with Close Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Feedback</Text>
          <Pressable 
            style={styles.closeButton} 
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Feedback Section */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Feedback (Optional)</Text>
            <Text style={styles.feedbackSubtext}>
              Share your experience...
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Share your feedback..."
              placeholderTextColor="#B0B0B0"
              multiline={true}
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Image Upload Section */}
          <View style={styles.uploadSection}>
            <Pressable style={styles.uploadButton} onPress={() => {}}>
              <GalleryAddIcon width={16} height={16} />
              <Text style={styles.uploadText}>Upload Images</Text>
            </Pressable>
            <Text style={styles.uploadNote}>
              (optional) - File type: png, jpg, mp4, mov
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Button Container */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={[
              styles.submitButton,
              isSubmitting && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  closeText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
    paddingBottom: 20,
  },
  // Feedback Section
  feedbackSection: {
    gap: 8,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  feedbackSubtext: {
    fontSize: 12,
    color: '#7C7C7C',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Upload Section
  uploadSection: {
    gap: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0E9FF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  uploadNote: {
    fontSize: 10,
    color: '#7C7C7C',
  },
  // Button Container
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexShrink: 0,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#010135',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default FeedbackModal;
