import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * App Store
 * Manages application-level state and initialization
 */
const useAppStore = create()(
  immer((set, get) => ({
    // State
    isInitialized: false,
    
    // Actions
    setIsInitialized: (initialized) => {
      set(draft => {
        draft.isInitialized = initialized;
      });
    },

    // 🟢 Initialize Application
    initializeApp: async () => {
      try {
        // Import SettingsStore to load settings
        const { default: useSettingsStore } = await import('./settingsStore.js');
        const settingsStore = useSettingsStore.getState();
        
        // Load settings from localStorage
        settingsStore.loadFromLocalStorage();
        
        set(draft => {
          draft.isInitialized = true;
        });
        
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        set(draft => {
          draft.isInitialized = true; // Still set to true to prevent loading loop
        });
      }
    },

    // 🟢 Initialize Global Keyboard Listeners
    initializeKeyboardListeners: (uiStore) => {
      const cleanup = uiStore.initializeKeyboardListener({
        onToggleSidePanel: () => {
          uiStore.setIsSidePanelVisible(!uiStore.isSidePanelVisible);
        },
        onToggleVisibilityPanel: () => {
          window.dispatchEvent(new CustomEvent('toggleVisibilityPanel'));
        }
      });
      
      return cleanup;
    },

    // 🟢 Auto-create OPC Relationships
    handleTagsChange: (tags, relationshipStore) => {
      relationshipStore.updateOPCRelationships(tags);
    },

    // 🟢 App-level Error Handler
    handleError: (error, context = '') => {
      console.error(`❌ App Error ${context}:`, error);
      
      // Could implement error reporting/tracking here
      // For now, just log the error
    },

    // 🟢 Get App Status
    getAppStatus: (pdfStore, viewerStore) => {
      if (viewerStore.isLoading) {
        return {
          status: 'loading',
          message: 'Processing PDF...',
          progress: viewerStore.progress
        };
      }
      
      if (pdfStore.pdfFile && pdfStore.pdfDoc) {
        return {
          status: 'ready',
          message: 'Workspace ready',
          document: pdfStore.pdfDoc
        };
      }
      
      return {
        status: 'waiting',
        message: 'Upload a PDF to get started'
      };
    },

    // 🟢 Handle File Upload
    handleFileUpload: (file, pdfStore) => {
      pdfStore.loadPdfFile(file, pdfStore.processPdf, null);
    },

    // 🟢 Handle App Reset
    handleAppReset: (projectStore) => {
      projectStore.resetAll();
    },

    // 🟢 Handle Toggle Side Panel
    handleToggleSidePanel: (uiStore) => {
      uiStore.setIsSidePanelVisible(!uiStore.isSidePanelVisible);
    }
  }))
);

export default useAppStore;