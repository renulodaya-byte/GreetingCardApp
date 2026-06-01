/**
 * useSmartGallery Hook
 *
 * Manages the full lifecycle of smart gallery analysis:
 * 1. Request permissions
 * 2. Fetch photos
 * 3. Run ML analysis
 * 4. Return sorted results with loading state
 *
 * Provides progressive loading — photos appear as they're analyzed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Category, ScoredPhoto } from '../types';
import {
  analyzeGalleryForCategory,
  quickAnalyzeGallery,
  fetchGalleryPhotos,
} from '../utils/smartGallery';
import {
  requestGalleryPermission,
  showPermissionDeniedAlert,
} from '../utils/permissions';

interface UseSmartGalleryResult {
  suggestedPhotos: ScoredPhoto[];
  allPhotos: ScoredPhoto[];
  isLoading: boolean;
  progress: number;
  error: string | null;
  hasPermission: boolean;
  retry: () => void;
}

export function useSmartGallery(
  category: Category | null,
  quickMode: boolean = false
): UseSmartGalleryResult {
  const [suggestedPhotos, setSuggestedPhotos] = useState<ScoredPhoto[]>([]);
  const [allPhotos, setAllPhotos] = useState<ScoredPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const abortRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (!category) return;
    abortRef.current = false;

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setSuggestedPhotos([]);
    setAllPhotos([]);

    try {
      // Step 1: Check permissions
      const permGranted = await requestGalleryPermission();
      if (!permGranted) {
        setHasPermission(false);
        showPermissionDeniedAlert();
        setError('Gallery permission denied');
        setIsLoading(false);
        return;
      }
      setHasPermission(true);

      if (abortRef.current) return;

      // Step 2: Run analysis
      const analyzeFn = quickMode
        ? quickAnalyzeGallery
        : analyzeGalleryForCategory;

      const results = await analyzeFn(category, (p) => {
        if (!abortRef.current) setProgress(p);
      });

      if (abortRef.current) return;

      // Step 3: Split into suggested and all
      const suggested = results.filter((r) => r.isSuggested);
      const rest = results.filter((r) => !r.isSuggested);

      setSuggestedPhotos(suggested);
      setAllPhotos(rest);
    } catch (err: any) {
      if (!abortRef.current) {
        setError(err.message || 'Failed to analyze photos');
        console.error('[useSmartGallery] Analysis failed:', err);

        // Fallback: show all photos unsorted
        try {
          const photos = await fetchGalleryPhotos(100);
          setAllPhotos(
            photos.map((p) => ({
              photo: p,
              score: 0,
              faceCount: 0,
              isSuggested: false,
              faces: [],
            }))
          );
        } catch {
          // Complete failure
        }
      }
    } finally {
      if (!abortRef.current) {
        setIsLoading(false);
        setProgress(1);
      }
    }
  }, [category, quickMode]);

  useEffect(() => {
    runAnalysis();
    return () => {
      abortRef.current = true;
    };
  }, [runAnalysis]);

  return {
    suggestedPhotos,
    allPhotos,
    isLoading,
    progress,
    error,
    hasPermission,
    retry: runAnalysis,
  };
}
