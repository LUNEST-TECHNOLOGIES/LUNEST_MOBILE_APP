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

const ReviewFeedbackModal = ({
  visible = false,
  onClose = () => {},
  onSubmit = () => {},
  isLoading = false,
  guestName = "Guest",
  rating = 0,
  isHost = false,
}) => {
  const [feedback, setFeedback] = useState("");
  const [images, setImages] = useState([]);
  
  const categories = isHost ? [
    { id: 'cleanliness', label: 'Cleanliness' },
    { id: 'communication', label: 'Communication' },
    { id: 'ruleCompliance', label: 'Rule Compliance' },
  ] : [
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'cleanliness', label: 'Cleanliness' },
    { id: 'communication', label: 'Communication' },
    { id: 'location', label: 'Location' },
    { id: 'value', label: 'Value' },
  ];

  const [categoryRatings, setCategoryRatings] = useState(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: rating }), {})
  );

  const handleCategoryRate = (id, value) => {
    setCategoryRatings(prev => ({ ...prev, [id]: value }));
  };

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
    // Check if all categories are rated
    const allRated = Object.values(categoryRatings).every(val => val > 0);
    if (!allRated) {
      Alert.alert("Rating Required", "Please provide a rating for all categories.");
      return;
    }

    // Calculate overall rating as average of categories
    const values = Object.values(categoryRatings);
    const avgRating = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : rating;

    onSubmit({ 
      feedback: feedback.trim(),
      images: images,
      rating: avgRating,
      categories: categoryRatings
    });
  };

  const handleClose = () => {
    setFeedback("");
    setImages([]);
    setCategoryRatings(categories.reduce((acc, cat) => ({ ...acc, [cat.id]: rating }), {}));
    onClose();
  };

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

            {/* Categorical Ratings */}
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryRow}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <View style={styles.categoryStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => handleCategoryRate(cat.id, star)}
                        activeOpacity={0.6}
                      >
                        <Ionicons 
                          name={star <= categoryRatings[cat.id] ? "star" : "star-outline"} 
                          size={24} 
                          color={star <= categoryRatings[cat.id] ? "#FFB800" : "#D1D1D6"} 
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

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
                (isLoading || !Object.values(categoryRatings).every(val => val > 0)) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !Object.values(categoryRatings).every(val => val > 0)}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  categoriesContainer: {
    backgroundColor: "#F9F9FB",
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    gap: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
  },
  categoryStars: {
    flexDirection: "row",
    gap: 4,
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
