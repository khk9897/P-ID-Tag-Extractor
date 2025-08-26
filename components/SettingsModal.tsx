import React, { useState, useEffect } from 'https://esm.sh/react@19.1.1';
import { Category } from '../types.ts';
import { DEFAULT_PATTERNS } from '../constants.ts';

export const SettingsModal = ({ patterns, onSave, onClose }) => {
  const [localPatterns, setLocalPatterns] = useState(patterns);

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
    onSave(localPatterns);
  };
  
  const handleReset = () => {
    setLocalPatterns(DEFAULT_PATTERNS);
  }

  const handlePatternChange = (category, value) => {
    setLocalPatterns(prev => ({...prev, [category]: value}));
  };

  const categories = [Category.Equipment, Category.Line, Category.Instrument];

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
        <div className="p-6 space-y-4">
            <p className="text-sm text-slate-400">
                Define the Regex patterns used to find tags. Use the pipe character <code>|</code> to separate multiple patterns for a single category.
                Changes made after uploading a PDF will trigger a re-scan of the document.
            </p>
            {categories.map(category => (
                <div key={category}>
                    <label htmlFor={`pattern-${category}`} className="block text-sm font-semibold mb-1 text-slate-200">{category}</label>
                    <textarea
                        id={`pattern-${category}`}
                        value={localPatterns[category]}
                        onChange={(e) => handlePatternChange(category, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                        rows={2}
                    />
                </div>
            ))}
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