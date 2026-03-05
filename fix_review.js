const fs = require('fs');
const path = require('path');

const reviewJsxPath = path.join(__dirname, 'app', 'create-listing', 'review.jsx');
let content = fs.readFileSync(reviewJsxPath, 'utf8');

// 1. Add VideoIcon component
const videoIconStr = `const VideoIcon = ({ size = 24, color = "#000000" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
    <line x1="7" y1="2" x2="7" y2="22"></line>
    <line x1="17" y1="2" x2="17" y2="22"></line>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="2" y1="7" x2="7" y2="7"></line>
    <line x1="2" y1="17" x2="7" y2="17"></line>
    <line x1="17" y1="17" x2="22" y2="17"></line>
    <line x1="17" y1="7" x2="22" y2="7"></line>
  </svg>
);

const Review = () => {`;

content = content.replace('const Review = () => {', videoIconStr);

// 2. Update photos and videos state handling
const photosStateStr = `  const photos = useMemo(() => {
    let images = [];
    if (draftData?.photos) {
      images = Array.isArray(draftData.photos) ? draftData.photos : safeParseArray(draftData.photos);
    } else if (params.photos) {
      images = safeParseArray(params.photos);
    } else if (isEditing && mergedData.images) {
      images = safeParseArray(mergedData.images);
    }
    return images;
  }, [draftData, params.photos, isEditing, mergedData.images]);

  // Handle multiple videos gracefully
  const videos = useMemo(() => {
    let vids = [];
    if (draftData?.propertyVideos || draftData?.videos || draftData?.video) {
        const d_vids = draftData.propertyVideos || draftData.videos || draftData.video;
        vids = Array.isArray(d_vids) ? d_vids : safeParseArray(d_vids);
    } else if (params.propertyVideos || params.videos || params.video) {
        vids = safeParseArray(params.propertyVideos || params.videos || params.video);
    } else if (isEditing && (mergedData.propertyVideos || mergedData.videos || mergedData.video)) {
        vids = safeParseArray(mergedData.propertyVideos || mergedData.videos || mergedData.video);
    }

    return vids.map(v => {
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null) return v.url || v.uri || null;
        return null;
    }).filter(Boolean);
  }, [draftData, params.video, params.videos, params.propertyVideos, isEditing, mergedData.propertyVideos, mergedData.videos, mergedData.video]);

  // Combine media for rendering
  const media = useMemo(() => {
      const vids = videos.map(v => ({ uri: v, type: 'video' }));
      const imgs = photos.map(p => ({
          uri: typeof p === 'string' ? p : (p?.uri || p?.url),
          type: 'image'
      })).filter(p => Boolean(p.uri));
      return [...vids, ...imgs];
  }, [photos, videos]);`;

content = content.replace(/  const photos = useMemo\(\(\) => \{[\s\S]*?\}, \[mergedData\.videos, mergedData\.video\]\);/, photosStateStr);

// 3. Update video upload handling
const videoUploadStr = `      // Step 1.5: Handle Videos Upload - supports multiple
      let propertyVideos = [];
      if (videos && videos.length > 0) {
        const localVideos = videos.filter(
          (video) => video && !video.startsWith("http://") && !video.startsWith("https://") && !video.startsWith("blob:")
        );
        const existingVideos = videos.filter(
          (video) => video && (video.startsWith("http://") || video.startsWith("https://") || video.startsWith("blob:"))
        );

        if (localVideos.length > 0) {
          console.log(\`🎬 [Review] Uploading \${localVideos.length} local video(s)...\`);
          const uploadVideosResult = await listingService.uploadVideos(localVideos);
          
          if (uploadVideosResult.success && uploadVideosResult.videos) {
            propertyVideos = [...existingVideos, ...uploadVideosResult.videos];
            console.log("✅ [Review] Video(s) uploaded successfully:", propertyVideos.length);
          } else {
            console.error("❌ [Review] Video upload failed:", uploadVideosResult);
            Alert.alert("Upload Error", uploadVideosResult.message || "Failed to upload videos.");
            setIsSubmitting(false);
            return;
          }
        } else {
          propertyVideos = existingVideos;
        }
      } else {
        if (isEditing) {
          propertyVideos = safeParseArray(mergedData.propertyVideos);
        }
      }`;

content = content.replace(/      \/\/ Step 1\.5: Handle video(?:\r\n|\n|.)*?      if \(photos && photos\.length > 0\) \{/m, videoUploadStr + '\n      if (photos && photos.length > 0) {');

// 4. Set propertyVideos in listingData
content = content.replace(/        titleType: mergedData\.titleType \|\| "",\s*status: "PENDING", \/\/ Set status to pending for review/m, `        titleType: mergedData.titleType || "",\n        propertyVideos: propertyVideos,\n        status: "PENDING", // Set status to pending for review`);

// 5. Update media rendering
const mediaRenderStr = `        {/* Photos & Videos - First */}
        {media.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Media ({media.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoPreview}
            >
              {media.map((item, index) => {
                  if (item.type === 'video') {
                      return (
                          <View key={\`video-\${index}\`} style={styles.videoPreviewWrapper}>
                              <View style={[styles.previewImage, styles.videoPlaceholder]}>
                                  <VideoIcon size={30} color="#192DFF" />
                                  <Text style={styles.videoPlaceholderText}>Video</Text>
                              </View>
                          </View>
                      )
                  }
                  
                  return (
                    <Image
                      key={\`img-\${index}\`}
                      source={{ uri: item.uri }}
                      style={styles.previewImage}
                      onError={(error) => {
                        console.warn("[Review] Image failed to load:", item.uri, error);
                      }}
                    />
                  );
                })}
            </ScrollView>
          </View>
        )}`;

content = content.replace(/        \{\/\* Photos - First \*\/\}[\s\S]*?        \{\/\* Property Information \*\/\}/, mediaRenderStr + '\n\n        {/* Property Information */}');

// 6. Update stylesheet
const styleAdditions = `  videoPreviewWrapper: {
    width: 120,
    height: 120,
    marginRight: 12,
  },
  videoPlaceholder: {
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#192DFF',
  }
});`;

content = content.replace(/  submitButtonText: \{[\s\S]*?\}\);\s*export default Review;/m, `  submitButtonText: {\n    fontSize: 16,\n    fontWeight: "700",\n    color: "#FFFFFF",\n  },\n${styleAdditions}\n\nexport default Review;`);

fs.writeFileSync(reviewJsxPath, content, 'utf8');
console.log('Successfully updated review.jsx');
