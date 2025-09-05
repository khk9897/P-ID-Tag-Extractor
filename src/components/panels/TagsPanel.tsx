import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Tag, Relationship, Comment, Category } from '../../types';
import { CATEGORY_COLORS } from '../../constants';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { filterTags, filterRelationships } from '../../utils/filterUtils';
import { sortTags } from '../../utils/sortUtils';
import { DeleteTagButton, EditButton } from '../common/IconButton';
import { CommentIndicator } from '../CommentIndicator';

interface TagsPanelProps {
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  relationships: Relationship[];
  currentPage?: number;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[]) => void;
  tagSelectionSource?: string;
  onDeleteTags: (ids: string[]) => void;
  onUpdateTagText: (id: string, text: string) => void;
  onPingTag: (id: string) => void;
  comments: Comment[];
  onCreateComment: (comment: Partial<Comment>) => void;
  getCommentsForTarget: (targetId: string, targetType: string) => Comment[];
}

const TagListItem = React.memo(({ 
  tag, 
  isSelected, 
  relationships,
  onSelect,
  onDelete,
  onPing,
  onEdit,
  onOpenCommentModal,
  getCommentsForTarget
}: {
  tag: Tag;
  isSelected: boolean;
  relationships: Relationship[];
  onSelect: (tagId: string, event: React.MouseEvent) => void;
  onDelete: () => void;
  onPing: () => void;
  onEdit: () => void;
  onOpenCommentModal: () => void;
  getCommentsForTarget: (targetId: string, targetType: string) => Comment[];
}) => {
  const showRelationshipDetails = useSidePanelStore(state => state.showRelationshipDetails);
  const tagComments = getCommentsForTarget(tag.id, 'tag');
  
  // Get related items for this tag
  const relatedInfo = useMemo(() => {
    if (!showRelationshipDetails) return null;
    
    const connections = relationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && 
      r.type === 'Connection'
    );
    
    const installations = relationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && 
      r.type === 'Installation'
    );
    
    return { connections, installations };
  }, [tag.id, relationships, showRelationshipDetails]);

  return (
    <li
      className={`group px-2 py-1.5 border-b border-slate-700 cursor-pointer transition-all duration-150 hover:bg-slate-700/30 ${
        isSelected ? 'bg-sky-500/20 hover:bg-sky-500/30' : ''
      }`}
      onClick={(e) => onSelect(tag.id, e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
              style={{
                backgroundColor: `${CATEGORY_COLORS[tag.category]}20`,
                color: CATEGORY_COLORS[tag.category]
              }}
            >
              {tag.category}
            </span>
            <span className="text-sm text-slate-300 break-all">{tag.text}</span>
            {tag.isReviewed && (
              <span className="text-xs text-green-400" title="Reviewed">✓</span>
            )}
          </div>
          
          {showRelationshipDetails && relatedInfo && (
            <>
              {relatedInfo.connections.length > 0 && (
                <div className="mt-1 ml-2">
                  <span className="text-xs text-amber-400">Connected to:</span>
                  <ul className="ml-2">
                    {relatedInfo.connections.map(rel => (
                      <li key={rel.id} className="text-xs text-slate-400">
                        • {rel.from === tag.id ? `→ ${rel.to}` : `← ${rel.from}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {relatedInfo.installations.length > 0 && (
                <div className="mt-1 ml-2">
                  <span className="text-xs text-lime-400">Installed on:</span>
                  <ul className="ml-2">
                    {relatedInfo.installations.map(rel => (
                      <li key={rel.id} className="text-xs text-slate-400">
                        • {rel.from === tag.id ? `→ ${rel.to}` : `← ${rel.from}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {tagComments.length > 0 && (
            <CommentIndicator
              comments={tagComments}
              onClick={(e) => {
                e.stopPropagation();
                onOpenCommentModal();
              }}
            />
          )}
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
          <DeleteTagButton onClick={onDelete} />
        </div>
      </div>
    </li>
  );
});

TagListItem.displayName = 'TagListItem';

export const TagsPanel: React.FC<TagsPanelProps> = ({
  tags,
  setTags,
  relationships,
  currentPage,
  selectedTagIds,
  setSelectedTagIds,
  tagSelectionSource,
  onDeleteTags,
  onUpdateTagText,
  onPingTag,
  comments,
  onCreateComment,
  getCommentsForTarget
}) => {
  const {
    showCurrentPageOnly,
    debouncedSearchQuery,
    filterCategory,
    reviewFilter,
    commentFilter,
    sortOrder,
    openCommentModal
  } = useSidePanelStore();
  
  const listRef = useRef<List>(null);
  const lastClickedIndex = useRef<number>(-1);
  
  // Filter and sort tags
  const filteredAndSortedTags = useMemo(() => {
    const filtered = filterTags(tags, {
      searchQuery: debouncedSearchQuery,
      currentPage,
      showCurrentPageOnly,
      filterCategory,
      reviewFilter,
      commentFilter,
      comments
    });
    
    return sortTags(filtered, sortOrder as any);
  }, [tags, debouncedSearchQuery, currentPage, showCurrentPageOnly, filterCategory, reviewFilter, commentFilter, comments, sortOrder]);
  
  // Filter relationships for visible tags
  const visibleRelationships = useMemo(() => {
    const visibleTagIds = new Set(filteredAndSortedTags.map(t => t.id));
    return relationships.filter(r => 
      visibleTagIds.has(r.from) || visibleTagIds.has(r.to)
    );
  }, [filteredAndSortedTags, relationships]);
  
  const handleTagSelect = useCallback((tagId: string, event: React.MouseEvent) => {
    const tagIndex = filteredAndSortedTags.findIndex(t => t.id === tagId);
    
    if (event.shiftKey && lastClickedIndex.current !== -1) {
      const start = Math.min(lastClickedIndex.current, tagIndex);
      const end = Math.max(lastClickedIndex.current, tagIndex);
      const rangeIds = filteredAndSortedTags.slice(start, end + 1).map(t => t.id);
      
      setSelectedTagIds([...new Set([...selectedTagIds, ...rangeIds])]);
    } else if (event.ctrlKey || event.metaKey) {
      setSelectedTagIds(
        selectedTagIds.includes(tagId)
          ? selectedTagIds.filter(id => id !== tagId)
          : [...selectedTagIds, tagId]
      );
    } else {
      setSelectedTagIds([tagId]);
    }
    
    lastClickedIndex.current = tagIndex;
  }, [filteredAndSortedTags, selectedTagIds, setSelectedTagIds]);
  
  const handleEditTag = useCallback((tag: Tag) => {
    const newText = prompt('Edit tag text:', tag.text);
    if (newText && newText !== tag.text) {
      onUpdateTagText(tag.id, newText);
    }
  }, [onUpdateTagText]);
  
  // Auto-scroll to selected tag
  useEffect(() => {
    if (tagSelectionSource === 'viewer' && selectedTagIds.length > 0 && listRef.current) {
      const selectedIndex = filteredAndSortedTags.findIndex(t => selectedTagIds.includes(t.id));
      if (selectedIndex !== -1) {
        listRef.current.scrollToItem(selectedIndex, 'smart');
      }
    }
  }, [selectedTagIds, tagSelectionSource, filteredAndSortedTags]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const tag = filteredAndSortedTags[index];
    const isSelected = selectedTagIds.includes(tag.id);
    
    return (
      <div style={style}>
        <TagListItem
          tag={tag}
          isSelected={isSelected}
          relationships={visibleRelationships}
          onSelect={handleTagSelect}
          onDelete={() => onDeleteTags([tag.id])}
          onPing={() => onPingTag(tag.id)}
          onEdit={() => handleEditTag(tag)}
          onOpenCommentModal={() => openCommentModal(tag.id, tag.text, 'tag')}
          getCommentsForTarget={getCommentsForTarget}
        />
      </div>
    );
  }, [filteredAndSortedTags, selectedTagIds, visibleRelationships, handleTagSelect, onDeleteTags, onPingTag, handleEditTag, openCommentModal, getCommentsForTarget]);
  
  return (
    <div className="flex-1 overflow-hidden">
      <div className="mb-2 px-3 text-sm text-slate-400">
        {filteredAndSortedTags.length} tags
        {selectedTagIds.length > 0 && (
          <span className="ml-2 text-sky-400">({selectedTagIds.length} selected)</span>
        )}
      </div>
      
      {filteredAndSortedTags.length > 0 ? (
        <List
          ref={listRef}
          height={600}
          itemCount={filteredAndSortedTags.length}
          itemSize={60}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-slate-600"
        >
          {Row}
        </List>
      ) : (
        <div className="px-3 py-8 text-center text-slate-500">
          No tags found
        </div>
      )}
    </div>
  );
};