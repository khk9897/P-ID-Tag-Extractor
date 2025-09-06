// PdfViewerStore - PDF 뷰어 고급 상태 관리 및 편집 로직
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';

const usePdfViewerStore = create(
  immer((set, get) => ({
    // === 편집 상태 ===
    editingTagId: null,
    editingRawTextId: null,
    editingText: '',
    
    // === 뷰포트 관리 ===
    viewport: null,
    rotation: 0,
    
    // === 드래그 및 선택 상태 ===
    isDragging: false,
    selectionRect: null,
    isPanning: false,
    panStart: { scrollX: 0, scrollY: 0, clientX: 0, clientY: 0 },
    
    // === 하이라이트 상태 ===
    highlightedTagIds: new Set(),
    relatedTagIds: new Set(),
    highlightedRawTextItemIds: new Set(),
    
    // === 스크롤 제어 ===
    isUserScrolling: false,
    
    // === OPC 네비게이션 ===
    pendingOpcTarget: null,
    opcNavigationButton: null,
    
    // === 캐시 시스템 ===
    coordinatesCache: new Map(),
    canvasCache: new Map(),
    renderQueue: Promise.resolve(),
    
    // === Actions: 편집 관련 ===
    setEditingTagId: (tagId) => set((state) => {
      state.editingTagId = tagId;
      state.editingRawTextId = null;
    }),
    
    setEditingRawTextId: (rawTextId) => set((state) => {
      state.editingRawTextId = rawTextId;
      state.editingTagId = null;
    }),
    
    setEditingText: (text) => set((state) => {
      state.editingText = text;
    }),
    
    clearEditing: () => set((state) => {
      state.editingTagId = null;
      state.editingRawTextId = null;
      state.editingText = '';
    }),
    
    // === Actions: 뷰포트 관리 ===
    setViewport: (viewport) => set((state) => {
      state.viewport = viewport;
    }),
    
    setRotation: (rotation) => set((state) => {
      state.rotation = rotation;
    }),
    
    // === Actions: 드래그 및 선택 ===
    setIsDragging: (isDragging) => set((state) => {
      state.isDragging = isDragging;
    }),
    
    setSelectionRect: (rect) => set((state) => {
      state.selectionRect = rect;
    }),
    
    setIsPanning: (isPanning) => set((state) => {
      state.isPanning = isPanning;
    }),
    
    setPanStart: (panStart) => set((state) => {
      state.panStart = panStart;
    }),
    
    // === Actions: 하이라이트 관리 ===
    setHighlightedTagIds: (tagIds) => set((state) => {
      state.highlightedTagIds = new Set(tagIds);
    }),
    
    addHighlightedTagId: (tagId) => set((state) => {
      state.highlightedTagIds.add(tagId);
    }),
    
    removeHighlightedTagId: (tagId) => set((state) => {
      state.highlightedTagIds.delete(tagId);
    }),
    
    clearHighlightedTagIds: () => set((state) => {
      state.highlightedTagIds.clear();
    }),
    
    setRelatedTagIds: (tagIds) => set((state) => {
      state.relatedTagIds = new Set(tagIds);
    }),
    
    setHighlightedRawTextItemIds: (rawTextIds) => set((state) => {
      state.highlightedRawTextItemIds = new Set(rawTextIds);
    }),
    
    // === Actions: 스크롤 제어 ===
    setIsUserScrolling: (isScrolling) => set((state) => {
      state.isUserScrolling = isScrolling;
    }),
    
    // === Actions: OPC 네비게이션 ===
    setPendingOpcTarget: (target) => set((state) => {
      state.pendingOpcTarget = target;
    }),
    
    setOpcNavigationButton: (button) => set((state) => {
      state.opcNavigationButton = button;
    }),
    
    clearOpcNavigation: () => set((state) => {
      state.pendingOpcTarget = null;
      state.opcNavigationButton = null;
    }),
    
    // === 고급 기능: 좌표 변환 캐싱 ===
    getCoordinatesCacheKey: (viewport, rotation) => {
      return `${viewport?.width || 0}_${viewport?.height || 0}_${rotation}`;
    },
    
    getCachedCoordinates: (x1, y1, x2, y2, scale) => {
      const state = get();
      const cacheKey = state.getCoordinatesCacheKey(state.viewport, state.rotation);
      
      if (!state.coordinatesCache.has(cacheKey)) {
        state.coordinatesCache.set(cacheKey, new Map());
      }
      
      const cache = state.coordinatesCache.get(cacheKey);
      const coordKey = `${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)}`;
      
      if (cache.has(coordKey)) {
        const cached = cache.get(coordKey);
        return {
          rectX: cached.baseX * scale,
          rectY: cached.baseY * scale,
          rectWidth: cached.baseWidth * scale,
          rectHeight: cached.baseHeight * scale
        };
      }
      
      // Calculate base coordinates
      const baseX = x1;
      const baseY = y1;
      const baseWidth = x2 - x1;
      const baseHeight = y2 - y1;
      
      const baseResult = { baseX, baseY, baseWidth, baseHeight };
      cache.set(coordKey, baseResult);
      
      return {
        rectX: baseX * scale,
        rectY: baseY * scale,
        rectWidth: baseWidth * scale,
        rectHeight: baseHeight * scale
      };
    },
    
    clearCoordinatesCache: () => set((state) => {
      state.coordinatesCache.clear();
    }),
    
    // === 고급 기능: 캔버스 캐싱 ===
    getCachedCanvas: (pageNumber, scale) => {
      const state = get();
      const cacheKey = `${pageNumber}_${scale}`;
      return state.canvasCache.get(cacheKey);
    },
    
    setCachedCanvas: (pageNumber, scale, imageData) => set((state) => {
      const cacheKey = `${pageNumber}_${scale}`;
      
      // Manage cache size - remove oldest entries if cache is full
      const maxCacheSize = 5;
      if (state.canvasCache.size >= maxCacheSize) {
        const firstKey = state.canvasCache.keys().next().value;
        if (firstKey) state.canvasCache.delete(firstKey);
      }
      
      state.canvasCache.set(cacheKey, {
        data: imageData.data,
        viewport: imageData.viewport,
        width: imageData.width,
        height: imageData.height
      });
    }),
    
    clearCanvasCache: () => set((state) => {
      state.canvasCache.clear();
    }),
    
    // === 유틸리티: 태그 센터 계산 ===
    getTagCenter: (tag, scale) => {
      const state = get();
      if (!state.viewport || !tag || !tag.bbox) return { x: 0, y: 0 };
      
      const { rectX, rectY, rectWidth, rectHeight } = state.getCachedCoordinates(
        tag.bbox.x1, tag.bbox.y1, tag.bbox.x2, tag.bbox.y2, scale
      );
      
      return {
        x: rectX + rectWidth / 2,
        y: rectY + rectHeight / 2
      };
    },
    
    // === 유틸리티: 어노테이션 센터 계산 ===
    getAnnotationTargetCenter: (rawTextItemId, rawTextMap, scale) => {
      const state = get();
      if (!state.viewport) return { x: 0, y: 0 };
      
      const item = rawTextMap.get(rawTextItemId);
      if (!item) return { x: 0, y: 0 };
      
      const pdfCenterX = (item.bbox.x1 + item.bbox.x2) / 2;
      const pdfCenterY = (item.bbox.y1 + item.bbox.y2) / 2;
      
      // Apply rotation and scaling
      let screenX, screenY;
      switch (state.rotation) {
        case 90:
          screenX = pdfCenterY * scale;
          screenY = (state.viewport.width - pdfCenterX) * scale;
          break;
        case 180:
          screenX = (state.viewport.width - pdfCenterX) * scale;
          screenY = (state.viewport.height - pdfCenterY) * scale;
          break;
        case 270:
          screenX = (state.viewport.height - pdfCenterY) * scale;
          screenY = pdfCenterX * scale;
          break;
        default:
          screenX = pdfCenterX * scale;
          screenY = pdfCenterY * scale;
          break;
      }
      
      return { x: screenX, y: screenY };
    },
    
    // === 유틸리티: 편집 상태 체크 ===
    isEditingTag: (tagId) => {
      const state = get();
      return state.editingTagId === tagId;
    },
    
    isEditingRawText: (rawTextId) => {
      const state = get();
      return state.editingRawTextId === rawTextId;
    },
    
    hasActiveEdit: () => {
      const state = get();
      return !!(state.editingTagId || state.editingRawTextId);
    },
    
    // === 유틸리티: 하이라이트 체크 ===
    isTagHighlighted: (tagId) => {
      const state = get();
      return state.highlightedTagIds.has(tagId);
    },
    
    isRawTextHighlighted: (rawTextId) => {
      const state = get();
      return state.highlightedRawTextItemIds.has(rawTextId);
    },
    
    isTagRelated: (tagId) => {
      const state = get();
      return state.relatedTagIds.has(tagId);
    },
    
    // === 초기화 ===
    resetAll: () => set((state) => {
      state.editingTagId = null;
      state.editingRawTextId = null;
      state.editingText = '';
      state.viewport = null;
      state.rotation = 0;
      state.isDragging = false;
      state.selectionRect = null;
      state.isPanning = false;
      state.panStart = { scrollX: 0, scrollY: 0, clientX: 0, clientY: 0 };
      state.highlightedTagIds = new Set();
      state.relatedTagIds = new Set();
      state.highlightedRawTextItemIds = new Set();
      state.isUserScrolling = false;
      state.pendingOpcTarget = null;
      state.opcNavigationButton = null;
      state.coordinatesCache.clear();
      state.canvasCache.clear();
      state.renderQueue = Promise.resolve();
    })
  }))
);

export default usePdfViewerStore;