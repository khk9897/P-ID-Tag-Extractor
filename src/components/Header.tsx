import React, { useState, useRef, useEffect } from 'react';

// Store imports
import useTagStore from '../stores/tagStore.js';
import usePDFStore from '../stores/pdfStore.js';
import useViewerStore from '../stores/viewerStore.js';
import useUIStore from '../stores/uiStore.js';
import useProjectStore from '../stores/projectStore.js';
import useAutoLinkingStore from '../stores/autoLinkingStore.js';
import useRelationshipStore from '../stores/relationshipStore.js';
import useDescriptionStore from '../stores/descriptionStore.js';
import useCommentStore from '../stores/commentStore.js';
import useSettingsStore from '../stores/settingsStore.js';

// Types
interface HeaderProps {
  onReset: () => void;
  onToggleSidePanel: () => void;
}

// --- Helper Components ---

const Key = ({ text }: { text: React.ReactNode }) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-sky-300 bg-slate-700 rounded-md border-b-2 border-slate-600">
    {text}
  </kbd>
);

const HotkeyHelp = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const shortcuts = [
    { key: 'S', desc: <>Toggle <span className="text-sky-300 font-bold">S</span>ide Panel</> },
    { key: 'O', desc: <>Toggle <span className="text-sky-300 font-bold">O</span>PC Panel</> },
    { key: 'C', desc: <>Toggle <span className="text-sky-300 font-bold">C</span>onnect Mode</> },
    { key: 'K', desc: <>Toggle Manual Ma<span className="text-sky-300 font-bold">k</span>e Mode</> },
    { key: '←/→', desc: 'Navigate pages' },
    { key: '+/-', desc: 'Zoom in/out' },
    { key: '?', desc: 'Show this help' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-slate-300">{shortcut.desc}</span>
              <Key text={shortcut.key} />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-600">
          <p className="text-xs text-slate-400">Press <Key text="Esc" /> to close</p>
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, label }: { 
  checked: boolean; 
  onChange: () => void; 
  label: string; 
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-300">{label}</span>
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-sky-500' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

interface VisibilityPanelProps {
  onClose: () => void;
  visibilitySettings: any;
  toggleTagVisibility: (category: string) => void;
  toggleRelationshipVisibility: (type: string) => void;
  toggleAllTags: () => void;
  toggleAllRelationships: () => void;
  showAllRelationships: boolean;
  setShowAllRelationships: (show: boolean) => void;
  showOnlySelectedRelationships: boolean;
  setShowOnlySelectedRelationships: (show: boolean) => void;
}

const VisibilityPanel = ({
  onClose,
  visibilitySettings,
  toggleTagVisibility,
  toggleRelationshipVisibility,
  toggleAllTags,
  toggleAllRelationships,
  showAllRelationships,
  setShowAllRelationships,
  showOnlySelectedRelationships,
  setShowOnlySelectedRelationships,
}: VisibilityPanelProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const allTagsVisible = Object.values(visibilitySettings.tags).every(Boolean);
  const allRelationshipsVisible = Object.values(visibilitySettings.relationships).every(Boolean);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div
        ref={ref}
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600 max-h-96 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Visibility Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-slate-200">Tags</h4>
            <button
              onClick={toggleAllTags}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
            >
              {allTagsVisible ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(visibilitySettings.tags).map(([category, visible]) => (
              <ToggleSwitch
                key={category}
                checked={visible as boolean}
                onChange={() => toggleTagVisibility(category)}
                label={category}
              />
            ))}
          </div>
        </div>

        {/* Relationships Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-slate-200">Relationships</h4>
            <button
              onClick={toggleAllRelationships}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
            >
              {allRelationshipsVisible ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(visibilitySettings.relationships).map(([type, visible]) => (
              <ToggleSwitch
                key={type}
                checked={visible as boolean}
                onChange={() => toggleRelationshipVisibility(type)}
                label={type}
              />
            ))}
          </div>
        </div>

        {/* Relationship Display Options */}
        <div className="mb-4 space-y-2">
          <ToggleSwitch
            checked={showAllRelationships}
            onChange={() => setShowAllRelationships(!showAllRelationships)}
            label="Show All Relationships"
          />
          <ToggleSwitch
            checked={showOnlySelectedRelationships}
            onChange={() => setShowOnlySelectedRelationships(!showOnlySelectedRelationships)}
            label="Show Only Selected"
          />
        </div>
      </div>
    </div>
  );
};

// --- Main Header Component ---

export const Header: React.FC<HeaderProps> = ({ onReset, onToggleSidePanel }) => {
  // Local State
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  
  // Refs
  const importInputRef = useRef<HTMLInputElement>(null);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const tagStore = useTagStore();
  const pdfStore = usePDFStore();
  const viewerStore = useViewerStore();
  const uiStore = useUIStore();
  const projectStore = useProjectStore();
  const autoLinkingStore = useAutoLinkingStore();
  const relationshipStore = useRelationshipStore();
  const descriptionStore = useDescriptionStore();
  const commentStore = useCommentStore();
  const settingsStore = useSettingsStore();

  // Derived state
  const hasData = !!(pdfStore.pdfFile && pdfStore.pdfDoc);
  const currentPage = viewerStore.currentPage;
  const totalPages = pdfStore.totalPages;
  const scale = viewerStore.scale;
  const mode = viewerStore.mode;
  const visibilitySettings = uiStore.visibilitySettings;

  // --- Event Handlers (Now using store functions) ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const stores = {
        tagStore,
        relationshipStore,
        descriptionStore,
        commentStore,
        settingsStore
      };
      
      projectStore.handleFileImport(file, pdfStore.pdfFile, stores, uiStore);
      
      // Reset input
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  // Keyboard event handlers
  const keyboardCallbacks = {
    onToggleSidePanel,
    onToggleVisibilityPanel: () => setShowVisibilityPanel(!showVisibilityPanel),
    onToggleConnectMode: () => viewerStore.toggleMode('connect'),
    onToggleMakeMode: () => viewerStore.toggleMode('make'),
    onPreviousPage: () => viewerStore.goToPreviousPage(),
    onNextPage: () => viewerStore.goToNextPage(totalPages),
    onZoomIn: () => viewerStore.zoomIn(),
    onZoomOut: () => viewerStore.zoomOut(),
    onShowHelp: () => setShowHotkeyHelp(true),
  };

  // Effects
  useEffect(() => {
    const cleanup = uiStore.initializeHeaderKeyboardListener(keyboardCallbacks);
    return cleanup;
  }, [totalPages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setShowPageDropdown(false);
      }
    };

    if (showPageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPageDropdown]);

  // --- Render Methods ---

  const renderLogo = () => (
    <div className="flex items-center space-x-2">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-6 w-6 lg:h-8 lg:w-8 text-sky-400" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <path d="M14 2v6h6"></path>
        <path d="M16 13H8"></path>
        <path d="M16 17H8"></path>
        <path d="M10 9H8"></path>
      </svg>
      <div>
        <div className="text-sm lg:text-base font-bold text-sky-400">P&ID Smart Digitizer</div>
        <div className="text-xs text-slate-400 hidden lg:block">AI-Powered P&ID Analysis</div>
      </div>
    </div>
  );

  const renderFileActions = () => (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={importInputRef}
        className="hidden"
        accept=".json,application/json"
        onChange={handleFileChange}
      />
      <button
        onClick={() => importInputRef.current?.click()}
        disabled={!hasData}
        className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
      >
        📥 Import
      </button>
      <button
        onClick={() => {
          const stores = { tagStore, relationshipStore, descriptionStore, commentStore, settingsStore };
          projectStore.handleProjectExport(pdfStore, stores);
        }}
        disabled={!hasData}
        className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
      >
        📤 <span className="hidden md:inline ml-1">Export</span>
      </button>
      <button
        onClick={() => {
          const stores = { tagStore, relationshipStore, descriptionStore, commentStore };
          projectStore.handleExcelExport(stores);
        }}
        disabled={!hasData}
        className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
      >
        📊 <span className="hidden md:inline ml-1">Excel</span>
      </button>
    </div>
  );

  const renderNavigationControls = () => {
    if (!hasData) return null;

    return (
      <div className="flex items-center gap-2">
        {/* Page Navigation */}
        <div className="relative" ref={pageDropdownRef}>
          <button
            onClick={() => setShowPageDropdown(!showPageDropdown)}
            className="flex items-center bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-md text-xs border border-slate-600"
          >
            Page {currentPage}/{totalPages} ▼
          </button>
          
          {showPageDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => {
                    viewerStore.handlePageNavigation(page, totalPages);
                    setShowPageDropdown(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-slate-700 ${
                    page === currentPage ? 'bg-slate-700 text-sky-400' : 'text-white'
                  }`}
                >
                  Page {page}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => viewerStore.zoomOut()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs"
          >
            −
          </button>
          <span className="text-xs text-slate-300 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => viewerStore.zoomIn()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs"
          >
            +
          </button>
        </div>

        {/* Mode Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => viewerStore.setMode('select')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              mode === 'select'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            Select
          </button>
          <button
            onClick={() => viewerStore.toggleMode('connect')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              mode === 'connect'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            Connect
          </button>
          <button
            onClick={() => viewerStore.toggleMode('make')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              mode === 'make'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            Make
          </button>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => autoLinkingStore.handleAutoLinkAll()}
        disabled={!hasData || autoLinkingStore.isAutoLinking}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap"
      >
        {autoLinkingStore.isAutoLinking ? '⏳' : '🔗'} Auto-link
      </button>
      
      <button
        onClick={() => setShowVisibilityPanel(true)}
        disabled={!hasData}
        className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded-md text-xs transition-colors"
      >
        👁️
      </button>

      <button
        onClick={() => uiStore.setIsSettingsOpen(true)}
        className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded-md text-xs transition-colors"
      >
        ⚙️
      </button>

      <button
        onClick={() => setShowHotkeyHelp(true)}
        className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded-md text-xs transition-colors"
      >
        ?
      </button>

      <button
        onClick={onReset}
        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md text-xs transition-colors"
      >
        🔄
      </button>
    </div>
  );

  // --- Main Render ---

  return (
    <>
      <header className="relative flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-2 z-50">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {renderLogo()}
          
          <div className="flex items-center gap-4">
            {renderFileActions()}
            {renderNavigationControls()}
            {renderActionButtons()}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showHotkeyHelp && <HotkeyHelp onClose={() => setShowHotkeyHelp(false)} />}
      
      {showVisibilityPanel && (
        <VisibilityPanel
          onClose={() => setShowVisibilityPanel(false)}
          visibilitySettings={visibilitySettings}
          toggleTagVisibility={uiStore.toggleTagVisibility}
          toggleRelationshipVisibility={uiStore.toggleRelationshipVisibility}
          toggleAllTags={uiStore.toggleAllTags}
          toggleAllRelationships={uiStore.toggleAllRelationships}
          showAllRelationships={uiStore.showAllRelationships}
          setShowAllRelationships={uiStore.setShowAllRelationships}
          showOnlySelectedRelationships={uiStore.showOnlySelectedRelationships}
          setShowOnlySelectedRelationships={uiStore.setShowOnlySelectedRelationships}
        />
      )}
    </>
  );
};

export default Header;