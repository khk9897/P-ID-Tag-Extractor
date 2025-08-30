import React, { useState, useRef, useEffect } from 'react';

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
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const modes = [
    { key: 'S', desc: 'Toggle Side Panel' },
    { key: 'C', desc: 'Toggle Connect Mode' },
    { key: 'K', desc: 'Toggle Manual Create Mode' },
    { key: 'Esc', desc: 'Exit Mode / Clear Selection' },
  ];
  const actions = [
    { key: 'M', desc: 'Merge two text items to an Instrument' },
    { key: 'N', desc: 'Create Description from selected items' },
    { key: 'I', desc: 'Create "Install" relationship' },
    { key: 'R', desc: 'Create relationships (Note/Annotation)' },
    { key: 'Delete', desc: 'Delete selected tag(s)' },
  ];

  return (
    <div ref={ref} className="absolute top-16 right-4 z-20 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-4 text-white animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
      <h3 className="text-md font-bold mb-3 border-b border-slate-600 pb-2">Hotkeys & Controls</h3>
      <div className="space-y-4">
        <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">Navigation & Selection</h4>
            <dl className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between items-center"><dt>Pan View</dt><dd><Key text="Drag" /></dd></div>
                <div className="flex justify-between items-center"><dt>Zoom In</dt><dd><Key text="1" /></dd></div>
                <div className="flex justify-between items-center"><dt>Zoom Out</dt><dd><Key text="2" /></dd></div>
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
}) => {
  const importInputRef = useRef(null);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImportProject(e.target.files[0]);
      // Reset input value to allow selecting the same file again
      e.target.value = null;
    }
  };

  return (
    <header className="relative flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-2 flex justify-between items-center z-50">
      <div className="flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <path d="M14 2v6h6"></path>
          <circle cx="12" cy="15" r="2"></circle>
          <path d="M12 10v3"></path>
          <path d="m15 12-1.5 2.6"></path>
          <path d="m9 12 1.5 2.6"></path>
        </svg>
        <h1 className="text-xl font-bold text-white tracking-tight">P&ID Smart Digitizer</h1>
        
        {/* Side Panel Toggle - next to title */}
        {hasData && (
          <button
            onClick={onToggleSidePanel}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            title="Toggle Side Panel (S)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Viewer Controls - Centered */}
      {hasData && pdfDoc && (
        <div className="absolute left-1/2 -translate-x-1/2">
            <div className="bg-slate-800/80 p-1 rounded-xl shadow-lg flex items-center space-x-4">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors">Prev</button>
                <span>Page {currentPage} of {pdfDoc.numPages}</span>
                <button onClick={() => setCurrentPage(Math.min(pdfDoc.numPages, currentPage + 1))} disabled={currentPage === pdfDoc.numPages} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors">Next</button>
                <div className="h-6 w-px bg-slate-600"></div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-300">Zoom:</span>
                    <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors">-</button>
                    <span className="w-12 text-center text-sm font-semibold text-white">{(scale * 100).toFixed(0)}%</span>
                    <button onClick={() => setScale(s => s + 0.25)} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors">+</button>
                </div>
                <div className="h-6 w-px bg-slate-600"></div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-300">Mode:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${mode === 'select' ? 'bg-slate-600' : mode === 'connect' ? 'bg-blue-500' : 'bg-green-500'}`}>{mode}</span>
                    <span className="text-xs text-slate-400 hidden lg:inline">Hotkeys: [C], [K], [M]...</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowHotkeyHelp(prev => !prev); }}
                        title="Show hotkeys and controls"
                        className="p-1.5 rounded-full transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {/* Auto-link buttons */}
        {hasData && (
          <>
            <button
              onClick={onAutoLinkAll}
              className="flex items-center justify-center space-x-1 bg-green-700 hover:bg-green-600 text-green-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs"
              title="Run all auto-linking functions: Descriptions, Notes & Holds, and Equipment Short Specs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Auto Link</span>
            </button>
            <button
              onClick={onAutoLinkDescriptions}
              className="flex items-center justify-center space-x-1 bg-sky-700 hover:bg-sky-600 text-sky-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs"
              title="Auto-link nearby text as descriptions to Instrument tags"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Inst</span>
            </button>
            <button
              onClick={onAutoLinkNotesAndHolds}
              className="flex items-center justify-center space-x-1 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs"
              title="Auto-link Note & Hold tags to corresponding descriptions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>N&H</span>
            </button>
            <button
              onClick={onAutoLinkEquipmentShortSpecs}
              className="flex items-center justify-center space-x-1 bg-orange-700 hover:bg-orange-600 text-orange-100 font-semibold py-1 px-2 rounded-md transition-colors text-xs"
              title="Auto-link Equipment tags to Equipment Short Specs (A/B pattern support)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Equip</span>
            </button>
            <button
              onClick={onRemoveWhitespace}
              className="flex items-center justify-center space-x-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1 px-2 rounded-md transition-colors text-xs"
              title="Remove all whitespace from Equipment, Line, and Instrument tags"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
              </svg>
              <span>Strip</span>
            </button>
          </>
        )}
        
        {hasData && (
            <>
              <button
                onClick={() => importInputRef.current?.click()}
                className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center space-x-2"
                title="Import project data from a .json file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import</span>
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
                className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center space-x-2"
                title="Export current tags and relationships to a .json file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>
            </>
          )}
        <button
          onClick={onOpenSettings}
          className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          <span>Settings</span>
        </button>
        {hasData && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Reset
          </button>
        )}
      </div>

      {showHotkeyHelp && <HotkeyHelp onClose={() => setShowHotkeyHelp(false)} />}
    </header>
  );
};