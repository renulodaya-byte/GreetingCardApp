import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CategoryPill } from '../components/CategoryPill';
import { CATEGORIES } from '../utils/constants';
import { Category, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CategorySelect'>;
};

export const CategorySelectScreen: React.FC<Props> = ({ navigation }) => {
  const setCategory = useAppStore((s) => s.setCategory);
  const reset = useAppStore((s) => s.reset);

  const handleCategoryPress = (category: Category) => {
    reset(); // Clean slate
    setCategory(category);
    navigation.navigate('PhotoSelect', { category });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <Text style={styles.headerEmoji}>🎨</Text>
          <Text style={styles.headerTitle}>Create a Greeting</Text>
          <Text style={styles.headerSubtitle}>
            Pick an occasion to get started
          </Text>
        </Animated.View>

        {/* Category Pills */}
        <View style={styles.pillsContainer}>
          {CATEGORIES.map((cat, index) => (
            <CategoryPill
              key={cat.id}
              category={cat}
              index={index}
              onPress={handleCategoryPress}
            />
          ))}
        </View>

        {/* Footer */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            🔒 All photos are processed on your device
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  headerEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
  },
  pillsContainer: {
    gap: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});
