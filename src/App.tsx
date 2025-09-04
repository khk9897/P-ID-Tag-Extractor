import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfUpload } from './components/PdfUpload.tsx';
import { Workspace } from './components/Workspace.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { extractTags, createOPCRelationships } from './services/taggingService.ts';
import { DEFAULT_PATTERNS, DEFAULT_TOLERANCES, DEFAULT_SETTINGS, DEFAULT_COLORS } from './constants.ts';
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // TODO: Add proper PDF.js type
  const [tags, setTags] = useState<Tag[]>([]);
  const [rawTextItems, setRawTextItems] = useState<RawTextItem[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
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
      annotation: true,
      note: true,
      offPageConnection: true,
    },
  });
  
  // Keep backward compatibility - derive showRelationships from relationships settings
  const showRelationships = Object.values(visibilitySettings.relationships).some(Boolean);
  const [isSidePanelVisible, setIsSidePanelVisible] = useState<boolean>(true);
  const [isOPCPanelVisible, setIsOPCPanelVisible] = useState<boolean>(false);
  const [showAutoLinkRanges, setShowAutoLinkRanges] = useState<boolean>(false);
  const [focusOPCConnection, setFocusOPCConnection] = useState<string | null>(null);
  
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
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            return;
        }

        if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            setIsSidePanelVisible(prev => !prev);
        } else if (e.key.toLowerCase() === 'o') {
            e.preventDefault();
            setIsOPCPanelVisible(prev => !prev);
        } else if (e.key.toLowerCase() === 'v') {
            e.preventDefault();
            // Toggle visibility panel by dispatching a custom event
            window.dispatchEvent(new CustomEvent('toggleVisibilityPanel'));
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
          return [...nonOpcRel, ...opcRelationships];
        });
      }
    }
  }, [tags]); // Run when tags change

  const handleOPCTagClick = useCallback((tagText: string): void => {
    setFocusOPCConnection(tagText);
    // Clear focus after a short delay to allow for re-focusing
    setTimeout(() => setFocusOPCConnection(null), 100);
  }, []);

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
          autoGenerateLoops(allTags);
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
      await processPdf(doc, patterns, tolerances, appSettings);
    } catch (error) {
      setIsLoading(false);
    }
  }, [patterns, tolerances, appSettings, processPdf]);

  const handleSaveSettingsOnly = (newPatterns: PatternConfig, newTolerances: ToleranceConfig, newAppSettings: AppSettings, newColorSettings: ColorSettings): void => {
    setPatterns(newPatterns);
    setTolerances(newTolerances);
    setAppSettings(newAppSettings);
    setColorSettings(newColorSettings);
    setIsSettingsOpen(false);
    
    // Store to localStorage
    localStorage.setItem('pid-tagger-patterns', JSON.stringify(newPatterns));
    localStorage.setItem('pid-tagger-tolerances', JSON.stringify(newTolerances));
    localStorage.setItem('pid-tagger-app-settings', JSON.stringify(newAppSettings));
    localStorage.setItem('pid-tagger-color-settings', JSON.stringify(newColorSettings));
  };

  const handleSaveSettingsAndRescan = async (newPatterns: PatternConfig, newTolerances: ToleranceConfig, newAppSettings: AppSettings, newColorSettings: ColorSettings, activeTab: string): Promise<void> => {
    setPatterns(newPatterns);
    setTolerances(newTolerances);
    setAppSettings(newAppSettings);
    setColorSettings(newColorSettings);
    setIsSettingsOpen(false);
    
    // Store to localStorage
    localStorage.setItem('pid-tagger-patterns', JSON.stringify(newPatterns));
    localStorage.setItem('pid-tagger-tolerances', JSON.stringify(newTolerances));
    localStorage.setItem('pid-tagger-app-settings', JSON.stringify(newAppSettings));
    localStorage.setItem('pid-tagger-color-settings', JSON.stringify(newColorSettings));
    
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
  
  const handleCreateTag = useCallback((itemsToConvert: RawTextItem[], category: CategoryType): void => {
    if (!itemsToConvert || itemsToConvert.length === 0) return;

    // All items must be on the same page
    const page = itemsToConvert[0].page;
    if (itemsToConvert.some(item => item.page !== page)) {
      return;
    }

    // Sort items by position (top to bottom, then left to right)
    const sortedItems = [...itemsToConvert].sort((a, b) => {
      // First sort by vertical position (top to bottom, smaller y values first in screen coordinates)
      const yDiff = a.bbox.y1 - b.bbox.y1;
      if (Math.abs(yDiff) > 5) { // Allow small vertical tolerance for alignment
        return yDiff;
      }
      // If vertically aligned, sort by horizontal position (left to right)
      return a.bbox.x1 - b.bbox.x1;
    });
    
    // Combine text with appropriate separator based on category settings
    const shouldUseHyphen = (() => {
      switch (category) {
        case Category.Equipment: return appSettings.hyphenSettings.equipment;
        case Category.Line: return appSettings.hyphenSettings.line;
        case Category.Instrument: return appSettings.hyphenSettings.instrument;
        case Category.DrawingNumber: return appSettings.hyphenSettings.drawingNumber;
        case Category.NotesAndHolds: return appSettings.hyphenSettings.notesAndHolds;
        case Category.SpecialItem: return appSettings.hyphenSettings.specialItem;
        default: return false;
      }
    })();
    
    const rawCombinedText = shouldUseHyphen
      ? sortedItems.map(item => item.text).join('-')
      : sortedItems.map(item => item.text).join('');
    
    // Apply whitespace removal based on settings (except for NotesAndHolds)
    const combinedText = (appSettings.autoRemoveWhitespace && category !== Category.NotesAndHolds) 
      ? rawCombinedText.replace(/\s+/g, '') 
      : rawCombinedText;
    
    const combinedBbox = itemsToConvert.reduce((acc, item) => {
      return {
        x1: Math.min(acc.x1, item.bbox.x1),
        y1: Math.min(acc.y1, item.bbox.y1),
        x2: Math.max(acc.x2, item.bbox.x2),
        y2: Math.max(acc.y2, item.bbox.y2),
      };
    }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

    const newTag = {
      id: uuidv4(),
      text: combinedText,
      page,
      bbox: combinedBbox,
      category,
      sourceItems: itemsToConvert, // Store original items
    };

    setTags(prev => [...prev, newTag]);
    const idsToConvert = new Set(itemsToConvert.map(item => item.id));
    setRawTextItems(prev => prev.filter(item => !idsToConvert.has(item.id)));
    // Clean up any annotation relationships involving the now-converted raw items
    setRelationships(prev => prev.filter(rel => !(rel.type === RelationshipType.Annotation && idsToConvert.has(rel.to))));
  }, [appSettings.autoRemoveWhitespace, appSettings.hyphenSettings]);

  const handleCreateManualTag = useCallback((tagData: ManualTagData): void => {
    const { text, bbox, page, category } = tagData;
    if (!text || !bbox || !page || !category) {
        return;
    }

    // Apply whitespace removal based on settings (except for NotesAndHolds)
    const cleanedText = (appSettings.autoRemoveWhitespace && category !== Category.NotesAndHolds) 
      ? text.replace(/\s+/g, '') 
      : text;

    const newTag = {
      id: uuidv4(),
      text: cleanedText,
      page,
      bbox,
      category,
      sourceItems: [], // No source items for manually drawn tags
    };

    setTags(prev => [...prev, newTag]);
  }, [appSettings.autoRemoveWhitespace]);

  const handleDeleteTags = useCallback((tagIdsToDelete: string[]): void => {
    const idsToDelete = new Set(tagIdsToDelete);

    // Find the tags being deleted
    const tagsToRevert = tags.filter(tag => idsToDelete.has(tag.id));
    
    const itemsToRestore = [];
    
    for (const tag of tagsToRevert) {
      if (tag.sourceItems && tag.sourceItems.length > 0) {
        // It was a manually created tag, restore the original source items
        // Convert source items to proper RawTextItem format
        const convertedItems = tag.sourceItems.map(item => ({
          id: uuidv4(),
          text: item.str || item.text, // Handle both formats
          page: tag.page,
          bbox: item.bbox || {
            x1: item.transform[4],
            y1: item.transform[5] - item.height,
            x2: item.transform[4] + item.width,
            y2: item.transform[5],
          },
        }));
        itemsToRestore.push(...convertedItems);
      } else {
        // It was an originally detected tag. Revert to a single raw item.
        const restoredItem = {
          id: uuidv4(), // Generate new unique ID for the raw item
          text: tag.text,
          page: tag.page,
          bbox: tag.bbox,
        };
        itemsToRestore.push(restoredItem);
      }
    }

    // Remove the tags
    setTags(prev => prev.filter(tag => !idsToDelete.has(tag.id)));
    // Add the restored/reverted items back to the pool of raw text items
    setRawTextItems(prev => [...prev, ...itemsToRestore]);
    // Clean up any relationships involving the deleted tags
    setRelationships(prev => prev.filter(rel => !idsToDelete.has(rel.from) && !idsToDelete.has(rel.to)));
    // Clean up any comments for the deleted tags
    setComments(prev => prev.filter(comment => !idsToDelete.has(comment.targetId)));
  }, [tags]);
  
  const handleMergeRawTextItems = useCallback((itemIdsToMerge: string[]): void => {
    if (!itemIdsToMerge || itemIdsToMerge.length < 2) return;

    const itemsToMerge = rawTextItems.filter(item => itemIdsToMerge.includes(item.id));
    if (itemsToMerge.length < 2) return;

    // All items must be on the same page
    const page = itemsToMerge[0].page;
    if (itemsToMerge.some(item => item.page !== page)) {
      return;
    }


    // Sort items by position (top to bottom, then left to right)
    const sortedItems = [...itemsToMerge].sort((a, b) => {
      // First sort by vertical position (top to bottom, smaller y values first in screen coordinates)
      const yDiff = a.bbox.y1 - b.bbox.y1;
      if (Math.abs(yDiff) > 5) { // Allow small vertical tolerance for alignment
        return yDiff;
      }
      // If vertically aligned, sort by horizontal position (left to right)
      return a.bbox.x1 - b.bbox.x1;
    });

    // Combine text with spaces
    const combinedText = sortedItems.map(item => item.text).join(' ');
    
    // Calculate combined bounding box
    const combinedBbox = itemsToMerge.reduce((acc, item) => {
      return {
        x1: Math.min(acc.x1, item.bbox.x1),
        y1: Math.min(acc.y1, item.bbox.y1),
        x2: Math.max(acc.x2, item.bbox.x2),
        y2: Math.max(acc.y2, item.bbox.y2),
      };
    }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

    // Create new merged item
    const mergedItem: RawTextItem = {
      id: uuidv4(),
      text: combinedText,
      page,
      bbox: combinedBbox,
    };

    // Remove original items and add merged item
    const idsToRemove = new Set(itemIdsToMerge);
    setRawTextItems(prev => [
      ...prev.filter(item => !idsToRemove.has(item.id)),
      mergedItem
    ]);

    // Clean up any relationships pointing to the removed items
    setRelationships(prev => prev.filter(rel => !idsToRemove.has(rel.to)));
  }, [rawTextItems]);

  const handleDeleteRawTextItems = useCallback((itemIdsToDelete: string[]): void => {
    const idsToDelete = new Set(itemIdsToDelete);
    setRawTextItems(prev => prev.filter(item => !idsToDelete.has(item.id)));
    // Also remove any relationships pointing to these items
    setRelationships(prev => prev.filter(rel => !idsToDelete.has(rel.to)));
  }, []);

  const handleUpdateTagText = useCallback((tagId: string, newText: string): void => {
    setTags(prevTags => prevTags.map(tag => 
      tag.id === tagId ? { ...tag, text: newText } : tag
    ));
  }, []);

  const handleUpdateRawTextItemText = useCallback((itemId: string, newText: string): void => {
    setRawTextItems(prevItems => prevItems.map(item =>
        item.id === itemId ? { ...item, text: newText } : item
    ));
  }, []);

  const handleCreateDescription = useCallback((selectedItems: (Tag | RawTextItem)[], type: 'Note' | 'Hold' = 'Note'): void => {
    if (!selectedItems || selectedItems.length === 0) return;

    // Sort by Y coordinate (top to bottom) - in screen coordinate system, smaller Y values are at the top
    const sortedItems = [...selectedItems].sort((a, b) => a.bbox.y1 - b.bbox.y1);
    
    // Merge text content
    const text = sortedItems.map(item => item.text).join(' ');
    
    // Calculate merged bounding box
    const mergedBbox = {
      x1: Math.min(...sortedItems.map(item => item.bbox.x1)),
      y1: Math.min(...sortedItems.map(item => item.bbox.y1)),
      x2: Math.max(...sortedItems.map(item => item.bbox.x2)),
      y2: Math.max(...sortedItems.map(item => item.bbox.y2)),
    };

    // Find next available number for this page and type
    const currentPage = sortedItems[0].page;
    const descriptionType = type;
    const existingNumbers = descriptions
      .filter(desc => desc.metadata.type === descriptionType && desc.page === currentPage)
      .map(desc => desc.metadata.number);
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const newDescription: Description = {
      id: uuidv4(),
      text,
      page: sortedItems[0].page,
      bbox: mergedBbox,
      sourceItems: sortedItems,
      metadata: {
        type: descriptionType,
        scope: 'Specific',
        number: nextNumber,
      },
    };

    setDescriptions(prev => [...prev, newDescription]);

    // Auto-link with Note/Hold tags (same as in handleAutoLinkNotesAndHolds)
    const extractNumbers = (tagText: string): number[] => {
      const numberMatches = tagText.match(/\d+/g);
      return numberMatches ? numberMatches.map(num => parseInt(num, 10)) : [];
    };

    const detectNoteHoldType = (tagText: string): 'Note' | 'Hold' | null => {
      const lowerText = tagText.toLowerCase();
      if (lowerText.includes('note')) return 'Note';
      if (lowerText.includes('hold')) return 'Hold';
      return null;
    };

    // Find Note/Hold tags on the same page that match this description
    const noteHoldTags = tags.filter(t => 
      t.category === Category.NotesAndHolds && 
      t.page === currentPage
    );

    const newRelationships = [];
    for (const tag of noteHoldTags) {
      const tagType = detectNoteHoldType(tag.text);
      if (!tagType || tagType !== descriptionType) continue;

      const numbers = extractNumbers(tag.text);
      if (numbers.includes(nextNumber)) {
        // Check if relationship doesn't already exist
        const relationshipKey = `${tag.id}-${newDescription.id}`;
        const existsAlready = relationships.some(r => 
          r.from === tag.id && r.to === newDescription.id && r.type === RelationshipType.Description
        );
        
        if (!existsAlready) {
          newRelationships.push({
            id: uuidv4(),
            from: tag.id,
            to: newDescription.id,
            type: RelationshipType.Description
          });
        }
      }
    }

    if (newRelationships.length > 0) {
      setRelationships(prev => [...prev, ...newRelationships]);
    }

    // Remove tags that were converted to description
    const tagIdsToRemove = selectedItems
      .filter(item => 'category' in item) // Only tags have category
      .map(tag => tag.id);
    
    if (tagIdsToRemove.length > 0) {
      setTags(prev => prev.filter(tag => !tagIdsToRemove.includes(tag.id)));
    }

    // Remove raw text items that were converted to description  
    const rawItemIdsToRemove = selectedItems
      .filter(item => !('category' in item)) // Only raw items don't have category
      .map(item => item.id);
    
    if (rawItemIdsToRemove.length > 0) {
      setRawTextItems(prev => prev.filter(item => !rawItemIdsToRemove.includes(item.id)));
    }
  }, [descriptions, tags, relationships]);

  const handleCreateHoldDescription = useCallback((selectedItems: (Tag | RawTextItem)[]): void => {
    handleCreateDescription(selectedItems, 'Hold');
  }, [handleCreateDescription]);

  const handleCreateEquipmentShortSpec = useCallback((selectedItems: (Tag | RawTextItem)[]): void => {
    if (!selectedItems || selectedItems.length === 0) return;

    // Find Equipment tags - support multiple equipment tags (e.g., A/B/C/D/E)
    const equipmentTags = selectedItems.filter(item => 'category' in item && item.category === Category.Equipment) as Tag[];
    
    if (equipmentTags.length === 0) {
      return;
    }

    // Use the first equipment tag as the primary one for metadata
    const primaryEquipmentTag = equipmentTags[0];
    const nonTagItems = selectedItems.filter(item => !('category' in item));

    if (nonTagItems.length === 0) {
      return;
    }

    // Sort all items by Y coordinate (top to bottom)
    const sortedItems = [...selectedItems].sort((a, b) => a.bbox.y1 - b.bbox.y1);
    
    // Sort non-tag items by Y coordinate (top to bottom)
    const sortedNonTagItems = nonTagItems.sort((a, b) => a.bbox.y1 - b.bbox.y1);
    
    // Get the topmost non-Equipment item for Service metadata
    const serviceItem = sortedNonTagItems[0];
    const serviceText = serviceItem ? serviceItem.text : '';
    
    // Exclude the first item (service) from the short spec text content
    const shortSpecItems = sortedNonTagItems.slice(1); // Skip first item (service)
    
    // Merge text content from remaining non-tag items with line breaks for different Y positions
    let text = '';
    let previousY = null;
    const yTolerance = 5; // Y coordinate tolerance for considering items on the same line
    
    for (let i = 0; i < shortSpecItems.length; i++) {
      const item = shortSpecItems[i];
      const currentY = item.bbox.y1;
      
      // Add line break if this item is on a significantly different Y coordinate
      if (previousY !== null && Math.abs(currentY - previousY) > yTolerance) {
        text += '\n';
      } else if (text.length > 0 && !text.endsWith('\n')) {
        // Add space if on same line and not first item
        text += ' ';
      }
      
      text += item.text;
      previousY = currentY;
    }
    
    // Calculate merged bounding box from all items
    const mergedBbox = {
      x1: Math.min(...sortedItems.map(item => item.bbox.x1)),
      y1: Math.min(...sortedItems.map(item => item.bbox.y1)),
      x2: Math.max(...sortedItems.map(item => item.bbox.x2)),
      y2: Math.max(...sortedItems.map(item => item.bbox.y2)),
    };

    const newEquipmentShortSpec: EquipmentShortSpec = {
      id: uuidv4(),
      text,
      page: sortedItems[0].page,
      bbox: mergedBbox,
      sourceItems: sortedItems,
      metadata: {
        originalEquipmentTag: primaryEquipmentTag,
        service: serviceText,
      },
    };

    setEquipmentShortSpecs(prev => [...prev, newEquipmentShortSpec]);

    // Auto-link with Equipment tags using the same logic as handleAutoLinkEquipmentShortSpecs
    const extractBasePattern = (tagText: string): { base: string; suffix?: string } => {
      const abPattern = tagText.match(/^(.+?)([A-Z](?:\/[A-Z])+|[A-Z])$/);
      if (abPattern) {
        const base = abPattern[1];
        const suffix = abPattern[2];
        return { base, suffix };
      }
      return { base: tagText };
    };

    const findMatchingEquipmentTags = (shortSpec: EquipmentShortSpec, equipmentTags: Tag[]): Tag[] => {
      const originalTag = shortSpec.metadata.originalEquipmentTag;
      const { base: originalBase, suffix: originalSuffix } = extractBasePattern(originalTag.text);
      
      const originalHasABPattern = originalSuffix && originalSuffix.includes('/');
      const textHasABPattern = /[A-Z]\/[A-Z]|[A-Z],[A-Z]|[A-Z]\s*&\s*[A-Z]/.test(shortSpec.text);
      const hasABPattern = originalHasABPattern || textHasABPattern;
      
      const matchingTags = [];
      
      for (const tag of equipmentTags) {
        const { base: tagBase, suffix: tagSuffix } = extractBasePattern(tag.text);
        
        // Exact match
        if (tag.text === originalTag.text) {
          matchingTags.push(tag);
          continue;
        }
        
        // Base pattern match (same page only)
        if (tagBase === originalBase && tag.page === shortSpec.page) {
          if (hasABPattern) {
            matchingTags.push(tag);
          } else if (!tagSuffix) {
            matchingTags.push(tag);
          }
        }
      }
      return matchingTags;
    };

    // Find all Equipment tags on the page that match the pattern
    const allEquipmentTags = tags.filter(t => t.category === Category.Equipment);
    const matchingTags = findMatchingEquipmentTags(newEquipmentShortSpec, allEquipmentTags);

    // Track existing relationships to avoid duplicates
    const existingRelationshipKeys = new Set(
      relationships
        .filter(r => r.type === RelationshipType.EquipmentShortSpec)
        .map(r => `${r.from}-${r.to}`)
    );

    // Create relationships with all matching Equipment tags
    const newRelationships = [];
    for (const tag of matchingTags) {
      const relationshipKey = `${tag.id}-${newEquipmentShortSpec.id}`;
      if (!existingRelationshipKeys.has(relationshipKey)) {
        newRelationships.push({
          id: uuidv4(),
          from: tag.id,
          to: newEquipmentShortSpec.id,
          type: RelationshipType.EquipmentShortSpec,
        });
        existingRelationshipKeys.add(relationshipKey);
      }
    }

    if (newRelationships.length > 0) {
      setRelationships(prev => [...prev, ...newRelationships]);
    }

    // Remove all selected Equipment tags from tags
    const equipmentTagIds = equipmentTags.map(tag => tag.id);
    setTags(prev => prev.filter(tag => !equipmentTagIds.includes(tag.id)));

    // Remove raw text items that were converted
    const rawItemIdsToRemove = nonTagItems
      .filter(item => !('category' in item))
      .map(item => item.id);
    
    if (rawItemIdsToRemove.length > 0) {
      setRawTextItems(prev => prev.filter(item => !rawItemIdsToRemove.includes(item.id)));
    }
  }, [equipmentShortSpecs, tags, relationships]);

  const handleDeleteEquipmentShortSpecs = useCallback((equipmentShortSpecIds: string[]): void => {
    // Find specs to be deleted to restore their source items
    const specsToDelete = equipmentShortSpecs.filter(spec => equipmentShortSpecIds.includes(spec.id));
    
    // Restore Equipment tags and raw text items
    specsToDelete.forEach(spec => {
      // Restore all Equipment tags from sourceItems
      const equipmentTagsToRestore = spec.sourceItems.filter(item => 
        'category' in item && item.category === Category.Equipment
      ) as Tag[];
      
      if (equipmentTagsToRestore.length > 0) {
        setTags(prev => [...prev, ...equipmentTagsToRestore]);
      }
      
      // Restore raw text items that were converted (excluding the Equipment tags)
      const rawItemsToRestore = spec.sourceItems.filter(item => 
        !('category' in item) // Only raw text items, not tags
      );
      
      if (rawItemsToRestore.length > 0) {
        setRawTextItems(prev => [...prev, ...rawItemsToRestore]);
      }
    });
    
    // Remove the equipment short specs
    setEquipmentShortSpecs(prev => prev.filter(spec => !equipmentShortSpecIds.includes(spec.id)));
  }, [equipmentShortSpecs]);

  const handleUpdateEquipmentShortSpec = useCallback((id: string, text: string, metadata?: any): void => {
    setEquipmentShortSpecs(prev => prev.map(spec =>
      spec.id === id ? { 
        ...spec, 
        text,
        ...(metadata && { metadata })
      } : spec
    ));
  }, []);

  const handleDeleteDescriptions = useCallback((descriptionIds: string[]): void => {
    const idsToDelete = new Set(descriptionIds);
    
    // Get descriptions to be deleted to restore their source items
    const descriptionsToDelete = descriptions.filter(desc => idsToDelete.has(desc.id));
    
    // Restore source items
    descriptionsToDelete.forEach(desc => {
      desc.sourceItems.forEach(sourceItem => {
        if ('category' in sourceItem) {
          // This is a Tag, restore it
          setTags(prev => {
            // Check if tag already exists to avoid duplicates
            const exists = prev.some(tag => tag.id === sourceItem.id);
            if (!exists) {
              return [...prev, sourceItem as Tag];
            }
            return prev;
          });
        } else {
          // This is a RawTextItem, restore it
          setRawTextItems(prev => {
            // Check if raw text item already exists to avoid duplicates
            const exists = prev.some(item => item.id === sourceItem.id);
            if (!exists) {
              return [...prev, sourceItem as RawTextItem];
            }
            return prev;
          });
        }
      });
    });
    
    // Remove the descriptions
    setDescriptions(prev => prev.filter(desc => !idsToDelete.has(desc.id)));
    
    // Clean up relationships
    setRelationships(prev => prev.filter(rel => !idsToDelete.has(rel.from) && !idsToDelete.has(rel.to)));
  }, [descriptions]);

  const handleUpdateDescription = useCallback((id: string, text: string, metadata: Description['metadata']): void => {
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

  // Comment management functions
  const handleCreateComment = useCallback((
    targetId: string, 
    targetType: CommentTargetType, 
    content: string, 
    priority: CommentPriority = 'medium'
  ): void => {
    const newComment: Comment = {
      id: uuidv4(),
      targetId,
      targetType,
      content,
      author: 'User',
      timestamp: Date.now(),
      isResolved: false,
      priority
    };
    
    setComments(prev => [...prev, newComment]);
  }, []);

  const handleUpdateComment = useCallback((
    commentId: string, 
    updates: Partial<Pick<Comment, 'content' | 'priority' | 'isResolved'>>
  ): void => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, ...updates, timestamp: updates.content ? Date.now() : comment.timestamp }
        : comment
    ));
  }, []);

  const handleDeleteComment = useCallback((commentId: string): void => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  }, []);

  const handleDeleteCommentsForTarget = useCallback((targetId: string): void => {
    setComments(prev => prev.filter(comment => comment.targetId !== targetId));
  }, []);

  const getCommentsForTarget = useCallback((targetId: string): Comment[] => {
    return comments.filter(comment => comment.targetId === targetId);
  }, [comments]);

  const validateProjectData = (data: any): data is ProjectData => {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    
    // Required fields validation
    const requiredFields = ['pdfFileName', 'exportDate', 'tags', 'relationships', 'rawTextItems'];
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Type validation for arrays
    if (!Array.isArray(data.tags) || !Array.isArray(data.relationships) || !Array.isArray(data.rawTextItems)) {
      return false;
    }
    
    // Optional descriptions field validation
    if (data.descriptions && !Array.isArray(data.descriptions)) {
      return false;
    }
    
    // Validate tag structure
    for (const tag of data.tags) {
      if (!tag.id || !tag.text || !tag.page || !tag.bbox || !tag.category) {
        return false;
      }
      if (!tag.bbox.hasOwnProperty('x1') || !tag.bbox.hasOwnProperty('y1') || 
          !tag.bbox.hasOwnProperty('x2') || !tag.bbox.hasOwnProperty('y2')) {
        return false;
      }
    }
    
    // Validate relationship structure
    for (const rel of data.relationships) {
      if (!rel.id || !rel.from || !rel.to || !rel.type) {
        return false;
      }
      if (!Object.values(RelationshipType).includes(rel.type)) {
        return false;
      }
    }
    
    // Validate rawTextItems structure
    for (const item of data.rawTextItems) {
      if (!item.id || !item.text || !item.page || !item.bbox) {
        return false;
      }
    }
    
    return true;
  };

  const sanitizeProjectData = (data: ProjectData): ProjectData => {
    // Sanitize strings to prevent XSS
    const sanitizeString = (str: string): string => {
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+="[^"]*"/gi, '');
    };
    
    return {
      ...data,
      pdfFileName: sanitizeString(data.pdfFileName),
      tags: data.tags.map(tag => ({
        ...tag,
        text: sanitizeString(tag.text)
      })),
      rawTextItems: data.rawTextItems.map(item => ({
        ...item,
        text: sanitizeString(item.text)
      })),
      descriptions: (data.descriptions || []).map(desc => ({
        ...desc,
        text: sanitizeString(desc.text)
      }))
    };
  };

  const loadProjectData = useCallback((projectData: any): void => {
    if (!validateProjectData(projectData)) {
      alert("Invalid project file structure or corrupted data. Cannot load.");
      return;
    }
    
    const sanitizedData = sanitizeProjectData(projectData);
    
    setTags(sanitizedData.tags);
    setRelationships(sanitizedData.relationships);
    setRawTextItems(sanitizedData.rawTextItems);
    setDescriptions(sanitizedData.descriptions || []);
    setEquipmentShortSpecs(sanitizedData.equipmentShortSpecs || []);
    setLoops(sanitizedData.loops || []);
    setComments(sanitizedData.comments || []);
    
    if (sanitizedData.settings?.patterns) {
        setPatterns(sanitizedData.settings.patterns);
    }
    if (sanitizedData.settings?.tolerances) {
        setTolerances(sanitizedData.settings.tolerances);
    }
    if (sanitizedData.settings?.appSettings) {
        setAppSettings(sanitizedData.settings.appSettings);
    }
    
  }, []);

  const handleImportProject = useCallback(async (file: File): Promise<void> => {
    if (!file || !pdfFile) {
        alert("Please open a PDF file before importing a project file.");
        return;
    }
    
    // File size validation (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert("Project file is too large. Maximum file size is 50MB.");
        return;
    }
    
    // File type validation
    if (!file.name.toLowerCase().endsWith('.json')) {
        alert("Please select a valid JSON project file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            if (!content) {
                throw new Error("File content is empty");
            }
            
            // Additional JSON parsing security
            if (content.includes('<script>') || content.includes('javascript:')) {
                throw new Error("Project file contains potentially malicious content");
            }
            
            const projectData = JSON.parse(content);
            
            if (projectData.pdfFileName !== pdfFile.name) {
                const sanitizedOldName = projectData.pdfFileName?.replace(/[<>]/g, '') || 'Unknown';
                showConfirmation(
                    `This project file seems to be for a different PDF ("${sanitizedOldName}"). You currently have "${pdfFile.name}" open. Do you want to load the project data anyway?`,
                    () => loadProjectData(projectData)
                );
            } else {
                loadProjectData(projectData);
            }
        } catch (error) {
            let errorMessage = "Could not load project. ";
            
            if (error instanceof SyntaxError) {
                errorMessage += "The file contains invalid JSON format.";
            } else if (error.message.includes('malicious')) {
                errorMessage += "The file contains potentially unsafe content.";
            } else {
                errorMessage += "The file might be corrupted or in an invalid format.";
            }
            
            alert(errorMessage);
        }
    };
    
    reader.onerror = () => {
        alert("Error reading file. Please try again.");
    };
    
    reader.readAsText(file);
  }, [pdfFile, loadProjectData, showConfirmation]);

  const handleExportProject = useCallback(() => {
    if (!pdfFile) return;

    const projectData = {
        pdfFileName: pdfFile.name,
        exportDate: new Date().toISOString(),
        tags,
        relationships,
        rawTextItems,
        descriptions,
        equipmentShortSpecs,
        comments,
        loops,
        settings: {
            patterns,
            tolerances,
            appSettings,
        },
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = pdfFile.name.replace(/\.pdf$/i, '') + '-project.json';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pdfFile, tags, relationships, rawTextItems, patterns, tolerances]);
  
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
    const autoLinkDistance = tolerances[Category.Instrument]?.autoLinkDistance;
    if (typeof autoLinkDistance !== 'number') {
        alert("Auto-link distance is not configured. Please check your settings.");
        return;
    }

    // Show range circles first
    setShowAutoLinkRanges(true);
    
    // Show confirmation after a brief delay to display ranges
    setTimeout(() => {
      showConfirmation(
        `This will automatically create description links for all Instrument tags based on the current distance setting (${autoLinkDistance}px). This may create many relationships. Do you want to proceed?`,
        () => {
          setShowAutoLinkRanges(false);
          performLinking();
        }
      );
    }, 500);

    const performLinking = () => {
        const instrumentTags = tags.filter(t => t.category === Category.Instrument);
        const existingAnnotationTargets = new Set(
            relationships
                .filter(r => r.type === RelationshipType.Annotation)
                .map(r => r.to)
        );
        const unlinkedRawItems = rawTextItems.filter(item => !existingAnnotationTargets.has(item.id));
        const newRelationships = [];

        // For each non-tag item, find the closest instrument tag within distance
        for (const item of unlinkedRawItems) {
            if (existingAnnotationTargets.has(item.id)) continue;

            const pageInstrumentTags = instrumentTags.filter(tag => tag.page === item.page);
            let closestTag = null;
            let minDistance = Infinity;

            for (const instTag of pageInstrumentTags) {
                const instCenter = {
                    x: (instTag.bbox.x1 + instTag.bbox.x2) / 2,
                    y: (instTag.bbox.y1 + instTag.bbox.y2) / 2
                };

                const distance = calculateMinDistanceToCorners(instCenter.x, instCenter.y, item.bbox);
                
                if (distance <= autoLinkDistance && distance < minDistance) {
                    minDistance = distance;
                    closestTag = instTag;
                }
            }

            // Create relationship only with the closest instrument tag
            if (closestTag) {
                newRelationships.push({
                    id: uuidv4(),
                    from: closestTag.id,
                    to: item.id,
                    type: RelationshipType.Annotation
                });
                existingAnnotationTargets.add(item.id); 
            }
        }
        
        if (newRelationships.length > 0) {
            const existingRelsSet = new Set(relationships.map(r => `${r.from}-${r.to}-${r.type}`));
            const uniqueNewRels = newRelationships.filter(r => !existingRelsSet.has(`${r.from}-${r.to}-${r.type}`));
            
            if (uniqueNewRels.length > 0) {
                setRelationships(prev => [...prev, ...uniqueNewRels]);
                alert(`${uniqueNewRels.length} new description link(s) created.`);
            } else {
                alert('No new description links could be found. They may already exist.');
            }
        } else {
            alert('No new description links could be found with the current settings.');
        }
    };
    
    showConfirmation(
        `This will automatically create description links for all Instrument tags based on the current distance setting (${autoLinkDistance}px). This may create many relationships. Do you want to proceed?`,
        performLinking
    );
  }, [tags, rawTextItems, relationships, tolerances, showConfirmation]);

  const handleAutoLinkNotesAndHolds = useCallback(() => {
    const detectNoteHoldType = (tagText: string): 'Note' | 'Hold' | null => {
      const lowerText = tagText.toLowerCase();
      if (lowerText.includes('note')) return 'Note';
      if (lowerText.includes('hold')) return 'Hold';
      return null;
    };

    const extractNumbers = (tagText: string): number[] => {
      // Extract numbers from text (handles comma-separated values)
      const numberMatches = tagText.match(/\d+/g);
      return numberMatches ? numberMatches.map(num => parseInt(num, 10)) : [];
    };

    const performLinking = () => {
      const noteHoldTags = tags.filter(t => t.category === Category.NotesAndHolds);
      // Track existing relationships to avoid duplicates
      const existingRelationshipKeys = new Set(
        relationships
          .filter(r => r.type === RelationshipType.Description)
          .map(r => `${r.from}-${r.to}`)
      );
      const newRelationships = [];

      for (const tag of noteHoldTags) {
        const type = detectNoteHoldType(tag.text);
        if (!type) continue;

        const numbers = extractNumbers(tag.text);
        if (numbers.length === 0) continue;

        // Find matching descriptions (same page only)
        for (const number of numbers) {
          const matchingDescriptions = descriptions.filter(desc => 
            desc.metadata.type === type && 
            desc.metadata.number === number &&
            desc.metadata.scope === 'Specific' &&
            desc.page === tag.page
          );

          for (const desc of matchingDescriptions) {
            const relationshipKey = `${tag.id}-${desc.id}`;
            // Only create relationship if it doesn't already exist
            if (!existingRelationshipKeys.has(relationshipKey)) {
              newRelationships.push({
                id: uuidv4(),
                from: tag.id,
                to: desc.id,
                type: RelationshipType.Description
              });
              existingRelationshipKeys.add(relationshipKey);
            }
          }
        }
      }

      if (newRelationships.length > 0) {
        const existingRelsSet = new Set(relationships.map(r => `${r.from}-${r.to}-${r.type}`));
        const uniqueNewRels = newRelationships.filter(r => !existingRelsSet.has(`${r.from}-${r.to}-${r.type}`));
        
        if (uniqueNewRels.length > 0) {
          setRelationships(prev => [...prev, ...uniqueNewRels]);
          alert(`${uniqueNewRels.length} new Note & Hold link(s) created.`);
        } else {
          alert('No new Note & Hold links could be found. They may already exist.');
        }
      } else {
        alert('No new Note & Hold links could be found with the current data.');
      }
    };

    showConfirmation(
      'This will automatically create links between Note & Hold tags and their corresponding descriptions based on type and number matching. Do you want to proceed?',
      performLinking
    );
  }, [tags, descriptions, relationships, showConfirmation]);

  const handleAutoLinkEquipmentShortSpecs = useCallback(() => {
    const extractBasePattern = (tagText: string): { base: string; suffix?: string } => {
      // Extract base pattern and suffix (A, B, C, etc.)
      // Handle complex cases like "D44-EM-7209A/B/C/D/E/F/H/G" and simple "D44-G-7201A"
      const abPattern = tagText.match(/^(.+?)([A-Z](?:\/[A-Z])+|[A-Z])$/);
      if (abPattern) {
        const base = abPattern[1];
        const suffix = abPattern[2];
        return { base, suffix };
      }
      return { base: tagText };
    };

    const findMatchingEquipmentTags = (shortSpec: EquipmentShortSpec, equipmentTags: Tag[]): Tag[] => {
      const originalTag = shortSpec.metadata.originalEquipmentTag;
      const { base: originalBase, suffix: originalSuffix } = extractBasePattern(originalTag.text);
      
      // Look for A/B patterns in both the original tag and short spec text
      const originalHasABPattern = originalSuffix && originalSuffix.includes('/');
      const textHasABPattern = /[A-Z]\/[A-Z]|[A-Z],[A-Z]|[A-Z]\s*&\s*[A-Z]/.test(shortSpec.text);
      const hasABPattern = originalHasABPattern || textHasABPattern;
      
      const matchingTags = [];
      
      for (const tag of equipmentTags) {
        const { base: tagBase, suffix: tagSuffix } = extractBasePattern(tag.text);
        
        // Exact match
        if (tag.text === originalTag.text) {
          matchingTags.push(tag);
          continue;
        }
        
        // Base pattern match
        if (tagBase === originalBase) {
          // If original tag or short spec has A/B pattern, include all tags with the same base
          if (hasABPattern) {
            matchingTags.push(tag);
          } else if (!tagSuffix) {
            // If no suffix in tag, and no A/B pattern, it's a match
            matchingTags.push(tag);
          }
        }
      }
      return matchingTags;
    };

    const performLinking = () => {
      const equipmentTags = tags.filter(t => t.category === Category.Equipment);
      
      // Track existing relationships to avoid duplicates
      const existingRelationshipKeys = new Set(
        relationships
          .filter(r => r.type === RelationshipType.EquipmentShortSpec)
          .map(r => `${r.from}-${r.to}`)
      );
      
      const newRelationships = [];
      
      for (const shortSpec of equipmentShortSpecs) {
        const matchingTags = findMatchingEquipmentTags(shortSpec, equipmentTags);
        
        for (const tag of matchingTags) {
          const relationshipKey = `${tag.id}-${shortSpec.id}`;
          
          // Only create relationship if it doesn't already exist
          if (!existingRelationshipKeys.has(relationshipKey)) {
            newRelationships.push({
              id: uuidv4(),
              from: tag.id,
              to: shortSpec.id,
              type: RelationshipType.EquipmentShortSpec,
            });
          }
        }
      }
      
      if (newRelationships.length > 0) {
        setRelationships(prev => [...prev, ...newRelationships]);
        alert(`Successfully linked ${newRelationships.length} Equipment tag(s) to Equipment Short Spec(s).`);
      } else {
        alert("No new Equipment-Short Spec relationships found to create.");
      }
    };

    if (equipmentShortSpecs.length === 0) {
      alert("No Equipment Short Specs available to link.");
      return;
    }

    if (tags.filter(t => t.category === Category.Equipment).length === 0) {
      alert("No Equipment tags available to link.");
      return;
    }

    showConfirmation(
      `This will automatically create relationships between Equipment tags and Equipment Short Specs. Continue?`,
      performLinking
    );
  }, [tags, equipmentShortSpecs, relationships, showConfirmation]);

  const handleAutoLinkAll = useCallback(async () => {
    showConfirmation(
      'This will run all auto-linking functions in sequence: Descriptions, Notes & Holds, and Equipment Short Specs. Continue?',
      async () => {
        try {
          // Run all auto-link functions sequentially
          await new Promise<void>((resolve) => {
            const performDescriptions = () => {
              const instrumentTags = tags.filter(t => t.category === Category.Instrument);
              const autoLinkDistance = tolerances[Category.Instrument]?.autoLinkDistance;
              
              if (typeof autoLinkDistance !== 'number' || instrumentTags.length === 0) {
                resolve();
                return;
              }
              
              const existingAnnotationTargets = new Set(
                relationships
                  .filter(r => r.type === RelationshipType.Annotation)
                  .map(r => r.to)
              );
              
              const newRelationships = [];
              const unlinkedRawItems = rawTextItems.filter(item => !existingAnnotationTargets.has(item.id));
              
              // For each non-tag item, find the closest instrument tag within distance
              for (const item of unlinkedRawItems) {
                if (existingAnnotationTargets.has(item.id)) continue;

                const pageInstrumentTags = instrumentTags.filter(tag => tag.page === item.page);
                let closestTag = null;
                let minDistance = Infinity;

                for (const tag of pageInstrumentTags) {
                  const instCenter = {
                    x: (tag.bbox.x1 + tag.bbox.x2) / 2,
                    y: (tag.bbox.y1 + tag.bbox.y2) / 2
                  };

                  const distance = calculateMinDistanceToCorners(instCenter.x, instCenter.y, item.bbox);
                  
                  if (distance <= autoLinkDistance && distance < minDistance) {
                    minDistance = distance;
                    closestTag = tag;
                  }
                }

                // Create relationship only with the closest instrument tag
                if (closestTag) {
                  newRelationships.push({
                    id: uuidv4(),
                    from: closestTag.id,
                    to: item.id,
                    type: RelationshipType.Annotation
                  });
                  existingAnnotationTargets.add(item.id); 
                }
              }
              
              if (newRelationships.length > 0) {
                setRelationships(prev => [...prev, ...newRelationships]);
              }
              resolve();
            };
            
            performDescriptions();
          });
          
          await new Promise<void>((resolve) => {
            const performNotesAndHolds = () => {
              const noteHoldTags = tags.filter(t => t.category === Category.NotesAndHolds);
              const existingRelationshipKeys = new Set(
                relationships
                  .filter(r => r.type === RelationshipType.Description)
                  .map(r => `${r.from}-${r.to}`)
              );
              const newRelationships = [];
              
              for (const tag of noteHoldTags) {
                const lowerText = tag.text.toLowerCase();
                const type = lowerText.includes('note') ? 'Note' : lowerText.includes('hold') ? 'Hold' : null;
                if (!type) continue;
                
                const numberMatches = tag.text.match(/\d+/g);
                const numbers = numberMatches ? numberMatches.map(num => parseInt(num, 10)) : [];
                if (numbers.length === 0) continue;
                
                for (const number of numbers) {
                  const matchingDescriptions = descriptions.filter(desc => 
                    desc.metadata.type === type && 
                    desc.metadata.number === number &&
                    desc.metadata.scope === 'Specific' &&
                    desc.page === tag.page
                  );
                  
                  for (const desc of matchingDescriptions) {
                    const relationshipKey = `${tag.id}-${desc.id}`;
                    if (!existingRelationshipKeys.has(relationshipKey)) {
                      newRelationships.push({
                        id: uuidv4(),
                        from: tag.id,
                        to: desc.id,
                        type: RelationshipType.Description,
                      });
                    }
                  }
                }
              }
              
              if (newRelationships.length > 0) {
                setRelationships(prev => [...prev, ...newRelationships]);
              }
              resolve();
            };
            
            performNotesAndHolds();
          });
          
          await new Promise<void>((resolve) => {
            const performEquipmentShortSpecs = () => {
              const equipmentTags = tags.filter(t => t.category === Category.Equipment);
              const existingRelationshipKeys = new Set(
                relationships
                  .filter(r => r.type === RelationshipType.EquipmentShortSpec)
                  .map(r => `${r.from}-${r.to}`)
              );
              const newRelationships = [];
              
              for (const shortSpec of equipmentShortSpecs) {
                const originalTag = shortSpec.metadata.originalEquipmentTag;
                const originalBase = originalTag.text.match(/^(.+?)([A-Z]\/[A-Z]|[A-Z])?$/)?.[1] || originalTag.text;
                const originalSuffix = originalTag.text.match(/^(.+?)([A-Z]\/[A-Z]|[A-Z])?$/)?.[2];
                
                const originalHasABPattern = originalSuffix && originalSuffix.includes('/');
                const textHasABPattern = /[A-Z]\/[A-Z]|[A-Z],[A-Z]|[A-Z]\s*&\s*[A-Z]/.test(shortSpec.text);
                const hasABPattern = originalHasABPattern || textHasABPattern;
                
                for (const tag of equipmentTags) {
                  const tagBase = tag.text.match(/^(.+?)([A-Z]\/[A-Z]|[A-Z])?$/)?.[1] || tag.text;
                  const tagSuffix = tag.text.match(/^(.+?)([A-Z]\/[A-Z]|[A-Z])?$/)?.[2];
                  
                  if (tag.text === originalTag.text || (tagBase === originalBase && (hasABPattern || !tagSuffix))) {
                    const relationshipKey = `${tag.id}-${shortSpec.id}`;
                    if (!existingRelationshipKeys.has(relationshipKey)) {
                      newRelationships.push({
                        id: uuidv4(),
                        from: tag.id,
                        to: shortSpec.id,
                        type: RelationshipType.EquipmentShortSpec,
                      });
                    }
                  }
                }
              }
              
              if (newRelationships.length > 0) {
                setRelationships(prev => [...prev, ...newRelationships]);
              }
              resolve();
            };
            
            performEquipmentShortSpecs();
          });
          
          alert('All auto-linking completed successfully!');
        } catch (error) {
          alert('Error during auto-linking: ' + error.message);
        }
      }
    );
  }, [tags, rawTextItems, descriptions, equipmentShortSpecs, relationships, tolerances, showConfirmation]);

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

  // Loop generation utility functions
  const parseInstrumentTag = useCallback((text: string) => {
    const cleanText = text.trim();
    
    // Match patterns: "PT-7083 C", "PZV-7012 A", "PIC-101", etc.
    const match = cleanText.match(/^([A-Z]{1,4})-?(\d+)[\s]*([A-Z]*)$/);
    if (match) {
      return {
        function: match[1].trim(),
        number: parseInt(match[2]),
        suffix: match[3].trim()
      };
    }
    
    // Try alternative pattern without dash: "PT7083C"
    const altMatch = cleanText.match(/^([A-Z]{1,4})(\d+)([A-Z]*)$/);
    if (altMatch) {
      return {
        function: altMatch[1].trim(),
        number: parseInt(altMatch[2]),
        suffix: altMatch[3].trim()
      };
    }
    
    return null;
  }, []);

  const generateLoopId = useCallback((instrumentTags: Tag[]) => {
    if (instrumentTags.length === 0) return null;
    
    const firstTag = instrumentTags[0];
    const parsed = parseInstrumentTag(firstTag.text);
    if (!parsed) return firstTag.text.charAt(0) + '-' + '000';
    
    // Find common function prefix among all tags
    let commonPrefix = parsed.function;
    for (const tag of instrumentTags.slice(1)) {
      const tagParsed = parseInstrumentTag(tag.text);
      if (tagParsed && tagParsed.number === parsed.number) {
        // Find common prefix between functions
        let i = 0;
        while (i < commonPrefix.length && i < tagParsed.function.length && 
               commonPrefix[i] === tagParsed.function[i]) {
          i++;
        }
        commonPrefix = commonPrefix.substring(0, i);
      }
    }
    
    // Fallback to first letter if no common prefix
    if (commonPrefix.length === 0) {
      commonPrefix = parsed.function.charAt(0);
    }
    
    return `${commonPrefix}-${parsed.number}`;
  }, [parseInstrumentTag]);

  const autoGenerateLoops = useCallback((allTags: Tag[]) => {
    const instrumentTags = allTags.filter(t => t.category === Category.Instrument);
    
    if (instrumentTags.length === 0) {
      return;
    }

    // Group by 1-letter prefix and number
    const oneLetterGroups = new Map<string, Tag[]>();
    
    for (const tag of instrumentTags) {
      const parsed = parseInstrumentTag(tag.text);
      if (!parsed) continue;
      
      const oneLetterKey = `${parsed.function.charAt(0)}-${parsed.number}`;
      if (!oneLetterGroups.has(oneLetterKey)) {
        oneLetterGroups.set(oneLetterKey, []);
      }
      oneLetterGroups.get(oneLetterKey)!.push(tag);
    }
    
    // Create loops from groups with multiple tags
    const newLoops: Loop[] = [];
    oneLetterGroups.forEach((groupTags) => {
      if (groupTags.length > 1) {
        const loopId = generateLoopId(groupTags);
        if (loopId) {
          const newLoop: Loop = {
            id: loopId,
            tagIds: groupTags.map(t => t.id),
            createdAt: new Date().toISOString(),
            isAutoGenerated: true
          };
          newLoops.push(newLoop);
        }
      }
    });
    
    if (newLoops.length > 0) {
      setLoops(prev => [...prev, ...newLoops]);
    }
  }, [parseInstrumentTag, generateLoopId]);

  const handleAutoGenerateLoops = useCallback((pageFilter?: number) => {
    const instrumentTags = tags.filter(t => 
      t.category === Category.Instrument && 
      (pageFilter ? t.page === pageFilter : true)
    );
    
    if (instrumentTags.length === 0) {
      alert('No instrument tags found to create loops.');
      return;
    }

    showConfirmation(
      `This will automatically create loops from ${instrumentTags.length} instrument tags based on function prefix and number matching. Continue?`,
      () => {
        // First, group by 1-letter prefix and number
        const oneLetterGroups = new Map<string, Tag[]>();
        
        for (const tag of instrumentTags) {
          const parsed = parseInstrumentTag(tag.text);
          if (!parsed) continue;
          
          const oneLetterKey = `${parsed.function.charAt(0)}-${parsed.number}`;
          if (!oneLetterGroups.has(oneLetterKey)) {
            oneLetterGroups.set(oneLetterKey, []);
          }
          oneLetterGroups.get(oneLetterKey)!.push(tag);
        }
        
        // Use 1-letter groups as the primary grouping method
        const loopGroups = oneLetterGroups;
        
        // Create loops from groups with multiple tags
        const newLoops: Loop[] = [];
        const existingLoopIds = new Set(loops.map(l => l.id));
        
        for (const [groupKey, groupTags] of loopGroups.entries()) {
          if (groupTags.length > 1) {
            const loopId = generateLoopId(groupTags) || groupKey;
            
            // Skip if loop already exists
            if (existingLoopIds.has(loopId)) continue;
            
            newLoops.push({
              id: loopId,
              tagIds: groupTags.map(t => t.id),
              createdAt: new Date().toISOString(),
              isAutoGenerated: true
            });
          }
        }
        
        if (newLoops.length > 0) {
          setLoops(prev => [...prev, ...newLoops]);
          alert(`Created ${newLoops.length} new loops from ${newLoops.reduce((sum, loop) => sum + loop.tagIds.length, 0)} instrument tags.`);
        } else {
          alert('No new loops could be created. They may already exist or no matching groups were found.');
        }
      }
    );
  }, [tags, loops, parseInstrumentTag, generateLoopId, showConfirmation]);

  const handleManualCreateLoop = useCallback((selectedTagIds: string[]) => {
    const selectedInstrumentTags = tags.filter(t => 
      selectedTagIds.includes(t.id) && t.category === Category.Instrument
    );
    
    if (selectedInstrumentTags.length < 2) {
      alert('Please select at least 2 instrument tags to create a loop.');
      return;
    }
    
    const loopId = generateLoopId(selectedInstrumentTags);
    if (!loopId) {
      alert('Could not generate loop ID from selected tags.');
      return;
    }
    
    // Check if loop already exists
    const existingLoop = loops.find(l => l.id === loopId);
    if (existingLoop) {
      alert(`Loop "${loopId}" already exists.`);
      return;
    }
    
    const newLoop: Loop = {
      id: loopId,
      tagIds: selectedInstrumentTags.map(t => t.id),
      createdAt: new Date().toISOString(),
      isAutoGenerated: false
    };
    
    setLoops(prev => [...prev, newLoop]);
    alert(`Created loop "${loopId}" with ${selectedInstrumentTags.length} instrument tags.`);
  }, [tags, loops, generateLoopId]);

  const handleDeleteLoops = useCallback((loopIds: string[]) => {
    setLoops(prev => prev.filter(l => !loopIds.includes(l.id)));
  }, []);

  const handleUpdateLoop = useCallback((loopId: string, updates: Partial<Loop>) => {
    setLoops(prev => {
      const updatedLoops = prev.map(loop => 
        loop.id === loopId 
          ? { ...loop, ...updates }
          : loop
      );
      
      // Remove loops with no tags
      return updatedLoops.filter(loop => loop.tagIds && loop.tagIds.length > 0);
    });
  }, []);

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
            onCreateTag={handleCreateTag}
            onCreateManualTag={handleCreateManualTag}
            onCreateDescription={handleCreateDescription}
            onCreateHoldDescription={handleCreateHoldDescription}
            onCreateEquipmentShortSpec={handleCreateEquipmentShortSpec}
            onDeleteTags={handleDeleteTags}
            onUpdateTagText={handleUpdateTagText}
            onDeleteDescriptions={handleDeleteDescriptions}
            onUpdateDescription={handleUpdateDescription}
            onDeleteEquipmentShortSpecs={handleDeleteEquipmentShortSpecs}
            onUpdateEquipmentShortSpec={handleUpdateEquipmentShortSpec}
            onMergeRawTextItems={handleMergeRawTextItems}
            onDeleteRawTextItems={handleDeleteRawTextItems}
            onUpdateRawTextItemText={handleUpdateRawTextItemText}
            onAutoLinkDescriptions={handleAutoLinkDescriptions}
            onAutoLinkNotesAndHolds={handleAutoLinkNotesAndHolds}
            onAutoLinkEquipmentShortSpecs={handleAutoLinkEquipmentShortSpecs}
            onAutoGenerateLoops={handleAutoGenerateLoops}
            onManualCreateLoop={handleManualCreateLoop}
            onDeleteLoops={handleDeleteLoops}
            onUpdateLoop={handleUpdateLoop}
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
            comments={comments}
            onCreateComment={handleCreateComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            getCommentsForTarget={getCommentsForTarget}
            isSidePanelVisible={isSidePanelVisible}
            isOPCPanelVisible={isOPCPanelVisible}
            colorSettings={colorSettings}
            focusOPCConnection={focusOPCConnection}
            onOPCTagClick={handleOPCTagClick}
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
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          scale={scale}
          setScale={setScale}
          mode={mode}
          onToggleSidePanel={() => setIsSidePanelVisible(p => !p)}
          onToggleOPCPanel={() => setIsOPCPanelVisible(p => !p)}
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
    </div>
  );
};

export default App;
