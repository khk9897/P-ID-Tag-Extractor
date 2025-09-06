// PDFStore - PDF 문서 상태 및 처리 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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
    }
  }))
);

export default usePDFStore;