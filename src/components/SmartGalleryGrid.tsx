import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ScoredPhoto } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 40 - ITEM_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface SmartGalleryGridProps {
  suggestedPhotos: ScoredPhoto[];
  allPhotos: ScoredPhoto[];
  isLoading: boolean;
  progress: number;
  categoryColor: string;
  selectedUris: string[];
  maxSelection: number;
  onPhotoToggle: (uri: string) => void;
}

export const SmartGalleryGrid: React.FC<SmartGalleryGridProps> = ({
  suggestedPhotos,
  allPhotos,
  isLoading,
  progress,
  categoryColor,
  selectedUris,
  maxSelection,
  onPhotoToggle,
}) => {
  // Build sections data
  const sections: Array<{ type: 'header' | 'photo'; data: any }> = [];

  if (suggestedPhotos.length > 0) {
    sections.push({ type: 'header', data: { title: 'Suggested for you', icon: '⭐' } });
    suggestedPhotos.forEach((sp) =>
      sections.push({ type: 'photo', data: sp })
    );
    // Pad to fill row
    const suggestedRemainder = suggestedPhotos.length % NUM_COLUMNS;
    if (suggestedRemainder > 0) {
      for (let i = 0; i < NUM_COLUMNS - suggestedRemainder; i++) {
        sections.push({ type: 'photo', data: null }); // empty spacer
      }
    }
  }

  if (allPhotos.length > 0) {
    sections.push({
      type: 'header',
      data: { title: 'All photos', icon: '📷' },
    });
    allPhotos.forEach((sp) => sections.push({ type: 'photo', data: sp }));
  }

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof sections)[0]; index: number }) => {
      if (item.type === 'header') {
        return (
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionIcon}>{item.data.icon}</Text>
            <Text style={styles.sectionTitle}>{item.data.title}</Text>
            {item.data.title === 'Suggested for you' && (
              <View
                style={[
                  styles.suggestedBadge,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Text
                  style={[styles.suggestedBadgeText, { color: categoryColor }]}
                >
                  AI sorted
                </Text>
              </View>
            )}
          </Animated.View>
        );
      }

      // Photo item
      const scoredPhoto: ScoredPhoto | null = item.data;
      if (!scoredPhoto) {
        return <View style={styles.photoItemEmpty} />;
      }

      const selectionIdx = selectedUris.indexOf(scoredPhoto.photo.uri);
      const isSelected = selectionIdx >= 0;
      const atMax = !isSelected && selectedUris.length >= maxSelection;

      return (
        <TouchableOpacity
          style={[
            styles.photoItem,
            isSelected && { borderWidth: 3, borderColor: categoryColor },
            atMax && styles.photoItemDisabled,
          ]}
          onPress={() => !atMax && onPhotoToggle(scoredPhoto.photo.uri)}
          activeOpacity={atMax ? 1 : 0.7}
        >
          <Image
            source={{ uri: scoredPhoto.photo.uri }}
            style={styles.photoImage}
            resizeMode="cover"
          />

          {/* Selection order badge */}
          {isSelected && (
            <View style={[styles.selectionBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.selectionBadgeText}>{selectionIdx + 1}</Text>
            </View>
          )}

          {/* Face count badge */}
          {!isSelected && scoredPhoto.faceCount > 0 && (
            <View style={styles.faceCountBadge}>
              <Text style={styles.faceCountText}>
                👤 {scoredPhoto.faceCount}
              </Text>
            </View>
          )}

          {/* Suggested indicator */}
          {scoredPhoto.isSuggested && !isSelected && (
            <View
              style={[
                styles.suggestedIndicator,
                { backgroundColor: categoryColor },
              ]}
            />
          )}
        </TouchableOpacity>
      );
    },
    [categoryColor, onPhotoToggle, selectedUris, maxSelection]
  );

  if (isLoading) {
    return (
      <Animated.View entering={FadeIn} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={categoryColor} />
        <Text style={styles.loadingTitle}>Analyzing your photos...</Text>
        <Text style={styles.loadingSubtitle}>
          Finding the best matches for your card
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: categoryColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}%
        </Text>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            All analysis happens on your device. No photos are uploaded.
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📷</Text>
        <Text style={styles.emptyTitle}>No photos found</Text>
        <Text style={styles.emptySubtitle}>
          Take some photos or check your gallery permissions
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sections}
      renderItem={renderItem}
      keyExtractor={(item, index) =>
        item.type === 'header'
          ? `header-${index}`
          : item.data?.photo?.uri || `empty-${index}`
      }
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={15}
      windowSize={10}
      initialNumToRender={20}
      getItemLayout={(_, index) => ({
        length: ITEM_SIZE + ITEM_GAP,
        offset: (ITEM_SIZE + ITEM_GAP) * Math.floor(index / NUM_COLUMNS),
        index,
      })}
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    paddingBottom: 100,
  },
  row: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 8,
    width: SCREEN_WIDTH - 40,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  suggestedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  suggestedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  photoItemDisabled: {
    opacity: 0.35,
  },
  selectionBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  photoItemEmpty: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  faceCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  faceCountText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  suggestedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
  },
  privacyIcon: {
    fontSize: 14,
  },
  privacyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    flex: 1,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    textAlign: 'center',
  },
});
