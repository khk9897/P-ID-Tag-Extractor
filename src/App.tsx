import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfUpload } from './components/PdfUpload.tsx';
import { Workspace } from './components/Workspace.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { extractTags } from './services/taggingService.ts';
import { DEFAULT_PATTERNS, DEFAULT_TOLERANCES } from './constants.ts';
import { 
  Category, 
  RelationshipType, 
  CategoryType,
  Tag,
  RawTextItem,
  Relationship,
  ConfirmModalProps,
  ProcessingProgress,
  ProjectData,
  PatternConfig,
  ToleranceConfig,
  ViewMode,
  ManualTagData
} from './types.ts';

// Set PDF.js worker source - use CDN for worker reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onCancel}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
          <p className="text-slate-300">{message}</p>
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
  const [showRelationships, setShowRelationships] = useState<boolean>(true);
  const [isSidePanelVisible, setIsSidePanelVisible] = useState<boolean>(true);

  
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
               console.log("Updated patterns with new categories or structure from defaults.");
          }
          return parsed;
      }
      
      // If format is completely wrong, return defaults
      return DEFAULT_PATTERNS; 
    } catch (error) {
      console.error("Failed to load patterns from localStorage", error);
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
            console.error("Failed to load tolerances from localStorage", error);
            return DEFAULT_TOLERANCES;
        }
    });

  useEffect(() => {
    try {
      localStorage.setItem('pid-tagger-patterns', JSON.stringify(patterns));
    } catch (error)
      {
      console.error("Failed to save patterns to localStorage", error);
    }
  }, [patterns]);

    useEffect(() => {
        try {
            localStorage.setItem('pid-tagger-tolerances', JSON.stringify(tolerances));
        } catch (error) {
            console.error("Failed to save tolerances to localStorage", error);
        }
    }, [tolerances]);
  
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            return;
        }

        if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            setIsSidePanelVisible(prev => !prev);
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []); // Run only once

  const showConfirmation = (message: string, onConfirm: () => void): void => {
    setConfirmation({ isOpen: true, message, onConfirm });
  };
  const handleCloseConfirmation = () => {
    setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
  };
  const handleConfirm = () => {
    confirmation.onConfirm();
    handleCloseConfirmation();
  };

  const processPdf = useCallback(async (doc: any, patternsToUse: PatternConfig, tolerancesToUse: ToleranceConfig): Promise<void> => {
    setIsLoading(true);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setProgress({ current: 0, total: doc.numPages });
    setCurrentPage(1); // Reset to first page on new process

    try {
      let allTags = [];
      let allRawTextItems = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const { tags: pageTags, rawTextItems: pageRawTextItems } = await extractTags(doc, i, patternsToUse, tolerancesToUse);
        allTags = [...allTags, ...pageTags];
        allRawTextItems = [...allRawTextItems, ...pageRawTextItems];
        setProgress(p => ({ ...p, current: i }));
      }
      setTags(allTags);
      setRawTextItems(allRawTextItems);
    } catch (error) {
      console.error("Error processing PDF:", error);
      console.error("Failed to process PDF file. It might be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      await processPdf(doc, patterns, tolerances);
    } catch (error) {
      console.error("Error loading PDF:", error);
      console.error("Failed to load PDF file. It might be corrupted or in an unsupported format.");
      setIsLoading(false);
    }
  }, [patterns, tolerances, processPdf]);

  const handleSaveSettings = async (newPatterns: PatternConfig, newTolerances: ToleranceConfig): Promise<void> => {
    setPatterns(newPatterns);
    setTolerances(newTolerances);
    setIsSettingsOpen(false);
    if (pdfDoc) {
      await processPdf(pdfDoc, newPatterns, newTolerances);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfDoc(null);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setIsLoading(false);
    setProgress({ current: 0, total: 0 });
    setCurrentPage(1);
    setScale(1.5);
    setMode('select');
  };
  
  const handleCreateTag = useCallback((itemsToConvert: RawTextItem[], category: CategoryType): void => {
    if (!itemsToConvert || itemsToConvert.length === 0) return;

    // All items must be on the same page
    const page = itemsToConvert[0].page;
    if (itemsToConvert.some(item => item.page !== page)) {
      console.error("Cannot combine items from different pages.");
      return;
    }

    const combinedText = itemsToConvert.map(item => item.text).join('-');
    
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
  }, []);

  const handleCreateManualTag = useCallback((tagData: ManualTagData): void => {
    const { text, bbox, page, category } = tagData;
    if (!text || !bbox || !page || !category) {
        console.error("Missing data for manual tag creation.");
        return;
    }

    const newTag = {
      id: uuidv4(),
      text,
      page,
      bbox,
      category,
      sourceItems: [], // No source items for manually drawn tags
    };

    setTags(prev => [...prev, newTag]);
  }, []);

  const handleDeleteTags = useCallback((tagIdsToDelete: string[]): void => {
    const idsToDelete = new Set(tagIdsToDelete);

    // Find the tags being deleted
    const tagsToRevert = tags.filter(tag => idsToDelete.has(tag.id));
    
    const itemsToRestore = [];
    
    for (const tag of tagsToRevert) {
      if (tag.sourceItems && tag.sourceItems.length > 0) {
        // It was a manually created tag, restore the original source items
        itemsToRestore.push(...tag.sourceItems);
      } else {
        // It was an originally detected tag. Revert to a single raw item.
        itemsToRestore.push({
          id: tag.id, // Reuse the tag's unique ID for the new raw item
          text: tag.text,
          page: tag.page,
          bbox: tag.bbox,
        });
      }
    }

    // Remove the tags
    setTags(prev => prev.filter(tag => !idsToDelete.has(tag.id)));
    // Add the restored/reverted items back to the pool of raw text items
    setRawTextItems(prev => [...prev, ...itemsToRestore]);
    // Clean up any relationships involving the deleted tags
    setRelationships(prev => prev.filter(rel => !idsToDelete.has(rel.from) && !idsToDelete.has(rel.to)));
  }, [tags]);
  
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
    
    if (sanitizedData.settings?.patterns) {
        setPatterns(sanitizedData.settings.patterns);
    }
    if (sanitizedData.settings?.tolerances) {
        setTolerances(sanitizedData.settings.tolerances);
    }
    
    console.log("Project loaded successfully.");
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
            console.error("Error parsing project file:", error);
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
        settings: {
            patterns,
            tolerances,
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
  
  const handleAutoLinkDescriptions = useCallback(() => {
    const autoLinkDistance = tolerances[Category.Instrument]?.autoLinkDistance;
    if (typeof autoLinkDistance !== 'number') {
        alert("Auto-link distance is not configured. Please check your settings.");
        return;
    }

    const performLinking = () => {
        const instrumentTags = tags.filter(t => t.category === Category.Instrument);
        const existingAnnotationTargets = new Set(
            relationships
                .filter(r => r.type === RelationshipType.Annotation)
                .map(r => r.to)
        );
        const unlinkedRawItems = rawTextItems.filter(item => !existingAnnotationTargets.has(item.id));
        const newRelationships = [];

        for (const instTag of instrumentTags) {
            const instCenter = {
                x: (instTag.bbox.x1 + instTag.bbox.x2) / 2,
                y: (instTag.bbox.y1 + instTag.bbox.y2) / 2
            };

            const pageRawItems = unlinkedRawItems.filter(item => item.page === instTag.page);

            for (const item of pageRawItems) {
                if (existingAnnotationTargets.has(item.id)) continue; // Already processed in this run

                const itemCenter = {
                    x: (item.bbox.x1 + item.bbox.x2) / 2,
                    y: (item.bbox.y1 + item.bbox.y2) / 2
                };

                const dx = instCenter.x - itemCenter.x;
                const dy = instCenter.y - itemCenter.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance <= autoLinkDistance) {
                    newRelationships.push({
                        id: uuidv4(),
                        from: instTag.id,
                        to: item.id,
                        type: RelationshipType.Annotation
                    });
                    existingAnnotationTargets.add(item.id); 
                }
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
            onCreateTag={handleCreateTag}
            onCreateManualTag={handleCreateManualTag}
            onDeleteTags={handleDeleteTags}
            onUpdateTagText={handleUpdateTagText}
            onDeleteRawTextItems={handleDeleteRawTextItems}
            onUpdateRawTextItemText={handleUpdateRawTextItemText}
            onAutoLinkDescriptions={handleAutoLinkDescriptions}
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
            showRelationships={showRelationships}
            setShowRelationships={setShowRelationships}
            isSidePanelVisible={isSidePanelVisible}
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
            onSave={handleSaveSettings}
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
