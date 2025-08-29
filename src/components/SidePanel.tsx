import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Category, RelationshipType } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { exportToExcel } from '../services/excelExporter.ts';

const DeleteRelationshipButton = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="ml-2 p-0.5 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
    title="Delete relationship"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
);

const DeleteTagButton = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
    title="Delete tag"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
);

const EditTagButton = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-500 hover:bg-sky-500/20 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
    title="Edit tag text"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  </button>
);

const RelatedTextItem: React.FC<{
  item: any;
  relId: string;
  onDeleteRelationship: (relId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, newText: string) => void;
}> = ({ item, relId, onDeleteRelationship, onDeleteItem, onUpdateItemText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setEditText(item.text);
  }, [item.text]);

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== item.text) {
      onUpdateItemText(item.id, trimmedText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div className="group flex items-center justify-between" onClick={(e) => {if(isEditing) e.stopPropagation()}}>
      <div className="flex items-center space-x-1.5 flex-grow min-w-0" title={item.text}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-sm text-white bg-slate-600 border border-sky-500 rounded px-1 w-full"
          />
        ) : (
          <span className="text-slate-300 font-mono truncate max-w-[180px]">{item.text}</span>
        )}
      </div>
      <div className="flex items-center flex-shrink-0">
          <EditTagButton onClick={() => setIsEditing(true)} />
          <DeleteTagButton onClick={() => onDeleteItem(item.id)} />
          <DeleteRelationshipButton onClick={() => onDeleteRelationship(relId)} />
      </div>
    </div>
  );
};


interface TagListItemProps {
  tag: any;
  isSelected: boolean;
  onItemClick: (event: React.MouseEvent) => void;
  onGoToTag: (tag: any) => void;
  relationships: any[];
  allTags: any[];
  allRawTextItems: any[];
  onDeleteRelationship: (relId: any) => void;
  onDeleteTag: (tagId: string) => void;
  onUpdateTagText: (tagId: string, newText: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, newText: string) => void;
  showDetails: boolean;
}

const TagListItem: React.FC<TagListItemProps> = ({ tag, isSelected, onItemClick, onGoToTag, relationships, allTags, allRawTextItems, onDeleteRelationship, onDeleteTag, onUpdateTagText, onDeleteItem, onUpdateItemText, showDetails }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(tag.text);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const colors = CATEGORY_COLORS[tag.category];
  const tagMap = useMemo(() => new Map(allTags.map(t => [t.id, t])), [allTags]);
  const rawTextItemMap = useMemo(() => new Map(allRawTextItems.map(item => [item.id, item])), [allRawTextItems]);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setEditText(tag.text);
  }, [tag.text]);

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== tag.text) {
      onUpdateTagText(tag.id, trimmedText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(tag.text); // Reset text
      setIsEditing(false);
    }
  };
  
  const handleRelatedTagClick = (e, relatedTagId) => {
    e.stopPropagation();
    const relatedTag = tagMap.get(relatedTagId);
    if (relatedTag) {
      onGoToTag(relatedTag);
    }
  };

  const renderRelationship = (id, text) => (
    <span
      onClick={(e) => handleRelatedTagClick(e, id)}
      className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-mono"
    >
      {text}
    </span>
  );
  
  const drawingNumberTag = useMemo(() => {
      const pageDrawingNumbers = allTags.filter(t => t.page === tag.page && t.category === Category.DrawingNumber);
      // Assuming one drawing number per page as per logic
      return pageDrawingNumbers.length > 0 ? pageDrawingNumbers[0] : null;
  }, [allTags, tag.page]);


  const outgoingConnections = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.Connection);
  const incomingConnections = relationships.filter(r => r.to === tag.id && r.type === RelationshipType.Connection);
  const installationTarget = relationships.find(r => r.from === tag.id && r.type === RelationshipType.Installation);
  const installedInstruments = relationships.filter(r => r.to === tag.id && r.type === RelationshipType.Installation);
  const annotationRelationships = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.Annotation);
  const noteRelationships = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.Note);
  const notedByRelationships = relationships.filter(r => r.to === tag.id && r.type === RelationshipType.Note);
  
  const hasRelationships = outgoingConnections.length > 0 || incomingConnections.length > 0 || installationTarget || installedInstruments.length > 0 || annotationRelationships.length > 0 || noteRelationships.length > 0 || notedByRelationships.length > 0;

  return (
    <li
      data-tag-id={tag.id}
      onClick={(e) => {
        if (!isEditing) {
          onItemClick(e);
        }
      }}
      className={`group p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-red-500/30 ring-1 ring-red-500' : 'hover:bg-slate-700/50'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow mr-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-sm text-white bg-slate-600 border border-sky-500 rounded px-1 w-full"
            />
          ) : (
            <span 
              className="font-mono text-sm text-white block"
            >
              {tag.text}
            </span>
          )}
          <span className={`text-xs font-semibold ${colors.text}`}>{tag.category}</span>
          {tag.category !== Category.DrawingNumber && drawingNumberTag && (
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  DWG: {drawingNumberTag.text}
              </div>
          )}
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <span className="text-xs text-slate-400">P. {tag.page}</span>
          <EditTagButton onClick={() => setIsEditing(true)} />
          <DeleteTagButton onClick={() => onDeleteTag(tag.id)} />
        </div>
      </div>
      
      {showDetails && hasRelationships && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1 text-xs text-slate-300">
          {/* Outgoing Connections */}
          {outgoingConnections.map(rel => {
            const otherTag = tagMap.get(rel.to);
            return otherTag ? <div key={rel.id} className="flex items-center justify-between"><div className="flex items-center space-x-1.5"><span className="text-slate-400">→</span>{renderRelationship(otherTag.id, otherTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
          })}
          {/* Incoming Connections */}
          {incomingConnections.map(rel => {
            const otherTag = tagMap.get(rel.from);
            return otherTag ? <div key={rel.id} className="flex items-center justify-between"><div className="flex items-center space-x-1.5"><span className="text-slate-400">←</span>{renderRelationship(otherTag.id, otherTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
          })}
          {/* This tag is an instrument installed ON something */}
          {installationTarget && tagMap.get(installationTarget.to) && (
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                    <span title="Installation">📌</span>
                    <span className="text-slate-400">Installed on:</span>
                    {renderRelationship(installationTarget.to, tagMap.get(installationTarget.to).text)}
                </div>
                <DeleteRelationshipButton onClick={() => onDeleteRelationship(installationTarget.id)} />
            </div>
          )}
          {/* Instruments installed ON this tag */}
          {installedInstruments.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Installed Instruments:</span>
              <div className="pl-3 space-y-0.5 mt-1">
                {installedInstruments.map(rel => {
                  const instrument = tagMap.get(rel.from);
                  return instrument ? <div key={rel.id} className="flex items-center justify-between"><div>{renderRelationship(instrument.id, instrument.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
                })}
              </div>
            </div>
          )}
          {/* Annotation relationships */}
          {annotationRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Related Text:</span>
              <div className="pl-3 space-y-1 mt-1">
                {annotationRelationships.map(rel => {
                  const note = rawTextItemMap.get(rel.to);
                  return note ? (
                    <RelatedTextItem
                        key={rel.id}
                        item={note}
                        relId={rel.id}
                        onDeleteRelationship={onDeleteRelationship}
                        onDeleteItem={onDeleteItem}
                        onUpdateItemText={onUpdateItemText}
                    />
                  ) : null;
                })}
              </div>
            </div>
          )}
          {/* Note relationships (tag -> note) */}
          {noteRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Notes:</span>
              <div className="pl-3 space-y-0.5 mt-1">
                {noteRelationships.map(rel => {
                  const noteTag = tagMap.get(rel.to);
                  return noteTag ? <div key={rel.id} className="flex items-center justify-between"><div className="flex items-center space-x-1.5"><span title="Note">📝</span>{renderRelationship(noteTag.id, noteTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
                })}
              </div>
            </div>
          )}
          {/* Noted by relationships (target -> this note tag) */}
          {notedByRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Note for:</span>
              <div className="pl-3 space-y-0.5 mt-1">
                {notedByRelationships.map(rel => {
                  const targetTag = tagMap.get(rel.from);
                  return targetTag ? <div key={rel.id} className="flex items-center justify-between"><div>{renderRelationship(targetTag.id, targetTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

export const SidePanel = ({ tags, setTags, rawTextItems, relationships, setRelationships, currentPage, setCurrentPage, selectedTagIds, setSelectedTagIds, onDeleteTags, onUpdateTagText, onDeleteRawTextItems, onUpdateRawTextItemText, onAutoLinkDescriptions, showConfirmation, onPingTag, showRelationships, setShowRelationships }) => {
  const [showCurrentPageOnly, setShowCurrentPageOnly] = useState(true);
  const [showRelationshipDetails, setShowRelationshipDetails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tags');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('default');
  const [sections, setSections] = useState({
    viewOptions: true,
    tools: true,
  });
  const listRef = useRef(null);
  const lastClickedIndex = useRef(-1);
  
  const toggleSection = (sectionName) => {
    setSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const handleDeleteRelationship = (relId) => {
    setRelationships(prev => prev.filter(r => r.id !== relId));
  };

  const handleDeleteTag = (tagId) => {
    onDeleteTags([tagId]);
  };
  
  const handleDeleteItem = (itemId) => {
    onDeleteRawTextItems([itemId]);
  };
  
  const handleRemoveWhitespace = () => {
    showConfirmation(
      'Are you sure you want to remove all whitespace from every tag? This action cannot be undone.',
      () => {
        const updatedTags = tags.map(tag => ({
          ...tag,
          text: tag.text.replace(/\s/g, '')
        }));
        setTags(updatedTags);
      }
    );
  };
  
  const sortedAndFilteredTags = useMemo(() => {
    let baseTags = tags;
    
    const filtered = baseTags
      .filter(tag => !showCurrentPageOnly || tag.page === currentPage)
      .filter(tag => filterCategory === 'All' || tag.category === filterCategory)
      .filter(tag => tag.text.toLowerCase().includes(searchQuery.toLowerCase()));

    switch (sortOrder) {
      case 'length-asc':
        return [...filtered].sort((a, b) => a.text.length - b.text.length);
      case 'length-desc':
        return [...filtered].sort((a, b) => b.text.length - a.text.length);
      case 'pos-top-bottom':
        return [...filtered].sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          const yDiff = b.bbox.y2 - a.bbox.y2;
          if (Math.abs(yDiff) < 1) {
            return a.bbox.x1 - b.bbox.x1;
          }
          return yDiff;
        });
      case 'pos-left-right':
        return [...filtered].sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          const xDiff = a.bbox.x1 - b.bbox.x1;
          if (Math.abs(xDiff) < 1) {
             return b.bbox.y2 - a.bbox.y2;
          }
          return xDiff;
        });
      case 'default':
      default:
        return [...filtered].sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          return a.text.localeCompare(b.text);
        });
    }
  }, [tags, showCurrentPageOnly, currentPage, filterCategory, searchQuery, sortOrder]);


  useEffect(() => {
    if (activeTab === 'tags' && selectedTagIds.length === 1 && listRef.current) {
      const selectedId = selectedTagIds[0];
      const element = listRef.current.querySelector(`[data-tag-id='${selectedId}']`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedTagIds, activeTab, sortedAndFilteredTags]); // Also run when list changes

  const handleTagClick = (tag, index, e) => {
    const isMultiSelect = e.ctrlKey || e.metaKey;
    const isShiftSelect = e.shiftKey;

    if (isShiftSelect && lastClickedIndex.current !== -1) {
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      const rangeIds = sortedAndFilteredTags.slice(start, end + 1).map(t => t.id);
      
      if (isMultiSelect) {
        setSelectedTagIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedTagIds(rangeIds);
      }
    } else if (isMultiSelect) {
      setSelectedTagIds(prev =>
        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
      );
      lastClickedIndex.current = index;
    } else {
      // This is a simple click.
      // Check if it's a re-click on the single selected tag to trigger a ping.
      if (selectedTagIds.length === 1 && selectedTagIds[0] === tag.id) {
        onPingTag(tag.id);
      }
      setCurrentPage(tag.page);
      setSelectedTagIds([tag.id]);
      lastClickedIndex.current = index;
    }
  };
  
  const goToTag = (tag) => {
    setCurrentPage(tag.page);
    setSelectedTagIds([tag.id]);
  }

  const handleBulkDelete = () => {
    if (selectedTagIds.length > 0) {
      onDeleteTags(selectedTagIds);
      setSelectedTagIds([]);
      lastClickedIndex.current = -1;
    }
  };
  

  const handleExport = () => {
    exportToExcel(tags, relationships, rawTextItems);
  };

  const RelationshipViewer = () => {
    const [relSearchQuery, setRelSearchQuery] = useState('');
    const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

    const filteredRelationships = useMemo(() => {
        if (!relSearchQuery) return relationships;
        const lowerCaseQuery = relSearchQuery.toLowerCase();
        return relationships.filter(rel => {
            const fromTag = tagMap.get(rel.from);
            const toTag = tagMap.get(rel.to);
            return (
                (fromTag as any)?.text?.toLowerCase().includes(lowerCaseQuery) ||
                (toTag as any)?.text?.toLowerCase().includes(lowerCaseQuery)
            );
        });
    }, [relSearchQuery, relationships, tagMap]);

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-700 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Search by tag name..."
                    value={relSearchQuery}
                    onChange={(e) => setRelSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-sky-500 focus:border-sky-500"
                />
            </div>
            <ul className="flex-grow overflow-y-auto p-2 space-y-2">
                {filteredRelationships.length === 0 && (
                    <li className="text-center text-slate-400 py-4">No relationships found.</li>
                )}
                {filteredRelationships.map(rel => {
                    const fromTag = tagMap.get(rel.from);
                    const toTag = tagMap.get(rel.to);
                    if (!fromTag || !toTag) return null;

                    const renderTag = (tag) => (
                        <span
                            onClick={() => goToTag(tag)}
                            className="font-mono text-sky-400 hover:underline cursor-pointer"
                        >
                            {tag.text}
                        </span>
                    );

                    return (
                        <li key={rel.id} className="p-2 bg-slate-700/30 rounded-md text-sm text-slate-300 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                {rel.type === RelationshipType.Connection ? (
                                    <>
                                        {renderTag(fromTag)}
                                        <span className="text-slate-400">→</span>
                                        {renderTag(toTag)}
                                    </>
                                ) : (
                                    <>
                                        {renderTag(fromTag)}
                                        <span title="Installed on" className="cursor-default">📌</span>
                                        {renderTag(toTag)}
                                    </>
                                )}
                            </div>
                            <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
  };

  const filterCategories = ['All', Category.Equipment, Category.Line, Category.Instrument, Category.DrawingNumber, Category.NotesAndHolds];
  
  const totalTagCount = useMemo(() => {
    return tags.filter(tag => !showCurrentPageOnly || tag.page === currentPage).length;
  }, [tags, showCurrentPageOnly, currentPage]);
  
  return (
    <aside className="w-80 h-full bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0">
      <div className="border-b border-slate-700 flex">
        <button onClick={() => setActiveTab('tags')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'tags' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Tags ({totalTagCount})</button>
        <button onClick={() => setActiveTab('relationships')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'relationships' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Relationships ({relationships.length})</button>
      </div>

      {activeTab === 'tags' && (
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-3 space-y-2 border-b border-slate-700 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-sky-500 focus:border-sky-500"
                />
                
                {/* Filter & Sort Section */}
                <div className="flex justify-between items-center">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300">
                      <input
                          type="checkbox"
                          checked={showCurrentPageOnly}
                          onChange={(e) => setShowCurrentPageOnly(e.target.checked)}
                          className="rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-600"
                      />
                      <span>Show page only</span>
                    </label>
                    <div className="flex items-center space-x-1">
                      <label htmlFor="sort-order" className="text-sm text-slate-400">Sort:</label>
                      <select
                        id="sort-order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-slate-700 border-slate-600 rounded-md pl-2 pr-7 py-1 text-sm focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="default">Default (A-Z)</option>
                        <option value="pos-top-bottom">Position (Top-Bottom)</option>
                        <option value="pos-left-right">Position (Left-Right)</option>
                        <option value="length-asc">Length (Asc)</option>
                        <option value="length-desc">Length (Desc)</option>
                      </select>
                    </div>
                </div>

                {/* View Options & Category Filter Section */}
                <hr className="border-slate-700" />
                <div>
                  <button onClick={() => toggleSection('viewOptions')} className="w-full flex justify-between items-center text-left py-1">
                    <h4 className="text-sm font-semibold text-slate-400">View Options</h4>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${sections.viewOptions ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {sections.viewOptions && (
                    <div className="space-y-4 mt-2 animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300 pl-1">
                            <input
                                type="checkbox"
                                checked={showRelationships}
                                onChange={(e) => setShowRelationships(e.target.checked)}
                                className="rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-600"
                            />
                            <span>Show relationship lines</span>
                        </label>
                         <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300 pl-1">
                            <input
                                type="checkbox"
                                checked={showRelationshipDetails}
                                onChange={(e) => setShowRelationshipDetails(e.target.checked)}
                                className="rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-600"
                            />
                            <span>Show list details</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {filterCategories.map(cat => {
                          const baseTags = tags.filter(t => !showCurrentPageOnly || t.page === currentPage);
                          const count = cat === 'All' ? baseTags.length : baseTags.filter(t => t.category === cat).length;
                          const isActive = filterCategory === cat;
                          const colors = cat !== 'All' ? CATEGORY_COLORS[cat] : null;

                          let buttonClasses = 'px-2.5 py-1 text-xs font-semibold rounded-full transition-colors flex items-center';

                          if (isActive) {
                            if (cat === 'All') {
                                buttonClasses += ' bg-sky-500 text-white';
                            } else {
                                buttonClasses += ` ${colors.bg} ${colors.text} ring-1 ${colors.border}`;
                            }
                          } else {
                              buttonClasses += ' bg-slate-700 text-slate-300 hover:bg-slate-600';
                          }

                          return (
                            <button key={cat} onClick={() => setFilterCategory(cat)} className={buttonClasses} disabled={count === 0 && cat !== 'All'}>
                              {cat}
                              <span className={`ml-1.5 px-1.5 text-xs rounded-full ${isActive ? 'bg-black/20' : 'bg-slate-600/80 text-slate-400'}`}>{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Toolbox Section */}
                <hr className="border-slate-700" />
                <div>
                   <button onClick={() => toggleSection('tools')} className="w-full flex justify-between items-center text-left py-1">
                    <h4 className="text-sm font-semibold text-slate-400">Tools</h4>
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${sections.tools ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {sections.tools && (
                    <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                      <button
                        onClick={handleRemoveWhitespace}
                        className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-2 rounded-md transition-colors text-xs"
                        title="Remove all spaces from all tag names. This action cannot be undone."
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
                        </svg>
                        <span>Strip Whitespace</span>
                      </button>
                       <button
                        onClick={onAutoLinkDescriptions}
                        className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-2 rounded-md transition-colors text-xs"
                        title="Automatically link nearby text as descriptions to Instrument tags."
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>Auto-link</span>
                      </button>
                    </div>
                  )}
                </div>
            </div>
            
            {selectedTagIds.length > 1 && (
              <div className="p-2 flex-shrink-0">
                  <button
                    onClick={handleBulkDelete}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-2 rounded-md transition-colors text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Selected ({selectedTagIds.length})</span>
                  </button>
              </div>
            )}
            
            <ul ref={listRef} className="flex-grow overflow-y-auto p-2 divide-y divide-slate-700/80">
                {sortedAndFilteredTags.map((tag, index) => (
                    <TagListItem 
                      key={tag.id} 
                      tag={tag} 
                      isSelected={selectedTagIds.includes(tag.id)}
                      onItemClick={(e) => handleTagClick(tag, index, e)}
                      onGoToTag={goToTag}
                      relationships={relationships}
                      allTags={tags}
                      allRawTextItems={rawTextItems}
                      onDeleteRelationship={handleDeleteRelationship}
                      onDeleteTag={handleDeleteTag}
                      onUpdateTagText={onUpdateTagText}
                      onDeleteItem={handleDeleteItem}
                      onUpdateItemText={onUpdateRawTextItemText}
                      showDetails={showRelationshipDetails}
                    />
                ))}
            </ul>
        </div>
      )}
      
      {activeTab === 'relationships' && <RelationshipViewer />}

      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <button onClick={handleExport} className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            <span>Export to Excel</span>
        </button>
      </div>
    </aside>
  );
};