import React, { useState, useEffect } from 'react';
import { Category, RelationshipType } from '../types.ts';

export const SelectionPanel = ({
  selectedTagIds,
  setSelectedTagIds,
  allTags,
  relationships,
  onDeselect,
  onClear,
  rawTextItems,
  selectedRawTextItemIds,
  onDeselectRawTextItem,
  onCreateTag,
  manualCreationData,
  onManualTagCreate,
  onClearManualCreation,
}) => {
  const [manualTagText, setManualTagText] = useState('');
  const [isAlphabeticalSort, setIsAlphabeticalSort] = useState(false);

  useEffect(() => {
    if (manualCreationData) {
      setManualTagText('');
    }
  }, [manualCreationData]);

  const hasSelectedTags = selectedTagIds.length > 0;
  const hasSelectedRawItems = selectedRawTextItemIds.length > 0;

  if (manualCreationData) {
    const handleCreate = (category) => {
      if (manualTagText.trim()) {
        onManualTagCreate({ text: manualTagText.trim(), category });
      } else {
        alert("Please enter text for the tag.");
      }
    };

    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-3xl z-20 px-4 animate-fade-in-up">
        <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl p-3">
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="font-bold text-md text-white">Create Manual Tag</h3>
            <button
              onClick={onClearManualCreation}
              className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Enter tag text..."
              value={manualTagText}
              onChange={(e) => setManualTagText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-sky-500 focus:border-sky-500"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-700 pt-2">
            <span className="text-sm font-semibold text-slate-300">Select category:</span>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleCreate(Category.Equipment)} className="px-3 py-1.5 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">1</span>
                <span>Equipment</span>
              </button>
              <button onClick={() => handleCreate(Category.Line)} className="px-3 py-1.5 text-sm font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">2</span>
                <span>Line</span>
              </button>
              <button onClick={() => handleCreate(Category.SpecialItem)} className="px-3 py-1.5 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">3</span>
                <span>Special Item</span>
              </button>
              <button onClick={() => handleCreate(Category.Instrument)} className="px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">4</span>
                <span>Instrument</span>
              </button>
              <button onClick={() => handleCreate(Category.NotesAndHolds)} className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">5</span>
                <span>Note/Hold</span>
              </button>
              <button onClick={() => handleCreate(Category.OffPageConnector)} className="px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors flex items-center space-x-1">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">6</span>
                <span>OPC</span>
              </button>
              <button onClick={() => handleCreate(Category.DrawingNumber)} className="px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">Drawing No.</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSelectedTags && !hasSelectedRawItems) {
    return null;
  }

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-4xl z-20 px-4 animate-fade-in-up">
      <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl p-3">
        <div className="flex flex-col space-y-3 max-h-72 overflow-y-auto pr-1">
          {/* Section for Raw Text Items */}
          {hasSelectedRawItems && (() => {
            let selectedRawItems = selectedRawTextItemIds
              .map(id => rawTextItems.find(item => item.id === id))
              .filter(Boolean);

            // Sort based on toggle state
            if (isAlphabeticalSort) {
              selectedRawItems = [...selectedRawItems].sort((a, b) => a.text.localeCompare(b.text));
            }

            const handleCreate = (category) => {
              onCreateTag(selectedRawItems, category);
              onClear();
            };

            return (
              <div className={hasSelectedTags ? 'pb-3 mb-3 border-b border-slate-700' : ''}>
                <div className="flex justify-between items-center mb-2 px-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-md text-white">{selectedRawItems.length} text piece(s) selected</h3>
                    <button
                      onClick={() => setIsAlphabeticalSort(!isAlphabeticalSort)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isAlphabeticalSort 
                          ? 'bg-sky-600 text-white hover:bg-sky-500' 
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                      }`}
                      title={`Sort: ${isAlphabeticalSort ? 'Alphabetical' : 'Selection Order'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </button>
                  </div>
                  {/* Only show clear button if tags aren't also selected (tag section has its own) */}
                  {!hasSelectedTags && (
                    <button
                      onClick={onClear}
                      className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto pr-2 mb-3">
                  {selectedRawItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center bg-slate-700 rounded-full py-1 pl-3 pr-2 text-sm"
                    >
                      <span className="font-mono text-white mr-2">{item.text}</span>
                      <button
                        onClick={() => onDeselectRawTextItem(item.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 transition-colors"
                        aria-label={`Deselect ${item.text}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                {/* Create Tag UI - show only if NO tags are selected */}
                {!hasSelectedTags && (
                  <div className="flex items-center justify-between border-t border-slate-700 pt-2">
                    <span className="text-sm font-semibold text-slate-300">Create new tag:</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleCreate(Category.Equipment)} className="px-3 py-1.5 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">1</span>
                        <span>Equipment</span>
                      </button>
                      <button onClick={() => handleCreate(Category.Line)} className="px-3 py-1.5 text-sm font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">2</span>
                        <span>Line</span>
                      </button>
                      <button onClick={() => handleCreate(Category.SpecialItem)} className="px-3 py-1.5 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">3</span>
                        <span>Special Item</span>
                      </button>
                      <button onClick={() => handleCreate(Category.Instrument)} className="px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">4</span>
                        <span>Instrument</span>
                      </button>
                      <button onClick={() => handleCreate(Category.NotesAndHolds)} className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">5</span>
                        <span>Note/Hold</span>
                      </button>
                      <button onClick={() => handleCreate(Category.OffPageConnector)} className="px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors flex items-center space-x-1">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">6</span>
                        <span>OPC</span>
                      </button>
                      <button onClick={() => handleCreate(Category.DrawingNumber)} className="px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">Drawing No.</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Section for Selected Tags */}
          {hasSelectedTags && (() => {
            let selectedTags = selectedTagIds
              .map(id => allTags.find(tag => tag.id === id))
              .filter((tag) => !!tag);

            // Sort based on toggle state
            if (isAlphabeticalSort) {
              const categorySortOrder = {
                [Category.Equipment]: 0,
                [Category.Line]: 1,
                [Category.SpecialItem]: 2,
                [Category.Instrument]: 3,
                [Category.NotesAndHolds]: 4,
                [Category.DrawingNumber]: 5,
                [Category.Uncategorized]: 6,
              };

              selectedTags = [...selectedTags].sort((a, b) => {
                const orderA = categorySortOrder[a.category] ?? 99;
                const orderB = categorySortOrder[b.category] ?? 99;
                if (orderA !== orderB) {
                  return orderA - orderB;
                }
                return a.text.localeCompare(b.text);
              });
            }

            const singleSelectedTag = selectedTagIds.length === 1 ? allTags.find(t => t.id === selectedTagIds[0]) : null;
            let installedInstruments = [];
            if (singleSelectedTag && (singleSelectedTag.category === Category.Equipment || singleSelectedTag.category === Category.Line)) {
              installedInstruments = relationships
                .filter(r => r.type === RelationshipType.Installation && r.to === singleSelectedTag.id)
                .map(r => allTags.find(t => t.id === r.from))
                .filter(Boolean);
            }

            const handleSelectInstrument = (instrumentId) => {
              if (!selectedTagIds.includes(instrumentId)) {
                setSelectedTagIds(prev => [...prev, instrumentId]);
              }
            };

            const handleSelectAllInstruments = () => {
              const instrumentIds = installedInstruments.map(inst => inst.id);
              setSelectedTagIds(prev => [...new Set([...prev, ...instrumentIds])]);
            };

            return (
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-md text-white">{selectedTags.length} tag(s) selected</h3>
                    <button
                      onClick={() => setIsAlphabeticalSort(!isAlphabeticalSort)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isAlphabeticalSort 
                          ? 'bg-sky-600 text-white hover:bg-sky-500' 
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                      }`}
                      title={`Sort: ${isAlphabeticalSort ? 'Alphabetical' : 'Selection Order'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={onClear}
                    className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-2">
                  {selectedTags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center bg-slate-700 rounded-full py-1 pl-3 pr-2 text-sm"
                    >
                      <span className="font-mono text-white mr-2">{tag.text}</span>
                      <button
                        onClick={() => onDeselect(tag.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 transition-colors"
                        aria-label={`Deselect ${tag.text}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {installedInstruments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <h4 className="font-semibold text-sm text-white">Installed Instruments ({installedInstruments.length})</h4>
                      <button onClick={handleSelectAllInstruments} className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">Select All</button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-2">
                      {installedInstruments.map(inst => {
                        const isSelected = selectedTagIds.includes(inst.id);
                        return (
                          <div
                            key={inst.id}
                            className={`flex items-center rounded-full py-1 pl-3 pr-2 text-sm transition-colors ${isSelected ? 'bg-slate-600' : 'bg-slate-700'}`}
                          >
                            <span className={`font-mono mr-2 ${isSelected ? 'text-slate-400' : 'text-white'}`}>{inst.text}</span>
                            {!isSelected && (
                              <button
                                onClick={() => handleSelectInstrument(inst.id)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-600 hover:bg-sky-500 transition-colors"
                                aria-label={`Select ${inst.text}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};