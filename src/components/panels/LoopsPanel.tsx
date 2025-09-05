import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Loop, Tag } from '../../types';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { EditButton, SaveButton, CancelButton, IconButton } from '../common/IconButton';

interface LoopsPanelProps {
  loops: Loop[];
  setLoops: (loops: Loop[]) => void;
  tags: Tag[];
  currentPage?: number;
  onAutoGenerateLoops: () => void;
  onManualCreateLoop: () => void;
  onDeleteLoops: (ids: string[]) => void;
  onUpdateLoop: (id: string, updates: Partial<Loop>) => void;
}

const LoopListItem = React.memo(({
  loop,
  tags,
  isEditing,
  editValue,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onValueChange
}: {
  loop: Loop;
  tags: Tag[];
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onValueChange: (value: string) => void;
}) => {
  const loopTags = useMemo(() => 
    tags.filter(tag => loop.tagIds.includes(tag.id)),
    [tags, loop.tagIds]
  );
  
  return (
    <li className="group px-2 py-2 border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-300"
                placeholder="Loop name"
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-300">{loop.name}</span>
                <span className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                  {loop.tagIds.length} tags
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Tags: {loopTags.map(t => t.text).join(', ')}
              </div>
            </>
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
              <EditButton onClick={onEdit} />
              <IconButton
                icon="trash"
                onClick={onDelete}
                title="Delete loop"
                className="opacity-0 group-hover:opacity-100"
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
});

LoopListItem.displayName = 'LoopListItem';

export const LoopsPanel: React.FC<LoopsPanelProps> = ({
  loops,
  setLoops,
  tags,
  currentPage,
  onAutoGenerateLoops,
  onManualCreateLoop,
  onDeleteLoops,
  onUpdateLoop
}) => {
  const {
    showCurrentPageOnly,
    loopSearchQuery,
    editingLoopId,
    setEditingLoopId,
    editingLoopValue,
    setEditingLoopValue
  } = useSidePanelStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Calculate list height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.offsetHeight;
        if (containerHeight > 200 && containerHeight !== listHeight) {
          setListHeight(containerHeight);
        }
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
  
  // Filter loops
  const filteredLoops = useMemo(() => {
    let filtered = [...loops];
    
    // Search filter
    if (loopSearchQuery) {
      const searchLower = loopSearchQuery.toLowerCase();
      filtered = filtered.filter(loop => 
        loop.name.toLowerCase().includes(searchLower) ||
        tags.some(tag => 
          loop.tagIds.includes(tag.id) && 
          tag.text.toLowerCase().includes(searchLower)
        )
      );
    }
    
    // Page filter
    if (showCurrentPageOnly && currentPage !== undefined) {
      filtered = filtered.filter(loop =>
        tags.some(tag => 
          loop.tagIds.includes(tag.id) && 
          tag.page === currentPage
        )
      );
    }
    
    return filtered;
  }, [loops, loopSearchQuery, showCurrentPageOnly, currentPage, tags]);
  
  const handleEditStart = useCallback((loop: Loop) => {
    setEditingLoopId(loop.id);
    setEditingLoopValue(loop.name);
  }, [setEditingLoopId, setEditingLoopValue]);
  
  const handleSave = useCallback(() => {
    if (editingLoopId && editingLoopValue) {
      onUpdateLoop(editingLoopId, { name: editingLoopValue });
      setEditingLoopId(null);
      setEditingLoopValue('');
    }
  }, [editingLoopId, editingLoopValue, onUpdateLoop, setEditingLoopId, setEditingLoopValue]);
  
  const handleCancel = useCallback(() => {
    setEditingLoopId(null);
    setEditingLoopValue('');
  }, [setEditingLoopId, setEditingLoopValue]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const loop = filteredLoops[index];
    const isEditing = editingLoopId === loop.id;
    
    return (
      <div style={style}>
        <LoopListItem
          loop={loop}
          tags={tags}
          isEditing={isEditing}
          editValue={editingLoopValue}
          onEdit={() => handleEditStart(loop)}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={() => onDeleteLoops([loop.id])}
          onValueChange={setEditingLoopValue}
        />
      </div>
    );
  }, [filteredLoops, tags, editingLoopId, editingLoopValue, handleEditStart, handleSave, handleCancel, onDeleteLoops, setEditingLoopValue]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-2 px-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {filteredLoops.length} loops
          </span>
          <div className="flex gap-2">
            <button
              onClick={onAutoGenerateLoops}
              className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
              title="Auto-generate loops from tags"
            >
              Auto-Generate
            </button>
            <button
              onClick={onManualCreateLoop}
              className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
              title="Create new loop manually"
            >
              + New Loop
            </button>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 min-h-0">
        {filteredLoops.length > 0 ? (
          <List
            height={listHeight}
            itemCount={filteredLoops.length}
            itemSize={70}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-slate-600"
          >
            {Row}
          </List>
        ) : (
          <div className="px-3 py-8 text-center text-slate-500">
            No loops found
          </div>
        )}
      </div>
    </div>
  );
};