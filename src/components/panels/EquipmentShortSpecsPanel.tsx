import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EquipmentShortSpec } from '../../types';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { filterEquipmentShortSpecs, sortEquipmentShortSpecs } from '../../utils/filterUtils';
import { EditButton, SaveButton, CancelButton, IconButton } from '../common/IconButton';

interface EquipmentShortSpecsPanelProps {
  equipmentShortSpecs: EquipmentShortSpec[];
  setEquipmentShortSpecs: (specs: EquipmentShortSpec[]) => void;
  currentPage?: number;
  selectedEquipmentShortSpecIds: string[];
  setSelectedEquipmentShortSpecIds: (ids: string[]) => void;
  onDeleteEquipmentShortSpecs: (ids: string[]) => void;
  onUpdateEquipmentShortSpec: (id: string, updates: Partial<EquipmentShortSpec>) => void;
  onAutoLinkEquipmentShortSpecs: () => void;
  onPingEquipmentShortSpec: (id: string) => void;
}

const EquipmentShortSpecListItem = React.memo(({
  spec,
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
  spec: EquipmentShortSpec;
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
      onClick={(e) => onSelect(spec.id, e)}
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
                placeholder="Specification text"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempMetadata?.originalEquipmentTag?.text || ''}
                  onChange={(e) => onMetadataChange('originalEquipmentTag', { text: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300"
                  placeholder="Equipment tag"
                />
                <input
                  type="text"
                  value={tempMetadata?.service || ''}
                  onChange={(e) => onMetadataChange('service', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300"
                  placeholder="Service"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                {spec.metadata?.originalEquipmentTag && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-pink-500/20 text-pink-400 rounded">
                    {spec.metadata.originalEquipmentTag.text}
                  </span>
                )}
                <span className="text-xs text-slate-500">Page {spec.page}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{spec.text}</p>
              {spec.metadata?.service && (
                <p className="text-xs text-slate-500 mt-0.5">Service: {spec.metadata.service}</p>
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
                title="Delete specification"
                className="opacity-0 group-hover:opacity-100"
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
});

EquipmentShortSpecListItem.displayName = 'EquipmentShortSpecListItem';

export const EquipmentShortSpecsPanel: React.FC<EquipmentShortSpecsPanelProps> = ({
  equipmentShortSpecs,
  setEquipmentShortSpecs,
  currentPage,
  selectedEquipmentShortSpecIds,
  setSelectedEquipmentShortSpecIds,
  onDeleteEquipmentShortSpecs,
  onUpdateEquipmentShortSpec,
  onAutoLinkEquipmentShortSpecs,
  onPingEquipmentShortSpec
}) => {
  const {
    showCurrentPageOnly,
    debouncedSearchQuery,
    editingEquipmentShortSpecId,
    setEditingEquipmentShortSpecId,
    tempEquipmentShortSpecText,
    setTempEquipmentShortSpecText,
    tempEquipmentShortSpecMetadata,
    setTempEquipmentShortSpecMetadata
  } = useSidePanelStore();
  
  // Filter and sort specs
  const filteredSpecs = useMemo(() => {
    const filtered = filterEquipmentShortSpecs(
      equipmentShortSpecs,
      debouncedSearchQuery,
      currentPage,
      showCurrentPageOnly
    );
    return sortEquipmentShortSpecs(filtered);
  }, [equipmentShortSpecs, debouncedSearchQuery, currentPage, showCurrentPageOnly]);
  
  const handleSpecSelect = useCallback((specId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedEquipmentShortSpecIds(
        selectedEquipmentShortSpecIds.includes(specId)
          ? selectedEquipmentShortSpecIds.filter(id => id !== specId)
          : [...selectedEquipmentShortSpecIds, specId]
      );
    } else {
      setSelectedEquipmentShortSpecIds([specId]);
    }
  }, [selectedEquipmentShortSpecIds, setSelectedEquipmentShortSpecIds]);
  
  const handleEditStart = useCallback((spec: EquipmentShortSpec) => {
    setEditingEquipmentShortSpecId(spec.id);
    setTempEquipmentShortSpecText(spec.text);
    setTempEquipmentShortSpecMetadata(spec.metadata || {});
  }, [setEditingEquipmentShortSpecId, setTempEquipmentShortSpecText, setTempEquipmentShortSpecMetadata]);
  
  const handleSave = useCallback(() => {
    if (editingEquipmentShortSpecId) {
      onUpdateEquipmentShortSpec(editingEquipmentShortSpecId, {
        text: tempEquipmentShortSpecText,
        metadata: tempEquipmentShortSpecMetadata
      });
      setEditingEquipmentShortSpecId(null);
    }
  }, [
    editingEquipmentShortSpecId, tempEquipmentShortSpecText, tempEquipmentShortSpecMetadata,
    onUpdateEquipmentShortSpec, setEditingEquipmentShortSpecId
  ]);
  
  const handleCancel = useCallback(() => {
    setEditingEquipmentShortSpecId(null);
    setTempEquipmentShortSpecText('');
    setTempEquipmentShortSpecMetadata({});
  }, [setEditingEquipmentShortSpecId, setTempEquipmentShortSpecText, setTempEquipmentShortSpecMetadata]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const spec = filteredSpecs[index];
    const isSelected = selectedEquipmentShortSpecIds.includes(spec.id);
    const isEditing = editingEquipmentShortSpecId === spec.id;
    
    return (
      <div style={style}>
        <EquipmentShortSpecListItem
          spec={spec}
          isSelected={isSelected}
          isEditing={isEditing}
          onSelect={handleSpecSelect}
          onEdit={() => handleEditStart(spec)}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={() => onDeleteEquipmentShortSpecs([spec.id])}
          onPing={() => onPingEquipmentShortSpec(spec.id)}
          tempText={tempEquipmentShortSpecText}
          tempMetadata={tempEquipmentShortSpecMetadata}
          onTextChange={setTempEquipmentShortSpecText}
          onMetadataChange={(field, value) => 
            setTempEquipmentShortSpecMetadata({ ...tempEquipmentShortSpecMetadata, [field]: value })
          }
        />
      </div>
    );
  }, [
    filteredSpecs, selectedEquipmentShortSpecIds, editingEquipmentShortSpecId,
    handleSpecSelect, handleEditStart, handleSave, handleCancel,
    onDeleteEquipmentShortSpecs, onPingEquipmentShortSpec, tempEquipmentShortSpecText,
    tempEquipmentShortSpecMetadata, setTempEquipmentShortSpecText, setTempEquipmentShortSpecMetadata
  ]);
  
  return (
    <div className="flex-1 overflow-hidden">
      <div className="mb-2 px-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {filteredSpecs.length} specifications
            {selectedEquipmentShortSpecIds.length > 0 && (
              <span className="ml-2 text-sky-400">({selectedEquipmentShortSpecIds.length} selected)</span>
            )}
          </span>
          <button
            onClick={onAutoLinkEquipmentShortSpecs}
            className="px-2 py-1 text-xs bg-pink-500/20 text-pink-400 rounded hover:bg-pink-500/30 transition-colors"
            title="Auto-link equipment specifications"
          >
            Auto-Link Specs
          </button>
        </div>
      </div>
      
      {filteredSpecs.length > 0 ? (
        <List
          height={600}
          itemCount={filteredSpecs.length}
          itemSize={80}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-slate-600"
        >
          {Row}
        </List>
      ) : (
        <div className="px-3 py-8 text-center text-slate-500">
          No equipment specifications found
        </div>
      )}
    </div>
  );
};