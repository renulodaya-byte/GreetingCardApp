import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import RNFS from 'react-native-fs';
import { SmartGalleryGrid } from '../components/SmartGalleryGrid';
import { useSmartGallery } from '../hooks/useSmartGallery';
import { MAX_PHOTOS, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';

async function resolveToLocalFile(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) return uri;
  if (!uri.startsWith('content://')) return uri;
  const dest = `${RNFS.CachesDirectoryPath}/sel_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  await RNFS.copyFile(uri, dest);
  return `file://${dest}`;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoSelect'>;
  route: RouteProp<RootStackParamList, 'PhotoSelect'>;
};

export const PhotoSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category } = route.params;
  const selectedPhotos = useAppStore((s) => s.selectedPhotos);
  const togglePhoto = useAppStore((s) => s.togglePhoto);
  const setPhotos = useAppStore((s) => s.setPhotos);

  // Smart gallery hook — runs ML analysis on mount
  const {
    suggestedPhotos,
    allPhotos,
    isLoading,
    progress,
    error,
    retry,
  } = useSmartGallery(category);

  const [isResolving, setIsResolving] = useState(false);

  const handleContinue = async () => {
    setIsResolving(true);
    try {
      const resolved = await Promise.all(
        selectedPhotos.map((u) => resolveToLocalFile(u))
      );
      navigation.navigate('Customize', {
        category,
        photoUris: resolved,
      });
    } catch (err) {
      console.error('[PhotoSelect] Failed to resolve photo URIs:', err);
      navigation.navigate('Customize', {
        category,
        photoUris: selectedPhotos,
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleSkip = () => {
    setPhotos([]);
    navigation.navigate('Customize', { category, photoUris: [] });
  };

  const getHintText = () => {
    const base = `Tap up to ${MAX_PHOTOS} photos — they'll be arranged as a collage`;
    switch (category.genderFilter) {
      case 'female':
        return `${base}. Photos with women shown first.`;
      case 'male':
        return `${base}. Photos with men shown first.`;
      case 'couple':
        return `${base}. Couple photos shown first.`;
      default:
        return base;
    }
  };

  const count = selectedPhotos.length;
  const canContinue = count > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />

      {/* Header */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor: category.color + '20',
              borderColor: category.color + '30',
            },
          ]}
        >
          <Text style={styles.categoryBadgeEmoji}>{category.emoji}</Text>
          <Text style={[styles.categoryBadgeText, { color: category.color }]}>
            {category.label}
          </Text>
        </View>

        <Text style={styles.title}>Choose Photos</Text>
        <Text style={styles.hint}>{getHintText()}</Text>

        {/* Selection counter */}
        <View
          style={[
            styles.counterPill,
            {
              backgroundColor: count > 0 ? category.color + '25' : 'rgba(255,255,255,0.06)',
              borderColor: count > 0 ? category.color + '50' : 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <Text
            style={[
              styles.counterText,
              { color: count > 0 ? category.color : 'rgba(255,255,255,0.4)' },
            ]}
          >
            {count} of {MAX_PHOTOS} selected
          </Text>
        </View>
      </Animated.View>

      {/* Smart Gallery Grid */}
      <View style={styles.galleryContainer}>
        <SmartGalleryGrid
          suggestedPhotos={suggestedPhotos}
          allPhotos={allPhotos}
          isLoading={isLoading}
          progress={progress}
          categoryColor={category.color}
          selectedUris={selectedPhotos}
          maxSelection={MAX_PHOTOS}
          onPhotoToggle={togglePhoto}
        />
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {canContinue ? (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: category.color }]}
            onPress={handleContinue}
            disabled={isResolving}
            activeOpacity={0.85}
          >
            {isResolving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>
                Continue with {count} {count === 1 ? 'photo' : 'photos'} →
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>
              Skip — continue without photo
            </Text>
          </TouchableOpacity>
        )}

        {error && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: category.color + '40' }]}
            onPress={retry}
            activeOpacity={0.7}
          >
            <Text style={[styles.retryButtonText, { color: category.color }]}>
              Retry analysis
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryBadgeEmoji: {
    fontSize: 14,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  counterPill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  galleryContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 8,
  },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  retryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
