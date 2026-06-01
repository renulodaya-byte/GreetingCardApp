import { create } from 'zustand';
import { AppState, MAX_PHOTOS } from '../types';

export const useAppStore = create<AppState>((set) => ({
  selectedCategory: null,
  selectedPhotos: [],
  customMessage: '',
  senderName: '',
  scoredPhotos: [],
  isAnalyzing: false,
  analysisProgress: 0,

  setCategory: (cat) => set({ selectedCategory: cat }),
  setPhotos: (uris) => set({ selectedPhotos: uris.slice(0, MAX_PHOTOS) }),
  togglePhoto: (uri) =>
    set((state) => {
      const existing = state.selectedPhotos.indexOf(uri);
      if (existing >= 0) {
        return {
          selectedPhotos: state.selectedPhotos.filter((u) => u !== uri),
        };
      }
      if (state.selectedPhotos.length >= MAX_PHOTOS) {
        return state;
      }
      return { selectedPhotos: [...state.selectedPhotos, uri] };
    }),
  setCustomMessage: (msg) => set({ customMessage: msg }),
  setSenderName: (name) => set({ senderName: name }),
  setScoredPhotos: (photos) => set({ scoredPhotos: photos }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisProgress: (val) => set({ analysisProgress: val }),

  reset: () =>
    set({
      selectedCategory: null,
      selectedPhotos: [],
      customMessage: '',
      senderName: '',
      scoredPhotos: [],
      isAnalyzing: false,
      analysisProgress: 0,
    }),
}));
