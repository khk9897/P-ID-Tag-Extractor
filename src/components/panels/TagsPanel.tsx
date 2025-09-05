import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
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
  allTags,
  onSelect,
  onDelete,
  onPing,
  onEdit,
  onOpenCommentModal,
  getCommentsForTarget,
  onPingTag,
  onSelectRelatedTag
}: {
  tag: Tag;
  isSelected: boolean;
  relationships: Relationship[];
  allTags: Tag[];
  onSelect: (tagId: string, event: React.MouseEvent) => void;
  onDelete: () => void;
  onPing: () => void;
  onEdit: () => void;
  onOpenCommentModal: () => void;
  getCommentsForTarget: (targetId: string, targetType: string) => Comment[];
  onPingTag?: (tagId: string) => void;
  onSelectRelatedTag?: (tagId: string) => void;
}) => {
  const showRelationshipDetails = useSidePanelStore(state => state.showRelationshipDetails);
  const tagComments = getCommentsForTarget(tag.id, 'tag');
  
  // Create tag map for ID to text conversion and category mapping
  const tagMap = useMemo(() => 
    new Map(allTags.map(t => [t.id, t.text])),
    [allTags]
  );
  
  const tagCategoryMap = useMemo(() => 
    new Map(allTags.map(t => [t.id, t.category])),
    [allTags]
  );
  
  // Handle related tag click
  const handleRelatedTagClick = useCallback((targetId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent parent click
    
    if (onSelectRelatedTag) {
      onSelectRelatedTag(targetId);
    }
  }, [onSelectRelatedTag]);
  
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
            <button
              className="text-sm text-slate-300 break-all hover:text-sky-400 transition-colors cursor-pointer text-left"
              onClick={(e) => {
                e.stopPropagation();
                onPingTag?.(tag.id);
              }}
              title="Highlight in PDF"
            >
              {tag.text}
            </button>
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
                    {relatedInfo.connections.map(rel => {
                      const targetId = rel.from === tag.id ? rel.to : rel.from;
                      const targetText = tagMap.get(targetId) || targetId;
                      return (
                        <li key={rel.id} className="text-xs text-slate-400 flex items-center gap-1">
                          • <button
                              className="text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPingTag?.(targetId);
                              }}
                              title="Highlight in PDF"
                            >
                              {targetText}
                            </button>
                          <button 
                            onClick={(e) => handleRelatedTagClick(targetId, e)}
                            className="p-0.5 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                            title="Go to tag in panel"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {relatedInfo.installations.length > 0 && (
                <div className="mt-1 ml-2">
                  <span className="text-xs text-lime-400">
                    {tag.category === 'Line' ? 'Installed instrument:' : 'Installed on:'}
                  </span>
                  <ul className="ml-2">
                    {relatedInfo.installations.map(rel => {
                      const targetId = rel.from === tag.id ? rel.to : rel.from;
                      const targetText = tagMap.get(targetId) || targetId;
                      return (
                        <li key={rel.id} className="text-xs text-slate-400 flex items-center gap-1">
                          • <button
                              className="text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPingTag?.(targetId);
                              }}
                              title="Highlight in PDF"
                            >
                              {targetText}
                            </button>
                          <button 
                            onClick={(e) => handleRelatedTagClick(targetId, e)}
                            className="p-0.5 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                            title="Go to tag in panel"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
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
    showRelationshipDetails,
    openCommentModal,
    // Get selection state from zustand
    currentPage,
    selectedTagIds,
    setSelectedTagIds,
    tagSelectionSource
  } = useSidePanelStore();
  
  const listRef = useRef<List>(null);
  const lastClickedIndex = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
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
      
      setSelectedTagIds([...new Set([...(Array.isArray(selectedTagIds) ? selectedTagIds : []), ...rangeIds])], 'panel');
    } else if (event.ctrlKey || event.metaKey) {
      const newSelection = selectedTagIds.includes(tagId)
        ? selectedTagIds.filter(id => id !== tagId)
        : [...selectedTagIds, tagId];
      setSelectedTagIds(newSelection, 'panel');
    } else {
      setSelectedTagIds([tagId], 'panel');
    }
    
    lastClickedIndex.current = tagIndex;
  }, [filteredAndSortedTags, selectedTagIds, setSelectedTagIds]);
  
  const handleEditTag = useCallback((tag: Tag) => {
    const newText = prompt('Edit tag text:', tag.text);
    if (newText && newText !== tag.text) {
      onUpdateTagText(tag.id, newText);
    }
  }, [onUpdateTagText]);
  
  // Handle related tag selection - ensure both selection and scrolling
  const handleSelectRelatedTag = useCallback((targetId: string) => {
    // First, select the tag
    setSelectedTagIds([targetId], 'panel');
    
    // Find the target tag in the filtered list
    const targetIndex = filteredAndSortedTags.findIndex(t => t.id === targetId);
    
    if (targetIndex !== -1 && listRef.current) {
      // If found in filtered list, scroll to it
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(targetIndex, 'smart');
        }
      }, 100);
    } else {
      // If not in filtered list, try to find in all tags and temporarily show it
      const allTagIndex = tags.findIndex(t => t.id === targetId);
      if (allTagIndex !== -1) {
        console.log(`Target tag "${tags[allTagIndex].text}" not visible in current filter. Tag is on page ${tags[allTagIndex].page}.`);
        // Could potentially clear filters here if needed, but for now just select it
      }
    }
  }, [filteredAndSortedTags, setSelectedTagIds, tags]);
  
  // Calculate screen-aware dynamic height
  const [listHeight, setListHeight] = useState(400);
  
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current && headerRef.current) {
        // 화면 크기 정보
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        
        // 컨테이너 위치 및 크기
        const containerRect = containerRef.current.getBoundingClientRect();
        const headerRect = headerRef.current.getBoundingClientRect();
        
        // 사용 가능한 실제 높이 계산
        const availableHeight = Math.floor(
          windowHeight - containerRect.top - headerRect.height - 10 // 10px 여유 공간
        );
        
        // console.log('🔍 Screen-aware height calculation:', {
        //   windowHeight,
        //   windowWidth,
        //   containerTop: containerRect.top,
        //   containerHeight: containerRect.height,
        //   headerHeight: headerRect.height,
        //   calculatedAvailable: availableHeight,
        //   currentListHeight: listHeight,
        //   resolution: windowWidth + 'x' + windowHeight
        // });
        
        if (availableHeight > 200 && availableHeight !== listHeight) {
          setListHeight(availableHeight);
        }
      }
    };

    updateHeight();
    
    // ResizeObserver for container changes
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Window resize for screen/resolution changes
    const handleResize = () => {
      setTimeout(updateHeight, 50); // 약간의 지연으로 레이아웃 정착 후 측정
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Reset List cache when relationships or visibility settings change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [visibleRelationships, showRelationshipDetails]);

  // Auto-scroll to selected tag (only when selection source is viewer)
  useEffect(() => {
    if (tagSelectionSource === 'viewer' && selectedTagIds.length === 1 && listRef.current) {
      // Use a timeout to prevent excessive scrolling during rapid updates
      const timeoutId = setTimeout(() => {
        const selectedIndex = filteredAndSortedTags.findIndex(t => t.id === selectedTagIds[0]);
        if (selectedIndex !== -1) {
          listRef.current.scrollToItem(selectedIndex, 'smart');
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTagIds, tagSelectionSource]); // Remove filteredAndSortedTags dependency


  // Calculate dynamic item size based on relationship details
  const getItemSize = useCallback((index: number) => {
    const tag = filteredAndSortedTags[index];
    if (!showRelationshipDetails) return 60; // Base height
    
    const connections = visibleRelationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && r.type === 'Connection'
    );
    const installations = visibleRelationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && r.type === 'Installation'
    );
    
    const baseHeight = 60;
    const connectionLines = connections.length;
    const installationLines = installations.length;
    
    // Add extra height for relationship sections
    let extraHeight = 0;
    if (connectionLines > 0) {
      extraHeight += 20 + (connectionLines * 16); // Header + lines
    }
    if (installationLines > 0) {
      extraHeight += 20 + (installationLines * 16); // Header + lines
    }
    
    return baseHeight + extraHeight;
  }, [filteredAndSortedTags, visibleRelationships, showRelationshipDetails]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const tag = filteredAndSortedTags[index];
    const isSelected = Array.isArray(selectedTagIds) && selectedTagIds.includes(tag.id);
    
    return (
      <div style={style}>
        <TagListItem
          tag={tag}
          isSelected={isSelected}
          relationships={visibleRelationships}
          allTags={tags}
          onSelect={handleTagSelect}
          onDelete={() => onDeleteTags([tag.id])}
          onPing={() => onPingTag(tag.id)}
          onEdit={() => handleEditTag(tag)}
          onOpenCommentModal={() => openCommentModal(tag.id, tag.text, 'tag')}
          getCommentsForTarget={getCommentsForTarget}
          onPingTag={onPingTag}
          onSelectRelatedTag={handleSelectRelatedTag}
        />
      </div>
    );
  }, [filteredAndSortedTags, selectedTagIds, visibleRelationships, tags, handleTagSelect, onDeleteTags, onPingTag, handleEditTag, openCommentModal, getCommentsForTarget, handleSelectRelatedTag]);
  
  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
      <div ref={headerRef} className="mb-2 px-3 text-sm text-slate-400 flex-shrink-0">
        {filteredAndSortedTags.length} tags
        {selectedTagIds.length > 0 && (
          <span className="ml-2 text-sky-400">({selectedTagIds.length} selected)</span>
        )}
      </div>
      
      <div 
        className="flex-1 min-h-0"
        style={{ height: listHeight }}
      >
        {filteredAndSortedTags.length > 0 ? (
          <List
            ref={listRef}
            height={listHeight} // 동적으로 계산된 높이
            itemCount={filteredAndSortedTags.length}
            itemSize={getItemSize}
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
    </div>
  );
};