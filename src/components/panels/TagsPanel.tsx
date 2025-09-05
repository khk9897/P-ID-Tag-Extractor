import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Tag, Relationship, Comment, Category, Description, EquipmentShortSpec, Loop, RelationshipType } from '../../types';
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
  descriptions: Description[];
  equipmentShortSpecs: EquipmentShortSpec[];
  loops: Loop[];
  rawTextItems: RawTextItem[];
  onDeleteTags: (ids: string[]) => void;
  onUpdateTagText: (id: string, text: string) => void;
  onToggleReviewStatus: (tagId: string) => void;
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
  descriptions,
  equipmentShortSpecs,
  loops,
  rawTextItems,
  onSelect,
  onDelete,
  onPing,
  onEdit,
  onOpenCommentModal,
  onToggleReviewStatus,
  getCommentsForTarget,
  onPingTag,
  onSelectRelatedTag,
  expandedLoops,
  expandedNotes,
  expandedSpecs,
  onToggleExpandLoops,
  onToggleExpandNotes,
  onToggleExpandSpecs
}: {
  tag: Tag;
  isSelected: boolean;
  relationships: Relationship[];
  allTags: Tag[];
  descriptions: Description[];
  equipmentShortSpecs: EquipmentShortSpec[];
  loops: Loop[];
  onSelect: (tagId: string, event: React.MouseEvent) => void;
  onDelete: () => void;
  onPing: () => void;
  onEdit: () => void;
  onOpenCommentModal: () => void;
  onToggleReviewStatus: (tagId: string) => void;
  getCommentsForTarget: (targetId: string, targetType: string) => Comment[];
  onPingTag?: (tagId: string) => void;
  onSelectRelatedTag?: (tagId: string) => void;
  expandedLoops: Set<string>;
  expandedNotes: Set<string>;
  expandedSpecs: Set<string>;
  onToggleExpandLoops: (tagId: string) => void;
  onToggleExpandNotes: (tagId: string) => void;
  onToggleExpandSpecs: (tagId: string) => void;
}) => {
  const showRelationshipDetails = useSidePanelStore(state => state.showRelationshipDetails);
  const tagComments = getCommentsForTarget(tag.id, 'tag');
  
  // Create tag map for ID to text conversion and category mapping
  const tagMap = useMemo(() => 
    new Map(allTags.map(t => [t.id, t.text])),
    [allTags]
  );
  
  // Category badge colors and letters
  const colors = CATEGORY_COLORS[tag.category];
  const categoryLetters = {
    [Category.Equipment]: 'E',
    [Category.Line]: 'L',
    [Category.Instrument]: 'I',
    [Category.DrawingNumber]: 'D',
    [Category.NotesAndHolds]: 'N',
    [Category.SpecialItem]: 'S',
    [Category.OffPageConnector]: 'O',
    [Category.Uncategorized]: 'U'
  };

  // Drawing number for current page
  const drawingNumberTag = useMemo(() => {
    const pageDrawingNumbers = allTags.filter(t => t.page === tag.page && t.category === Category.DrawingNumber);
    return pageDrawingNumbers.length > 0 ? pageDrawingNumbers[0] : null;
  }, [allTags, tag.page]);
  
  // Loop information for this tag
  const tagLoops = useMemo(() => {
    return loops.filter(loop => loop.tagIds.includes(tag.id));
  }, [loops, tag.id]);
  
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
      className={`list-none group px-2 border-b border-slate-700 cursor-pointer transition-all duration-150 hover:bg-slate-700/30 ${
        isSelected ? 'bg-sky-500/20 hover:bg-sky-500/30' : ''
      }`}
      onClick={(e) => onSelect(tag.id, e)}
    >
      <div className="flex items-start justify-between gap-2" style={{ margin: 0, padding: 0 }}>
        <div className="flex-1 min-w-0" style={{ margin: 0, padding: 0 }}>
          <div className="flex items-center gap-2" style={{ margin: 0, padding: 0 }}>
            <input
              type="checkbox"
              checked={tag.isReviewed || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleReviewStatus(tag.id);
              }}
              className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-2 flex-shrink-0"
              style={{ margin: 0, minWidth: '16px', minHeight: '16px' }}
              title="Mark as reviewed"
            />
            <span 
              className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white border flex-shrink-0`}
              style={{
                backgroundColor: tag.category === Category.Equipment ? '#fb923c' :
                               tag.category === Category.Line ? '#f472b6' :
                               tag.category === Category.Instrument ? '#fbbf24' :
                               tag.category === Category.DrawingNumber ? '#818cf8' :
                               tag.category === Category.NotesAndHolds ? '#5eead4' :
                               tag.category === Category.SpecialItem ? '#c084fc' :
                               tag.category === Category.OffPageConnector ? '#a78bfa' : '#94a3b8',
                borderColor: tag.category === Category.Equipment ? '#fdba74' :
                           tag.category === Category.Line ? '#f9a8d4' :
                           tag.category === Category.Instrument ? '#fcd34d' :
                           tag.category === Category.DrawingNumber ? '#a5b4fc' :
                           tag.category === Category.NotesAndHolds ? '#99f6e4' :
                           tag.category === Category.SpecialItem ? '#d8b4fe' :
                           tag.category === Category.OffPageConnector ? '#c4b5fd' : '#cbd5e1'
              }}
              title={tag.category}
            >
              {categoryLetters[tag.category]}
            </span>
            <button
              className="text-sm text-slate-300 truncate hover:text-sky-400 transition-colors cursor-pointer text-left flex-1 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(tag.id, e);
              }}
              title={tag.text}
            >
              {tag.text}
            </button>
          </div>
          
          {/* Drawing Number Display */}
          {tag.category !== Category.DrawingNumber && drawingNumberTag && (
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              DWG: {drawingNumberTag.text}
            </div>
          )}
          
          {showRelationshipDetails && relatedInfo && (
            <>
              {relatedInfo.connections.length > 0 && (
                <div className="mt-3 mb-2">
                  <div className="text-xs text-amber-400 font-mono mb-1">Connected to:</div>
                  <div className="ml-2">
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
                </div>
              )}
              
              {relatedInfo.installations.length > 0 && (
                <div className="mt-3 mb-2">
                  <div className="text-xs text-lime-400 font-mono mb-1">
                    {tag.category === 'Line' ? 'Installed instrument:' : 'Installed on:'}
                  </div>
                  <div className="ml-2">
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
                </div>
              )}
              
              {/* Loop Information for Instrument tags */}
              {tag.category === Category.Instrument && tagLoops.length > 0 && (
                <div className="mt-1">
                  {tagLoops.map(loop => {
                    const isExpanded = expandedLoops.has(tag.id);
                    const loopTags = loop.tagIds.map(id => allTags.find(t => t.id === id)).filter(Boolean);
                    
                    return (
                      <div key={loop.id} className="mb-1">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-slate-700/20 rounded px-1 py-0.5 transition-colors w-fit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpandLoops(tag.id);
                          }}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-3 w-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-blue-400 font-mono">
                            Loop: {loop.name || loop.id} ({loopTags.length} tags) P.{loopTags.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ')}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-1 ml-2">
                            <ul className="ml-2">
                              {loopTags.map(loopTag => (
                                <li key={loopTag.id} className="text-xs text-slate-400 flex items-center gap-1">
                                  • <span className="text-slate-500 font-mono">P.{loopTag.page}</span>
                                  <button
                                    className="text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPingTag?.(loopTag.id);
                                    }}
                                    title="Highlight in PDF"
                                  >
                                    {loopTag.text}
                                  </button>
                                  <button 
                                    onClick={(e) => handleRelatedTagClick(loopTag.id, e)}
                                    className="p-0.5 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                                    title="Go to tag in panel"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Equipment Short Spec */}
              {tag.category === Category.Equipment && (() => {
                const equipmentSpecs = equipmentShortSpecs.filter(spec => {
                  const specRelationships = relationships.filter(r => 
                    (r.from === tag.id && r.to === spec.id) || 
                    (r.from === spec.id && r.to === tag.id)
                  );
                  return specRelationships.length > 0;
                });
                
                return equipmentSpecs.length > 0 && (
                  <div className="mt-4 mb-3">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:bg-slate-700/20 rounded px-1 py-0.5 transition-colors w-fit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpandSpecs(tag.id);
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-3 w-3 text-slate-400 transition-transform ${expandedSpecs.has(tag.id) ? 'rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-orange-400 font-mono">
                        Equipment Spec
                      </span>
                    </div>
                    
                    {expandedSpecs.has(tag.id) && (
                      <div className="mt-1 ml-2">
                        <ul className="ml-2">
                          {equipmentSpecs.map(spec => (
                            <li key={spec.id} className="text-xs text-slate-400 flex items-start gap-1 mt-1">
                              • <div className="flex-1">
                                <div className="text-orange-300 font-medium">
                                  {spec.metadata?.service}
                                </div>
                                <div className="text-slate-400 text-xs mt-0.5">
                                  {spec.text.substring(0, 100)}
                                  {spec.text.length > 100 && '...'}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Related Text Items (via Annotation relationships) */}
              {(() => {
                const annotationRels = relationships.filter(r => 
                  r.from === tag.id && r.type === RelationshipType.Annotation
                );
                if (annotationRels.length === 0) return null;
                
                return (
                  <div className="mt-4 mb-3">
                    <div className="text-xs text-slate-400 font-mono mb-1">
                      Related Text: ({annotationRels.length} items)
                    </div>
                    <div className="ml-2">
                      <ul className="ml-2">
                        {annotationRels.map(rel => {
                          const relatedItem = rawTextItems.find(item => item.id === rel.to);
                          if (!relatedItem) return null;
                          
                          return (
                            <li key={rel.id} className="text-xs text-slate-400 flex items-start gap-1 mt-1">
                              • <div className="flex-1">
                                <span className="text-slate-500 font-mono">P.{relatedItem.page}</span>
                                <div className="text-slate-300 text-xs mt-0.5">
                                  {relatedItem.text ? relatedItem.text.substring(0, 50) : ''}
                                  {relatedItem.text && relatedItem.text.length > 50 && '...'}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })()}
              
              {/* Note & Hold Descriptions - Show at the end */}
              {(() => {
                const noteRelsFrom = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.Note);
                const noteRelsTo = relationships.filter(r => r.to === tag.id && r.type === RelationshipType.Note);
                const allNoteRels = [...noteRelsFrom, ...noteRelsTo];
                
                
                if (allNoteRels.length === 0) return null;
                
                return (
                  <div className="mt-4 mb-3">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:bg-slate-700/20 rounded px-1 py-0.5 transition-colors w-fit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpandNotes(tag.id);
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-3 w-3 text-slate-400 transition-transform ${expandedNotes.has(tag.id) ? 'rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-purple-400 font-mono">
                        Notes & Hold: ({allNoteRels.length} {allNoteRels.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                    
                    {expandedNotes.has(tag.id) && (
                      <div className="mt-1 ml-2">
                        <ul className="ml-2">
                          {allNoteRels.map(rel => {
                            // Handle both directions of relationships
                            const targetId = rel.from === tag.id ? rel.to : rel.from;
                            const noteDescription = descriptions.find(desc => desc.id === targetId);
                            
                            
                            if (!noteDescription) return null;
                            
                            return (
                              <li key={rel.id} className="text-xs text-slate-400 mt-1">
                                <div className="flex items-start gap-1">
                                  <span>•</span>
                                  <div className="flex-1">
                                    <div className="text-purple-300 font-medium">
                                      {noteDescription.metadata?.type} {noteDescription.metadata?.number}
                                    </div>
                                    <div className="text-slate-400 text-xs mt-0.5">
                                      {noteDescription.text.substring(0, 100)}
                                      {noteDescription.text.length > 100 && '...'}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {tagComments.length > 0 && (
            <CommentIndicator
              comments={tagComments}
              onClick={() => {
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
  descriptions,
  equipmentShortSpecs,
  loops,
  rawTextItems,
  onDeleteTags,
  onUpdateTagText,
  onToggleReviewStatus,
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
  
  // Manage expansion states at panel level for dynamic height calculation
  const [panelExpandedLoops, setPanelExpandedLoops] = useState(new Set<string>());
  const [panelExpandedNotes, setPanelExpandedNotes] = useState(new Set<string>());
  const [panelExpandedSpecs, setPanelExpandedSpecs] = useState(new Set<string>());

  // Create loops by tag map for performance
  const loopsByTag = useMemo(() => {
    const map = new Map<string, any[]>();
    loops.forEach(loop => {
      loop.tagIds.forEach(tagId => {
        if (!map.has(tagId)) {
          map.set(tagId, []);
        }
        map.get(tagId)!.push(loop);
      });
    });
    return map;
  }, [loops]);
  
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

  // Expansion toggle handlers
  const handleToggleExpandLoops = useCallback((tagId: string) => {
    setPanelExpandedLoops(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  const handleToggleExpandNotes = useCallback((tagId: string) => {
    setPanelExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  const handleToggleExpandSpecs = useCallback((tagId: string) => {
    setPanelExpandedSpecs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);
  
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
  }, [visibleRelationships, showRelationshipDetails, loopsByTag, equipmentShortSpecs, descriptions, panelExpandedLoops, panelExpandedNotes, panelExpandedSpecs]);

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


  // Calculate dynamic item size based on expanded sections
  const getItemSize = useCallback((index: number) => {
    const tag = filteredAndSortedTags[index];
    let baseHeight = 32; // Minimal base height for review checkbox and tag text
    
    // Add height for drawing number if present
    if (tag.category !== Category.DrawingNumber) {
      const drawingNumberTag = tags.find(t => 
        t.category === Category.DrawingNumber && t.page === tag.page
      );
      if (drawingNumberTag) {
        baseHeight += 18; // Height for drawing number line
      }
    }
    
    if (!showRelationshipDetails) return baseHeight;
    
    // Count relationships for traditional sections
    const connections = visibleRelationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && r.type === 'Connection'
    );
    const installations = visibleRelationships.filter(r => 
      (r.from === tag.id || r.to === tag.id) && r.type === 'Installation'
    );
    
    let extraHeight = 0;
    
    // Traditional relationship sections
    if (connections.length > 0) {
      extraHeight += 20 + (connections.length * 16); // Header + lines
    }
    if (installations.length > 0) {
      extraHeight += 20 + (installations.length * 16); // Header + lines
    }
    
    // New expandable sections - check if they have content and are expanded
    
    // Loop information for Instrument tags
    if (tag.category === Category.Instrument) {
      const tagLoops = loopsByTag.get(tag.id) || [];
      if (tagLoops.length > 0) {
        extraHeight += 40; // Header height with bottom margin
        if (panelExpandedLoops.has(tag.id)) {
          // Calculate total tags in all loops for this tag
          const totalLoopTags = tagLoops.reduce((acc, loop) => acc + loop.tagIds.length, 0);
          extraHeight += totalLoopTags * 24; // Each tag item
          extraHeight += 10; // Additional padding for expanded content
        }
      }
    }
    
    // Note descriptions for related Note tags
    const noteRelationships = visibleRelationships.filter(r => 
      r.from === tag.id && r.type === RelationshipType.Note
    );
    if (noteRelationships.length > 0) {
      extraHeight += 40; // Header height with bottom margin
      if (panelExpandedNotes.has(tag.id)) {
        extraHeight += noteRelationships.length * 60; // Each note description
        extraHeight += 10; // Additional padding for expanded content
      }
    }
    
    // Equipment short specs for Equipment tags (now with toggle)
    if (tag.category === Category.Equipment) {
      const equipmentSpecs = equipmentShortSpecs.filter(spec => {
        const specRelationships = visibleRelationships.filter(r => 
          (r.from === tag.id && r.to === spec.id) || 
          (r.from === spec.id && r.to === tag.id)
        );
        return specRelationships.length > 0;
      });
      if (equipmentSpecs.length > 0) {
        extraHeight += 40; // Header height with bottom margin (increased)
        if (panelExpandedSpecs.has(tag.id)) {
          extraHeight += equipmentSpecs.length * 80; // Each spec when expanded (further increased)
          extraHeight += 10; // Additional padding for expanded content (reduced)
        }
      }
    }
    
    // Related text items (via Annotation relationships)
    const annotationRels = visibleRelationships.filter(r => 
      r.from === tag.id && r.type === RelationshipType.Annotation
    );
    if (annotationRels.length > 0) {
      extraHeight += 20; // Header height
      extraHeight += annotationRels.length * 35; // Each annotation item
      extraHeight += 10; // Additional padding
    }
    
    return baseHeight + extraHeight;
  }, [filteredAndSortedTags, visibleRelationships, showRelationshipDetails, loopsByTag, equipmentShortSpecs, panelExpandedLoops, panelExpandedNotes, panelExpandedSpecs]);

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
          descriptions={descriptions}
          equipmentShortSpecs={equipmentShortSpecs}
          loops={loops}
          rawTextItems={rawTextItems}
          onSelect={handleTagSelect}
          onDelete={() => onDeleteTags([tag.id])}
          onPing={() => onPingTag(tag.id)}
          onEdit={() => handleEditTag(tag)}
          onOpenCommentModal={() => openCommentModal(tag.id, tag.text, 'tag')}
          onToggleReviewStatus={onToggleReviewStatus}
          getCommentsForTarget={getCommentsForTarget}
          onPingTag={onPingTag}
          onSelectRelatedTag={handleSelectRelatedTag}
          expandedLoops={panelExpandedLoops}
          expandedNotes={panelExpandedNotes}
          expandedSpecs={panelExpandedSpecs}
          onToggleExpandLoops={handleToggleExpandLoops}
          onToggleExpandNotes={handleToggleExpandNotes}
          onToggleExpandSpecs={handleToggleExpandSpecs}
        />
      </div>
    );
  }, [filteredAndSortedTags, selectedTagIds, visibleRelationships, tags, handleTagSelect, onDeleteTags, onPingTag, handleEditTag, openCommentModal, getCommentsForTarget, handleSelectRelatedTag, panelExpandedLoops, panelExpandedNotes, panelExpandedSpecs, handleToggleExpandLoops, handleToggleExpandNotes, handleToggleExpandSpecs]);
  
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