/**
 * Smart Gallery Engine
 *
 * Uses on-device ML (Google ML Kit) to detect faces in gallery photos
 * and score them by relevance to the selected greeting category.
 *
 * Pipeline:
 * 1. Fetch recent photos from CameraRoll
 * 2. Run face detection on each photo (batched for performance)
 * 3. Classify faces by gender/age using ML Kit attributes
 * 4. Score each photo against the category's filter
 * 5. Return sorted list with suggestions at top
 *
 * ALL PROCESSING IS ON-DEVICE — no photos leave the phone.
 */

import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import FaceDetection, {
  FaceDetectionOptions,
  Face,
} from '@react-native-ml-kit/face-detection';
import {
  Category,
  GalleryPhoto,
  ScoredPhoto,
  DetectedFace,
  GenderFilter,
} from '../types';

// ─── Configuration ───────────────────────────────────────────
const MAX_PHOTOS_TO_FETCH = 200;
const BATCH_SIZE = 10; // Process 10 photos at a time to avoid memory spikes
const SUGGESTION_THRESHOLD = 0.6; // Minimum score to be "suggested"

// ML Kit face detector options — optimize for classification accuracy
const FACE_DETECTOR_OPTIONS: FaceDetectionOptions = {
  performanceMode: 'accurate',
  classificationMode: 'all',
  contourMode: 'none',
  minFaceSize: 0.15,
};

// ─── Fetch Gallery Photos ────────────────────────────────────
export async function fetchGalleryPhotos(
  limit: number = MAX_PHOTOS_TO_FETCH
): Promise<GalleryPhoto[]> {
  try {
    const result = await CameraRoll.getPhotos({
      first: limit,
      assetType: 'Photos',
      include: ['filename', 'imageSize'],
    });

    return result.edges.map((edge) => ({
      uri: edge.node.image.uri,
      filename: edge.node.image.filename || 'unknown',
      timestamp: edge.node.timestamp,
      width: edge.node.image.width || 0,
      height: edge.node.image.height || 0,
    }));
  } catch (error) {
    console.error('[SmartGallery] Failed to fetch photos:', error);
    return [];
  }
}

// ─── Face Detection on Single Photo ─────────────────────────
async function detectFacesInPhoto(
  photoUri: string
): Promise<DetectedFace[]> {
  try {
    const result = await FaceDetection.detect(photoUri, FACE_DETECTOR_OPTIONS);

    return result.map((face) => ({
      bounds: {
        x: face.frame.left,
        y: face.frame.top,
        width: face.frame.width,
        height: face.frame.height,
      },
      smilingProbability: face.smilingProbability ?? undefined,
      leftEyeOpenProbability: face.leftEyeOpenProbability ?? undefined,
      rightEyeOpenProbability: face.rightEyeOpenProbability ?? undefined,
      rollAngle: face.rotationZ ?? undefined,
      yawAngle: face.rotationY ?? undefined,
      trackingId: face.trackingID ?? undefined,
    }));
  } catch (error) {
    // Silently fail for individual photos — don't break the whole scan
    console.warn('[SmartGallery] Face detection failed for:', photoUri);
    return [];
  }
}

// ─── Gender Estimation Heuristic ─────────────────────────────
/**
 * ML Kit's standard face detection doesn't directly output gender.
 * We use a heuristic based on face geometry ratios that ML Kit provides.
 *
 * For a production app, you'd integrate a dedicated gender classification
 * model (e.g., TFLite model running via react-native-tflite).
 *
 * This heuristic uses:
 * - Face aspect ratio (width/height)
 * - Jaw width relative to face width
 * - Face area relative to image
 *
 * Returns a probability score: 0 = likely male, 1 = likely female
 * Values near 0.5 = uncertain
 */
function estimateGenderProbability(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): number {
  // Face aspect ratio — female faces tend to be slightly narrower
  const aspectRatio = face.bounds.width / face.bounds.height;

  // Face area relative to image — portraits vs group shots
  const imageArea = imageWidth * imageHeight;
  const faceArea = face.bounds.width * face.bounds.height;
  const faceRatio = faceArea / imageArea;

  // Simple heuristic scoring
  // In production, replace with a proper TFLite classifier
  let score = 0.5; // Start neutral

  // Narrower face ratio slightly suggests female
  if (aspectRatio < 0.85) score += 0.1;
  if (aspectRatio > 0.95) score -= 0.1;

  // Smiling probability can be a weak signal (not gender-specific, but
  // photos with big smiles are often better for birthday cards)
  if (face.smilingProbability && face.smilingProbability > 0.7) {
    score += 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

// ─── Age Estimation Heuristic ────────────────────────────────
/**
 * Basic heuristic for adult vs child based on face size relative to image.
 * Adults in selfies/portraits typically have larger face-to-image ratios.
 *
 * Returns true if likely adult.
 */
function estimateIsAdult(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): boolean {
  const imageArea = imageWidth * imageHeight;
  const faceArea = face.bounds.width * face.bounds.height;
  const faceRatio = faceArea / imageArea;

  // Large face = likely adult in a portrait/selfie
  // Small face = could be child or just far away
  return faceRatio > 0.03;
}

// ─── Photo Relevance Scoring ─────────────────────────────────
/**
 * Scores a photo based on how well it matches the category filter.
 *
 * Scoring weights:
 * - Gender match:     40% (highest weight)
 * - Adult match:      15%
 * - Face count match: 15% (1 face for individual, 2 for couple)
 * - Face size:        15% (larger face = better portrait)
 * - Recency:          10% (newer photos score higher)
 * - Quality signals:   5% (smiling, eyes open)
 */
function scorePhoto(
  photo: GalleryPhoto,
  faces: DetectedFace[],
  category: Category,
  newestTimestamp: number,
  oldestTimestamp: number
): number {
  if (faces.length === 0) return 0;

  let score = 0;
  const timeRange = newestTimestamp - oldestTimestamp || 1;

  // ── Gender Match (40%) ──
  if (category.genderFilter !== 'any') {
    const genderScores = faces.map((f) =>
      estimateGenderProbability(f, photo.width, photo.height)
    );

    if (category.genderFilter === 'female') {
      // Higher femaleProbability = better match
      const bestMatch = Math.max(...genderScores);
      score += bestMatch * 0.4;
    } else if (category.genderFilter === 'male') {
      // Lower femaleProbability = more male = better match
      const bestMatch = Math.min(...genderScores);
      score += (1 - bestMatch) * 0.4;
    } else if (category.genderFilter === 'couple') {
      // Want 2 faces, ideally one of each
      if (faces.length >= 2) {
        score += 0.35;
        // Bonus if faces have different gender scores
        const sorted = [...genderScores].sort();
        const genderDiversity = sorted[sorted.length - 1] - sorted[0];
        score += genderDiversity * 0.05;
      }
    }
  } else {
    // "any" gender — all photos with faces get base score
    score += 0.3;
  }

  // ── Adult Match (15%) ──
  if (category.ageFilter === 'adult') {
    const adultFaces = faces.filter((f) =>
      estimateIsAdult(f, photo.width, photo.height)
    );
    score += (adultFaces.length > 0 ? 1 : 0.3) * 0.15;
  } else {
    score += 0.15;
  }

  // ── Face Count Match (15%) ──
  if (category.genderFilter === 'couple') {
    // Ideal: exactly 2 faces
    if (faces.length === 2) score += 0.15;
    else if (faces.length === 1 || faces.length === 3) score += 0.08;
    else score += 0.03;
  } else {
    // For individual cards, 1 face is ideal
    if (faces.length === 1) score += 0.15;
    else if (faces.length === 2) score += 0.1;
    else score += 0.05;
  }

  // ── Face Size (15%) — larger face = better portrait ──
  const largestFace = faces.reduce(
    (max, f) =>
      f.bounds.width * f.bounds.height > max.bounds.width * max.bounds.height
        ? f
        : max,
    faces[0]
  );
  const faceRatio =
    (largestFace.bounds.width * largestFace.bounds.height) /
    (photo.width * photo.height || 1);
  score += Math.min(faceRatio * 3, 1) * 0.15; // Cap at 1, scale up small ratios

  // ── Recency (10%) ──
  const recency = (photo.timestamp - oldestTimestamp) / timeRange;
  score += recency * 0.1;

  // ── Quality Signals (5%) ──
  const bestSmile = Math.max(
    ...faces.map((f) => f.smilingProbability || 0)
  );
  const eyesOpen = faces.some(
    (f) =>
      (f.leftEyeOpenProbability || 0) > 0.5 &&
      (f.rightEyeOpenProbability || 0) > 0.5
  );
  score += bestSmile * 0.03;
  score += (eyesOpen ? 1 : 0) * 0.02;

  return Math.max(0, Math.min(1, score));
}

// ─── Main Analysis Pipeline ──────────────────────────────────
/**
 * Full pipeline: fetch → detect → score → sort
 *
 * @param category - The selected greeting category
 * @param onProgress - Callback for progress updates (0-1)
 * @returns Sorted array of scored photos (best matches first)
 */
export async function analyzeGalleryForCategory(
  category: Category,
  onProgress?: (progress: number) => void
): Promise<ScoredPhoto[]> {
  // Step 1: Fetch gallery photos
  onProgress?.(0.05);
  const photos = await fetchGalleryPhotos();

  if (photos.length === 0) return [];

  onProgress?.(0.1);

  // Compute time range for recency scoring
  const timestamps = photos.map((p) => p.timestamp);
  const newestTimestamp = Math.max(...timestamps);
  const oldestTimestamp = Math.min(...timestamps);

  // Step 2 & 3: Detect faces and score photos in batches
  const scoredPhotos: ScoredPhoto[] = [];
  const totalBatches = Math.ceil(photos.length / BATCH_SIZE);

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (photo) => {
        const faces = await detectFacesInPhoto(photo.uri);
        const score = scorePhoto(
          photo,
          faces,
          category,
          newestTimestamp,
          oldestTimestamp
        );

        return {
          photo,
          score,
          faceCount: faces.length,
          isSuggested: score >= SUGGESTION_THRESHOLD,
          faces,
        };
      })
    );

    scoredPhotos.push(...batchResults);

    // Update progress (10% for fetch, 90% for analysis)
    const progress = 0.1 + (batchIndex / totalBatches) * 0.9;
    onProgress?.(Math.min(progress, 0.99));
  }

  // Step 4: Sort — suggested first (by score desc), then rest by recency
  scoredPhotos.sort((a, b) => {
    // Suggested photos first
    if (a.isSuggested && !b.isSuggested) return -1;
    if (!a.isSuggested && b.isSuggested) return 1;

    // Within same group, sort by score
    if (a.isSuggested && b.isSuggested) return b.score - a.score;

    // Non-suggested: sort by recency
    return b.photo.timestamp - a.photo.timestamp;
  });

  onProgress?.(1);
  return scoredPhotos;
}

// ─── Alternative: Quick Analysis (Fewer Photos) ──────────────
/**
 * Lighter version that only scans the most recent 50 photos.
 * Use this if the full scan is too slow on low-end devices.
 */
export async function quickAnalyzeGallery(
  category: Category,
  onProgress?: (progress: number) => void
): Promise<ScoredPhoto[]> {
  onProgress?.(0.05);
  const photos = await fetchGalleryPhotos(50);

  if (photos.length === 0) return [];

  const timestamps = photos.map((p) => p.timestamp);
  const newestTimestamp = Math.max(...timestamps);
  const oldestTimestamp = Math.min(...timestamps);

  const results = await Promise.all(
    photos.map(async (photo, idx) => {
      const faces = await detectFacesInPhoto(photo.uri);
      const score = scorePhoto(
        photo,
        faces,
        category,
        newestTimestamp,
        oldestTimestamp
      );
      onProgress?.(0.1 + (idx / photos.length) * 0.9);

      return {
        photo,
        score,
        faceCount: faces.length,
        isSuggested: score >= SUGGESTION_THRESHOLD,
        faces,
      };
    })
  );

  results.sort((a, b) => {
    if (a.isSuggested && !b.isSuggested) return -1;
    if (!a.isSuggested && b.isSuggested) return 1;
    if (a.isSuggested && b.isSuggested) return b.score - a.score;
    return b.photo.timestamp - a.photo.timestamp;
  });

  onProgress?.(1);
  return results;
}
