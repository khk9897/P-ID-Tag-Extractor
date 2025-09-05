import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Relationship, Tag, RelationshipTypeValue } from '../../types';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { filterRelationships } from '../../utils/filterUtils';
import { IconButton } from '../common/IconButton';

interface RelationshipsPanelProps {
  relationships: Relationship[];
  setRelationships: (relationships: Relationship[]) => void;
  tags: Tag[];
  onPingRelationship: (id: string) => void;
}

const RELATIONSHIP_COLORS: Record<RelationshipTypeValue, string> = {
  Connection: '#fbbf24',
  Installation: '#84cc16',
  Annotation: '#06b6d4',
  Note: '#a855f7',
  Description: '#8b5cf6',
  EquipmentShortSpec: '#ec4899'
};

const RelationshipListItem = React.memo(({
  relationship,
  sourceTag,
  targetTag,
  onDelete,
  onPing
}: {
  relationship: Relationship;
  sourceTag?: Tag;
  targetTag?: Tag;
  onDelete: () => void;
  onPing: () => void;
}) => {
  return (
    <li className="group px-2 py-1.5 border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap"
              style={{
                backgroundColor: `${RELATIONSHIP_COLORS[relationship.type]}20`,
                color: RELATIONSHIP_COLORS[relationship.type]
              }}
            >
              {relationship.type}
            </span>
            <div className="flex items-center gap-1 text-sm text-slate-300">
              <span className="truncate">{sourceTag?.text || relationship.sourceId}</span>
              <span className="text-slate-500">→</span>
              <span className="truncate">{targetTag?.text || relationship.targetId}</span>
            </div>
          </div>
          {(sourceTag || targetTag) && (
            <div className="text-xs text-slate-500 mt-0.5">
              Page {sourceTag?.page || targetTag?.page}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
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
          <IconButton
            icon="delete"
            onClick={onDelete}
            title="Delete relationship"
            size="small"
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
      </div>
    </li>
  );
});

RelationshipListItem.displayName = 'RelationshipListItem';

export const RelationshipsPanel: React.FC<RelationshipsPanelProps> = ({
  relationships,
  setRelationships,
  tags,
  onPingRelationship
}) => {
  const { 
    showCurrentPageOnly, 
    debouncedSearchQuery,
    currentPage 
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
  
  // Create tag map for quick lookups
  const tagMap = useMemo(() => 
    new Map(tags.map(t => [t.id, t])),
    [tags]
  );
  
  // Filter relationships
  const filteredRelationships = useMemo(() => {
    let filtered = filterRelationships(relationships, tags, debouncedSearchQuery);
    
    if (showCurrentPageOnly && currentPage !== undefined) {
      filtered = filtered.filter(rel => {
        const sourceTag = tagMap.get(rel.from);
        const targetTag = tagMap.get(rel.to);
        return sourceTag?.page === currentPage || targetTag?.page === currentPage;
      });
    }
    
    return filtered;
  }, [relationships, tags, debouncedSearchQuery, showCurrentPageOnly, currentPage, tagMap]);
  
  const handleDeleteRelationship = useCallback((relId: string) => {
    setRelationships(relationships.filter(r => r.id !== relId));
  }, [relationships, setRelationships]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const relationship = filteredRelationships[index];
    const sourceTag = tagMap.get(relationship.from);
    const targetTag = tagMap.get(relationship.to);
    
    return (
      <div style={style}>
        <RelationshipListItem
          relationship={relationship}
          sourceTag={sourceTag}
          targetTag={targetTag}
          onDelete={() => handleDeleteRelationship(relationship.id)}
          onPing={() => onPingRelationship(relationship.id)}
        />
      </div>
    );
  }, [filteredRelationships, tagMap, handleDeleteRelationship, onPingRelationship]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-2 px-3 text-sm text-slate-400 flex-shrink-0">
        {filteredRelationships.length} relationships
      </div>
      
      <div ref={containerRef} className="flex-1 min-h-0">
        {filteredRelationships.length > 0 ? (
          <List
            height={listHeight}
            itemCount={filteredRelationships.length}
            itemSize={50}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-slate-600"
          >
            {Row}
          </List>
        ) : (
          <div className="px-3 py-8 text-center text-slate-500">
            No relationships found
          </div>
        )}
      </div>
    </div>
  );
};