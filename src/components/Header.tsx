import React, { useState, useRef, useEffect } from 'react';
import { EXTERNAL_LINKS } from '../constants.ts';

// --- Components moved from App.tsx for colocation ---

type KeyProps = {
  text: React.ReactNode;
};
const Key = ({ text }: KeyProps) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-sky-300 bg-slate-700 rounded-md border-b-2 border-slate-600">
    {text}
  </kbd>
);

const HotkeyHelp = ({ onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const modes = [
    { key: 'S', desc: <>Toggle <span className="text-sky-300 font-bold">S</span>ide Panel</> },
    { key: 'C', desc: <>Toggle <span className="text-sky-300 font-bold">C</span>onnect Mode</> },
    { key: 'K', desc: <>Toggle Manual Ma<span className="text-sky-300 font-bold">k</span>e Mode</> },
    { key: 'V', desc: <>Toggle <span className="text-sky-300 font-bold">V</span>isibility Panel</> },
    { key: '/', desc: <>Show Hotkey Help <span className="text-sky-300 font-bold">/</span></> },
    { key: 'Esc', desc: <><span className="text-sky-300 font-bold">Esc</span> Mode / Clear Selection</> },
  ];
  const actions = [
    { key: 'M', desc: <><span className="text-sky-300 font-bold">M</span>erge multiple text items into one</> },
    { key: 'N', desc: <>Make <span className="text-sky-300 font-bold">N</span>ote Description from selected items</> },
    { key: 'H', desc: <>Make <span className="text-sky-300 font-bold">H</span>old Description from selected items</> },
    { key: 'P', desc: <>Make Equipment Short S<span className="text-sky-300 font-bold">p</span>ec</> },
    { key: 'L', desc: <>Make <span className="text-sky-300 font-bold">L</span>oop from selected instruments</> },
    { key: 'I', desc: <>Make "<span className="text-sky-300 font-bold">I</span>nstall" relationship</> },
    { key: 'R', desc: <>Make <span className="text-sky-300 font-bold">R</span>elationships (Note/Annotation)</> },
    { key: 'Delete', desc: <><span className="text-sky-300 font-bold">Delete</span> selected tag(s)</> },
  ];

  return (
    <div ref={ref} className="absolute top-16 right-4 z-20 w-96 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-4 text-white animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
      <div className="flex justify-between items-center mb-3 border-b border-slate-600 pb-2">
        <h3 className="text-md font-bold">Hotkeys & Controls</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-700 transition-colors"
          title="Close (Esc)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">Navigation & Selection</h4>
            <dl className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between items-center"><dt>Pan View</dt><dd><Key text="Drag" /></dd></div>
                <div className="flex justify-between items-center"><dt>Zoom Out</dt><dd><Key text="1" /></dd></div>
                <div className="flex justify-between items-center"><dt>Zoom In</dt><dd><Key text="2" /></dd></div>
                <div className="flex justify-between items-center"><dt>Previous Page</dt><dd><Key text="Q" /></dd></div>
                <div className="flex justify-between items-center"><dt>Next Page</dt><dd><Key text="W" /></dd></div>
                <div className="flex justify-between items-center"><dt>Area Select</dt><dd><Key text="Ctrl" /> + <Key text="Drag" /></dd></div>
            </dl>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">Modes</h4>
            <dl className="space-y-2 text-sm text-slate-300">
                {modes.map(m => <div key={m.key} className="flex justify-between items-center"><dt>{m.desc}</dt><dd><Key text={m.key} /></dd></div>)}
            </dl>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">Actions</h4>
            <dl className="space-y-2 text-sm text-slate-300">
                {actions.map(a => <div key={a.key} className="flex justify-between items-center"><dt>{a.desc}</dt><dd><Key text={a.key} /></dd></div>)}
            </dl>
        </div>
      </div>
    </div>
  );
};

const VisibilityPanel = ({ onClose, visibilitySettings, toggleTagVisibility, toggleRelationshipVisibility, toggleAllTags, toggleAllRelationships, updateVisibilitySettings }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const allTagsVisible = Object.values(visibilitySettings.tags).every(Boolean);
  const allRelationshipsVisible = Object.values(visibilitySettings.relationships).every(Boolean);

  const ToggleSwitch = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={onChange}
        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
          checked ? 'bg-sky-600' : 'bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div ref={ref} className="absolute top-16 right-4 z-20 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-4 text-white animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
      <h3 className="text-md font-bold mb-3 border-b border-slate-600 pb-2">Visibility Controls</h3>
      
      <div className="space-y-4">
        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-slate-400">Tags</h4>
            <button
              onClick={toggleAllTags}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              {allTagsVisible ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <ToggleSwitch
              checked={visibilitySettings.tags.equipment}
              onChange={() => toggleTagVisibility('equipment')}
              label="Equipment"
            />
            <ToggleSwitch
              checked={visibilitySettings.tags.line}
              onChange={() => toggleTagVisibility('line')}
              label="Line"
            />
            <ToggleSwitch
              checked={visibilitySettings.tags.instrument}
              onChange={() => toggleTagVisibility('instrument')}
              label="Instrument"
            />
            <ToggleSwitch
              checked={visibilitySettings.tags.drawingNumber}
              onChange={() => toggleTagVisibility('drawingNumber')}
              label="Drawing Number"
            />
            <ToggleSwitch
              checked={visibilitySettings.tags.notesAndHolds}
              onChange={() => toggleTagVisibility('notesAndHolds')}
              label="Notes & Holds"
            />
          </div>
        </div>

        {/* Other Elements Section */}
        <div>
          <h4 className="font-semibold text-sm text-slate-400 mb-2">Other Elements</h4>
          <div className="space-y-2 text-sm">
            <ToggleSwitch
              checked={visibilitySettings.descriptions}
              onChange={() => updateVisibilitySettings({ descriptions: !visibilitySettings.descriptions })}
              label="Descriptions"
            />
            <ToggleSwitch
              checked={visibilitySettings.equipmentShortSpecs}
              onChange={() => updateVisibilitySettings({ equipmentShortSpecs: !visibilitySettings.equipmentShortSpecs })}
              label="Equipment Short Specs"
            />
          </div>
        </div>

        {/* Relationships Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-slate-400">Relationships</h4>
            <button
              onClick={toggleAllRelationships}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              {allRelationshipsVisible ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <ToggleSwitch
              checked={visibilitySettings.relationships.connection}
              onChange={() => toggleRelationshipVisibility('connection')}
              label="Connection"
            />
            <ToggleSwitch
              checked={visibilitySettings.relationships.installation}
              onChange={() => toggleRelationshipVisibility('installation')}
              label="Installation"
            />
            <ToggleSwitch
              checked={visibilitySettings.relationships.annotation}
              onChange={() => toggleRelationshipVisibility('annotation')}
              label="Annotation"
            />
            <ToggleSwitch
              checked={visibilitySettings.relationships.note}
              onChange={() => toggleRelationshipVisibility('note')}
              label="Note"
            />
            <ToggleSwitch
              checked={visibilitySettings.relationships.description}
              onChange={() => toggleRelationshipVisibility('description')}
              label="Description"
            />
            <ToggleSwitch
              checked={visibilitySettings.relationships.equipmentShortSpec}
              onChange={() => toggleRelationshipVisibility('equipmentShortSpec')}
              label="Equipment Short Spec"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


export const Header = ({
  onReset,
  hasData,
  onOpenSettings,
  onImportProject,
  onExportProject,
  pdfDoc,
  currentPage,
  setCurrentPage,
  scale,
  setScale,
  mode,
  onToggleSidePanel,
  onAutoLinkDescriptions,
  onAutoLinkNotesAndHolds,
  onAutoLinkEquipmentShortSpecs,
  onAutoLinkAll,
  onRemoveWhitespace,
  visibilitySettings,
  updateVisibilitySettings,
  toggleTagVisibility,
  toggleRelationshipVisibility,
  toggleAllTags,
  toggleAllRelationships,
  showConfirmation,
}) => {
  const importInputRef = useRef(null);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  useEffect(() => {
    const handleToggleVisibilityPanel = () => {
      setShowVisibilityPanel(prev => !prev);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setShowHotkeyHelp(prev => !prev);
      }
    };

    window.addEventListener('toggleVisibilityPanel', handleToggleVisibilityPanel);
    window.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      window.removeEventListener('toggleVisibilityPanel', handleToggleVisibilityPanel);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImportProject(e.target.files[0]);
      // Reset input value to allow selecting the same file again
      e.target.value = null;
    }
  };

  return (
    <header className="relative flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-2 z-50">
      {/* Single-line layout with flex-wrap */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Logo and title */}
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 lg:h-8 lg:w-8 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
            <circle cx="12" cy="15" r="2"></circle>
            <path d="M12 10v3"></path>
            <path d="m15 12-1.5 2.6"></path>
            <path d="m9 12 1.5 2.6"></path>
          </svg>
          <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight hidden sm:inline">P&ID Smart Digitizer</h1>
          <h1 className="text-lg font-bold text-white tracking-tight sm:hidden">P&ID</h1>
          
          {/* Side Panel Toggle - next to title */}
          {hasData && (
            <button
              onClick={onToggleSidePanel}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              title="Toggle Side Panel (S)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          )}
        </div>

        {/* PDF Navigation & Mode - when data is loaded */}
        {hasData && (
          <div className="flex items-center gap-2">
            {pdfDoc && (
              <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center gap-2">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors text-sm">←</button>
                <span className="text-sm whitespace-nowrap">Page {currentPage}/{pdfDoc.numPages}</span>
                <button onClick={() => setCurrentPage(Math.min(pdfDoc.numPages, currentPage + 1))} disabled={currentPage === pdfDoc.numPages} className="px-2 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors text-sm">→</button>
              </div>
            )}
            
            {/* Mode indicator */}
            <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center gap-1">
              <span className="text-xs text-slate-300 hidden sm:inline">Mode:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${mode === 'select' ? 'bg-slate-600' : mode === 'connect' ? 'bg-blue-500' : 'bg-green-500'}`}>{mode}</span>
            </div>
          </div>
        )}

        {/* Zoom & View Controls - when data is loaded */}
        {hasData && (
          <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-300 hidden sm:inline">Zoom:</span>
              <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-sm">-</button>
              <span className="w-12 text-center text-xs font-semibold text-white">{(scale * 100).toFixed(0)}%</span>
              <button onClick={() => setScale(s => s + 0.25)} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-sm">+</button>
            </div>
            
            <div className="h-6 w-px bg-slate-600"></div>
            
            {/* Enhanced Visibility Controls */}
            <button
              onClick={() => setShowVisibilityPanel(prev => !prev)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showVisibilityPanel 
                  ? 'bg-sky-600 text-white hover:bg-sky-500' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
              }`}
              title="Toggle visibility controls (V)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* Auto-link buttons - when data is loaded */}
        {hasData && (
          <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center gap-1">
            <button
              onClick={onAutoLinkAll}
              className="flex items-center justify-center space-x-1 bg-green-700 hover:bg-green-600 text-green-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
              title="Run all auto-linking functions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="hidden md:inline">Auto</span>
            </button>
            <button
              onClick={onAutoLinkDescriptions}
              className="flex items-center justify-center bg-sky-700 hover:bg-sky-600 text-sky-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
              title="Auto-link nearby text as descriptions to Instrument tags"
            >
              <span>Inst</span>
            </button>
            <button
              onClick={onAutoLinkNotesAndHolds}
              className="flex items-center justify-center bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
              title="Auto-link Note & Hold tags to corresponding descriptions"
            >
              <span>N&H</span>
            </button>
            <button
              onClick={onAutoLinkEquipmentShortSpecs}
              className="flex items-center justify-center bg-orange-700 hover:bg-orange-600 text-orange-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
              title="Auto-link Equipment tags to Equipment Short Specs"
            >
              <span>Equip</span>
            </button>
          </div>
        )}

        {/* Tools & Essential buttons */}
        <div className="flex items-center gap-1">
          {hasData && (
            <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center gap-1">
              <button
                onClick={onRemoveWhitespace}
                className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
                title="Remove all whitespace from tags"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
                </svg>
                <span className="hidden md:inline ml-1">Strip</span>
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex items-center bg-slate-600 hover:bg-slate-700 text-white font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
                title="Import project data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden md:inline ml-1">Import</span>
              </button>
              <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".json,application/json"
                onChange={handleFileChange}
              />
              <button
                onClick={onExportProject}
                className="flex items-center bg-slate-600 hover:bg-slate-700 text-white font-semibold py-1 px-2 rounded-md transition-colors text-xs whitespace-nowrap"
                title="Export project data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden md:inline ml-1">Export</span>
              </button>
            </div>
          )}
          
          {/* Always visible essential buttons */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowHotkeyHelp(prev => !prev); }}
            className="p-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            title="Help & Hotkeys (/)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <a
            href={EXTERNAL_LINKS.NOTION_GUIDE}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
            title="User Guide & Feedback"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>
          {hasData && (
            <button
              onClick={() => {
                showConfirmation(
                  'Are you sure you want to reset everything? This will remove all extracted tags, relationships, comments, and project data. This action cannot be undone.',
                  onReset
                );
              }}
              className="p-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              title="Reset All Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showHotkeyHelp && <HotkeyHelp onClose={() => setShowHotkeyHelp(false)} />}
      {showVisibilityPanel && (
        <VisibilityPanel
          onClose={() => setShowVisibilityPanel(false)}
          visibilitySettings={visibilitySettings}
          toggleTagVisibility={toggleTagVisibility}
          toggleRelationshipVisibility={toggleRelationshipVisibility}
          toggleAllTags={toggleAllTags}
          toggleAllRelationships={toggleAllRelationships}
          updateVisibilitySettings={updateVisibilitySettings}
        />
      )}
    </header>
  );
};