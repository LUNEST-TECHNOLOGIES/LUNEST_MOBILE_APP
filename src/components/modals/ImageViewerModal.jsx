/**
 * ImageViewerModal
 * Full-screen image viewer with zoom and swipe capabilities
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import {
    useSafeAreaInsets
} from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ImageViewerModal = ({
  visible,
  images = [],
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes that are significantly vertical
        return Math.abs(gestureState.dy) > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Optional: Could add visual offset here if desired
      },
      onPanResponderRelease: (_, gestureState) => {
        // Close modal if swiped down more than 100 pixels with some velocity
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        }
      },
    }),
  ).current;

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index after a brief delay
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
    }
  };

  const handleImageLoadStart = (index) => {
    setImageLoadingStates((prev) => ({ ...prev, [index]: true }));
  };

  const handleImageLoadEnd = (index) => {
    setImageLoadingStates((prev) => ({ ...prev, [index]: false }));
  };

  const getImageSource = (image) => {
    if (!image) return null;
    if (typeof image === "string") {
      return { uri: image };
    }
    if (image.uri) {
      return { uri: image.uri };
    }
    if (image.url) {
      return { uri: image.url };
    }
    return image;
  };

  const renderMedia = ({ item, index }) => {
    if (!item) return null;
    const isVideo = item.type === "video" || (typeof item === "string" && (item.endsWith?.(".mp4") || item.endsWith?.(".mov")));
    const source = getImageSource(item);
    const isLoading = imageLoadingStates[index];
    const isActive = currentIndex === index;

    if (isVideo) {
      return (
        <View style={styles.imageContainer}>
          <VideoPlayerOverlay 
            uri={source.uri} 
            isActive={isActive && visible} 
            onClose={onClose}
          />
        </View>
      );
    }

    return (
      <View style={styles.imageContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        <Image
          source={source}
          style={styles.fullImage}
          contentFit="contain"
          onLoadStart={() => handleImageLoadStart(index)}
          onLoadEnd={() => handleImageLoadEnd(index)}
          onError={() => handleImageLoadEnd(index)}
        />
      </View>
    );
  };

  const getItemLayout = (_, index) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <StatusBar hidden={visible} barStyle="light-content" translucent />
      <View style={styles.container} {...panResponder.panHandlers}>
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderMedia}
          keyExtractor={(_, index) => `image-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
          decelerationRate="fast"
          initialScrollIndex={initialIndex}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            });
          }}
        />

        {/* Header Overlay - Positioned Absolutely to avoid pushing media */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Pagination Dots */}
        {images.length > 1 && (
          <View
            style={[
              styles.pagination,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            {images.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  currentIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Translucent to show content behind
    zIndex: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 44,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pagination: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
    zIndex: 100,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  paginationDotActive: {
    backgroundColor: "#FFFFFF",
    width: 24,
  },
});

// Internal Video Player for the Modal
const VideoPlayerOverlay = ({ uri, isActive }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
      player.seekBy(0); // Reset
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={styles.fullImage}
      contentFit="contain"
      nativeControls={true}
      fullscreenOptions={{ enabled: false }} // Already in fullscreen modal
    />
  );
};

export default ImageViewerModal;
