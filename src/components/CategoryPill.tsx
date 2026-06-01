import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Category } from '../types';

interface CategoryPillProps {
  category: Category;
  index: number;
  onPress: (category: Category) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  index,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.pill, animatedStyle, { borderColor: category.color + '30' }]}
      onPress={() => onPress(category)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <View style={[styles.emojiContainer, { backgroundColor: category.color + '25' }]}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.label}>{category.label}</Text>
        <Text style={styles.description}>{category.description}</Text>
      </View>

      <Text style={[styles.arrow, { color: category.color }]}>→</Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    gap: 14,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  arrow: {
    fontSize: 22,
    opacity: 0.6,
  },
});
