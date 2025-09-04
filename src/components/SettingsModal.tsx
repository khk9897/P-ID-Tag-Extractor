import React, { useState, useEffect } from 'react';
import { Category, AppSettings, ColorSettings } from '../types.ts';
import { DEFAULT_PATTERNS, DEFAULT_TOLERANCES, DEFAULT_SETTINGS, DEFAULT_COLORS, EXTERNAL_LINKS } from '../constants.ts';

const RegexHelp = () => {
  const cheatSheet = [
    { char: '^', desc: 'Matches the start of the string' },
    { char: '$', desc: 'Matches the end of the string' },
    { char: '.', desc: 'Matches any single character except newline' },
    { char: '\\d', desc: 'A digit (0-9)' },
    { char: '\\w', desc: 'A word character (a-z, A-Z, 0-9, _)' },
    { char: '\\s', desc: 'A whitespace character' },
    { char: '[ABC]', desc: 'Any one of the characters in the brackets' },
    { char: '[A-Z]', desc: 'Any character in the range A to Z' },
    { char: '*', desc: '0 or more repetitions of the preceding token' },
    { char: '+', desc: '1 or more repetitions of the preceding token' },
    { char: '?', desc: '0 or 1 repetition of the preceding token' },
    { char: '{n}', desc: 'Exactly n repetitions (e.g., \\d{3})' },
    { char: '{n,}', desc: 'n or more repetitions' },
    { char: '{n,m}', desc: 'Between n and m repetitions' },
    { char: '|', desc: 'Acts like a boolean OR (e.g., A|B)' },
    { char: '(...)', desc: 'Groups multiple tokens together' },
  ];

  return (
    <div className="mt-1 text-xs text-slate-400 bg-slate-900/50 p-4 rounded-md border border-slate-700 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <h4 className="font-semibold text-slate-300 mb-3 text-sm">Regular Expression (Regex) Quick Reference</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {cheatSheet.map(({ char, desc }) => (
          <div key={char} className="flex items-center space-x-3">
            <code className="bg-slate-700/50 px-2 py-1 rounded text-sky-400 font-mono w-20 text-center">{char}</code>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsModal = ({ patterns, tolerances, appSettings, colorSettings, onSaveOnly, onSaveAndRescan, onClose }) => {
  const [localPatterns, setLocalPatterns] = useState(patterns);
  const [localTolerances, setLocalTolerances] = useState(tolerances);
  const [localAppSettings, setLocalAppSettings] = useState(appSettings);
  const [localColorSettings, setLocalColorSettings] = useState(colorSettings || DEFAULT_COLORS);
  const [showRegexHelp, setShowRegexHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('patterns'); // 'patterns' or 'colors'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveOnly = () => {
    onSaveOnly(localPatterns, localTolerances, localAppSettings, localColorSettings);
  };

  const handleSaveAndRescan = () => {
    onSaveAndRescan(localPatterns, localTolerances, localAppSettings, localColorSettings, activeTab);
  };
  
  const handleReset = () => {
    if (activeTab === 'patterns') {
      setLocalPatterns(DEFAULT_PATTERNS);
      setLocalTolerances(DEFAULT_TOLERANCES);
      setLocalAppSettings(DEFAULT_SETTINGS);
    } else {
      setLocalColorSettings(DEFAULT_COLORS);
    }
  }

  const handlePatternChange = (category, value) => {
    setLocalPatterns(prev => ({...prev, [category]: value}));
  };

  const handleInstrumentPartChange = (part: 'func' | 'num', value: string) => {
    setLocalPatterns(prev => ({ 
        ...prev, 
        [Category.Instrument]: {
            ...prev[Category.Instrument],
            [part]: value
        }
    }));
  };
  
  const handleToleranceChange = (property: 'vertical' | 'horizontal' | 'autoLinkDistance', value: string) => {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
          setLocalTolerances(prev => ({
              ...prev,
              [Category.Instrument]: {
                  ...prev[Category.Instrument],
                  [property]: numValue
              }
          }));
      }
  };
  
  const categoryInfo = {
    [Category.Equipment]: {
        description: "Regular expression pattern for matching equipment tags."
    },
    [Category.Line]: {
        description: "Regular expression pattern for matching piping line tags."
    },
    [Category.Instrument]: {
        description: "Two-part pattern for matching instrument tags consisting of function and number components."
    },
    [Category.DrawingNumber]: {
        description: "Pattern for identifying drawing numbers. Only one match per page, selected from bottom-right corner."
    },
    [Category.NotesAndHolds]: {
        description: "Pattern for matching note and hold annotations."
    },
    [Category.SpecialItem]: {
        description: "Custom pattern for matching special items."
    },
    [Category.OffPageConnector]: {
        description: "Pattern for matching off-page connector reference numbers (e.g., A, B, 1, 2, A1, B2)."
    }
  };

  const categories = [Category.Equipment, Category.Line, Category.Instrument, Category.DrawingNumber, Category.NotesAndHolds, Category.SpecialItem, Category.OffPageConnector];
  
  const instrumentCurrentTolerances = localTolerances[Category.Instrument] || { vertical: 0, horizontal: 0, autoLinkDistance: 50 };
  const opcCurrentTolerances = localTolerances[Category.OffPageConnector] || { vertical: 0, horizontal: 0, autoLinkDistance: 30 };


  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-7xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'patterns' 
                ? 'text-white border-b-2 border-sky-500 bg-slate-900/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Patterns & Settings
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'colors' 
                ? 'text-white border-b-2 border-sky-500 bg-slate-900/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Colors & Themes
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'patterns' ? (
            <>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column - Regex Patterns */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-200">Regex Patterns</h3>
                <a
                  href={EXTERNAL_LINKS.REGEX_HELPER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-5 h-5 bg-sky-500/20 hover:bg-sky-500/30 rounded-full text-sky-400 hover:text-sky-300 transition-colors"
                  title="Open Regex Helper (External Link)"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left sub-column */}
                <div className="space-y-4">
                  {/* Equipment */}
                  {(() => {
                      const info = categoryInfo[Category.Equipment];
                      return (
                          <div key={Category.Equipment} className="p-3 bg-slate-900/30 rounded-lg">
                              <label htmlFor={`pattern-${Category.Equipment}`} className="block text-sm font-semibold mb-2 text-slate-200">Equipment</label>
                              <input
                                  id={`pattern-${Category.Equipment}`}
                                  type="text"
                                  value={localPatterns[Category.Equipment]}
                                  onChange={(e) => handlePatternChange(Category.Equipment, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                                  placeholder="Enter regex pattern for Equipment..."
                              />
                              {info && (
                                  <div className="mt-2 text-xs text-slate-400">
                                      <p>{info.description}</p>
                                  </div>
                              )}
                          </div>
                      )
                  })()}

                  {/* Line and Special Item combined card */}
                  <div className="p-3 bg-slate-900/30 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-slate-200">Line & Special Item Patterns</h4>
                    
                    {/* Line Section */}
                    <div className="mb-4">
                      <label htmlFor="pattern-Line" className="block text-xs font-medium text-slate-300 mb-1">Line</label>
                      <input
                        id="pattern-Line"
                        type="text"
                        value={localPatterns[Category.Line]}
                        onChange={(e) => handlePatternChange(Category.Line, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Enter regex pattern for Line..."
                      />
                      <div className="mt-1 text-xs text-slate-400">
                        <p>{categoryInfo[Category.Line].description}</p>
                      </div>
                    </div>

                    {/* Special Item Section */}
                    <div>
                      <label htmlFor="pattern-SpecialItem" className="block text-xs font-medium text-slate-300 mb-1">Special Item</label>
                      <input
                        id="pattern-SpecialItem"
                        type="text"
                        value={localPatterns[Category.SpecialItem]}
                        onChange={(e) => handlePatternChange(Category.SpecialItem, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Enter regex pattern for Special Item..."
                      />
                      <div className="mt-1 text-xs text-slate-400">
                        <p>{categoryInfo[Category.SpecialItem].description}</p>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="pattern-OffPageConnector" className="block text-xs font-medium text-slate-300 mb-1">OPC Reference</label>
                      <input
                        id="pattern-OffPageConnector"
                        type="text"
                        value={localPatterns[Category.OffPageConnector]}
                        onChange={(e) => handlePatternChange(Category.OffPageConnector, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Enter regex pattern for OPC Reference..."
                      />
                      <div className="mt-1 text-xs text-slate-400">
                        <p>{categoryInfo[Category.OffPageConnector].description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right sub-column */}
                <div className="space-y-4">
                  {/* Instrument */}
                  {(() => {
                      const info = categoryInfo[Category.Instrument];
                      
                      return (
                          <div key={Category.Instrument} className="p-3 bg-slate-900/30 rounded-lg">
                            <label className="block text-sm font-semibold mb-2 text-slate-200">Instrument</label>
                            <div className="space-y-3">
                              <div>
                                <label htmlFor="pattern-inst-func" className="block text-xs font-medium text-slate-400 mb-1">Function Part</label>
                                <input
                                  id="pattern-inst-func"
                                  type="text"
                                  value={localPatterns[Category.Instrument]?.func || ''}
                                  onChange={(e) => handleInstrumentPartChange('func', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                                />
                              </div>
                              <div>
                                <label htmlFor="pattern-inst-num" className="block text-xs font-medium text-slate-400 mb-1">Number Part</label>
                                <input
                                  id="pattern-inst-num"
                                  type="text"
                                  value={localPatterns[Category.Instrument]?.num || ''}
                                  onChange={(e) => handleInstrumentPartChange('num', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                                />
                              </div>
                            </div>
                            {info && (
                              <div className="mt-3 text-xs text-slate-400">
                                <p>{info.description}</p>
                              </div>
                            )}
                          </div>
                      )
                  })()}

                  {/* Notes And Holds */}
                  {(() => {
                      const info = categoryInfo[Category.NotesAndHolds];
                      return (
                          <div key={Category.NotesAndHolds} className="p-3 bg-slate-900/30 rounded-lg">
                              <label htmlFor={`pattern-${Category.NotesAndHolds}`} className="block text-sm font-semibold mb-2 text-slate-200">Notes And Holds</label>
                              <input
                                  id={`pattern-${Category.NotesAndHolds}`}
                                  type="text"
                                  value={localPatterns[Category.NotesAndHolds]}
                                  onChange={(e) => handlePatternChange(Category.NotesAndHolds, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                                  placeholder="Enter regex pattern for Notes And Holds..."
                              />
                              {info && (
                                  <div className="mt-2 text-xs text-slate-400">
                                      <p>{info.description}</p>
                                  </div>
                              )}
                          </div>
                      )
                  })()}

                  {/* Drawing Number */}
                  {(() => {
                      const info = categoryInfo[Category.DrawingNumber];
                      return (
                          <div key={Category.DrawingNumber} className="p-3 bg-slate-900/30 rounded-lg">
                              <label htmlFor={`pattern-${Category.DrawingNumber}`} className="block text-sm font-semibold mb-2 text-slate-200">Drawing Number</label>
                              <input
                                  id={`pattern-${Category.DrawingNumber}`}
                                  type="text"
                                  value={localPatterns[Category.DrawingNumber]}
                                  onChange={(e) => handlePatternChange(Category.DrawingNumber, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                                  placeholder="Enter regex pattern for Drawing Number..."
                              />
                              {info && (
                                  <div className="mt-2 text-xs text-slate-400">
                                      <p>{info.description}</p>
                                  </div>
                              )}
                          </div>
                      )
                  })()}
                </div>
              </div>
            </div>
            
            {/* Right Column - Application Settings & Instrument Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">Application Settings</h3>
              <div className="space-y-4">
                <div className="p-5 bg-slate-900/40 rounded-lg border border-slate-700/50">
                  <div className="flex items-start space-x-3 mb-3">
                    <input
                      id="auto-generate-loops"
                      type="checkbox"
                      checked={localAppSettings.autoGenerateLoops}
                      onChange={(e) => setLocalAppSettings(prev => ({
                        ...prev,
                        autoGenerateLoops: e.target.checked
                      }))}
                      className="w-5 h-5 mt-0.5 text-sky-600 bg-slate-900 border-slate-600 rounded focus:ring-sky-500 focus:ring-2"
                    />
                    <div>
                      <label htmlFor="auto-generate-loops" className="text-sm font-semibold text-slate-200 block">
                        Auto-generate loops
                      </label>
                      <div className="text-xs text-slate-400 mt-1">
                        Automatically create loops from instrument tags based on function prefix and number matching after PDF processing completes.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 bg-slate-900/40 rounded-lg border border-slate-700/50">
                  <div className="flex items-start space-x-3 mb-3">
                    <input
                      id="auto-remove-whitespace"
                      type="checkbox"
                      checked={localAppSettings.autoRemoveWhitespace}
                      onChange={(e) => setLocalAppSettings(prev => ({
                        ...prev,
                        autoRemoveWhitespace: e.target.checked
                      }))}
                      className="w-5 h-5 mt-0.5 text-sky-600 bg-slate-900 border-slate-600 rounded focus:ring-sky-500 focus:ring-2"
                    />
                    <div>
                      <label htmlFor="auto-remove-whitespace" className="text-sm font-semibold text-slate-200 block">
                        Auto-remove whitespace
                      </label>
                      <div className="text-xs text-slate-400 mt-1">
                        Automatically removes all whitespace from extracted tags (except Notes & Holds tags which preserve original formatting).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-900/40 rounded-lg border border-slate-700/50">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">
                      Hyphen Settings for Multi-Text Tags
                    </h4>
                    <div className="text-xs text-slate-400 mb-3">
                      When creating tags from multiple text pieces, choose which categories should use hyphens (-) as separators.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'equipment', label: 'Equipment', color: 'text-orange-400' },
                      { key: 'line', label: 'Line', color: 'text-rose-400' },
                      { key: 'instrument', label: 'Instrument', color: 'text-amber-400' },
                      { key: 'drawingNumber', label: 'Drawing Number', color: 'text-indigo-400' },
                      { key: 'notesAndHolds', label: 'Notes & Holds', color: 'text-teal-400' },
                      { key: 'specialItem', label: 'Special Item', color: 'text-purple-400' },
                      { key: 'offPageConnector', label: 'OPC Tag', color: 'text-violet-400' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input
                          id={`hyphen-${key}`}
                          type="checkbox"
                          checked={localAppSettings.hyphenSettings?.[key] || false}
                          onChange={(e) => {
                            setLocalAppSettings(prev => ({
                              ...prev,
                              hyphenSettings: {
                                ...(prev.hyphenSettings || {}),
                                [key]: e.target.checked
                              }
                            }));
                          }}
                          className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-600 rounded focus:ring-sky-500 focus:ring-2"
                        />
                        <label htmlFor={`hyphen-${key}`} className={`text-sm ${color} select-none cursor-pointer`}>
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-200 mb-3">Instrument Tolerances</h4>
                  <div className="space-y-4">
                    <div>
                       <label htmlFor="tolerance-vertical" className="block text-xs text-slate-400 mb-1">
                        Max Vertical Distance ({instrumentCurrentTolerances.vertical}px)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input id="tolerance-vertical" type="range" min="0" max="100"
                            value={instrumentCurrentTolerances.vertical}
                            onChange={(e) => handleToleranceChange('vertical', e.target.value)}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                        <input type="number" value={instrumentCurrentTolerances.vertical} onChange={(e) => handleToleranceChange('vertical', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded-md p-1 text-sm text-center" />
                      </div>
                    </div>
                    <div>
                       <label htmlFor="tolerance-horizontal" className="block text-xs text-slate-400 mb-1">
                        Max Horizontal Distance ({instrumentCurrentTolerances.horizontal}px)
                       </label>
                       <div className="flex items-center space-x-2">
                        <input id="tolerance-horizontal" type="range" min="0" max="100"
                            value={instrumentCurrentTolerances.horizontal}
                            onChange={(e) => handleToleranceChange('horizontal', e.target.value)}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                        <input type="number" value={instrumentCurrentTolerances.horizontal} onChange={(e) => handleToleranceChange('horizontal', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded-md p-1 text-sm text-center" />
                       </div>
                    </div>
                    <div>
                       <label htmlFor="tolerance-autolink" className="block text-xs text-slate-400 mb-1">
                        Max Link Distance ({instrumentCurrentTolerances.autoLinkDistance}px)
                       </label>
                       <div className="flex items-center space-x-2">
                        <input id="tolerance-autolink" type="range" min="0" max="200"
                            value={instrumentCurrentTolerances.autoLinkDistance}
                            onChange={(e) => handleToleranceChange('autoLinkDistance', e.target.value)}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                        <input type="number" min="0" max="200" value={instrumentCurrentTolerances.autoLinkDistance} onChange={(e) => handleToleranceChange('autoLinkDistance', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded-md p-1 text-sm text-center" />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-200 mb-3">OPC Tolerances</h4>
                  <div className="space-y-4">
                    <div>
                       <label htmlFor="tolerance-opc-vertical" className="block text-xs text-slate-400 mb-1">
                        Max Vertical Distance ({opcCurrentTolerances.vertical}px)
                       </label>
                       <div className="flex items-center space-x-2">
                        <input id="tolerance-opc-vertical" type="range" min="0" max="100"
                            value={opcCurrentTolerances.vertical}
                            onChange={(e) => {
                              setLocalTolerances(prev => ({
                                ...prev,
                                [Category.OffPageConnector]: {
                                  ...opcCurrentTolerances,
                                  vertical: parseInt(e.target.value)
                                }
                              }));
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                        <input type="number" value={opcCurrentTolerances.vertical} onChange={(e) => {
                          setLocalTolerances(prev => ({
                            ...prev,
                            [Category.OffPageConnector]: {
                              ...opcCurrentTolerances,
                              vertical: parseInt(e.target.value) || 0
                            }
                          }));
                        }} className="w-16 bg-slate-900 border border-slate-600 rounded-md p-1 text-sm text-center" />
                       </div>
                    </div>
                    <div>
                       <label htmlFor="tolerance-opc-horizontal" className="block text-xs text-slate-400 mb-1">
                        Max Horizontal Distance ({opcCurrentTolerances.horizontal}px)
                       </label>
                       <div className="flex items-center space-x-2">
                        <input id="tolerance-opc-horizontal" type="range" min="0" max="100"
                            value={opcCurrentTolerances.horizontal}
                            onChange={(e) => {
                              setLocalTolerances(prev => ({
                                ...prev,
                                [Category.OffPageConnector]: {
                                  ...opcCurrentTolerances,
                                  horizontal: parseInt(e.target.value)
                                }
                              }));
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                        <input type="number" min="0" max="100" value={opcCurrentTolerances.horizontal} onChange={(e) => {
                          setLocalTolerances(prev => ({
                            ...prev,
                            [Category.OffPageConnector]: {
                              ...opcCurrentTolerances,
                              horizontal: parseInt(e.target.value) || 0
                            }
                          }));
                        }} className="w-16 bg-slate-900 border border-slate-600 rounded-md p-1 text-sm text-center" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            </>
          ) : (
            /* Color Settings Tab */
            <div className="space-y-6">
              <div className="space-y-2 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md border border-slate-700">
                <p>
                  Customize colors for different tag categories and relationship types. Click on a color to change it.
                </p>
              </div>
              
              {/* Entity Colors */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-slate-200">Entity Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    equipment: 'Equipment Tag',
                    line: 'Line Tag',
                    instrument: 'Instrument Tag',
                    drawingNumber: 'Drawing Number',
                    notesAndHolds: 'Notes & Holds Tag',
                    specialItem: 'Special Item Tag',
                    offPageConnector: 'OPC Tag',
                    description: 'Note/Hold Description',
                    equipmentShortSpec: 'Equipment Short Spec',
                    uncategorized: 'Uncategorized'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                      <label className="text-sm text-slate-200">{label}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={localColorSettings.entities[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            entities: { ...prev.entities, [key]: e.target.value }
                          }))}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-600"
                        />
                        <input
                          type="text"
                          value={localColorSettings.entities[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            entities: { ...prev.entities, [key]: e.target.value }
                          }))}
                          className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Relationship Line Colors */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-slate-200">Relationship Line Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    connection: 'Connection Arrow',
                    installation: 'Installation Arrow',
                    annotation: 'Annotation Line & Linked Text',
                    note: 'Note Relationship Line'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                      <label className="text-sm text-slate-200">{label}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={localColorSettings.relationships[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            relationships: { ...prev.relationships, [key]: e.target.value }
                          }))}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-600"
                        />
                        <input
                          type="text"
                          value={localColorSettings.relationships[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            relationships: { ...prev.relationships, [key]: e.target.value }
                          }))}
                          className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Highlight Colors */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-slate-200">Highlight Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    primary: 'Primary Selection/Ping Highlight',
                    note: 'Note-Related Item Highlight',
                    equipment: 'Equipment-Related Item Highlight',
                    description: 'Description Item Highlight',
                    related: 'Related Tag Highlight',
                    noteRelated: 'Legacy Note-Related Highlight',
                    selected: 'Legacy Selected Item Border'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                      <label className="text-sm text-slate-200">{label}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={localColorSettings.highlights[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            highlights: { ...prev.highlights, [key]: e.target.value }
                          }))}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-600"
                        />
                        <input
                          type="text"
                          value={localColorSettings.highlights[key]}
                          onChange={(e) => setLocalColorSettings(prev => ({
                            ...prev,
                            highlights: { ...prev.highlights, [key]: e.target.value }
                          }))}
                          className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
            <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
                Reset to Defaults
            </button>
            <div className="flex space-x-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 bg-transparent rounded-md hover:bg-slate-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveOnly}
                    className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                    Save
                </button>
                {activeTab === 'patterns' && (
                  <button
                      onClick={handleSaveAndRescan}
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                      Save and Re-scan
                  </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};