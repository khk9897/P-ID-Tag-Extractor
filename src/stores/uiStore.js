import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * UI Store
 * Manages UI state, confirmations, and global keyboard handlers
 */
const useUIStore = create()(
  immer((set, get) => ({
    // State
    confirmation: {
      isOpen: false,
      message: '',
      onConfirm: () => {}
    },
    showAutoLinkRanges: false,
    
    // App UI state
    isSettingsOpen: false,
    isSidePanelVisible: true,
    showAllRelationships: (() => {
      const saved = localStorage.getItem('pid-tagger-showAllRelationships');
      return saved === 'false' ? false : true; // Default to true for backward compatibility
    })(),
    showOnlySelectedRelationships: (() => {
      const saved = localStorage.getItem('pid-tagger-showOnlySelectedRelationships');
      return saved === 'true' ? true : false; // Default to false
    })(),
    
    // Visibility settings
    visibilitySettings: {
      tags: {
        equipment: true,
        line: true,
        instrument: true,
        drawingNumber: true,
        notesAndHolds: true,
        specialItem: true,
        offPageConnector: true,
      },
      descriptions: true,
      equipmentShortSpecs: true,
      relationships: {
        connection: true,
        installation: true,
        annotation: false,
        note: false,
        offPageConnection: false,
      },
    },

    // Actions
    showConfirmation: (message, onConfirm) => {
      set(draft => {
        draft.confirmation = {
          isOpen: true,
          message,
          onConfirm
        };
      });
    },

    closeConfirmation: () => {
      set(draft => {
        draft.confirmation = {
          isOpen: false,
          message: '',
          onConfirm: () => {}
        };
        draft.showAutoLinkRanges = false;
      });
    },

    confirm: () => {
      const { confirmation } = get();
      confirmation.onConfirm();
      get().closeConfirmation();
    },

    setShowAutoLinkRanges: (show) => {
      set(draft => {
        draft.showAutoLinkRanges = show;
      });
    },
    
    // App UI actions
    setIsSettingsOpen: (isOpen) => {
      set(draft => {
        draft.isSettingsOpen = isOpen;
      });
    },
    
    setIsSidePanelVisible: (isVisible) => {
      set(draft => {
        draft.isSidePanelVisible = isVisible;
      });
    },
    
    setShowAllRelationships: (show) => {
      set(draft => {
        draft.showAllRelationships = show;
      });
      localStorage.setItem('pid-tagger-showAllRelationships', show.toString());
    },
    
    setShowOnlySelectedRelationships: (show) => {
      set(draft => {
        draft.showOnlySelectedRelationships = show;
      });
      localStorage.setItem('pid-tagger-showOnlySelectedRelationships', show.toString());
    },

    // Visibility actions
    updateVisibilitySettings: (updates) => {
      set(draft => {
        Object.assign(draft.visibilitySettings, updates);
        if (updates.tags) {
          Object.assign(draft.visibilitySettings.tags, updates.tags);
        }
        if (updates.relationships) {
          Object.assign(draft.visibilitySettings.relationships, updates.relationships);
        }
      });
    },

    toggleTagVisibility: (tagType) => {
      set(draft => {
        draft.visibilitySettings.tags[tagType] = !draft.visibilitySettings.tags[tagType];
      });
    },

    toggleRelationshipVisibility: (relType) => {
      set(draft => {
        draft.visibilitySettings.relationships[relType] = !draft.visibilitySettings.relationships[relType];
      });
    },

    toggleAllTags: () => {
      set(draft => {
        const allTagsVisible = Object.values(draft.visibilitySettings.tags).every(Boolean);
        const newState = !allTagsVisible;
        draft.visibilitySettings.tags = {
          equipment: newState,
          line: newState,
          instrument: newState,
          drawingNumber: newState,
          notesAndHolds: newState,
          specialItem: newState,
          offPageConnector: newState,
        };
      });
    },

    toggleAllRelationships: () => {
      set(draft => {
        const allRelationshipsVisible = Object.values(draft.visibilitySettings.relationships).every(Boolean);
        const newState = !allRelationshipsVisible;
        draft.visibilitySettings.relationships = {
          connection: newState,
          installation: newState,
          annotation: newState,
          note: newState,
          description: newState,
          equipmentShortSpec: newState,
          offPageConnection: newState,
        };
      });
    },

    // Computed getter for backward compatibility
    get showRelationships() {
      return Object.values(get().visibilitySettings.relationships).some(Boolean);
    },

    // Global keyboard handler
    handleGlobalKeyDown: (e, callbacks = {}) => {
      const target = e.target;
      console.log('🌐 UIStore handleGlobalKeyDown:', e.key, 'target:', target.tagName);
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        console.log('🚫 UI: Ignoring key because input element is focused');
        return;
      }

      // Handle keyboard shortcuts
      const key = e.key.toLowerCase();
      switch(key) {
        case 's':
          if (callbacks.onToggleSidePanel) {
            e.preventDefault();
            callbacks.onToggleSidePanel();
          }
          break;
        case 'v':
          if (callbacks.onToggleVisibilityPanel) {
            e.preventDefault();
            callbacks.onToggleVisibilityPanel();
          }
          break;
        case 'p':
        case 'r':
          console.log('📋 UIStore: P or R key detected, letting it pass through to PdfViewer');
          break;
        default:
          break;
      }
    },

    // Initialize global keyboard listener
    initializeKeyboardListener: (callbacks) => {
      const handleKeyDown = (e) => {
        get().handleGlobalKeyDown(e, callbacks);
      };

      window.addEventListener('keydown', handleKeyDown);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    },

    // 🟢 Header Keyboard Event Handling
    handleHeaderKeyDown: (event, callbacks) => {
      // Skip if target is an input element
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          callbacks.onToggleSidePanel();
          break;
        case 'o':
          event.preventDefault();
          callbacks.onToggleVisibilityPanel();
          break;
        case 'c':
          event.preventDefault();
          callbacks.onToggleConnectMode();
          break;
        case 'k':
          event.preventDefault();
          callbacks.onToggleMakeMode();
          break;
        case 'arrowleft':
          event.preventDefault();
          callbacks.onPreviousPage();
          break;
        case 'arrowright':
          event.preventDefault();
          callbacks.onNextPage();
          break;
        case '=':
        case '+':
          event.preventDefault();
          callbacks.onZoomIn();
          break;
        case '-':
          event.preventDefault();
          callbacks.onZoomOut();
          break;
        case '?':
          event.preventDefault();
          callbacks.onShowHelp();
          break;
        default:
          break;
      }
    },

    // Initialize header keyboard listener
    initializeHeaderKeyboardListener: (callbacks) => {
      const handleKeyDown = (e) => {
        get().handleHeaderKeyDown(e, callbacks);
      };

      document.addEventListener('keydown', handleKeyDown);
      
      // Return cleanup function
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }))
);

export default useUIStore;