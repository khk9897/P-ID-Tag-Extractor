import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfUpload } from './components/PdfUpload.tsx';
import { Workspace } from './components/Workspace.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { TagStoreDebug } from './components/TagStoreDebug.tsx';
import { extractTags, createOPCRelationships } from './services/taggingService.ts';
import { exportToExcel } from './services/excelExporter.ts';
import { DEFAULT_PATTERNS, DEFAULT_TOLERANCES, DEFAULT_SETTINGS, DEFAULT_COLORS } from './constants.ts';
import { useSidePanelStore } from './stores/sidePanelStore.ts';
import useTagStore from './stores/tagStore.js';
import useRawTextStore from './stores/rawTextStore.js';
import useCommentStore from './stores/commentStore.js';
import useContentStore from './stores/contentStore.js';
import useDescriptionStore from './stores/descriptionStore.js';
import useEquipmentShortSpecStore from './stores/equipmentShortSpecStore.js';
import useAutoLinkingStore from './stores/autoLinkingStore.js';
import useProjectStore from './stores/projectStore.js';
import usePDFStore from './stores/pdfStore.js';
import useSettingsStore from './stores/settingsStore.js';
import useLoopStore from './stores/loopStore.js';
import { 
  Category, 
  RelationshipType, 
  CategoryType,
  Tag,
  RawTextItem,
  Relationship,
  Description,
  EquipmentShortSpec,
  Loop,
  ConfirmModalProps,
  ProcessingProgress,
  ProjectData,
  PatternConfig,
  ToleranceConfig,
  AppSettings,
  ViewMode,
  ManualTagData,
  VisibilitySettings,
  Comment,
  CommentTargetType,
  CommentPriority,
  ColorSettings
} from './types.ts';

// Set PDF.js worker source - use local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', import.meta.url).href;

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onCancel}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
          <div className="text-slate-300 whitespace-pre-line">{message}</div>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-b-xl border-t border-slate-700 flex justify-end items-center space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-300 bg-transparent rounded-md hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  // Performance mode from store - declare first to avoid initialization errors
  const { setIsLargeFile, updateRelationshipMaps, performanceMode } = useSidePanelStore();
  
  // 🟢 NEW: Zustand stores integration (병행 운영)
  const tagStore = useTagStore();
  const rawTextStore = useRawTextStore();
  const commentStore = useCommentStore();
  const contentStore = useContentStore();
  const descriptionStore = useDescriptionStore();
  const equipmentShortSpecStore = useEquipmentShortSpecStore();
  const autoLinkingStore = useAutoLinkingStore();
  const projectStore = useProjectStore();
  const pdfStore = usePDFStore();
  const settingsStore = useSettingsStore();
  const loopStore = useLoopStore();
  
  // Initialize settings from localStorage on app startup
  React.useEffect(() => {
    settingsStore.loadFromLocalStorage();
  }, []); // Empty dependency array to run only once
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // TODO: Add proper PDF.js type
  const [tags, setTags] = useState<Tag[]>([]);  // 🟡 기존 state 유지 (당분간)
  const [rawTextItems, setRawTextItems] = useState<RawTextItem[]>([]);
  const [relationships, setRelationshipsState] = useState<Relationship[]>([]);
  
  // Wrapper to update both state and Maps
  const setRelationships = useCallback((newRelationships: Relationship[] | ((prev: Relationship[]) => Relationship[])) => {
    let updatedRelationships: Relationship[];
    
    setRelationshipsState((prev) => {
      updatedRelationships = typeof newRelationships === 'function' ? newRelationships(prev) : newRelationships;
      return updatedRelationships;
    });
    
    // Update Maps for O(1) lookup after state update
    if (updatedRelationships) {
      updateRelationshipMaps(updatedRelationships);
    }
  }, [updateRelationshipMaps]);
  
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [equipmentShortSpecs, setEquipmentShortSpecs] = useState<EquipmentShortSpec[]>([]);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // State lifted from viewer/workspace for toolbar
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [mode, setMode] = useState<ViewMode>('select');
  const [relationshipStartTag, setRelationshipStartTag] = useState<Tag | null>(null);
  // Replace simple boolean with comprehensive visibility settings
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
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
  });
  
  // Keep backward compatibility - derive showRelationships from relationships settings
  const showRelationships = Object.values(visibilitySettings.relationships).some(Boolean);
  const [isSidePanelVisible, setIsSidePanelVisible] = useState<boolean>(true);
  
  // 🟢 NEW: Synchronize existing state with Zustand stores
  useEffect(() => {
    // 기존 tags 상태가 변경될 때마다 TagStore 업데이트
    if (tags.length > 0) {
      tagStore.setTags(tags);
      console.log('🔄 TagStore synced with', tags.length, 'tags');
    }
  }, [tags, tagStore]);
  
  useEffect(() => {
    // 기존 rawTextItems 상태가 변경될 때마다 RawTextStore 업데이트
    if (rawTextItems.length > 0) {
      rawTextStore.setRawTextItems(rawTextItems);
      console.log('🔄 RawTextStore synced with', rawTextItems.length, 'items');
    }
  }, [rawTextItems, rawTextStore]);
  
  useEffect(() => {
    // 기존 comments 상태가 변경될 때마다 CommentStore 업데이트
    if (comments.length > 0) {
      commentStore.setComments(comments);
      console.log('🔄 CommentStore synced with', comments.length, 'comments');
    }
  }, [comments, commentStore]);
  
  useEffect(() => {
    // 기존 descriptions 상태가 변경될 때마다 DescriptionStore와 ContentStore 업데이트
    if (descriptions.length > 0) {
      descriptionStore.setDescriptions(descriptions);
      console.log('🔄 DescriptionStore synced with', descriptions.length, 'descriptions');
    }
  }, [descriptions, descriptionStore]);
  
  useEffect(() => {
    // 기존 equipmentShortSpecs 상태가 변경될 때마다 EquipmentShortSpecStore와 ContentStore 업데이트
    if (equipmentShortSpecs.length > 0) {
      equipmentShortSpecStore.setEquipmentShortSpecs(equipmentShortSpecs);
      console.log('🔄 EquipmentShortSpecStore synced with', equipmentShortSpecs.length, 'specs');
    }
  }, [equipmentShortSpecs, equipmentShortSpecStore]);
  const [showAutoLinkRanges, setShowAutoLinkRanges] = useState<boolean>(false);
  
  // Performance optimization settings
  const [showAllRelationships, setShowAllRelationships] = useState<boolean>(() => {
    const saved = localStorage.getItem('pid-tagger-showAllRelationships');
    return saved === 'false' ? false : true; // Default to true for backward compatibility
  });
  const [showOnlySelectedRelationships, setShowOnlySelectedRelationships] = useState<boolean>(() => {
    const saved = localStorage.getItem('pid-tagger-showOnlySelectedRelationships');
    return saved === 'true' ? true : false; // Default to false
  });

  
  const [patterns, setPatterns] = useState<PatternConfig>(() => {
    try {
      const savedPatterns = localStorage.getItem('pid-tagger-patterns');
      let parsed = savedPatterns ? JSON.parse(savedPatterns) : DEFAULT_PATTERNS;
      
      // Migration and validation logic
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          // Ensure all default categories exist, adding any that are missing
          let updated = false;
          for (const key in DEFAULT_PATTERNS) {
              if (!parsed.hasOwnProperty(key)) {
                  parsed[key] = DEFAULT_PATTERNS[key];
                  updated = true;
              }
          }
           // Migration for Instrument pattern from string to object
          if (typeof parsed[Category.Instrument] === 'string') {
              const pattern = parsed[Category.Instrument];
              const separator = '\\s?';
              const separatorIndex = pattern.indexOf(separator);
              if (separatorIndex > -1) {
                  parsed[Category.Instrument] = {
                      func: pattern.substring(0, separatorIndex),
                      num: pattern.substring(separatorIndex + separator.length),
                  };
              } else {
                  parsed[Category.Instrument] = { func: pattern, num: '' };
              }
              updated = true;
          }
          if (updated) {
          }
          return parsed;
      }
      
      // If format is completely wrong, return defaults
      return DEFAULT_PATTERNS; 
    } catch (error) {
      return DEFAULT_PATTERNS;
    }
  });

    const [tolerances, setTolerances] = useState<ToleranceConfig>(() => {
        try {
            const saved = localStorage.getItem('pid-tagger-tolerances');
            let parsed = saved ? JSON.parse(saved) : DEFAULT_TOLERANCES;

            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                if (!parsed[Category.Instrument]) {
                    parsed[Category.Instrument] = { ...DEFAULT_TOLERANCES[Category.Instrument] };
                } else {
                    if (!parsed[Category.Instrument].hasOwnProperty('autoLinkDistance')) {
                        parsed[Category.Instrument].autoLinkDistance = DEFAULT_TOLERANCES[Category.Instrument].autoLinkDistance;
                    }
                }
                return parsed;
            }
            return DEFAULT_TOLERANCES;
        } catch (error) {
            return DEFAULT_TOLERANCES;
        }
    });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('pid-tagger-app-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist (for backward compatibility)
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          hyphenSettings: {
            ...DEFAULT_SETTINGS.hyphenSettings,
            ...(parsed.hyphenSettings || {})
          }
        };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  });

  const [colorSettings, setColorSettings] = useState<ColorSettings>(() => {
    try {
      const saved = localStorage.getItem('pid-tagger-color-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Migration from old structure to new structure
        if (parsed.tags && !parsed.entities) {
          return {
            entities: {
              ...parsed.tags,
              description: parsed.relationships?.description || DEFAULT_COLORS.entities.description,
              equipmentShortSpec: parsed.relationships?.equipmentShortSpec || DEFAULT_COLORS.entities.equipmentShortSpec,
            },
            relationships: {
              connection: parsed.relationships?.connection || DEFAULT_COLORS.relationships.connection,
              installation: parsed.relationships?.installation || DEFAULT_COLORS.relationships.installation,
              annotation: parsed.relationships?.annotation || DEFAULT_COLORS.relationships.annotation,
              note: parsed.relationships?.note || DEFAULT_COLORS.relationships.note,
            },
            highlights: {
              noteRelated: parsed.relationships?.noteRelated || DEFAULT_COLORS.highlights.noteRelated,
              selected: DEFAULT_COLORS.highlights.selected,
            }
          };
        }
        
        // If it has the new structure, return it
        if (parsed.entities) {
          return parsed;
        }
      }
      return DEFAULT_COLORS;
    } catch (error) {
      return DEFAULT_COLORS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pid-tagger-patterns', JSON.stringify(patterns));
    } catch (error)
      {
    }
  }, [patterns]);

    useEffect(() => {
        try {
            localStorage.setItem('pid-tagger-tolerances', JSON.stringify(tolerances));
        } catch (error) {
        }
    }, [tolerances]);

  useEffect(() => {
    try {
      localStorage.setItem('pid-tagger-app-settings', JSON.stringify(appSettings));
    } catch (error) {
    }
  }, [appSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('pid-tagger-color-settings', JSON.stringify(colorSettings));
    } catch (error) {
    }
  }, [colorSettings]);

  // Save performance settings to localStorage
  useEffect(() => {
    localStorage.setItem('pid-tagger-showAllRelationships', showAllRelationships.toString());
  }, [showAllRelationships]);

  useEffect(() => {
    localStorage.setItem('pid-tagger-showOnlySelectedRelationships', showOnlySelectedRelationships.toString());
  }, [showOnlySelectedRelationships]);
  
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        console.log('🌐 App.tsx handleGlobalKeyDown:', e.key, 'target:', target.tagName);
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            console.log('🚫 App: Ignoring key because input element is focused');
            return;
        }

        if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            setIsSidePanelVisible(prev => !prev);
        } else if (e.key.toLowerCase() === 'v') {
            e.preventDefault();
            // Toggle visibility panel by dispatching a custom event
            window.dispatchEvent(new CustomEvent('toggleVisibilityPanel'));
        } else if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'r') {
            console.log('📋 App.tsx: P or R key detected, letting it pass through to PdfViewer');
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []); // Run only once

  // Auto-create OPC relationships when tags change
  useEffect(() => {
    const opcTags = tags.filter(tag => tag.category === Category.OffPageConnector);
    if (opcTags.length > 0) {
      const opcRelationships = createOPCRelationships(tags, RelationshipType);
      
      // Only update if there are new relationships to add
      if (opcRelationships.length > 0) {
        setRelationships(prevRel => {
          // Remove existing OPC relationships to avoid duplicates
          const nonOpcRel = prevRel.filter(rel => rel.type !== RelationshipType.OffPageConnection);
          const newRels = [...nonOpcRel, ...opcRelationships];
          return newRels;
        });
      }
    }
  }, [tags]); // Run when tags change


  const showConfirmation = (message: string, onConfirm: () => void): void => {
    setConfirmation({ isOpen: true, message, onConfirm });
  };
  const handleCloseConfirmation = () => {
    setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
    setShowAutoLinkRanges(false); // Hide auto-link ranges when closing confirmation
  };
  const handleConfirm = () => {
    confirmation.onConfirm();
    handleCloseConfirmation();
  };

  const processPdf = useCallback(async (doc: any, patternsToUse: PatternConfig, tolerancesToUse: ToleranceConfig, appSettingsToUse?: AppSettings): Promise<void> => {
    
    setIsLoading(true);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setComments([]);
    setLoops([]);
    setEquipmentShortSpecs([]); // Equipment Short Specs are deleted
    // Note: Keep descriptions as they are user-created content that persists
    setProgress({ current: 0, total: doc.numPages });
    setCurrentPage(1); // Reset to first page on new process

    try {
      let allTags = [];
      let allRawTextItems = [];
      
      for (let i = 1; i <= doc.numPages; i++) {
        const { tags: pageTags, rawTextItems: pageRawTextItems } = await extractTags(doc, i, patternsToUse, tolerancesToUse, appSettings);
        
        allTags = [...allTags, ...pageTags];
        allRawTextItems = [...allRawTextItems, ...pageRawTextItems];
        setProgress(p => ({ ...p, current: i }));
      }
      
      
      setTags(allTags);
      
      setRawTextItems(allRawTextItems);
      
      // Create OPC relationships after all tags are processed
      const opcRelationships = createOPCRelationships(allTags, RelationshipType);
      
      setRelationships(opcRelationships);
      
      // Auto-generate loops if enabled
      if (appSettingsToUse?.autoGenerateLoops || appSettings.autoGenerateLoops) {
        setTimeout(() => {
          loopStore.autoGenerateLoops(allTags, uuidv4);
        }, 100); // Small delay to ensure tags are set
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [appSettings]);

  const handleFileSelect = useCallback(async (file: File): Promise<void> => {
    
    setPdfFile(file);
    setIsLoading(true);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setProgress({ current: 0, total: 0 });
    setCurrentPage(1);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      
      // Check if it's a large file and enable performance mode
      const isLarge = doc.numPages > 100;
      setIsLargeFile(isLarge);
      // Auto-disable relationship lines for large files
      if (isLarge && showAllRelationships) {
        setShowAllRelationships(false);
      }
      
      await processPdf(doc, patterns, tolerances, appSettings);
    } catch (error) {
      setIsLoading(false);
    }
  }, [patterns, tolerances, appSettings, processPdf]);

  const handleSaveSettingsOnly = (newPatterns: PatternConfig, newTolerances: ToleranceConfig, newAppSettings: AppSettings, newColorSettings: ColorSettings): void => {
    // Update settings in SettingsStore
    settingsStore.setPatterns(newPatterns);
    settingsStore.setTolerances(newTolerances);
    settingsStore.setAppSettings(newAppSettings);
    settingsStore.setColorSettings(newColorSettings);
    
    // Save to localStorage
    settingsStore.saveToLocalStorage();
    
    // Update local state for backward compatibility during migration
    setPatterns(newPatterns);
    setTolerances(newTolerances);
    setAppSettings(newAppSettings);
    setColorSettings(newColorSettings);
    setIsSettingsOpen(false);
  };

  const handleSaveSettingsAndRescan = async (newPatterns: PatternConfig, newTolerances: ToleranceConfig, newAppSettings: AppSettings, newColorSettings: ColorSettings, activeTab: string): Promise<void> => {
    // Update settings in SettingsStore
    settingsStore.setPatterns(newPatterns);
    settingsStore.setTolerances(newTolerances);
    settingsStore.setAppSettings(newAppSettings);
    settingsStore.setColorSettings(newColorSettings);
    
    // Save to localStorage
    settingsStore.saveToLocalStorage();
    
    // Update local state for backward compatibility during migration
    setPatterns(newPatterns);
    setTolerances(newTolerances);
    setAppSettings(newAppSettings);
    setColorSettings(newColorSettings);
    setIsSettingsOpen(false);
    
    // Only rescan if patterns/tolerances/settings changed (not for color changes)
    if (activeTab === 'patterns' && pdfDoc) {
      // Check if user has manual data that will be lost
      const hasManualData = relationships.length > 0 || 
                           comments.length > 0 || 
                           loops.length > 0 ||
                           tags.some(tag => tag.isReviewed) ||
                           equipmentShortSpecs.length > 0;

      if (hasManualData) {
        showConfirmation(
          `Pattern settings have been changed and require PDF rescanning.

⚠️ Rescanning will delete all manually created content:

• Tag relationships (Connection, Installation, Note, etc.)
• User comments and notes
• Manually created loops
• Tag review status (✓ checkmarks)
• Equipment Short Spec data

✅ Note & Hold descriptions will be preserved.

💡 If you have important work, please Export your project as backup first.

Do you want to continue?`,
          () => processPdf(pdfDoc, newPatterns, newTolerances, newAppSettings)
        );
      } else {
        await processPdf(pdfDoc, newPatterns, newTolerances, newAppSettings);
      }
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfDoc(null);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setDescriptions([]);
    setEquipmentShortSpecs([]);
    setComments([]);
    setIsLoading(false);
    setProgress({ current: 0, total: 0 });
    setCurrentPage(1);
    setScale(1.5);
    setMode('select');
  };

  // Helper functions for visibility settings
  const updateVisibilitySettings = useCallback((updates: Partial<VisibilitySettings>) => {
    setVisibilitySettings(prev => ({
      ...prev,
      ...updates,
      tags: updates.tags ? { ...prev.tags, ...updates.tags } : prev.tags,
      relationships: updates.relationships ? { ...prev.relationships, ...updates.relationships } : prev.relationships,
    }));
  }, []);

  const toggleTagVisibility = useCallback((tagType: keyof VisibilitySettings['tags']) => {
    setVisibilitySettings(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [tagType]: !prev.tags[tagType],
      },
    }));
  }, []);

  const toggleRelationshipVisibility = useCallback((relType: keyof VisibilitySettings['relationships']) => {
    setVisibilitySettings(prev => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [relType]: !prev.relationships[relType],
      },
    }));
  }, []);

  const toggleAllTags = useCallback(() => {
    const allTagsVisible = Object.values(visibilitySettings.tags).every(Boolean);
    const newState = !allTagsVisible;
    setVisibilitySettings(prev => ({
      ...prev,
      tags: {
        equipment: newState,
        line: newState,
        instrument: newState,
        drawingNumber: newState,
        notesAndHolds: newState,
      },
    }));
  }, [visibilitySettings.tags]);

  const toggleAllRelationships = useCallback(() => {
    const allRelationshipsVisible = Object.values(visibilitySettings.relationships).every(Boolean);
    const newState = !allRelationshipsVisible;
    setVisibilitySettings(prev => ({
      ...prev,
      relationships: {
        connection: newState,
        installation: newState,
        annotation: newState,
        note: newState,
        description: newState,
        equipmentShortSpec: newState,
      },
    }));
  }, [visibilitySettings.relationships]);
  
  // 🟢 MIGRATED: Use TagStore for tag creation

  
  // 🟢 MIGRATED: Use RawTextStore directly






  
  const handleUpdateDescriptionOriginal = useCallback((id: string, text: string, metadata: Description['metadata']): void => {
    setDescriptions(prev => {
      const currentDesc = prev.find(desc => desc.id === id);
      if (!currentDesc) return prev;

      let updatedMetadata = metadata;

      // If type changed, recalculate number for the new type on the same page
      if (currentDesc.metadata.type !== metadata.type) {
        const existingNumbers = prev
          .filter(desc => 
            desc.id !== id && // Exclude current description
            desc.metadata.type === metadata.type && 
            desc.page === currentDesc.page
          )
          .map(desc => desc.metadata.number);
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        updatedMetadata = { ...metadata, number: nextNumber };
      }

      return prev.map(desc => 
        desc.id === id ? { ...desc, text, metadata: updatedMetadata } : desc
      );
    });
  }, []);




  const loadProjectData = useCallback((projectData: any): void => {
    projectStore.loadProjectData(
      projectData,
      setTags,
      setRelationships, 
      setRawTextItems,
      setDescriptions,
      setEquipmentShortSpecs,
      setLoops,
      setComments,
      setPatterns,
      setTolerances,
      setAppSettings
    );
  }, [projectStore]);

  const handleImportProject = useCallback(async (file: File): Promise<void> => {
    await projectStore.importProject(
      file,
      pdfFile,
      loadProjectData,
      alert,
      showConfirmation
    );
  }, [pdfFile, projectStore, loadProjectData, showConfirmation]);

  const handleExportProject = useCallback(() => {
    projectStore.exportProject(
      pdfFile,
      tags,
      relationships,
      rawTextItems,
      descriptions,
      equipmentShortSpecs,
      comments,
      loops,
      patterns,
      tolerances,
      appSettings
    );
  }, [pdfFile, tags, relationships, rawTextItems, descriptions, equipmentShortSpecs, comments, loops, patterns, tolerances, appSettings, projectStore]);

  const handleExportExcel = useCallback(() => {
    projectStore.exportToExcel(tags, relationships, descriptions, comments);
  }, [tags, relationships, descriptions, comments, projectStore]);
  
  // Helper function to calculate minimum distance from point to bbox corners and center
  const calculateMinDistanceToCorners = (centerX: number, centerY: number, bbox: { x1: number; y1: number; x2: number; y2: number }) => {
    const points = [
      [bbox.x1, bbox.y1], // top-left
      [bbox.x2, bbox.y1], // top-right
      [bbox.x1, bbox.y2], // bottom-left
      [bbox.x2, bbox.y2], // bottom-right
      [(bbox.x1 + bbox.x2) / 2, (bbox.y1 + bbox.y2) / 2] // center
    ];
    
    return Math.min(...points.map(([x, y]) => 
      Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2)
    ));
  };

  const handleAutoLinkDescriptions = useCallback(() => {
    autoLinkingStore.autoLinkDescriptions(
      tags, 
      rawTextItems, 
      relationships, 
      tolerances, 
      uuidv4, 
      calculateMinDistanceToCorners, 
      (newRelationships) => setRelationships(prev => [...prev, ...newRelationships]),
      setShowAutoLinkRanges,
      alert,
      showConfirmation
    );
  }, [tags, rawTextItems, relationships, tolerances, autoLinkingStore, showConfirmation]);

  const handleAutoLinkNotesAndHolds = useCallback(() => {
    autoLinkingStore.autoLinkNotesAndHolds(
      tags, 
      descriptions, 
      uuidv4, 
      (newRelationships) => setRelationships(prev => [...prev, ...newRelationships]),
      alert,
      showConfirmation
    );
  }, [tags, descriptions, autoLinkingStore, showConfirmation]);

  const handleAutoLinkEquipmentShortSpecs = useCallback(() => {
    autoLinkingStore.autoLinkEquipmentShortSpecs(
      tags, 
      equipmentShortSpecs, 
      relationships, 
      uuidv4, 
      (newRelationships) => setRelationships(prev => [...prev, ...newRelationships]),
      alert,
      showConfirmation
    );
  }, [tags, equipmentShortSpecs, relationships, autoLinkingStore, showConfirmation]);

  const handleAutoLinkAll = useCallback(async () => {
    autoLinkingStore.autoLinkAll(
      tags, 
      rawTextItems, 
      relationships, 
      descriptions, 
      equipmentShortSpecs, 
      tolerances, 
      uuidv4, 
      calculateMinDistanceToCorners, 
      (newRelationships) => setRelationships(prev => [...prev, ...newRelationships]),
      setShowAutoLinkRanges,
      alert,
      showConfirmation
    );
  }, [tags, rawTextItems, descriptions, equipmentShortSpecs, relationships, tolerances, autoLinkingStore, showConfirmation]);

  const handleRemoveWhitespace = useCallback(() => {
    showConfirmation(
      'Are you sure you want to remove all whitespace from Equipment, Line, and Instrument tags? This action cannot be undone.',
      () => {
        const updatedTags = tags.map(tag => {
          // Only apply to Equipment, Line, and Instrument categories
          if (tag.category === Category.Equipment || 
              tag.category === Category.Line || 
              tag.category === Category.Instrument) {
            return {
              ...tag,
              text: tag.text.replace(/\s/g, '')
            };
          }
          return tag;
        });
        setTags(updatedTags);
        
        // Count affected tags for feedback
        const affectedCount = tags.filter(tag => 
          (tag.category === Category.Equipment || 
           tag.category === Category.Line || 
           tag.category === Category.Instrument) && 
          tag.text.includes(' ')
        ).length;
        
        alert(`Removed whitespace from ${affectedCount} Equipment, Line, and Instrument tags.`);
      }
    );
  }, [tags, showConfirmation]);








  const mainContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white">
          <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg">Processing PDF...</p>
          <p className="text-slate-400">Page {progress.current} of {progress.total}</p>
        </div>
      );
    }

    if (pdfFile && pdfDoc) {
      return (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-300">
                <p className="mb-4">Error loading workspace. Please try refreshing the page.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reload
                </button>
              </div>
            </div>
          }
        >
          <Workspace
            pdfDoc={pdfDoc}
            tags={tags}
            setTags={setTags}
            relationships={relationships}
            setRelationships={setRelationships}
            rawTextItems={rawTextItems}
            descriptions={descriptions}
            setDescriptions={setDescriptions}
            equipmentShortSpecs={equipmentShortSpecs}
            setEquipmentShortSpecs={setEquipmentShortSpecs}
            loops={loops}
            setLoops={setLoops}
            onAutoLinkDescriptions={handleAutoLinkDescriptions}
            onAutoLinkNotesAndHolds={handleAutoLinkNotesAndHolds}
            onAutoLinkEquipmentShortSpecs={handleAutoLinkEquipmentShortSpecs}
            showConfirmation={showConfirmation}
            // Pass down viewer state
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            scale={scale}
            setScale={setScale}
            mode={mode}
            setMode={setMode}
            relationshipStartTag={relationshipStartTag}
            setRelationshipStartTag={setRelationshipStartTag}
            visibilitySettings={visibilitySettings}
            updateVisibilitySettings={updateVisibilitySettings}
            showAutoLinkRanges={showAutoLinkRanges}
            tolerances={tolerances}
            toggleTagVisibility={toggleTagVisibility}
            toggleRelationshipVisibility={toggleRelationshipVisibility}
            toggleAllTags={toggleAllTags}
            toggleAllRelationships={toggleAllRelationships}
            showAllRelationships={showAllRelationships}
            setShowAllRelationships={setShowAllRelationships}
            showOnlySelectedRelationships={showOnlySelectedRelationships}
            setShowOnlySelectedRelationships={setShowOnlySelectedRelationships}
            isSidePanelVisible={isSidePanelVisible}
            colorSettings={colorSettings}
          />
        </ErrorBoundary>
      );
    }
    
    return (
      <ErrorBoundary
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-300">
              <p className="mb-4">Error loading file upload. Please refresh the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload
              </button>
            </div>
          </div>
        }
      >
        <PdfUpload onFileSelect={handleFileSelect} />
      </ErrorBoundary>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 font-sans">
      <ErrorBoundary
        fallback={
          <div className="h-16 bg-slate-800 flex items-center justify-center">
            <p className="text-red-300">Error loading header</p>
          </div>
        }
      >
        <Header 
          onReset={handleReset} 
          hasData={!!pdfFile} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onImportProject={handleImportProject}
          onExportProject={handleExportProject}
          onExportExcel={handleExportExcel}
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          scale={scale}
          setScale={setScale}
          mode={mode}
          onToggleSidePanel={() => setIsSidePanelVisible(p => !p)}
          onAutoLinkDescriptions={handleAutoLinkDescriptions}
          onAutoLinkNotesAndHolds={handleAutoLinkNotesAndHolds}
          onAutoLinkEquipmentShortSpecs={handleAutoLinkEquipmentShortSpecs}
          onAutoLinkAll={handleAutoLinkAll}
          onRemoveWhitespace={handleRemoveWhitespace}
          visibilitySettings={visibilitySettings}
          updateVisibilitySettings={updateVisibilitySettings}
          toggleTagVisibility={toggleTagVisibility}
          toggleRelationshipVisibility={toggleRelationshipVisibility}
          toggleAllTags={toggleAllTags}
          toggleAllRelationships={toggleAllRelationships}
          showConfirmation={showConfirmation}
          showAllRelationships={showAllRelationships}
          setShowAllRelationships={setShowAllRelationships}
          showOnlySelectedRelationships={showOnlySelectedRelationships}
          setShowOnlySelectedRelationships={setShowOnlySelectedRelationships}
        />
      </ErrorBoundary>
      <main className="flex-grow overflow-hidden">
        {mainContent()}
      </main>
      {isSettingsOpen && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-slate-800 rounded-lg p-6">
                <p className="text-red-300 mb-4">Error loading settings modal</p>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <SettingsModal 
            patterns={patterns}
            tolerances={tolerances}
            appSettings={appSettings}
            colorSettings={colorSettings}
            onSaveOnly={handleSaveSettingsOnly}
            onSaveAndRescan={handleSaveSettingsAndRescan}
            onClose={() => setIsSettingsOpen(false)}
          />
        </ErrorBoundary>
      )}
      <ConfirmModal 
        isOpen={confirmation.isOpen}
        message={confirmation.message}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirmation}
      />
      
      {/* 🧪 임시 디버그 컴포넌트 */}
      <TagStoreDebug />
    </div>
  );
};

export default App;
