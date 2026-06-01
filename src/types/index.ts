// ─── Category Types ───────────────────────────────────────────
export type CategoryId =
  | 'mom_bday'
  | 'dad_bday'
  | 'friend_bday'
  | 'anniversary'
  | 'thank_you'
  | 'congrats';

export type GenderFilter = 'female' | 'male' | 'any' | 'couple';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  accentColor: string;
  genderFilter: GenderFilter;
  ageFilter: 'adult' | 'any';
  description: string;
}

// ─── Photo / Gallery Types ───────────────────────────────────
export interface GalleryPhoto {
  uri: string;
  filename: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  photoUri: string;
  faces: DetectedFace[];
}

export interface DetectedFace {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  smilingProbability?: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  // ML Kit face detection attributes
  rollAngle?: number;
  yawAngle?: number;
  trackingId?: number;
}

export interface ScoredPhoto {
  photo: GalleryPhoto;
  score: number;
  faceCount: number;
  isSuggested: boolean;
  faces: DetectedFace[];
}

// ─── Template Types ──────────────────────────────────────────
export interface CardTemplate {
  id: string;
  categoryId: CategoryId;
  title: string;
  subtitle: string;
  gradientColors: [string, string, string];
  decorEmojis: string[];
  fontColor: string;
  overlayOpacity: number;
}

// ─── Card Customization ─────────────────────────────────────
export interface CardData {
  category: Category;
  template: CardTemplate;
  photoUris: string[];
  customMessage: string;
  senderName: string;
}

export const MAX_PHOTOS = 3;

// ─── Navigation Types ────────────────────────────────────────
export type RootStackParamList = {
  CategorySelect: undefined;
  PhotoSelect: { category: Category };
  Customize: { category: Category; photoUris: string[] };
  Preview: { cardData: CardData };
};

// ─── Store Types ─────────────────────────────────────────────
export interface AppState {
  selectedCategory: Category | null;
  selectedPhotos: string[];
  customMessage: string;
  senderName: string;
  scoredPhotos: ScoredPhoto[];
  isAnalyzing: boolean;
  analysisProgress: number;

  // Actions
  setCategory: (cat: Category) => void;
  setPhotos: (uris: string[]) => void;
  togglePhoto: (uri: string) => void;
  setCustomMessage: (msg: string) => void;
  setSenderName: (name: string) => void;
  setScoredPhotos: (photos: ScoredPhoto[]) => void;
  setIsAnalyzing: (val: boolean) => void;
  setAnalysisProgress: (val: number) => void;
  reset: () => void;
}
