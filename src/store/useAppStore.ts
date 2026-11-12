import { create } from 'zustand';

export type ImageStatus = 'decoding' | 'ready' | 'processing' | 'done' | 'error';

export type RemovalResponse =
  | { kind: 'json'; contentType: string; value: unknown }
  | { kind: 'text'; contentType: string; value: string }
  | { kind: 'image'; contentType: string; url: string; size: number };

export type RemovalResult = {
  response: RemovalResponse;
  durationMs: number;
};

export type ImageItem = {
  id: string;
  name: string;
  size: number;
  mime: string;
  width: number;
  height: number;
  thumbnail: string;
  status: ImageStatus;
  error?: string;
  result: RemovalResult | null;
  addedAt: number;
};

export type ImageBatchState = {
  running: boolean;
  currentId: string | null;
  completed: number;
  total: number;
  message: string;
};

export type Toast = {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
};

type AppState = {
  rightsAcknowledged: boolean;

  images: ImageItem[];
  selectedImageId: string | null;
  imageBatch: ImageBatchState;

  toasts: Toast[];

  acknowledgeRights: (value: boolean) => void;

  addImages: (items: ImageItem[]) => void;
  updateImage: (id: string, patch: Partial<ImageItem>) => void;
  removeImage: (id: string) => void;
  selectImage: (id: string | null) => void;
  setImageBatch: (patch: Partial<ImageBatchState>) => void;

  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export const useAppStore = create<AppState>((set) => ({
  rightsAcknowledged: false,

  images: [],
  selectedImageId: null,
  imageBatch: { running: false, currentId: null, completed: 0, total: 0, message: '' },

  toasts: [],

  acknowledgeRights: (rightsAcknowledged) => set({ rightsAcknowledged }),

  addImages: (items) =>
    set((state) => ({
      images: [...items, ...state.images],
      selectedImageId: state.selectedImageId ?? items[0]?.id ?? null,
    })),
  updateImage: (id, patch) =>
    set((state) => ({
      images: state.images.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  removeImage: (id) =>
    set((state) => {
      const images = state.images.filter((item) => item.id !== id);
      return {
        images,
        selectedImageId:
          state.selectedImageId === id ? (images[0]?.id ?? null) : state.selectedImageId,
      };
    }),
  selectImage: (selectedImageId) => set({ selectedImageId }),
  setImageBatch: (patch) => set((state) => ({ imageBatch: { ...state.imageBatch, ...patch } })),

  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { ...toast, id: createId('toast') }],
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function getSelectedImage(state: Pick<AppState, 'images' | 'selectedImageId'>): ImageItem | null {
  return state.images.find((item) => item.id === state.selectedImageId) ?? null;
}
