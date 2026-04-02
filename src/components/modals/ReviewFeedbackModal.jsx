/**
 * ReviewFeedbackModal
 * Bottom-sheet modal for hosts to leave feedback on completed bookings.
 * Includes text input and submit button.
 */

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ToastNotification from "../common/ToastNotification";

const ReviewFeedbackModal = ({
  visible = false,
  onClose = () => {},
  onSubmit = () => {},
  isLoading = false,
  guestName = "Guest",
  rating = 5.0,
  isHost = false,
  toastVisible = false,
  toastConfig = { type: 'SUCCESS', message: '' },
  onToastHide = () => {},
}) => {
  const [feedback, setFeedback] = useState("");
  const [images, setImages] = useState([]);
  const [currentRating, setCurrentRating] = useState(rating || 5.0);
  
  // Host review categories
  const [categories, setCategories] = useState({
    cleanliness: rating || 5.0,
    communication: rating || 5.0,
    ruleCompliance: rating || 5.0,
  });

  const pickImage = async () => {
    // Request permission if needed
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.3,
    });

    if (!result.canceled) {
      // Append new images to the list
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (currentRating === 0) {
      Alert.alert("Rating Required", "Please provide an overall rating before submitting.");
      return;
    }

    onSubmit({ 
      feedback: feedback.trim(),
      images: images,
      rating: currentRating,
      categories: isHost ? categories : undefined
    });
  };

  const handleClose = () => {
    setFeedback("");
    setImages([]);
    setCurrentRating(rating || 5.0);
    setCategories({
      cleanliness: rating || 5.0,
      communication: rating || 5.0,
      ruleCompliance: rating || 5.0,
    });
    onClose();
  };

  const updateCategory = (key, val) => {
    setCategories(prev => ({ ...prev, [key]: val }));
  };

  const CategoryRating = ({ label, value, onRate }) => (
    <View style={styles.categoryRow}>
      <Text style={styles.categoryLabel}>{label}</Text>
      <View style={styles.starsRowSmall}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => onRate(star)}
            activeOpacity={0.6}
            style={{ padding: 4 }}
          >
            <Ionicons 
              name={star <= value ? "star" : "star-outline"} 
              size={24} 
              color={star <= value ? "#FFB800" : "#D1D1D6"} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#333" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Title */}
            <Text style={styles.title}>Leave a Review</Text>
            <Text style={styles.subtitle}>
              {isHost ? `How was your experience hosting ${guestName}?` : `How was your experience with ${guestName}?`}
            </Text>

            {/* Overall Rating */}
            <View style={styles.starsContainer}>
              <Text style={[styles.inputLabel, { marginBottom: 10 }]}>Overall Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => {
                        setCurrentRating(star);
                        if (isHost) {
                            setCategories({
                                cleanliness: star,
                                communication: star,
                                ruleCompliance: star
                            });
                        }
                    }}
                    activeOpacity={0.6}
                  >
                    <Ionicons 
                      name={star <= currentRating ? "star" : "star-outline"} 
                      size={40} 
                      color={star <= currentRating ? "#FFB800" : "#D1D1D6"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Ratings (Host only) */}
            {isHost && (
              <View style={styles.categoriesContainer}>
                <CategoryRating 
                  label="Cleanliness" 
                  value={categories.cleanliness} 
                  onRate={(v) => updateCategory('cleanliness', v)} 
                />
                <CategoryRating 
                  label="Communication" 
                  value={categories.communication} 
                  onRate={(v) => updateCategory('communication', v)} 
                />
                <CategoryRating 
                  label="Rule Compliance" 
                  value={categories.ruleCompliance} 
                  onRate={(v) => updateCategory('ruleCompliance', v)} 
                />
              </View>
            )}

            {/* Feedback input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Feedback (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder={isHost ? "Describe the guest's behavior..." : "Share your experience about the stay..."}
                placeholderTextColor="#B0B0B0"
                multiline
                numberOfLines={5}
                maxLength={500}
                value={feedback}
                onChangeText={setFeedback}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{feedback.length}/500</Text>
            </View>
            
            {/* Image Selection Section */}
            <View style={styles.imageSection}>
              <Text style={styles.inputLabel}>Add Photos (Up to 5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeBtn} 
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FD3131" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {images.length < 5 && (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                    <Ionicons name="camera" size={30} color="#6371F1" />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (isLoading || currentRating === 0) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || currentRating === 0}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Toast Notification - MUST be inside Modal to be visible above it */}
          <ToastNotification
            visible={toastVisible}
            type={toastConfig.type}
            message={toastConfig.message}
            onHide={onToastHide}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 50 : 30, // Increased for safe area
    maxHeight: "90%", // Increased from 85%
    minHeight: 450, // Increased from 400
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D1D6",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  starsContainer: {
    backgroundColor: "#F9F9FB",
    borderRadius: 16,
    padding: 24,
    marginVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
  },
  starsRowSmall: {
    flexDirection: "row",
    gap: 4,
  },
  categoriesContainer: {
    backgroundColor: "#F9F9FB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#525252",
    flex: 1,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#525252",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: 120,
    backgroundColor: "#FAFAFA",
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: "#B0B0B0",
    textAlign: "right",
  },
  imageSection: {
    marginTop: 8,
    marginBottom: 10,
  },
  imageScroll: {
    paddingVertical: 10,
    gap: 12,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    marginRight: 12,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6371F1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(99, 113, 241, 0.05)",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#6371F1",
    marginTop: 4,
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: "#010135",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20, // Increased from 4
    marginBottom: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ReviewFeedbackModal;
