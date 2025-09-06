// SettingsStore - 앱 설정 및 환경설정 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Default settings (imported from constants in the future)
const DEFAULT_PATTERNS = {
  equipment: "^[A-Z]{1,3}-\\d{3}[A-Z]?$",
  line: "^(?=.{10,25}$)(?=.*\")([^-]*-){3,}[^-]*$",
  instrument: "^[A-Z]{2,3}-\\d{3}[A-Z]?$",
  drawingNumber: "^[A-Z0-9]{2,}-[A-Z0-9]{2,}-\\d{2,}$",
  notesAndHolds: "^(NOTE|HOLD)\\s*\\d+$",
  specialItem: "^[A-Z]{1,2}\\d{1,3}[A-Z]?$"
};

const DEFAULT_TOLERANCES = {
  equipment: 15,
  line: 12,
  instrument: 10,
  drawingNumber: 20,
  notesAndHolds: 8,
  specialItem: 15
};

const DEFAULT_APP_SETTINGS = {
  autoRemoveWhitespace: true,
  hyphenSettings: {
    equipment: false,
    line: true,
    instrument: false,
    drawingNumber: true,
    notesAndHolds: false,
    specialItem: false
  }
};

const DEFAULT_VISIBILITY_SETTINGS = {
  tags: {
    Equipment: true,
    Line: true,
    Instrument: true,
    DrawingNumber: true,
    NotesAndHolds: true
  },
  relationships: {
    Connection: true,
    Installation: true,
    Annotation: true,
    Note: true,
    Description: true,
    EquipmentShortSpec: true
  },
  descriptions: true,
  comments: true,
  equipmentShortSpecs: true
};

const DEFAULT_COLORS = {
  Equipment: '#3B82F6',
  Line: '#EF4444', 
  Instrument: '#10B981',
  DrawingNumber: '#8B5CF6',
  NotesAndHolds: '#F59E0B'
};

const useSettingsStore = create(
  immer((set, get) => ({
    // State
    patterns: DEFAULT_PATTERNS,
    tolerances: DEFAULT_TOLERANCES,
    appSettings: DEFAULT_APP_SETTINGS,
    visibilitySettings: DEFAULT_VISIBILITY_SETTINGS,
    colorSettings: DEFAULT_COLORS,
    
    // UI Settings
    showAllRelationships: true,
    showOnlySelectedRelationships: false,
    showAutoLinkRanges: false,
    isAdvancedMode: false,
    
    // Performance settings
    performanceMode: false,
    maxItemsPerPage: 1000,
    enableVirtualization: false,
    
    // Actions - Pattern management
    setPatterns: (patterns) => set((state) => {
      state.patterns = { ...state.patterns, ...patterns };
    }),
    
    updatePattern: (category, pattern) => set((state) => {
      state.patterns[category] = pattern;
    }),
    
    resetPatterns: () => set((state) => {
      state.patterns = { ...DEFAULT_PATTERNS };
    }),
    
    // Actions - Tolerance management  
    setTolerances: (tolerances) => set((state) => {
      state.tolerances = { ...state.tolerances, ...tolerances };
    }),
    
    updateTolerance: (category, tolerance) => set((state) => {
      state.tolerances[category] = tolerance;
    }),
    
    resetTolerances: () => set((state) => {
      state.tolerances = { ...DEFAULT_TOLERANCES };
    }),
    
    // Actions - App settings
    setAppSettings: (settings) => set((state) => {
      state.appSettings = { ...state.appSettings, ...settings };
    }),
    
    updateAppSetting: (key, value) => set((state) => {
      state.appSettings[key] = value;
    }),
    
    toggleAutoRemoveWhitespace: () => set((state) => {
      state.appSettings.autoRemoveWhitespace = !state.appSettings.autoRemoveWhitespace;
    }),
    
    updateHyphenSetting: (category, enabled) => set((state) => {
      state.appSettings.hyphenSettings[category] = enabled;
    }),
    
    // Actions - Visibility settings
    setVisibilitySettings: (settings) => set((state) => {
      state.visibilitySettings = { ...state.visibilitySettings, ...settings };
    }),
    
    toggleTagVisibility: (category) => set((state) => {
      state.visibilitySettings.tags[category] = !state.visibilitySettings.tags[category];
    }),
    
    toggleRelationshipVisibility: (type) => set((state) => {
      state.visibilitySettings.relationships[type] = !state.visibilitySettings.relationships[type];
    }),
    
    toggleDescriptionsVisibility: () => set((state) => {
      state.visibilitySettings.descriptions = !state.visibilitySettings.descriptions;
    }),
    
    toggleCommentsVisibility: () => set((state) => {
      state.visibilitySettings.comments = !state.visibilitySettings.comments;
    }),
    
    showAllTags: () => set((state) => {
      Object.keys(state.visibilitySettings.tags).forEach(key => {
        state.visibilitySettings.tags[key] = true;
      });
    }),
    
    hideAllTags: () => set((state) => {
      Object.keys(state.visibilitySettings.tags).forEach(key => {
        state.visibilitySettings.tags[key] = false;
      });
    }),
    
    showAllRelationships: () => set((state) => {
      Object.keys(state.visibilitySettings.relationships).forEach(key => {
        state.visibilitySettings.relationships[key] = true;
      });
    }),
    
    hideAllRelationships: () => set((state) => {
      Object.keys(state.visibilitySettings.relationships).forEach(key => {
        state.visibilitySettings.relationships[key] = false;
      });
    }),
    
    // Actions - Color settings
    setColorSettings: (colors) => set((state) => {
      state.colorSettings = { ...state.colorSettings, ...colors };
    }),
    
    updateColor: (category, color) => set((state) => {
      state.colorSettings[category] = color;
    }),
    
    resetColors: () => set((state) => {
      state.colorSettings = { ...DEFAULT_COLORS };
    }),
    
    // Actions - UI settings
    toggleShowAllRelationships: () => set((state) => {
      state.showAllRelationships = !state.showAllRelationships;
    }),
    
    toggleShowOnlySelectedRelationships: () => set((state) => {
      state.showOnlySelectedRelationships = !state.showOnlySelectedRelationships;
    }),
    
    toggleShowAutoLinkRanges: () => set((state) => {
      state.showAutoLinkRanges = !state.showAutoLinkRanges;
    }),
    
    toggleAdvancedMode: () => set((state) => {
      state.isAdvancedMode = !state.isAdvancedMode;
    }),
    
    // Actions - Performance settings
    setPerformanceMode: (enabled) => set((state) => {
      state.performanceMode = enabled;
    }),
    
    setMaxItemsPerPage: (max) => set((state) => {
      state.maxItemsPerPage = Math.max(100, Math.min(max, 10000));
    }),
    
    toggleVirtualization: () => set((state) => {
      state.enableVirtualization = !state.enableVirtualization;
    }),
    
    // 🟢 Complex settings operations
    resetAllSettings: () => set((state) => {
      state.patterns = { ...DEFAULT_PATTERNS };
      state.tolerances = { ...DEFAULT_TOLERANCES };
      state.appSettings = { ...DEFAULT_APP_SETTINGS };
      state.visibilitySettings = { ...DEFAULT_VISIBILITY_SETTINGS };
      state.colorSettings = { ...DEFAULT_COLORS };
    }),
    
    exportSettings: () => {
      const state = get();
      return {
        patterns: state.patterns,
        tolerances: state.tolerances,
        appSettings: state.appSettings,
        visibilitySettings: state.visibilitySettings,
        colorSettings: state.colorSettings,
        exportedAt: Date.now()
      };
    },
    
    importSettings: (settingsData) => set((state) => {
      if (settingsData.patterns) {
        state.patterns = { ...DEFAULT_PATTERNS, ...settingsData.patterns };
      }
      if (settingsData.tolerances) {
        state.tolerances = { ...DEFAULT_TOLERANCES, ...settingsData.tolerances };
      }
      if (settingsData.appSettings) {
        state.appSettings = { ...DEFAULT_APP_SETTINGS, ...settingsData.appSettings };
      }
      if (settingsData.visibilitySettings) {
        state.visibilitySettings = { ...DEFAULT_VISIBILITY_SETTINGS, ...settingsData.visibilitySettings };
      }
      if (settingsData.colorSettings) {
        state.colorSettings = { ...DEFAULT_COLORS, ...settingsData.colorSettings };
      }
    }),
    
    // LocalStorage integration
    loadFromLocalStorage: () => {
      try {
        const savedPatterns = localStorage.getItem('pid-tagger-patterns');
        const savedTolerances = localStorage.getItem('pid-tagger-tolerances');
        const savedAppSettings = localStorage.getItem('pid-tagger-appSettings');
        const savedVisibility = localStorage.getItem('pid-tagger-visibilitySettings');
        const savedColors = localStorage.getItem('pid-tagger-colorSettings');
        const savedAllRel = localStorage.getItem('pid-tagger-showAllRelationships');
        const savedOnlySelected = localStorage.getItem('pid-tagger-showOnlySelectedRelationships');
        
        // Only update if there are saved settings
        if (savedPatterns || savedTolerances || savedAppSettings || savedVisibility || savedColors || savedAllRel || savedOnlySelected) {
          set((state) => {
            if (savedPatterns) {
              state.patterns = { ...DEFAULT_PATTERNS, ...JSON.parse(savedPatterns) };
            }
            if (savedTolerances) {
              state.tolerances = { ...DEFAULT_TOLERANCES, ...JSON.parse(savedTolerances) };
            }
            if (savedAppSettings) {
              state.appSettings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(savedAppSettings) };
            }
            if (savedVisibility) {
              state.visibilitySettings = { ...DEFAULT_VISIBILITY_SETTINGS, ...JSON.parse(savedVisibility) };
            }
            if (savedColors) {
              state.colorSettings = { ...DEFAULT_COLORS, ...JSON.parse(savedColors) };
            }
            if (savedAllRel) {
              state.showAllRelationships = JSON.parse(savedAllRel);
            }
            if (savedOnlySelected) {
              state.showOnlySelectedRelationships = JSON.parse(savedOnlySelected);
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    },
    
    saveToLocalStorage: () => {
      const state = get();
      try {
        localStorage.setItem('pid-tagger-patterns', JSON.stringify(state.patterns));
        localStorage.setItem('pid-tagger-tolerances', JSON.stringify(state.tolerances));
        localStorage.setItem('pid-tagger-appSettings', JSON.stringify(state.appSettings));
        localStorage.setItem('pid-tagger-visibilitySettings', JSON.stringify(state.visibilitySettings));
        localStorage.setItem('pid-tagger-colorSettings', JSON.stringify(state.colorSettings));
        localStorage.setItem('pid-tagger-showAllRelationships', JSON.stringify(state.showAllRelationships));
        localStorage.setItem('pid-tagger-showOnlySelectedRelationships', JSON.stringify(state.showOnlySelectedRelationships));
      } catch (error) {
        console.warn('Failed to save settings to localStorage:', error);
      }
    },
    
    // Statistics and validation
    get stats() {
      const state = get();
      const visibleTagCount = Object.values(state.visibilitySettings.tags).filter(Boolean).length;
      const visibleRelCount = Object.values(state.visibilitySettings.relationships).filter(Boolean).length;
      
      return {
        totalPatterns: Object.keys(state.patterns).length,
        totalTolerances: Object.keys(state.tolerances).length,
        visibleTagTypes: visibleTagCount,
        visibleRelationshipTypes: visibleRelCount,
        performanceMode: state.performanceMode,
        advancedMode: state.isAdvancedMode
      };
    }
  }))
);

export default useSettingsStore;