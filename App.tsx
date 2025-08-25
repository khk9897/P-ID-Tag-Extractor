import React, { useState, useCallback, useEffect } from 'https://esm.sh/react@19.1.1';
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
  const [relationships, setRelationships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [patterns, setPatterns] = useState(() => {
    try {
      const savedPatterns = localStorage.getItem('pid-tagger-patterns');
      const parsed = savedPatterns ? JSON.parse(savedPatterns) : DEFAULT_PATTERNS;
      // Migration and validation for new pattern structure
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        Category.Equipment in parsed &&
        Category.Line in parsed &&
        Category.Instrument in parsed
      ) {
        return parsed;
      }
      return DEFAULT_PATTERNS; // Return default if stored data is old format or invalid
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

  const handleFileSelect = useCallback(async (file) => {
    setPdfFile(file);
    setIsLoading(true);
    setTags([]);
    setRelationships([]);
    setProgress({ current: 0, total: 0 });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setProgress({ current: 0, total: doc.numPages });
      
      let allTags = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const pageTags = await extractTags(doc, i, patterns);
        allTags = [...allTags, ...pageTags];
        setProgress(p => ({ ...p, current: i }));
      }
      setTags(allTags);
    } catch (error) {
      console.error("Error processing PDF:", error);
      console.error("Failed to process PDF file. It might be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  }, [patterns]);

  const handleReset = () => {
    setPdfFile(null);
    setPdfDoc(null);
    setTags([]);
    setRelationships([]);
    setIsLoading(false);
    setProgress({ current: 0, total: 0 });
  };

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
          setPatterns={setPatterns}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
