import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Viewer Store
 * Manages PDF viewer state: page, scale, mode, selection
 */
const useViewerStore = create()(
  immer((set, get) => ({
    // State
    currentPage: 1,
    scale: 1.5,
    mode: 'select', // 'select' | 'relationship' | etc
    relationshipStartTag: null,
    isLoading: false,
    progress: { current: 0, total: 0 },
    
    // Actions
    setCurrentPage: (page) => {
      set(draft => {
        draft.currentPage = page;
      });
    },
    
    setScale: (scale) => {
      set(draft => {
        draft.scale = scale;
      });
    },
    
    setMode: (mode) => {
      set(draft => {
        draft.mode = mode;
      });
    },
    
    setRelationshipStartTag: (tag) => {
      set(draft => {
        draft.relationshipStartTag = tag;
      });
    },
    
    setIsLoading: (loading) => {
      set(draft => {
        draft.isLoading = loading;
      });
    },
    
    setProgress: (progress) => {
      set(draft => {
        draft.progress = progress;
      });
    },
    
    // Reset viewer state
    resetViewer: () => {
      set(draft => {
        draft.currentPage = 1;
        draft.scale = 1.5;
        draft.mode = 'select';
        draft.relationshipStartTag = null;
        draft.isLoading = false;
        draft.progress = { current: 0, total: 0 };
      });
    },

    // 🟢 Header Navigation Actions
    handlePageNavigation: (page, totalPages) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      set(draft => {
        draft.currentPage = validPage;
      });
    },

    goToNextPage: (totalPages) => {
      const currentPage = get().currentPage;
      if (currentPage < totalPages) {
        set(draft => {
          draft.currentPage = currentPage + 1;
        });
      }
    },

    goToPreviousPage: () => {
      const currentPage = get().currentPage;
      if (currentPage > 1) {
        set(draft => {
          draft.currentPage = currentPage - 1;
        });
      }
    },

    // 🟢 Header Zoom Actions
    handleZoom: (delta) => {
      const currentScale = get().scale;
      const newScale = Math.max(0.1, Math.min(5.0, currentScale + delta));
      set(draft => {
        draft.scale = newScale;
      });
    },

    zoomIn: () => {
      get().handleZoom(0.1);
    },

    zoomOut: () => {
      get().handleZoom(-0.1);
    },

    resetZoom: () => {
      set(draft => {
        draft.scale = 1.5;
      });
    },

    // 🟢 Mode Toggle Actions
    toggleMode: (targetMode) => {
      const currentMode = get().mode;
      const newMode = currentMode === targetMode ? 'select' : targetMode;
      set(draft => {
        draft.mode = newMode;
      });
    }
  }))
);

export default useViewerStore;