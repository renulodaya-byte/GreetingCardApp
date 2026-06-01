/**
 * Card Renderer
 *
 * Uses @shopify/react-native-skia to composite the greeting card:
 * - Gradient background
 * - Circular-cropped photo
 * - Title and message text
 * - Decorative elements
 *
 * Exports to PNG for sharing/downloading.
 */

import {
  Skia,
  TileMode,
  PaintStyle,
  ClipOp,
} from '@shopify/react-native-skia';
import type { SkCanvas, SkTypeface } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { CardData, CardTemplate } from '../types';

function getDefaultTypeface(): SkTypeface | null {
  try {
    return Skia.FontMgr.System().matchFamilyStyle('', {});
  } catch {
    return null;
  }
}

function makeFont(size: number, typeface: SkTypeface | null) {
  return typeface ? Skia.Font(typeface, size) : Skia.Font();
}

// ─── Card Dimensions (Portrait, Instagram-friendly) ──────────
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
const PHOTO_RADIUS = 200;
const PHOTO_CENTER_Y = 420;

// ─── Render Card to Skia Surface ─────────────────────────────
export async function renderCardToImage(
  cardData: CardData
): Promise<string | null> {
  try {
    const surface =
      Skia.Surface.MakeOffscreen(CARD_WIDTH, CARD_HEIGHT) ||
      Skia.Surface.Make(CARD_WIDTH, CARD_HEIGHT);
    if (!surface) {
      throw new Error('Skia surface could not be created');
    }

    const canvas = surface.getCanvas();

    // 1. Draw gradient background
    drawGradientBackground(canvas, cardData.template);

    // 2. Draw decorative overlay pattern
    drawOverlayPattern(canvas, cardData.template);

    // 3. Draw photo collage (1-3 circular photos)
    if (cardData.photoUris.length > 0) {
      await drawPhotoCollage(canvas, cardData.photoUris);
    }

    const collageBottomY = getCollageBottomY(cardData.photoUris.length);
    const typeface = getDefaultTypeface();

    // 4. Draw title text
    drawTitle(canvas, cardData.template.title, collageBottomY, typeface);

    // 5. Draw divider line
    drawDivider(canvas, collageBottomY);

    // 6. Draw custom message or default subtitle
    const message = cardData.customMessage || cardData.template.subtitle;
    drawMessage(canvas, message, collageBottomY, typeface);

    // 7. Draw sender name (if provided)
    if (cardData.senderName) {
      drawSenderName(canvas, cardData.senderName, typeface);
    }

    // 8. Draw decorative emojis
    drawDecorativeEmojis(canvas, cardData.template.decorEmojis, typeface);

    // Export to PNG
    const image = surface.makeImageSnapshot();
    if (!image) {
      throw new Error('makeImageSnapshot returned null');
    }
    const data = image.encodeToBase64();
    if (!data) {
      throw new Error('encodeToBase64 returned empty data');
    }

    // Save to cache directory
    const filePath = `${RNFS.CachesDirectoryPath}/greeting_card_${Date.now()}.png`;
    await RNFS.writeFile(filePath, data, 'base64');

    surface.dispose();
    return filePath;
  } catch (error) {
    console.error('[CardRenderer] Failed to render card:', error);
    throw error;
  }
}

// ─── Drawing Helpers ─────────────────────────────────────────

function drawGradientBackground(canvas: SkCanvas, template: CardTemplate) {
  const paint = Skia.Paint();
  const colors = template.gradientColors.map((c) => Skia.Color(c));

  const shader = Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: CARD_WIDTH, y: CARD_HEIGHT },
    colors,
    [0, 0.5, 1],
    TileMode.Clamp
  );

  paint.setShader(shader);
  canvas.drawRect(
    { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    paint
  );
}

function drawOverlayPattern(canvas: SkCanvas, template: CardTemplate) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(template.overlayOpacity);

  // Subtle radial gradient overlay for depth
  const shader = Skia.Shader.MakeRadialGradient(
    { x: CARD_WIDTH * 0.3, y: CARD_HEIGHT * 0.2 },
    CARD_WIDTH * 0.6,
    [Skia.Color('#FFFFFF'), Skia.Color('#00000000')],
    [0, 1],
    TileMode.Clamp
  );
  paint.setShader(shader);
  canvas.drawRect(
    { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    paint
  );
}

type CircleSpec = { x: number; y: number; r: number };

function getRenderCollageLayout(count: number): CircleSpec[] {
  const cx = CARD_WIDTH / 2;
  const baseY = PHOTO_CENTER_Y;
  if (count <= 1) {
    return [{ x: cx, y: baseY, r: PHOTO_RADIUS }];
  }
  if (count === 2) {
    const r = 160;
    return [
      { x: cx - 170, y: baseY, r },
      { x: cx + 170, y: baseY, r },
    ];
  }
  const r = 140;
  return [
    { x: cx - 155, y: baseY - 80, r },
    { x: cx + 155, y: baseY - 80, r },
    { x: cx, y: baseY + 80, r },
  ];
}

export function getCollageBottomY(count: number): number {
  if (count <= 1) return PHOTO_CENTER_Y + PHOTO_RADIUS;
  if (count === 2) return PHOTO_CENTER_Y + 160;
  return PHOTO_CENTER_Y + 80 + 140;
}

async function drawPhotoCollage(canvas: SkCanvas, photoUris: string[]) {
  const layout = getRenderCollageLayout(photoUris.length);
  for (let i = 0; i < layout.length; i++) {
    await drawOneCircle(canvas, photoUris[i], layout[i]);
  }
}

async function drawOneCircle(
  canvas: SkCanvas,
  photoUri: string,
  spec: CircleSpec
) {
  try {
    const imageData = await Skia.Data.fromURI(photoUri);
    const image = Skia.Image.MakeImageFromEncoded(imageData);
    if (!image) return;

    canvas.save();
    const clipPath = Skia.Path.Make();
    clipPath.addCircle(spec.x, spec.y, spec.r);
    canvas.clipPath(clipPath, ClipOp.Intersect, true);

    const imgW = image.width();
    const imgH = image.height();
    const cropSize = Math.min(imgW, imgH);
    const srcX = (imgW - cropSize) / 2;
    const srcY = (imgH - cropSize) / 2;

    const srcRect = { x: srcX, y: srcY, width: cropSize, height: cropSize };
    const destRect = {
      x: spec.x - spec.r,
      y: spec.y - spec.r,
      width: spec.r * 2,
      height: spec.r * 2,
    };

    const imgPaint = Skia.Paint();
    canvas.drawImageRect(image, srcRect, destRect, imgPaint);

    canvas.restore();

    const ringPaint = Skia.Paint();
    ringPaint.setStyle(PaintStyle.Stroke);
    ringPaint.setStrokeWidth(6);
    ringPaint.setColor(Skia.Color('#FFFFFF'));
    ringPaint.setAlphaf(0.6);
    canvas.drawCircle(spec.x, spec.y, spec.r + 4, ringPaint);

    const glowPaint = Skia.Paint();
    glowPaint.setStyle(PaintStyle.Stroke);
    glowPaint.setStrokeWidth(2);
    glowPaint.setColor(Skia.Color('#FFFFFF'));
    glowPaint.setAlphaf(0.25);
    canvas.drawCircle(spec.x, spec.y, spec.r + 14, glowPaint);
  } catch (error) {
    console.warn('[CardRenderer] Failed to draw photo:', error);
  }
}

function drawTitle(
  canvas: SkCanvas,
  title: string,
  collageBottomY: number,
  typeface: SkTypeface | null
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));

  const font = makeFont(64, typeface);

  const titleWidth = font.measureText(title).width;
  const x = (CARD_WIDTH - titleWidth) / 2;
  const y = collageBottomY + 100;

  canvas.drawText(title, x, y, paint, font);
}

function drawDivider(canvas: SkCanvas, collageBottomY: number) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(0.3);
  paint.setStrokeWidth(2);

  const y = collageBottomY + 130;
  canvas.drawLine(
    CARD_WIDTH / 2 - 40,
    y,
    CARD_WIDTH / 2 + 40,
    y,
    paint
  );
}

function drawMessage(
  canvas: SkCanvas,
  message: string,
  collageBottomY: number,
  typeface: SkTypeface | null
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(0.85);

  const font = makeFont(32, typeface);
  const y = collageBottomY + 180;
  const maxWidth = CARD_WIDTH - 140;

  // Simple word-wrap implementation
  const words = message.split(' ');
  let line = '';
  let lineY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const testWidth = font.measureText(testLine).width;

    if (testWidth > maxWidth && line !== '') {
      const lineWidth = font.measureText(line.trim()).width;
      canvas.drawText(
        line.trim(),
        (CARD_WIDTH - lineWidth) / 2,
        lineY,
        paint,
        font
      );
      line = word + ' ';
      lineY += 44;
    } else {
      line = testLine;
    }
  }

  // Draw remaining text
  if (line.trim()) {
    const lineWidth = font.measureText(line.trim()).width;
    canvas.drawText(
      line.trim(),
      (CARD_WIDTH - lineWidth) / 2,
      lineY,
      paint,
      font
    );
  }
}

function drawSenderName(
  canvas: SkCanvas,
  name: string,
  typeface: SkTypeface | null
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(0.6);

  const font = makeFont(30, typeface);
  const text = `— ${name}`;
  const textWidth = font.measureText(text).width;
  const x = (CARD_WIDTH - textWidth) / 2;
  const y = CARD_HEIGHT - 160;

  canvas.drawText(text, x, y, paint, font);
}

function drawDecorativeEmojis(
  canvas: SkCanvas,
  emojis: string[],
  typeface: SkTypeface | null
) {
  // Emojis are drawn as text at fixed decorative positions
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(0.3);

  const font = makeFont(48, typeface);

  const positions = [
    { x: 80, y: 120 },
    { x: CARD_WIDTH - 120, y: 180 },
    { x: 100, y: CARD_HEIGHT - 200 },
    { x: CARD_WIDTH - 100, y: CARD_HEIGHT - 140 },
  ];

  emojis.forEach((emoji, i) => {
    if (i < positions.length) {
      canvas.drawText(emoji, positions[i].x, positions[i].y, paint, font);
    }
  });
}

// ─── Export to Gallery ───────────────────────────────────────
export async function saveCardToGallery(filePath: string): Promise<boolean> {
  try {
    // On Android, copy to Pictures directory
    const destPath = `${RNFS.PicturesDirectoryPath}/GreetingCard_${Date.now()}.png`;
    await RNFS.copyFile(filePath, destPath);

    // Trigger media scanner to make it visible in gallery
    await RNFS.scanFile(destPath);
    return true;
  } catch (error) {
    console.error('[CardRenderer] Failed to save to gallery:', error);
    return false;
  }
}
