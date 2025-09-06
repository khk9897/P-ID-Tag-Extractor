import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Viewer Store
 * Manages PDF viewer state: page, scale, mode, selection, viewport, rotation
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
    
    // === 뷰포트 관리 (PdfViewerStore에서 통합) ===
    viewport: null,
    rotation: 0,
    
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
    
    // === Actions: 뷰포트 관리 (PdfViewerStore에서 통합) ===
    setViewport: (viewport) => {
      set(draft => {
        draft.viewport = viewport;
      });
    },
    
    setRotation: (rotation) => {
      set(draft => {
        draft.rotation = rotation;
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
        draft.viewport = null;
        draft.rotation = 0;
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
    },

    // === 유틸리티: 좌표 변환 (PdfViewerStore에서 이전) ===
    transformCoordinates: (x1, y1, x2, y2, scale = 1, coordinatesCache = null, viewport = null) => {
      const state = get();
      const currentViewport = viewport || state.viewport;
      
      if (!currentViewport) return { rectX: 0, rectY: 0, rectWidth: 0, rectHeight: 0 };
      
      // Use provided cache or create a local cache
      const cache = coordinatesCache || new Map();
      
      // Create cache key with integer rounding to maximize hit rate
      const roundedX1 = Math.round(x1);
      const roundedY1 = Math.round(y1);
      const roundedX2 = Math.round(x2);
      const roundedY2 = Math.round(y2);
      const cacheKey = `${roundedX1},${roundedY1},${roundedX2},${roundedY2}`;
      
      // Check cache first
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        return {
          rectX: cached.baseX * scale,
          rectY: cached.baseY * scale,
          rectWidth: cached.baseWidth * scale,
          rectHeight: cached.baseHeight * scale
        };
      }
      
      let baseX, baseY, baseWidth, baseHeight;
      
      // All rotations - coordinates already processed in taggingService
      baseX = x1;
      baseY = y1;
      baseWidth = x2 - x1;
      baseHeight = y2 - y1;
      
      // Cache the base result
      const baseResult = { baseX, baseY, baseWidth, baseHeight };
      cache.set(cacheKey, baseResult);
      
      return {
        rectX: baseX * scale,
        rectY: baseY * scale,
        rectWidth: baseWidth * scale,
        rectHeight: baseHeight * scale
      };
    },

    // === 유틸리티: 태그 센터 계산 ===
    getTagCenter: (tag, scale, viewport) => {
      const state = get();
      const currentViewport = viewport || state.viewport;
      
      if (!currentViewport || !tag || !tag.bbox) return { x: 0, y: 0 };
      
      const { rectX, rectY, rectWidth, rectHeight } = state.transformCoordinates(
        tag.bbox.x1, tag.bbox.y1, tag.bbox.x2, tag.bbox.y2, scale, null, currentViewport
      );
      
      return {
        x: rectX + rectWidth / 2,
        y: rectY + rectHeight / 2
      };
    }
  }))
);

export default useViewerStore;