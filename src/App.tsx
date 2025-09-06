import React, { useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfUpload } from './components/PdfUpload.tsx';
import { Workspace } from './components/Workspace.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import ConfirmModal from './components/ConfirmModal.tsx';
import useTagStore from './stores/tagStore.js';
import useRawTextStore from './stores/rawTextStore.js';
import useRelationshipStore from './stores/relationshipStore.js';
import useCommentStore from './stores/commentStore.js';
import useDescriptionStore from './stores/descriptionStore.js';
import useEquipmentShortSpecStore from './stores/equipmentShortSpecStore.js';
import useAutoLinkingStore from './stores/autoLinkingStore.js';
import useProjectStore from './stores/projectStore.js';
import usePDFStore from './stores/pdfStore.js';
import useSettingsStore from './stores/settingsStore.js';
import useUIStore from './stores/uiStore.js';
import useLoopStore from './stores/loopStore.js';
import useViewerStore from './stores/viewerStore.js';
import useAppStore from './stores/appStore.js';

// Set PDF.js worker source - use local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', import.meta.url).href;

const App: React.FC = () => {
  const tagStore = useTagStore();
  const rawTextStore = useRawTextStore();
  const relationshipStore = useRelationshipStore();
  const commentStore = useCommentStore();
  const descriptionStore = useDescriptionStore();
  const equipmentShortSpecStore = useEquipmentShortSpecStore();
  const autoLinkingStore = useAutoLinkingStore();
  const projectStore = useProjectStore();
  const pdfStore = usePDFStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();
  const loopStore = useLoopStore();
  const viewerStore = useViewerStore();
  const appStore = useAppStore();
  
  // Initialize app on mount
  useEffect(() => {
    appStore.initializeApp();
  }, []);
  // Initialize keyboard listeners
  useEffect(() => {
    const cleanup = appStore.initializeKeyboardListeners(uiStore);
    return cleanup;
  }, [uiStore, appStore]);

  // Auto-create OPC relationships when tags change
  useEffect(() => {
    appStore.handleTagsChange(tagStore.tags, relationshipStore);
  }, [tagStore.tags, relationshipStore, appStore]);

  // Get app status and render appropriate content
  const appStatus = appStore.getAppStatus(pdfStore, viewerStore);
  
  const mainContent = () => {
    if (appStatus.status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white">
          <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg">{appStatus.message}</p>
          <p className="text-slate-400">Page {appStatus.progress.current} of {appStatus.progress.total}</p>
        </div>
      );
    }

    if (appStatus.status === 'ready') {
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
            pdfDoc={pdfStore.pdfDoc}
            tags={tagStore.tags}
            setTags={tagStore.setTags}
            relationships={relationshipStore.relationships}
            setRelationships={relationshipStore.setRelationships}
            rawTextItems={rawTextStore.rawTextItems}
            descriptions={descriptionStore.descriptions}
            setDescriptions={descriptionStore.setDescriptions}
            equipmentShortSpecs={equipmentShortSpecStore.equipmentShortSpecs}
            setEquipmentShortSpecs={equipmentShortSpecStore.setEquipmentShortSpecs}
            loops={loopStore.loops}
            setLoops={loopStore.setLoops}
            showConfirmation={uiStore.showConfirmation}
            // Pass down viewer state
            currentPage={viewerStore.currentPage}
            setCurrentPage={viewerStore.setCurrentPage}
            scale={viewerStore.scale}
            setScale={viewerStore.setScale}
            mode={viewerStore.mode}
            setMode={viewerStore.setMode}
            relationshipStartTag={viewerStore.relationshipStartTag}
            setRelationshipStartTag={viewerStore.setRelationshipStartTag}
            visibilitySettings={uiStore.visibilitySettings}
            updateVisibilitySettings={uiStore.updateVisibilitySettings}
            showAutoLinkRanges={uiStore.showAutoLinkRanges}
            tolerances={settingsStore.tolerances}
            toggleTagVisibility={uiStore.toggleTagVisibility}
            toggleRelationshipVisibility={uiStore.toggleRelationshipVisibility}
            toggleAllTags={uiStore.toggleAllTags}
            toggleAllRelationships={uiStore.toggleAllRelationships}
            showAllRelationships={uiStore.showAllRelationships}
            setShowAllRelationships={uiStore.setShowAllRelationships}
            showOnlySelectedRelationships={uiStore.showOnlySelectedRelationships}
            setShowOnlySelectedRelationships={uiStore.setShowOnlySelectedRelationships}
            isSidePanelVisible={uiStore.isSidePanelVisible}
            onAutoLinkDescriptions={autoLinkingStore.autoLinkDescriptions}
            onAutoLinkNotesAndHolds={autoLinkingStore.autoLinkNotesAndHolds}
            onAutoLinkEquipmentShortSpecs={autoLinkingStore.autoLinkEquipmentShortSpecs}
            showRelationships={uiStore.showAllRelationships}
            setShowRelationships={uiStore.setShowAllRelationships}
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
        <PdfUpload onFileSelect={(file) => appStore.handleFileUpload(file, pdfStore)} />
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
          onReset={() => appStore.handleAppReset(projectStore)} 
          onToggleSidePanel={() => appStore.handleToggleSidePanel(uiStore)}
        />
      </ErrorBoundary>
      <main className="flex-grow overflow-hidden">
        {mainContent()}
      </main>
      {uiStore.isSettingsOpen && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-slate-800 rounded-lg p-6">
                <p className="text-red-300 mb-4">Error loading settings modal</p>
                <button
                  onClick={() => uiStore.setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <SettingsModal 
            patterns={settingsStore.patterns}
            tolerances={settingsStore.tolerances}
            appSettings={settingsStore.appSettings}
            colorSettings={settingsStore.colorSettings}
            onSaveOnly={(patterns, tolerances, appSettings, colorSettings) => 
              settingsStore.saveSettingsOnly(patterns, tolerances, appSettings, colorSettings, uiStore)}
            onSaveAndRescan={(patterns, tolerances, appSettings, colorSettings, activeTab) => 
              settingsStore.saveSettingsAndRescan(patterns, tolerances, appSettings, colorSettings, activeTab, uiStore, 
                { pdfStore, tagStore, relationshipStore, commentStore, loopStore, equipmentShortSpecStore }, pdfStore.processPdf)}
            onClose={() => uiStore.setIsSettingsOpen(false)}
          />
        </ErrorBoundary>
      )}
      <ConfirmModal 
        isOpen={uiStore.confirmation.isOpen}
        message={uiStore.confirmation.message}
        onConfirm={uiStore.confirm}
        onCancel={uiStore.closeConfirmation}
      />
      
      {/* 🧪 임시 디버그 컴포넌트 */}
    </div>
  );
};

export default App;
