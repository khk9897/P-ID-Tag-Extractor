import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Description } from '../../types';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { filterDescriptions, sortDescriptions } from '../../utils/filterUtils';
import { EditButton, SaveButton, CancelButton, IconButton } from '../common/IconButton';

interface DescriptionsPanelProps {
  descriptions: Description[];
  onDeleteDescriptions: (ids: string[]) => void;
  onUpdateDescription: (id: string, updates: Partial<Description>) => void;
  onAutoLinkDescriptions: () => void;
  onAutoLinkNotesAndHolds: () => void;
  onPingDescription: (id: string) => void;
}

const DescriptionListItem = React.memo(({
  description,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onPing,
  tempText,
  tempMetadata,
  onTextChange,
  onMetadataChange
}: {
  description: Description;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onPing: () => void;
  tempText: string;
  tempMetadata: any;
  onTextChange: (text: string) => void;
  onMetadataChange: (field: string, value: string) => void;
}) => {
  return (
    <li
      className={`group px-2 py-1.5 border-b border-slate-700 cursor-pointer transition-all duration-150 hover:bg-slate-700/30 ${
        isSelected ? 'bg-sky-500/20 hover:bg-sky-500/30' : ''
      }`}
      onClick={(e) => onSelect(description.id, e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={tempText}
                onChange={(e) => onTextChange(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-300"
                placeholder="Description text"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempMetadata?.type || ''}
                  onChange={(e) => onMetadataChange('type', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300"
                  placeholder="Type (e.g., NOTE)"
                />
                <input
                  type="text"
                  value={tempMetadata?.scope || ''}
                  onChange={(e) => onMetadataChange('scope', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300"
                  placeholder="Scope"
                />
                <input
                  type="text"
                  value={tempMetadata?.number || ''}
                  onChange={(e) => onMetadataChange('number', e.target.value)}
                  className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300"
                  placeholder="#"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                {description.metadata?.type && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                    {description.metadata.type}
                  </span>
                )}
                {description.metadata?.number && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-slate-600 text-slate-300 rounded">
                    #{description.metadata.number}
                  </span>
                )}
                <span className="text-xs text-slate-500">Page {description.page}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{description.text}</p>
              {description.metadata?.scope && (
                <p className="text-xs text-slate-500 mt-0.5">Scope: {description.metadata.scope}</p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <SaveButton onClick={onSave} />
              <CancelButton onClick={onCancel} />
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPing();
                }}
                className="p-1 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/20 transition-colors opacity-0 group-hover:opacity-100"
                title="Show in PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <EditButton onClick={onEdit} />
              <IconButton
                icon="trash"
                onClick={onDelete}
                title="Delete description"
                className="opacity-0 group-hover:opacity-100"
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
});

DescriptionListItem.displayName = 'DescriptionListItem';

export const DescriptionsPanel: React.FC<DescriptionsPanelProps> = ({
  descriptions,
  onDeleteDescriptions,
  onUpdateDescription,
  onAutoLinkDescriptions,
  onAutoLinkNotesAndHolds,
  onPingDescription
}) => {
  const {
    showCurrentPageOnly,
    debouncedSearchQuery,
    editingDescriptionId,
    setEditingDescriptionId,
    tempDescriptionText,
    setTempDescriptionText,
    tempDescriptionMetadata,
    setTempDescriptionMetadata,
    // Get selection state from zustand
    currentPage,
    selectedDescriptionIds,
    setSelectedDescriptionIds
  } = useSidePanelStore();
  
  const listRef = useRef<List>(null);
  const lastClickedIndex = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);
  
  // Filter and sort descriptions
  const filteredDescriptions = useMemo(() => {
    const filtered = filterDescriptions(
      descriptions,
      debouncedSearchQuery,
      currentPage,
      showCurrentPageOnly
    );
    return sortDescriptions(filtered);
  }, [descriptions, debouncedSearchQuery, currentPage, showCurrentPageOnly]);
  
  const handleDescriptionSelect = useCallback((descId: string, event: React.MouseEvent) => {
    const descIndex = filteredDescriptions.findIndex(d => d.id === descId);
    
    if (event.shiftKey && lastClickedIndex.current !== -1) {
      const start = Math.min(lastClickedIndex.current, descIndex);
      const end = Math.max(lastClickedIndex.current, descIndex);
      const rangeIds = filteredDescriptions.slice(start, end + 1).map(d => d.id);
      
      setSelectedDescriptionIds([...new Set([...selectedDescriptionIds, ...rangeIds])]);
    } else if (event.ctrlKey || event.metaKey) {
      setSelectedDescriptionIds(
        selectedDescriptionIds.includes(descId)
          ? selectedDescriptionIds.filter(id => id !== descId)
          : [...selectedDescriptionIds, descId]
      );
    } else {
      setSelectedDescriptionIds([descId]);
    }
    
    lastClickedIndex.current = descIndex;
  }, [filteredDescriptions, selectedDescriptionIds, setSelectedDescriptionIds]);
  
  const handleEditStart = useCallback((description: Description) => {
    setEditingDescriptionId(description.id);
    setTempDescriptionText(description.text);
    setTempDescriptionMetadata(description.metadata || {});
  }, [setEditingDescriptionId, setTempDescriptionText, setTempDescriptionMetadata]);
  
  const handleSave = useCallback(() => {
    if (editingDescriptionId) {
      onUpdateDescription(editingDescriptionId, {
        text: tempDescriptionText,
        metadata: tempDescriptionMetadata
      });
      setEditingDescriptionId(null);
    }
  }, [editingDescriptionId, tempDescriptionText, tempDescriptionMetadata, onUpdateDescription, setEditingDescriptionId]);
  
  const handleCancel = useCallback(() => {
    setEditingDescriptionId(null);
    setTempDescriptionText('');
    setTempDescriptionMetadata({});
  }, [setEditingDescriptionId, setTempDescriptionText, setTempDescriptionMetadata]);

  // Calculate list height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.offsetHeight;
        setListHeight(containerHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const description = filteredDescriptions[index];
    const isSelected = selectedDescriptionIds.includes(description.id);
    const isEditing = editingDescriptionId === description.id;
    
    return (
      <div style={style}>
        <DescriptionListItem
          description={description}
          isSelected={isSelected}
          isEditing={isEditing}
          onSelect={handleDescriptionSelect}
          onEdit={() => handleEditStart(description)}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={() => onDeleteDescriptions([description.id])}
          onPing={() => onPingDescription(description.id)}
          tempText={tempDescriptionText}
          tempMetadata={tempDescriptionMetadata}
          onTextChange={setTempDescriptionText}
          onMetadataChange={(field, value) => 
            setTempDescriptionMetadata({ ...tempDescriptionMetadata, [field]: value })
          }
        />
      </div>
    );
  }, [
    filteredDescriptions, selectedDescriptionIds, editingDescriptionId,
    handleDescriptionSelect, handleEditStart, handleSave, handleCancel,
    onDeleteDescriptions, onPingDescription, tempDescriptionText, tempDescriptionMetadata,
    setTempDescriptionText, setTempDescriptionMetadata
  ]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-2 px-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {filteredDescriptions.length} descriptions
            {selectedDescriptionIds.length > 0 && (
              <span className="ml-2 text-sky-400">({selectedDescriptionIds.length} selected)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onAutoLinkDescriptions}
              className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
              title="Auto-link descriptions to tags"
            >
              Auto-Link Descriptions
            </button>
            <button
              onClick={onAutoLinkNotesAndHolds}
              className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
              title="Auto-link notes & holds"
            >
              Auto-Link N&H
            </button>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 min-h-0">
        {filteredDescriptions.length > 0 ? (
          <List
            ref={listRef}
            height={listHeight}
            itemCount={filteredDescriptions.length}
            itemSize={80}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-slate-600"
          >
            {Row}
          </List>
        ) : (
          <div className="px-3 py-8 text-center text-slate-500">
            No descriptions found
          </div>
        )}
      </div>
    </div>
  );
};