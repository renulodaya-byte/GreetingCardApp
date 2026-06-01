import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  LinearGradient,
  Rect,
  Circle,
  Image as SkiaImage,
  useImage,
  Group,
  vec,
} from '@shopify/react-native-skia';
import { CardTemplate } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.25;

interface CardPreviewProps {
  template: CardTemplate;
  photoUris: string[];
  customMessage: string;
  senderName: string;
  compact?: boolean;
}

type CircleSpec = { x: number; y: number; r: number };

function getCollageLayout(
  count: number,
  w: number,
  s: number
): { circles: CircleSpec[]; bottomY: number } {
  const cx = w / 2;
  const baseY = 420 * s;
  if (count <= 1) {
    const r = 200 * s;
    return {
      circles: [{ x: cx, y: baseY, r }],
      bottomY: baseY + r,
    };
  }
  if (count === 2) {
    const r = 160 * s;
    return {
      circles: [
        { x: cx - 170 * s, y: baseY, r },
        { x: cx + 170 * s, y: baseY, r },
      ],
      bottomY: baseY + r,
    };
  }
  const r = 140 * s;
  return {
    circles: [
      { x: cx - 155 * s, y: baseY - 80 * s, r },
      { x: cx + 155 * s, y: baseY - 80 * s, r },
      { x: cx, y: baseY + 80 * s, r },
    ],
    bottomY: baseY + 80 * s + r,
  };
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  template,
  photoUris,
  customMessage,
  senderName,
  compact = false,
}) => {
  const image1 = useImage(photoUris[0] || null);
  const image2 = useImage(photoUris[1] || null);
  const image3 = useImage(photoUris[2] || null);
  const images = [image1, image2, image3];

  const width = compact ? PREVIEW_WIDTH * 0.85 : PREVIEW_WIDTH;
  const height = compact ? PREVIEW_HEIGHT * 0.85 : PREVIEW_HEIGHT;
  const s = width / 1080;

  const count = photoUris.length;
  const layout = getCollageLayout(count, width, s);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: compact ? 20 : 28,
        },
      ]}
    >
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={template.gradientColors}
          />
        </Rect>

        <Circle
          cx={width * 0.3}
          cy={height * 0.2}
          r={width * 0.5}
          opacity={template.overlayOpacity}
          color="#FFFFFF"
        />

        {layout.circles.map((c, i) => {
          const img = images[i];
          if (!img) return null;
          return (
            <Group key={i}>
              <Circle
                cx={c.x}
                cy={c.y}
                r={c.r + 4 * s}
                color="rgba(255,255,255,0.5)"
                style="stroke"
                strokeWidth={4 * s}
              />
              <Group
                clip={{
                  x: c.x - c.r,
                  y: c.y - c.r,
                  width: c.r * 2,
                  height: c.r * 2,
                }}
              >
                <SkiaImage
                  image={img}
                  x={c.x - c.r}
                  y={c.y - c.r}
                  width={c.r * 2}
                  height={c.r * 2}
                  fit="cover"
                />
              </Group>
            </Group>
          );
        })}
      </Canvas>

      <View style={[styles.textOverlay, { paddingTop: layout.bottomY + 60 * s }]}>
        <Text
          style={[
            styles.title,
            { fontSize: compact ? 20 : 26, color: template.fontColor },
          ]}
        >
          {template.title}
        </Text>

        <View style={styles.divider} />

        <Text
          style={[
            styles.message,
            { fontSize: compact ? 13 : 15, color: template.fontColor },
          ]}
        >
          {customMessage || template.subtitle}
        </Text>

        {senderName ? (
          <Text
            style={[
              styles.sender,
              { fontSize: compact ? 12 : 14, color: template.fontColor },
            ]}
          >
            — {senderName}
          </Text>
        ) : null}
      </View>

      {template.decorEmojis.map((emoji, i) => {
        const emojiPositionStyles = [
          { top: '6%' as const, left: '8%' as const },
          { top: '10%' as const, right: '8%' as const },
          { bottom: '12%' as const, left: '10%' as const },
          { bottom: '8%' as const, right: '10%' as const },
        ] as const;
        return (
          <Text
            key={i}
            style={[
              styles.decorEmoji,
              // @ts-ignore — percentage-based positioning works at runtime
              emojiPositionStyles[i],
              { fontSize: compact ? 20 : 26 },
            ]}
          >
            {emoji}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  textOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'serif',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: 50,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginVertical: 12,
  },
  message: {
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 22,
    fontFamily: 'serif',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sender: {
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 16,
    fontFamily: 'serif',
  },
  decorEmoji: {
    position: 'absolute',
    opacity: 0.3,
  },
});
