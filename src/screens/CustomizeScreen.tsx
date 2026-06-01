import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CardPreview } from '../components/CardPreview';
import { CARD_TEMPLATES } from '../utils/constants';
import { RootStackParamList, CardData } from '../types';
import { useAppStore } from '../store/useAppStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Customize'>;
  route: RouteProp<RootStackParamList, 'Customize'>;
};

export const CustomizeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category, photoUris } = route.params;
  const templates = CARD_TEMPLATES[category.id];

  const { customMessage, senderName, setCustomMessage, setSenderName } =
    useAppStore();

  const [messageFocused, setMessageFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);

  const template = templates[selectedTemplateIdx];

  const handlePreview = () => {
    const cardData: CardData = {
      category,
      template,
      photoUris,
      customMessage,
      senderName,
    };
    navigation.navigate('Preview', { cardData });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.header}
        >
          <Text style={styles.title}>Personalize Your Card</Text>
          <Text style={styles.subtitle}>Add a personal touch</Text>
        </Animated.View>

        {/* Live Card Preview (compact) */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.previewContainer}
        >
          <CardPreview
            template={template}
            photoUris={photoUris}
            customMessage={customMessage}
            senderName={senderName}
            compact={true}
          />
        </Animated.View>

        {/* Template selector */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.templateSelectorContainer}
        >
          <Text style={styles.inputLabel}>Choose a style</Text>
          <View style={styles.templateRow}>
            {templates.map((t, i) => {
              const isSelected = i === selectedTemplateIdx;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateSwatch,
                    isSelected && {
                      borderColor: category.color,
                      borderWidth: 2.5,
                    },
                  ]}
                  onPress={() => setSelectedTemplateIdx(i)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.templateGradient,
                      { backgroundColor: t.gradientColors[1] },
                    ]}
                  >
                    <View
                      style={[
                        styles.templateGradientTop,
                        { backgroundColor: t.gradientColors[0] },
                      ]}
                    />
                    <View
                      style={[
                        styles.templateGradientBottom,
                        { backgroundColor: t.gradientColors[2] },
                      ]}
                    />
                    <Text style={styles.templateEmoji}>{t.decorEmojis[0]}</Text>
                  </View>
                  <Text
                    style={[
                      styles.templateLabel,
                      isSelected && { color: category.color },
                    ]}
                  >
                    Style {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Input Fields */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.inputsContainer}
        >
          {/* Message input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your message</Text>
            <TextInput
              style={[
                styles.textArea,
                messageFocused && {
                  borderColor: category.color + '60',
                },
              ]}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder={template.subtitle}
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => setMessageFocused(true)}
              onBlur={() => setMessageFocused(false)}
            />
            <Text style={styles.charCount}>
              {customMessage.length}/150
            </Text>
          </View>

          {/* Name input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your name</Text>
            <TextInput
              style={[
                styles.textInput,
                nameFocused && {
                  borderColor: category.color + '60',
                },
              ]}
              value={senderName}
              onChangeText={setSenderName}
              placeholder="e.g. With love, Sarah"
              placeholderTextColor="rgba(255,255,255,0.2)"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>
        </Animated.View>

        {/* Quick message suggestions */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.suggestionsContainer}
        >
          <Text style={styles.suggestionsLabel}>Quick messages</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {getQuickMessages(category.id).map((msg, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.suggestionChip,
                  { borderColor: category.color + '30' },
                ]}
                onPress={() => setCustomMessage(msg)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, { color: category.color }]}>
                  {msg}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: category.color }]}
          onPress={handlePreview}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Preview Card ✨</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Quick message suggestions per category
function getQuickMessages(categoryId: string): string[] {
  const messages: Record<string, string[]> = {
    mom_bday: [
      'You make everything beautiful!',
      'Thank you for always being there',
      'Wishing you all the love today!',
    ],
    dad_bday: [
      'My hero, my inspiration!',
      "You're the best dad ever!",
      'Thanks for everything you do',
    ],
    friend_bday: [
      "Here's to more adventures!",
      'Life is better with you in it!',
      'Cheers to another amazing year!',
    ],
    anniversary: [
      'To many more years of love!',
      'Your love story inspires me',
      'Celebrating your beautiful bond',
    ],
    thank_you: [
      'I appreciate you so much!',
      'You made my day brighter',
      'Grateful beyond words',
    ],
    congrats: [
      'You earned this!',
      'So proud of you!',
      'The sky is the limit!',
    ],
  };

  return messages[categoryId] || ['Sending love your way!'];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  inputsContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  textArea: {
    padding: 14,
    paddingTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  textInput: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 15,
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'right',
  },
  templateSelectorContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  templateRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  templateSwatch: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  templateGradient: {
    width: '100%',
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  templateGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    opacity: 0.85,
  },
  templateGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    opacity: 0.9,
  },
  templateEmoji: {
    fontSize: 20,
    zIndex: 1,
  },
  templateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  suggestionsContainer: {
    marginTop: 24,
  },
  suggestionsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
  },
  suggestionsScroll: {
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#0D0D12',
  },
  ctaButton: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
