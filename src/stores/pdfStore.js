// PDFStore - PDF 문서 상태 및 처리 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';

const usePDFStore = create(
  immer((set, get) => ({
    // State
    pdfFile: null,
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.5,
    rotation: 0,
    isLoading: false,
    processingProgress: 0,
    processingStatus: '',
    
    // Computed values (getters)
    get canNavigateBack() {
      return get().currentPage > 1;
    },
    
    get canNavigateForward() {
      const state = get();
      return state.currentPage < state.totalPages;
    },
    
    get currentPageInfo() {
      const state = get();
      return {
        current: state.currentPage,
        total: state.totalPages,
        canBack: state.currentPage > 1,
        canForward: state.currentPage < state.totalPages
      };
    },
    
    // Actions
    setPdfFile: (file) => set((state) => {
      state.pdfFile = file;
    }),
    
    setPdfDoc: (doc) => set((state) => {
      state.pdfDoc = doc;
      if (doc && doc.numPages) {
        state.totalPages = doc.numPages;
      }
    }),
    
    setCurrentPage: (page) => set((state) => {
      const targetPage = Math.max(1, Math.min(page, state.totalPages));
      state.currentPage = targetPage;
    }),
    
    goToNextPage: () => set((state) => {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
      }
    }),
    
    goToPreviousPage: () => set((state) => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
      }
    }),
    
    goToFirstPage: () => set((state) => {
      state.currentPage = 1;
    }),
    
    goToLastPage: () => set((state) => {
      state.currentPage = state.totalPages;
    }),
    
    // Scale management
    setScale: (scale) => set((state) => {
      state.scale = Math.max(0.1, Math.min(scale, 5.0)); // Limit scale between 0.1 and 5.0
    }),
    
    zoomIn: () => set((state) => {
      const newScale = state.scale * 1.2;
      state.scale = Math.min(newScale, 5.0);
    }),
    
    zoomOut: () => set((state) => {
      const newScale = state.scale / 1.2;
      state.scale = Math.max(newScale, 0.1);
    }),
    
    resetZoom: () => set((state) => {
      state.scale = 1.5; // Default scale
    }),
    
    // Rotation management
    setRotation: (rotation) => set((state) => {
      state.rotation = rotation % 360;
    }),
    
    rotate: (degrees = 90) => set((state) => {
      state.rotation = (state.rotation + degrees) % 360;
    }),
    
    resetRotation: () => set((state) => {
      state.rotation = 0;
    }),
    
    // Loading and processing state
    setLoading: (isLoading) => set((state) => {
      state.isLoading = isLoading;
    }),
    
    setProcessingProgress: (progress) => set((state) => {
      state.processingProgress = Math.max(0, Math.min(progress, 100));
    }),
    
    setProcessingStatus: (status) => set((state) => {
      state.processingStatus = status;
    }),
    
    resetProcessing: () => set((state) => {
      state.processingProgress = 0;
      state.processingStatus = '';
    }),
    
    // 🟢 Complex PDF loading workflow
    loadPDF: async (file, onProgress) => set((state) => {
      state.isLoading = true;
      state.pdfFile = file;
      state.processingStatus = 'Loading PDF...';
      
      // This will be implemented with actual PDF.js integration
      // For now, just update the state
      if (onProgress) {
        onProgress('PDF loading started');
      }
    }),
    
    // Document management
    clearDocument: () => set((state) => {
      state.pdfFile = null;
      state.pdfDoc = null;
      state.currentPage = 1;
      state.totalPages = 0;
      state.scale = 1.5;
      state.rotation = 0;
      state.isLoading = false;
      state.processingProgress = 0;
      state.processingStatus = '';
    }),
    
    // Load PDF file and reset states
    loadPdfFile: async (file, processPdfCallback, resetStatesCallback) => {
      // Import ViewerStore to manage loading state
      const { default: useViewerStore } = await import('./viewerStore.js');
      const viewerStore = useViewerStore.getState();
      
      set(produce(draft => {
        draft.pdfFile = file;
        draft.isLoading = true;
        draft.progress = { current: 0, total: 0 };
        draft.currentPage = 1;
        draft.pdfDoc = null;
        draft.totalPages = 0;
      }));
      
      // Set viewer loading state
      viewerStore.setIsLoading(true);
      
      // Reset all other stores
      if (resetStatesCallback) {
        resetStatesCallback();
      }
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        
        const isLarge = doc.numPages > 100;
        
        set(produce(draft => {
          draft.pdfDoc = doc;
          draft.totalPages = doc.numPages;
          draft.isLargeFile = isLarge;
          draft.isLoading = false;
        }));
        
        // Process PDF if callback provided
        if (processPdfCallback) {
          // Import SettingsStore to get current settings
          const { default: useSettingsStore } = await import('./settingsStore.js');
          const settings = useSettingsStore.getState();
          
          await processPdfCallback(doc, settings.patterns, settings.tolerances, settings.appSettings);
        } else {
          // If no processPdf callback, we should still clear the loading state
          viewerStore.setIsLoading(false);
        }
        
        return { doc, isLarge };
      } catch (error) {
        console.error('❌ PDF loading failed:', error);
        set(produce(draft => {
          draft.isLoading = false;
        }));
        viewerStore.setIsLoading(false);
        throw error;
      }
    },
    
    // Viewport calculations (helper for coordinate transformations)
    getViewportTransform: () => {
      const state = get();
      return {
        scale: state.scale,
        rotation: state.rotation,
        page: state.currentPage
      };
    },
    
    // Statistics
    get stats() {
      const state = get();
      return {
        hasDocument: !!state.pdfDoc,
        fileName: state.pdfFile?.name || null,
        fileSize: state.pdfFile?.size || 0,
        totalPages: state.totalPages,
        currentPage: state.currentPage,
        scale: state.scale,
        rotation: state.rotation,
        isProcessing: state.isLoading
      };
    },

    // Process PDF and extract tags
    processPdf: async (doc, patterns, tolerances, appSettings) => {
      // Import required services and stores
      const { extractTags, createOPCRelationships } = await import('../services/taggingService.ts');
      const { RelationshipType } = await import('../types.ts');
      const { v4: uuidv4 } = await import('uuid');
      const { default: useViewerStore } = await import('./viewerStore.js');
      const { default: useTagStore } = await import('./tagStore.js');
      const { default: useRawTextStore } = await import('./rawTextStore.js');
      const { default: useRelationshipStore } = await import('./relationshipStore.js');
      const { default: useCommentStore } = await import('./commentStore.js');
      const { default: useLoopStore } = await import('./loopStore.js');
      const { default: useEquipmentShortSpecStore } = await import('./equipmentShortSpecStore.js');
      const { default: useSettingsStore } = await import('./settingsStore.js');

      const viewerStore = useViewerStore.getState();
      const tagStore = useTagStore.getState();
      const rawTextStore = useRawTextStore.getState();
      const relationshipStore = useRelationshipStore.getState();
      const commentStore = useCommentStore.getState();
      const loopStore = useLoopStore.getState();
      const equipmentShortSpecStore = useEquipmentShortSpecStore.getState();
      const settingsStore = useSettingsStore.getState();

      viewerStore.setIsLoading(true);
      tagStore.setTags([]);
      rawTextStore.setRawTextItems([]);
      relationshipStore.setRelationships([]);
      commentStore.setComments([]);
      loopStore.setLoops([]);
      equipmentShortSpecStore.setEquipmentShortSpecs([]);
      viewerStore.setProgress({ current: 0, total: doc.numPages });
      viewerStore.setCurrentPage(1);

      try {
        let allTags = [];
        let allRawTextItems = [];
        
        for (let i = 1; i <= doc.numPages; i++) {
          const { tags: pageTags, rawTextItems: pageRawTextItems } = await extractTags(doc, i, patterns, tolerances, appSettings);
          
          allTags = [...allTags, ...pageTags];
          allRawTextItems = [...allRawTextItems, ...pageRawTextItems];
          viewerStore.setProgress({ current: i, total: doc.numPages });
        }
        
        tagStore.setTags(allTags);
        rawTextStore.setRawTextItems(allRawTextItems);
        
        const opcRelationships = createOPCRelationships(allTags, RelationshipType);
        relationshipStore.setRelationships(opcRelationships);
        
        if (appSettings?.autoGenerateLoops || settingsStore.appSettings.autoGenerateLoops) {
          setTimeout(() => {
            loopStore.autoGenerateLoops(allTags, uuidv4);
          }, 100);
        }
      } catch (error) {
        console.error('PDF processing failed:', error);
      } finally {
        viewerStore.setIsLoading(false);
      }
    }
  }))
);

export default usePDFStore;