import React, { useState, useEffect } from 'react';
import { Category, AppSettings } from '../types.ts';
import { DEFAULT_PATTERNS, DEFAULT_TOLERANCES, DEFAULT_SETTINGS } from '../constants.ts';

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

export const SettingsModal = ({ patterns, tolerances, appSettings, onSave, onClose }) => {
  const [localPatterns, setLocalPatterns] = useState(patterns);
  const [localTolerances, setLocalTolerances] = useState(tolerances);
  const [localAppSettings, setLocalAppSettings] = useState(appSettings);
  const [showRegexHelp, setShowRegexHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    onSave(localPatterns, localTolerances, localAppSettings);
  };
  
  const handleReset = () => {
    setLocalPatterns(DEFAULT_PATTERNS);
    setLocalTolerances(DEFAULT_TOLERANCES);
    setLocalAppSettings(DEFAULT_SETTINGS);
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
        description: "Finds equipment tags, typically containing two hyphens.",
        example: "P-101-A, V-200-B"
    },
    [Category.Line]: {
        description: "Finds piping line tags, typically containing three or more hyphens.",
        example: `4"-P-1501-C1, 10"-CW-203-A2`
    },
    [Category.Instrument]: {
        description: "Finds two-part instrument tags (Function and Number) that may or may not be separated by a space.",
        example: "PI 1001, FIT1002A, TIC 1004 B"
    },
    [Category.DrawingNumber]: {
        description: "Finds drawing identifiers like drawing number, sheet number, etc. One per page, searched from bottom-right.",
        example: "PID-1234-001"
    },
    [Category.NotesAndHolds]: {
        description: "Finds notes or holds, typically starting with 'NOTE' or 'HOLD'.",
        example: "NOTE 1, HOLD FOR REVIEW"
    }
  };

  const categories = [Category.Equipment, Category.Line, Category.Instrument, Category.DrawingNumber, Category.NotesAndHolds];
  
  const instrumentCurrentTolerances = localTolerances[Category.Instrument] || { vertical: 0, horizontal: 0, autoLinkDistance: 50 };


  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">Extraction Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md border border-slate-700">
                <p>
                    Define the Regular Expression (Regex) patterns for finding tags. You can add multiple patterns for one category by using the pipe symbol <code>|</code>.
                </p>
                 <p>
                    Changing settings after a PDF is uploaded will re-scan the document.
                </p>
                <button 
                  onClick={() => setShowRegexHelp(prev => !prev)}
                  className="text-sm text-sky-400 hover:text-sky-300 font-semibold mt-1 flex items-center space-x-1"
                >
                  <span>{showRegexHelp ? 'Hide Regex Help' : 'Show Regex Help'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showRegexHelp ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
            
            {showRegexHelp && <RegexHelp />}

            {categories.map(category => {
                const info = categoryInfo[category];
                
                if (category === Category.Instrument) {
                  return (
                    <div key={category} className="p-3 bg-slate-900/30 rounded-lg">
                      <label className="block text-sm font-semibold mb-2 text-slate-200">{category}</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="mt-2 text-xs text-slate-400 space-y-1 pl-1">
                          <p>{info.description}</p>
                          <p>
                            <span className="font-semibold">Example Match:</span>{' '}
                            <code className="bg-slate-700/50 px-1 py-0.5 rounded">{info.example}</code>
                          </p>
                        </div>
                      )}
                        <div className="mt-4 pt-3 border-t border-slate-700">
                          <h4 className="text-xs font-medium text-slate-400 mb-2">Part Combination Tolerances</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-700">
                          <h4 className="text-xs font-medium text-slate-400 mb-2">Automatic Annotation Linking</h4>
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
                  );
                }

                return (
                    <div key={category}>
                        <label htmlFor={`pattern-${category}`} className="block text-sm font-semibold mb-1 text-slate-200">{category}</label>
                        <textarea
                            id={`pattern-${category}`}
                            value={localPatterns[category]}
                            onChange={(e) => handlePatternChange(category, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                            rows={2}
                        />
                        {info && (
                            <div className="mt-2 text-xs text-slate-400 space-y-1 pl-1">
                                <p>{info.description}</p>
                                <p>
                                    <span className="font-semibold">Example Match:</span>{' '}
                                    <code className="bg-slate-700/50 px-1 py-0.5 rounded">{info.example}</code>
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
            
            {/* App Settings Section */}
            <div className="pt-4 mt-4 border-t border-slate-700">
              <h3 className="text-sm font-semibold mb-3 text-slate-200">Application Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    id="auto-generate-loops"
                    type="checkbox"
                    checked={localAppSettings.autoGenerateLoops}
                    onChange={(e) => setLocalAppSettings(prev => ({
                      ...prev,
                      autoGenerateLoops: e.target.checked
                    }))}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-600 rounded focus:ring-sky-500 focus:ring-2"
                  />
                  <label htmlFor="auto-generate-loops" className="text-sm text-slate-200">
                    Auto-generate loops after tag extraction
                  </label>
                </div>
                <div className="text-xs text-slate-400 pl-7">
                  Automatically create loops from instrument tags based on function prefix and number matching after PDF processing completes.
                </div>
              </div>
            </div>
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
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                    Save and Re-scan
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};