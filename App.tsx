import React, { useState, useCallback, useEffect } from 'https://esm.sh/react@19.1.1';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@11.1.0';
import { PdfUpload } from './components/PdfUpload.tsx';
import { Workspace } from './components/Workspace.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { extractTags } from './services/taggingService.ts';
import { DEFAULT_PATTERNS } from './constants.ts';
import { Category } from './types.ts';

// Set PDF.js worker source globally
if ((window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = (window as any).pdfjsWorker;
}

const App = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [tags, setTags] = useState([]);
  const [rawTextItems, setRawTextItems] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [patterns, setPatterns] = useState(() => {
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
          if (updated) {
               console.log("Updated patterns with new categories from defaults.");
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

  useEffect(() => {
    try {
      localStorage.setItem('pid-tagger-patterns', JSON.stringify(patterns));
    } catch (error)
      {
      console.error("Failed to save patterns to localStorage", error);
    }
  }, [patterns]);

  const processPdf = useCallback(async (doc, patternsToUse) => {
    setIsLoading(true);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setProgress({ current: 0, total: doc.numPages });

    try {
      let allTags = [];
      let allRawTextItems = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const { tags: pageTags, rawTextItems: pageRawTextItems } = await extractTags(doc, i, patternsToUse);
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

  const handleFileSelect = useCallback(async (file) => {
    setPdfFile(file);
    setIsLoading(true);
    setTags([]);
    setRawTextItems([]);
    setRelationships([]);
    setProgress({ current: 0, total: 0 });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      await processPdf(doc, patterns);
    } catch (error) {
      console.error("Error loading PDF:", error);
      console.error("Failed to load PDF file. It might be corrupted or in an unsupported format.");
      setIsLoading(false);
    }
  }, [patterns, processPdf]);

  const handleSaveSettings = async (newPatterns) => {
    setPatterns(newPatterns);
    setIsSettingsOpen(false);
    if (pdfDoc) {
      await processPdf(pdfDoc, newPatterns);
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
  };
  
  const handleCreateTag = useCallback((itemsToConvert, category) => {
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
  }, []);

  const handleCreateManualTag = useCallback(({ text, bbox, page, category }) => {
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

  const handleDeleteTags = useCallback((tagIdsToDelete) => {
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

  const handleUpdateTagText = useCallback((tagId, newText) => {
    setTags(prevTags => prevTags.map(tag => 
      tag.id === tagId ? { ...tag, text: newText } : tag
    ));
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
        />
      );
    }
    
    return <PdfUpload onFileSelect={handleFileSelect} />;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 font-sans">
      <Header onReset={handleReset} hasData={!!pdfFile} onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-grow overflow-hidden">
        {mainContent()}
      </main>
      {isSettingsOpen && (
        <SettingsModal 
          patterns={patterns}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
