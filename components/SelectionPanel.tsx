import React from 'https://esm.sh/react@19.1.1';
import { Category, RelationshipType } from '../types.ts';

export const SelectionPanel = ({
  selectedTagIds,
  setSelectedTagIds,
  allTags,
  relationships,
  onDeselect,
  onClear,
}) => {
  if (selectedTagIds.length === 0) {
    return null;
  }

  const categorySortOrder = {
    [Category.Equipment]: 0,
    [Category.Line]: 1,
    [Category.Instrument]: 2,
    [Category.Uncategorized]: 3,
  };

  const selectedTags = selectedTagIds
    .map(id => allTags.find(tag => tag.id === id))
    .filter((tag) => !!tag)
    .sort((a, b) => {
        const orderA = categorySortOrder[a.category] ?? 99;
        const orderB = categorySortOrder[b.category] ?? 99;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.text.localeCompare(b.text);
    });

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
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-4xl z-20 px-4 animate-fade-in-up">
      <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl p-3">
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="font-bold text-md text-white">{selectedTags.length} item(s) selected</h3>
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
    </div>
  );
};