// PdfViewerStore - PDF 뷰어 고급 상태 관리 및 편집 로직
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produce, enableMapSet } from 'immer';

// Enable MapSet support for Immer (needed for Set objects)
enableMapSet();

const usePdfViewerStore = create(
  immer((set, get) => ({
    
    
    
    // === 하이라이트 상태 ===
    highlightedTagIds: new Set(),
    relatedTagIds: new Set(),
    highlightedRawTextItemIds: new Set(),
    
    
    // === 캐시 시스템 ===
    coordinatesCache: new Map(),
    canvasCache: new Map(),
    renderQueue: Promise.resolve(),
    
    
    
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
    
    // === 고급 기능: 렌더 큐 관리 ===
    renderPage: async (pdfDoc, pageNumber, scale, isBackground = false, canvasRef, renderIdRef, renderTaskRef, lastRenderedRef, renderQueueRef, viewerStore) => {
      if (!pdfDoc) return;
      
      const state = get();
      const currentRenderKey = `${pageNumber}_${scale}`;
      
      // Check cache first
      const cachedImageData = state.getCachedCanvas(pageNumber, scale);
      if (cachedImageData) {
        if (!isBackground) {
          const canvas = canvasRef.current;
          if (canvas) {
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context && cachedImageData) {
              // Set canvas size BEFORE restoring image data
              canvas.width = cachedImageData.width;
              canvas.height = cachedImageData.height;
              context.putImageData(cachedImageData.data, 0, 0);
              
              // Update viewport and rotation via viewerStore
              if (viewerStore) {
                viewerStore.setViewport(cachedImageData.viewport);
                viewerStore.setRotation(cachedImageData.viewport.rotation);
              }
              
              // Update lastRenderedRef for SVG overlay synchronization
              lastRenderedRef.current = currentRenderKey;
              return;
            }
          }
        }
      }
      
      // Skip render if we're already showing this page at this scale (non-background)
      if (!isBackground && lastRenderedRef.current === currentRenderKey) {
        return;
      }
      
      // Generate unique render ID for this operation
      const currentRenderId = ++renderIdRef.current;
      
      // Queue this render operation to prevent concurrent renders
      renderQueueRef.current = renderQueueRef.current.then(async () => {
        // Check if this render is still current
        if (renderIdRef.current !== currentRenderId) {
          return; // Skip this render as a newer one has been queued
        }

        // Cancel any existing render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancel errors
          }
          renderTaskRef.current = null;
          
          // Small delay to ensure cancellation completes
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        try {
          const page = await pdfDoc.getPage(pageNumber);
          
          // Check again if this render is still current
          if (renderIdRef.current !== currentRenderId) {
            return;
          }
          
          const vp = page.getViewport({ scale });
          const canvas = canvasRef.current;
          
          if (!canvas) return;
          
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return;

          // Clear and resize canvas
          context.clearRect(0, 0, canvas.width, canvas.height);
          canvas.height = vp.height;
          canvas.width = vp.width;
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Final check before starting render
          if (renderIdRef.current !== currentRenderId) {
            return;
          }

          // Use optimized render settings for better performance
          const renderContext = {
            canvasContext: context,
            viewport: vp,
            intent: 'display',
            renderInteractiveForms: false,
            includeAnnotationStorage: false,
          };
          
          renderTaskRef.current = page.render(renderContext);
          await renderTaskRef.current.promise;
          
          // Cache the rendered page (only for foreground renders)
          if (!isBackground && renderIdRef.current === currentRenderId) {
            try {
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              
              // Use store method to cache
              set((state) => {
                state.setCachedCanvas(pageNumber, scale, {
                  data: imageData,
                  viewport: vp,
                  width: canvas.width,
                  height: canvas.height
                });
              });
              
            } catch (cacheError) {
              // Cache storage failed, continue without caching
            }
          }
          
          // Only update state if this render is still current and not background
          if (!isBackground && renderIdRef.current === currentRenderId) {
            if (viewerStore) {
              viewerStore.setViewport(vp);
              viewerStore.setRotation(vp.rotation);
            }
          }
          
        } catch (error) {
          if (error.name !== 'RenderingCancelledException') {
            // Log error if needed
          }
        } finally {
          if (renderTaskRef.current) {
            renderTaskRef.current = null;
          }
          // Update last rendered key to avoid re-rendering same page (only for foreground)
          if (!isBackground) {
            lastRenderedRef.current = currentRenderKey;
          }
        }
      });
    },
    
    // === 유틸리티: 어노테이션 센터 계산 ===
    getAnnotationTargetCenter: (rawTextItemId, rawTextMap, scale, viewport, rotation) => {
      const state = get();
      if (!viewport) return { x: 0, y: 0 };
      
      const item = rawTextMap.get(rawTextItemId);
      if (!item) return { x: 0, y: 0 };
      
      const pdfCenterX = (item.bbox.x1 + item.bbox.x2) / 2;
      const pdfCenterY = (item.bbox.y1 + item.bbox.y2) / 2;
      
      // Apply rotation and scaling
      let screenX, screenY;
      switch (rotation) {
        case 90:
          screenX = pdfCenterY * scale;
          screenY = (viewport.width - pdfCenterX) * scale;
          break;
        case 180:
          screenX = (viewport.width - pdfCenterX) * scale;
          screenY = (viewport.height - pdfCenterY) * scale;
          break;
        case 270:
          screenX = (viewport.height - pdfCenterY) * scale;
          screenY = pdfCenterX * scale;
          break;
        default:
          screenX = pdfCenterX * scale;
          screenY = pdfCenterY * scale;
          break;
      }
      
      return { x: screenX, y: screenY };
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
      state.highlightedTagIds = new Set();
      state.relatedTagIds = new Set();
      state.highlightedRawTextItemIds = new Set();
      state.coordinatesCache.clear();
      state.canvasCache.clear();
      state.renderQueue = Promise.resolve();
    })
  }))
);

export default usePdfViewerStore;