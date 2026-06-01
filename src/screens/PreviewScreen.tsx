import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Share, { Social } from 'react-native-share';
import { CardPreview } from '../components/CardPreview';
import { renderCardToImage, saveCardToGallery } from '../utils/cardRenderer';
import { requestStorageWritePermission } from '../utils/permissions';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Preview'>;
  route: RouteProp<RootStackParamList, 'Preview'>;
};

export const PreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { cardData } = route.params;
  const reset = useAppStore((s) => s.reset);

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);

  // Render card to PNG (cached — only renders once)
  const ensureRendered = useCallback(async (): Promise<string | null> => {
    if (exportedPath) return exportedPath;

    setIsExporting(true);
    try {
      const path = await renderCardToImage(cardData);
      if (path) {
        setExportedPath(path);
      } else {
        Alert.alert('Error', 'Failed to render card. Please try again.');
      }
      return path;
    } catch (err: any) {
      console.error('[PreviewScreen] Render failed:', err);
      const msg = err?.message ? String(err.message) : String(err);
      Alert.alert('Render failed', msg);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [cardData, exportedPath]);

  // ── Download to Gallery ──────────────────────────────────
  const handleDownload = useCallback(async () => {
    setIsSaving(true);
    try {
      // Check write permission (needed for Android < 10)
      const hasPermission = await requestStorageWritePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is needed to save the card to your gallery.'
        );
        return;
      }

      const path = await ensureRendered();
      if (!path) return;

      const saved = await saveCardToGallery(path);
      if (saved) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Card saved to gallery! 🎉', ToastAndroid.SHORT);
        } else {
          Alert.alert('Saved!', 'Your greeting card has been saved to gallery.');
        }
      } else {
        Alert.alert('Error', 'Failed to save card to gallery.');
      }
    } catch (err) {
      console.error('[PreviewScreen] Save failed:', err);
      Alert.alert('Error', 'Could not save the card.');
    } finally {
      setIsSaving(false);
    }
  }, [ensureRendered]);

  // ── Share via Android Share Sheet ─────────────────────────
  const handleShare = useCallback(async () => {
    setIsExporting(true);
    try {
      const path = await ensureRendered();
      if (!path) return;

      await Share.open({
        url: `file://${path}`,
        type: 'image/png',
        title: `${cardData.template.title}`,
        message: cardData.customMessage || cardData.template.subtitle,
        subject: cardData.template.title,
      });
    } catch (err: any) {
      // User cancelled share — not an error
      if (err?.message !== 'User did not share') {
        console.error('[PreviewScreen] Share failed:', err);
      }
    } finally {
      setIsExporting(false);
    }
  }, [cardData, ensureRendered]);

  // ── Share directly to WhatsApp ─────────────────────────────
  const handleShareWhatsApp = useCallback(async () => {
    setIsExporting(true);
    try {
      const path = await ensureRendered();
      if (!path) return;

      await Share.shareSingle({
        social: Social.Whatsapp,
        url: `file://${path}`,
        type: 'image/png',
        message: cardData.customMessage || cardData.template.subtitle,
        title: cardData.template.title,
        filename: 'greeting-card',
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        // WhatsApp not installed is a common case
        const msg = String(err?.message || err);
        if (msg.toLowerCase().includes('not installed') || msg.toLowerCase().includes('no app')) {
          Alert.alert('WhatsApp not installed', 'Install WhatsApp to share directly, or use the share button for other options.');
        } else {
          console.error('[PreviewScreen] WhatsApp share failed:', err);
        }
      }
    } finally {
      setIsExporting(false);
    }
  }, [cardData, ensureRendered]);

  // ── Create Another Card ──────────────────────────────────
  const handleCreateAnother = () => {
    reset();
    navigation.popToTop();
  };

  const categoryColor = cardData.category.color;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.header}
      >
        <Text style={styles.title}>Your Card is Ready!</Text>
        <Text style={styles.subtitle}>
          Download it or share directly with someone special
        </Text>
      </Animated.View>

      {/* Full-size Card Preview */}
      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={styles.previewWrapper}
      >
        <CardPreview
          template={cardData.template}
          photoUris={cardData.photoUris}
          customMessage={cardData.customMessage}
          senderName={cardData.senderName}
          compact={false}
        />
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        style={styles.actionsContainer}
      >
        {/* WhatsApp Button (primary) */}
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleShareWhatsApp}
          disabled={isExporting || isSaving}
          activeOpacity={0.85}
        >
          {isExporting && !isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.whatsappButtonIcon}>💬</Text>
              <Text style={styles.whatsappButtonText}>Share on WhatsApp</Text>
            </>
          )}
        </TouchableOpacity>

        {/* More share options */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleShare}
          disabled={isExporting}
          activeOpacity={0.8}
        >
          {isExporting && !isSaving ? (
            <ActivityIndicator color={categoryColor} size="small" />
          ) : (
            <>
              <Text style={styles.secondaryButtonIcon}>📤</Text>
              <Text style={[styles.secondaryButtonText, { color: categoryColor }]}>
                More share options
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Save to Gallery */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: categoryColor }]}
          onPress={handleDownload}
          disabled={isSaving || isExporting}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonIcon}>💾</Text>
              <Text style={styles.primaryButtonText}>Save to Gallery</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Create Another */}
        <TouchableOpacity
          style={styles.tertiaryButton}
          onPress={handleCreateAnother}
          activeOpacity={0.7}
        >
          <Text style={styles.tertiaryButtonText}>
            🎨 Create Another Card
          </Text>
        </TouchableOpacity>
      </Animated.View>
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  previewWrapper: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryButtonIcon: {
    fontSize: 18,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#25D366',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  whatsappButtonIcon: {
    fontSize: 18,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  secondaryButtonIcon: {
    fontSize: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
  },
});
