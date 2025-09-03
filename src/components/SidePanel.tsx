import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Category, RelationshipType, Comment, CommentPriority } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { exportToExcel } from '../services/excelExporter.ts';
import { CommentModal } from './CommentModal.tsx';
import { CommentIndicator } from './CommentIndicator.tsx';

const DeleteRelationshipButton = React.memo(({ onClick }) => (
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
));

const DeleteTagButton = React.memo(({ onClick }) => (
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
));

const EditButton = React.memo(({ onClick, title = "Edit" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-500 hover:bg-sky-500/20 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  </button>
));

const SaveButton = React.memo(({ onClick, title = "Save" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-green-400 hover:text-green-300 transition-colors"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  </button>
));

const CancelButton = React.memo(({ onClick, title = "Cancel" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-400 hover:text-slate-300 transition-colors"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
));

// Backwards compatibility
const EditTagButton = EditButton;

const RelatedTextItem: React.FC<{
  item: any;
  relId: string;
  onDeleteRelationship: (relId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, newText: string) => void;
}> = React.memo(({ item, relId, onDeleteRelationship, onDeleteItem, onUpdateItemText }) => {
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
});


interface TagListItemProps {
  tag: any;
  isSelected: boolean;
  onItemClick: (event: React.MouseEvent) => void;
  onGoToTag: (tag: any) => void;
  relationships: any[];
  allTags: any[];
  allRawTextItems: any[];
  descriptions: any[];
  equipmentShortSpecs: any[];
  loops: any[];
  onToggleReviewStatus: (tagId: string) => void;
  onDeleteRelationship: (relId: any) => void;
  onDeleteTag: (tagId: string) => void;
  onUpdateTagText: (tagId: string, newText: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, newText: string) => void;
  onUpdateLoop: (loopId: string, updates: any) => void;
  showDetails: boolean;
  // Comment system props
  comments: Comment[];
  onOpenComments: (targetId: string, targetName: string, targetType: string) => void;
  getCommentsForTarget: (targetId: string) => Comment[];
}

const TagListItem: React.FC<TagListItemProps> = React.memo(({ tag, isSelected, onItemClick, onGoToTag, relationships, allTags, allRawTextItems, descriptions, equipmentShortSpecs, loops, onToggleReviewStatus, onDeleteRelationship, onDeleteTag, onUpdateTagText, onDeleteItem, onUpdateItemText, onUpdateLoop, showDetails, comments, onOpenComments, getCommentsForTarget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(tag.text);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [expandedEquipmentShortSpecs, setExpandedEquipmentShortSpecs] = useState(new Set());
  const [expandedNoteTags, setExpandedNoteTags] = useState(new Set());
  const [expandedLoops, setExpandedLoops] = useState(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const isTogglingExpansion = useRef(false);
  
  const colors = CATEGORY_COLORS[tag.category];
  const categoryLetters = {
    [Category.Equipment]: 'E',
    [Category.Line]: 'L',
    [Category.Instrument]: 'I',
    [Category.DrawingNumber]: 'D',
    [Category.NotesAndHolds]: 'N',
    [Category.Uncategorized]: 'U'
  };
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
    const relatedTag = tagMap.get(relatedTagId) || allTags.find(t => t.id === relatedTagId);
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
  const descriptionRelationships = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.Description);
  const describedByRelationships = relationships.filter(r => r.to === tag.id && r.type === RelationshipType.Description);
  const equipmentShortSpecRelationships = relationships.filter(r => r.from === tag.id && r.type === RelationshipType.EquipmentShortSpec);
  
  const hasRelationships = outgoingConnections.length > 0 || incomingConnections.length > 0 || installationTarget || installedInstruments.length > 0 || annotationRelationships.length > 0 || noteRelationships.length > 0 || notedByRelationships.length > 0 || descriptionRelationships.length > 0 || describedByRelationships.length > 0 || equipmentShortSpecRelationships.length > 0;

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
            <div className="flex items-center space-x-1">
              <input
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-sm text-white bg-slate-600 border border-sky-500 rounded px-1 flex-grow"
              />
              <SaveButton onClick={handleSave} />
              <CancelButton onClick={() => {
                setEditText(tag.text);
                setIsEditing(false);
              }} />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 flex-grow min-w-0">
                <input
                  type="checkbox"
                  checked={tag.isReviewed || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleReviewStatus(tag.id);
                  }}
                  className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                  title="Mark as reviewed"
                />
                <span 
                  className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white ${colors.bg} ${colors.border} border flex-shrink-0`}
                  title={tag.category}
                >
                  {categoryLetters[tag.category]}
                </span>
                <span className="font-mono text-sm text-white truncate">
                  {tag.text}
                </span>
              </div>
              <CommentIndicator
                comments={getCommentsForTarget(tag.id)}
                onClick={() => onOpenComments(tag.id, tag.text, 'tag')}
                size="sm"
                className="flex-shrink-0 ml-2"
              />
            </div>
          )}
          {tag.category !== Category.DrawingNumber && drawingNumberTag && (
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  DWG: {drawingNumberTag.text}
              </div>
          )}
          {tag.category === Category.Instrument && showDetails && (() => {
            const tagLoops = loops.filter(loop => loop.tagIds.includes(tag.id));
            return tagLoops.length > 0 && (
              <div className="mt-1">
                {tagLoops.map(loop => {
                  const isExpanded = expandedLoops.has(loop.id);
                  const loopTags = loop.tagIds.map(id => allTags.find(t => t.id === id)).filter(Boolean);
                  
                  return (
                    <div key={loop.id} className="mb-1">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-slate-700/20 rounded px-1 py-0.5 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedLoops(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(loop.id)) {
                              newSet.delete(loop.id);
                            } else {
                              newSet.add(loop.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <span className="text-xs text-blue-400 font-mono">
                          Loop: {loop.name || loop.id}
                        </span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-3 w-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-1 ml-2 p-2 border border-slate-600/50 rounded-md bg-slate-800/30">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs text-slate-400">
                              ({loopTags.length} tags)
                              {loopTags.length > 0 && ` P. ${loopTags.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ')}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {loopTags.map(loopTag => (
                              <div
                                key={loopTag.id}
                                className={`inline-flex items-center bg-slate-600/50 text-slate-300 rounded text-xs font-mono overflow-hidden ${loopTag.id === tag.id ? 'ring-1 ring-blue-400' : ''}`}
                              >
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGoToTag(loopTag);
                                  }}
                                  className="px-2 py-1 cursor-pointer hover:bg-slate-500/50 transition-colors"
                                  title={`Click to center on tag: ${loopTag.text}`}
                                >
                                  {loopTag.text} <span className="text-slate-400">P.{loopTag.page}</span>
                                </span>
                                {loopTag.id !== tag.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateLoop(loop.id, {
                                        ...loop,
                                        tagIds: loop.tagIds.filter(id => id !== loopTag.id)
                                      });
                                    }}
                                    className="px-1 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                                    title={`Remove ${loopTag.text} from loop`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
            return otherTag ? <div key={rel.id} className="flex items-center justify-between"><div className="flex items-center space-x-1.5"><span className="text-slate-300 text-xs">To</span>{renderRelationship(otherTag.id, otherTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
          })}
          {/* Incoming Connections */}
          {incomingConnections.map(rel => {
            const otherTag = tagMap.get(rel.from);
            return otherTag ? <div key={rel.id} className="flex items-center justify-between"><div className="flex items-center space-x-1.5"><span className="text-slate-300 text-xs">From</span>{renderRelationship(otherTag.id, otherTag.text)}</div><DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} /></div> : null;
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
              <div className="pl-3 space-y-1 mt-1">
                {noteRelationships.map(rel => {
                  const noteTag = tagMap.get(rel.to);
                  if (!noteTag) return null;
                  
                  // Find descriptions connected to this note tag
                  const noteDescriptions = relationships.filter(r => 
                    r.from === noteTag.id && r.type === RelationshipType.Description
                  ).map(r => descriptions.find(d => d.id === r.to)).filter(Boolean);
                  
                  const isExpanded = expandedNoteTags.has(noteTag.id);
                  
                  return (
                    <div key={rel.id} className="border border-slate-600 rounded-md bg-slate-700/20">
                      {/* Note tag header */}
                      <div className="flex items-center justify-between p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isTogglingExpansion.current = true;
                            const newExpanded = new Set(expandedNoteTags);
                            if (isExpanded) {
                              newExpanded.delete(noteTag.id);
                            } else {
                              newExpanded.add(noteTag.id);
                            }
                            setExpandedNoteTags(newExpanded);
                            setTimeout(() => {
                              isTogglingExpansion.current = false;
                            }, 50);
                          }}
                          className="flex items-center space-x-1.5 text-left flex-grow cursor-pointer"
                        >
                          <span title="Note">📝</span>
                          <span className="text-sky-400 hover:text-sky-300 font-mono">
                            {noteTag.text}
                          </span>
                          {noteDescriptions.length > 0 && (
                            <span className="text-slate-400 text-xs">
                              ({noteDescriptions.length}) {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                        </button>
                        <DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} />
                      </div>
                      
                      {/* Descriptions - expandable */}
                      {isExpanded && noteDescriptions.length > 0 && (
                        <div className="px-3 pb-2 border-t border-slate-600">
                          <div className="space-y-1 mt-2">
                            {noteDescriptions.map(description => {
                              const descRel = relationships.find(r => 
                                r.from === noteTag.id && r.to === description.id && r.type === RelationshipType.Description
                              );
                              const isDescExpanded = expandedDescriptions.has(description.id);
                              
                              return (
                                <div key={description.id} className="border border-slate-500 rounded-md bg-slate-700/30">
                                  {/* Description header */}
                                  <div className="flex items-center justify-between p-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newExpanded = new Set(expandedDescriptions);
                                        if (isDescExpanded) {
                                          newExpanded.delete(description.id);
                                        } else {
                                          newExpanded.add(description.id);
                                        }
                                        setExpandedDescriptions(newExpanded);
                                      }}
                                      className="flex items-center space-x-1.5 text-purple-300 hover:text-purple-100 text-xs cursor-pointer"
                                    >
                                      <span>{isDescExpanded ? '📖' : '📄'}</span>
                                      <span>{description.metadata.type} {description.metadata.number}</span>
                                      <span className="text-slate-400">{isDescExpanded ? '▼' : '▶'}</span>
                                    </button>
                                    {descRel && (
                                      <DeleteRelationshipButton onClick={() => onDeleteRelationship(descRel.id)} />
                                    )}
                                  </div>
                                  
                                  {/* Description content */}
                                  {isDescExpanded && (
                                    <div className="px-3 pb-3 border-t border-slate-500">
                                      <div className="text-xs text-slate-300 mt-2 leading-relaxed">
                                        {description.text}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        Page {description.page} • {description.metadata.scope}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
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
          
          {/* Description relationships (tag -> description) */}
          {descriptionRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Descriptions:</span>
              <div className="pl-3 space-y-1 mt-1">
                {descriptionRelationships.map(rel => {
                  const description = descriptions.find(d => d.id === rel.to);
                  const isExpanded = expandedDescriptions.has(description?.id);
                  
                  return description ? (
                    <div key={rel.id} className="border border-slate-600 rounded-md bg-slate-700/30">
                      {/* Header - always visible */}
                      <div className="flex items-center justify-between p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            isTogglingExpansion.current = true;
                            const newExpanded = new Set(expandedDescriptions);
                            if (isExpanded) {
                              newExpanded.delete(description.id);
                            } else {
                              newExpanded.add(description.id);
                            }
                            setExpandedDescriptions(newExpanded);
                            // Reset flag after state update
                            setTimeout(() => {
                              isTogglingExpansion.current = false;
                            }, 50);
                          }}
                          className="flex items-center space-x-1.5 text-purple-300 hover:text-purple-100 text-xs cursor-pointer bg-transparent border-none"
                        >
                          <span>{isExpanded ? '📖' : '📄'}</span>
                          <span>{description.metadata.type} {description.metadata.number}</span>
                          <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        <DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} />
                      </div>
                      
                      {/* Content - expandable */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-slate-600">
                          <div className="text-xs text-slate-300 mt-2 leading-relaxed">
                            {description.text}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Page {description.page} • {description.metadata.scope}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
          
          {/* Described by relationships (description -> this tag) */}
          {describedByRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Described by:</span>
              <div className="pl-3 space-y-0.5 mt-1">
                {describedByRelationships.map(rel => {
                  const sourceTag = tagMap.get(rel.from);
                  return sourceTag ? (
                    <div key={rel.id} className="flex items-center justify-between">
                      <div>{renderRelationship(sourceTag.id, sourceTag.text)}</div>
                      <DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Equipment Short Spec relationships (Equipment tag -> Equipment Short Spec) */}
          {equipmentShortSpecRelationships.length > 0 && (
            <div>
              <span className="text-slate-400 font-semibold">Equipment Short Specs:</span>
              <div className="pl-3 space-y-1 mt-1">
                {equipmentShortSpecRelationships.map(rel => {
                  const equipmentShortSpec = equipmentShortSpecs.find(spec => spec.id === rel.to);
                  const isExpanded = expandedEquipmentShortSpecs.has(equipmentShortSpec?.id);
                  
                  return equipmentShortSpec ? (
                    <div key={rel.id} className="border border-slate-600 rounded-md bg-slate-700/30">
                      {/* Header - always visible */}
                      <div className="flex items-center justify-between p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            isTogglingExpansion.current = true;
                            const newExpanded = new Set(expandedEquipmentShortSpecs);
                            if (isExpanded) {
                              newExpanded.delete(equipmentShortSpec.id);
                            } else {
                              newExpanded.add(equipmentShortSpec.id);
                            }
                            setExpandedEquipmentShortSpecs(newExpanded);
                            // Reset flag after state update
                            setTimeout(() => {
                              isTogglingExpansion.current = false;
                            }, 50);
                          }}
                          className="flex items-center space-x-2 text-left flex-grow text-orange-300 hover:text-orange-200"
                        >
                          <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <span className="font-medium text-xs">
                            {equipmentShortSpec.metadata.originalEquipmentTag.text}
                          </span>
                        </button>
                        <DeleteRelationshipButton onClick={() => onDeleteRelationship(rel.id)} />
                      </div>
                      
                      {/* Content - only visible when expanded */}
                      {isExpanded && (
                        <div className="p-2 pt-0 border-t border-slate-600">
                          <div className="text-xs text-slate-400 mb-2">
                            Page {equipmentShortSpec.page} • {equipmentShortSpec.sourceItems.length} source items
                          </div>
                          <div className="space-y-2">
                            {/* Service display */}
                            {equipmentShortSpec.metadata.service && (
                              <div className="p-2 bg-slate-600/30 rounded border-l-4 border-blue-500">
                                <div className="text-xs text-blue-300 font-semibold mb-1">Service</div>
                                <div className="text-sm text-slate-300">{equipmentShortSpec.metadata.service}</div>
                              </div>
                            )}
                            
                            {/* Short Spec display */}
                            <div className="p-2 bg-slate-800/50 rounded">
                              <div className="text-xs text-orange-300 font-semibold mb-1">Short Spec</div>
                              <div className="text-sm text-slate-300 whitespace-pre-wrap">{equipmentShortSpec.text}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
});

export const SidePanel = ({
  // Data props
  tags, setTags, rawTextItems, descriptions, equipmentShortSpecs, setEquipmentShortSpecs, 
  loops, setLoops, relationships, setRelationships,
  // View props
  currentPage, setCurrentPage, selectedTagIds, setSelectedTagIds, selectedDescriptionIds, 
  setSelectedDescriptionIds, selectedEquipmentShortSpecIds, setSelectedEquipmentShortSpecIds,
  tagSelectionSource, // Add selection source tracking
  // Action props
  onDeleteTags, onUpdateTagText, onDeleteDescriptions, onUpdateDescription, 
  onDeleteEquipmentShortSpecs, onUpdateEquipmentShortSpec, onDeleteRawTextItems, onUpdateRawTextItemText,
  onAutoLinkDescriptions, onAutoLinkNotesAndHolds, onAutoLinkEquipmentShortSpecs, 
  onAutoGenerateLoops, onManualCreateLoop, onDeleteLoops, onUpdateLoop, showConfirmation,
  // Ping props
  onPingTag, onPingDescription, onPingEquipmentShortSpec, onPingRelationship,
  // Visibility props
  visibilitySettings, updateVisibilitySettings, toggleTagVisibility, toggleRelationshipVisibility, 
  toggleAllTags, toggleAllRelationships,
  // Comment props
  comments, onCreateComment, onUpdateComment, onDeleteComment, getCommentsForTarget
}) => {
  const [showCurrentPageOnly, setShowCurrentPageOnly] = useState(true);
  const [showRelationshipDetails, setShowRelationshipDetails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loopSearchQuery, setLoopSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tags');
  const [editingLoopId, setEditingLoopId] = useState(null);
  const [editingLoopValue, setEditingLoopValue] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [reviewFilter, setReviewFilter] = useState('All');
  const [commentFilter, setCommentFilter] = useState('All'); // All, WithComments, WithoutComments
  const [sortOrder, setSortOrder] = useState('default');
  
  // Comment system state
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentTargetId, setCommentTargetId] = useState(null);
  const [commentTargetName, setCommentTargetName] = useState('');
  const [commentTargetType, setCommentTargetType] = useState(null);
  const [commentsTabFilter, setCommentsTabFilter] = useState('all'); // Comments 탭 전용 필터
  
  // Sidebar resizing state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 320;
  });
  const [isResizing, setIsResizing] = useState(false); // all, unresolved, resolved, high, medium, low
  
  // Reset sort order to default if instrument sorting is selected but not on Instrument filter
  useEffect(() => {
    if (sortOrder === 'instrument-number-function' && filterCategory !== Category.Instrument) {
      setSortOrder('default');
    }
  }, [filterCategory, sortOrder]);
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [editingEquipmentShortSpecId, setEditingEquipmentShortSpecId] = useState(null);
  const [tempEquipmentShortSpecText, setTempEquipmentShortSpecText] = useState('');
  const [tempEquipmentShortSpecMetadata, setTempEquipmentShortSpecMetadata] = useState({});
  const [tempDescriptionText, setTempDescriptionText] = useState('');
  const [tempDescriptionMetadata, setTempDescriptionMetadata] = useState({});
  const [sections, setSections] = useState({
    viewOptions: true,
  });
  const [virtualizedRange, setVirtualizedRange] = useState({ start: 0, end: 100 });
  const listRef = useRef(null);
  const descriptionListRef = useRef(null);
  const lastClickedIndex = useRef(-1);
  
  const toggleSection = useCallback((sectionName) => {
    setSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  }, []);

  const handleDeleteRelationship = useCallback((relId) => {
    setRelationships(prev => prev.filter(r => r.id !== relId));
  }, [setRelationships]);

  const handleDeleteTag = useCallback((tagId) => {
    onDeleteTags([tagId]);
  }, [onDeleteTags]);
  
  const handleDeleteItem = useCallback((itemId) => {
    onDeleteRawTextItems([itemId]);
  }, [onDeleteRawTextItems]);
  
  const handleToggleReviewStatus = useCallback((tagId) => {
    setTags(prev => prev.map(tag => 
      tag.id === tagId 
        ? { ...tag, isReviewed: !tag.isReviewed }
        : tag
    ));
  }, [setTags]);
  
  const handleLoopEdit = useCallback((loopId) => {
    const loop = loops.find(l => l.id === loopId);
    if (loop) {
      setEditingLoopId(loopId);
      setEditingLoopValue(loop.name || loop.id);
    }
  }, [loops]);
  
  const handleLoopSave = useCallback(() => {
    if (editingLoopId && editingLoopValue.trim()) {
      onUpdateLoop(editingLoopId, { 
        id: editingLoopValue.trim(),
        name: editingLoopValue.trim() 
      });
      setEditingLoopId(null);
      setEditingLoopValue('');
    }
  }, [editingLoopId, editingLoopValue, onUpdateLoop]);
  
  const handleLoopCancel = useCallback(() => {
    setEditingLoopId(null);
    setEditingLoopValue('');
  }, []);

  // Comment system helpers
  const handleOpenComments = useCallback((targetId, targetName, targetType) => {
    setCommentTargetId(targetId);
    setCommentTargetName(targetName);
    setCommentTargetType(targetType);
    setCommentModalOpen(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentModalOpen(false);
    setCommentTargetId(null);
    setCommentTargetName('');
    setCommentTargetType(null);
  }, []);

  const handleCreateComment = useCallback((content, priority) => {
    if (commentTargetId && commentTargetType) {
      onCreateComment(commentTargetId, commentTargetType, content, priority);
    }
  }, [commentTargetId, commentTargetType, onCreateComment]);

  // Get target name helper
  const getTargetName = useCallback((targetId, targetType) => {
    switch (targetType) {
      case 'tag':
        const tag = tags.find(t => t.id === targetId);
        return tag ? tag.text : 'Unknown Tag';
      case 'description':
        const desc = descriptions.find(d => d.id === targetId);
        return desc ? `${desc.metadata.type} ${desc.metadata.number}` : 'Unknown Description';
      case 'equipmentSpec':
        const spec = equipmentShortSpecs.find(s => s.id === targetId);
        return spec ? spec.equipmentTag : 'Unknown Equipment Spec';
      case 'relationship':
        const rel = relationships.find(r => r.id === targetId);
        if (!rel) return 'Unknown Relationship';
        const fromTag = tags.find(t => t.id === rel.from);
        const toTag = tags.find(t => t.id === rel.to);
        return `From ${fromTag?.text || 'Unknown'} To ${toTag?.text || 'Unknown'}`;
      default:
        return 'Unknown';
    }
  }, [tags, descriptions, equipmentShortSpecs, relationships]);

  // Get user-friendly type name for comments
  const getTypeDisplayName = useCallback((targetType) => {
    switch (targetType) {
      case 'tag': return 'Tags';
      case 'description': return 'Notes';
      case 'equipmentSpec': return 'Equipment Specs';
      case 'relationship': return 'Relations';
      case 'loop': return 'Loops';
      default: return targetType;
    }
  }, []);

  // Get detailed target info with metadata
  const getTargetDetails = useCallback((targetId, targetType) => {
    switch (targetType) {
      case 'tag':
        const tag = tags.find(t => t.id === targetId);
        return tag ? {
          name: tag.text,
          metadata: `Category: ${tag.category}, Page: ${tag.page}`
        } : { name: 'Unknown Tag', metadata: '' };
      
      case 'description':
        const desc = descriptions.find(d => d.id === targetId);
        return desc ? {
          name: `${desc.metadata.type} ${desc.metadata.number}`,
          metadata: `Scope: ${desc.metadata.scope}, Page: ${desc.page}`
        } : { name: 'Unknown Description', metadata: '' };
      
      case 'equipmentSpec':
        const spec = equipmentShortSpecs.find(s => s.id === targetId);
        return spec ? {
          name: spec.metadata.originalEquipmentTag.text,
          metadata: `Service: ${spec.metadata.service || 'N/A'}, Page: ${spec.page}`
        } : { name: 'Unknown Equipment Spec', metadata: '' };
      
      case 'loop':
        const loop = loops.find(l => l.id === targetId);
        if (!loop) return { name: 'Unknown Loop', metadata: '' };
        const loopTags = loop.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
        return {
          name: loop.name || loop.id,
          metadata: `Tags: ${loopTags.length}, Pages: ${loopTags.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ')}`
        };
      
      case 'relationship':
        const rel = relationships.find(r => r.id === targetId);
        if (!rel) return { name: 'Unknown Relationship', metadata: '' };
        const fromTag = tags.find(t => t.id === rel.from);
        const toTag = tags.find(t => t.id === rel.to);
        return {
          name: `From ${fromTag?.text || 'Unknown'} To ${toTag?.text || 'Unknown'}`,
          metadata: `Type: ${rel.type}`
        };
      
      default:
        return { name: 'Unknown', metadata: '' };
    }
  }, [tags, descriptions, equipmentShortSpecs, loops, relationships]);

  // Sidebar resizing handlers
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= 280 && newWidth <= 600) { // Min 280px, Max 600px
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Filtered comments for Comments tab
  const filteredComments = useMemo(() => {
    let filtered = [...comments];

    // Filter by status/priority
    switch (commentsTabFilter) {
      case 'unresolved':
        filtered = filtered.filter(c => !c.isResolved);
        break;
      case 'resolved':
        filtered = filtered.filter(c => c.isResolved);
        break;
      case 'high':
        filtered = filtered.filter(c => c.priority === 'high');
        break;
      case 'medium':
        filtered = filtered.filter(c => c.priority === 'medium');
        break;
      case 'low':
        filtered = filtered.filter(c => c.priority === 'low');
        break;
    }

    // Sort by priority (high first), then by timestamp (newest first)
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.timestamp - a.timestamp;
    });

    return filtered;
  }, [comments, commentsTabFilter]);
  
  const sortedAndFilteredTags = useMemo(() => {
    let baseTags = tags;
    
    const filtered = baseTags
      .filter(tag => !showCurrentPageOnly || tag.page === currentPage)
      .filter(tag => filterCategory === 'All' || tag.category === filterCategory)
      .filter(tag => {
        if (reviewFilter === 'All') return true;
        if (reviewFilter === 'Reviewed') return tag.isReviewed === true;
        if (reviewFilter === 'NotReviewed') return tag.isReviewed !== true;
        return true;
      })
      .filter(tag => {
        if (commentFilter === 'All') return true;
        const tagComments = comments.filter(c => c.targetId === tag.id);
        if (commentFilter === 'WithComments') return tagComments.length > 0;
        if (commentFilter === 'WithoutComments') return tagComments.length === 0;
        return true;
      })
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
      case 'instrument-number-function':
        return [...filtered].sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          
          // Parse instrument tag: e.g., "PIC-101" -> function="PIC", number="101"
          const parseInstrumentTag = (text) => {
            // Clean up whitespace and match patterns like "PT-7083 C", "PZV-7012 A", "PIC-101"
            const cleanText = text.trim();
            
            // Match patterns: "PT-7083 C", "PZV-7012 A", "PIC-101", etc.
            const match = cleanText.match(/^([A-Z]{2,4})-?(\d+)[\s]*([A-Z]*)$/);
            if (match) {
              return {
                function: match[1].trim(),
                number: parseInt(match[2]),
                suffix: match[3].trim()
              };
            }
            
            // Try alternative pattern without dash: "PT7083C"
            const altMatch = cleanText.match(/^([A-Z]{2,4})(\d+)([A-Z]*)$/);
            if (altMatch) {
              return {
                function: altMatch[1].trim(),
                number: parseInt(altMatch[2]),
                suffix: altMatch[3].trim()
              };
            }
            
            // Fallback for non-standard formats
            return { function: text, number: 99999, suffix: '' };
          };
          
          const aData = parseInstrumentTag(a.text);
          const bData = parseInstrumentTag(b.text);
          
          // Sort by number first (ascending)
          if (aData.number !== bData.number) {
            return aData.number - bData.number;
          }
          
          // Then by function (alphabetical)
          if (aData.function !== bData.function) {
            return aData.function.localeCompare(bData.function);
          }
          
          // Finally by suffix (alphabetical)
          return aData.suffix.localeCompare(bData.suffix);
        });
      case 'default':
      default:
        return [...filtered].sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          return a.text.localeCompare(b.text);
        });
    }
  }, [tags, showCurrentPageOnly, currentPage, filterCategory, reviewFilter, commentFilter, searchQuery, sortOrder, comments]);

  // Virtualized tags for performance
  const virtualizedTags = useMemo(() => {
    if (sortedAndFilteredTags.length <= 100) {
      return sortedAndFilteredTags; // Don't virtualize small lists
    }
    
    // Ensure selected tag is always in the virtual range (optimized for speed)
    if (selectedTagIds.length === 1) {
      const selectedIndex = sortedAndFilteredTags.findIndex(tag => tag.id === selectedTagIds[0]);
      if (selectedIndex !== -1) {
        const bufferSize = 30; // Increased buffer for smoother scrolling
        const newStart = Math.max(0, selectedIndex - bufferSize);
        const newEnd = Math.min(sortedAndFilteredTags.length, selectedIndex + bufferSize * 2);
        
        // Only update if the selected tag is completely outside current range
        const isOutsideRange = selectedIndex < virtualizedRange.start || selectedIndex >= virtualizedRange.end;
        
        if (isOutsideRange) {
          // Use immediate update for tag selection to be responsive
          setVirtualizedRange({ start: newStart, end: newEnd });
        }
      }
    }
    
    // Ensure we don't exceed array bounds and handle edge cases
    const safeStart = Math.max(0, Math.min(virtualizedRange.start, sortedAndFilteredTags.length));
    const safeEnd = Math.max(safeStart, Math.min(virtualizedRange.end, sortedAndFilteredTags.length));
    
    // Return a safe slice that won't cause rendering issues
    return sortedAndFilteredTags.slice(safeStart, safeEnd);
  }, [sortedAndFilteredTags, virtualizedRange, selectedTagIds]);

  const filteredDescriptions = useMemo(() => {
    return descriptions.filter(desc => !showCurrentPageOnly || desc.page === currentPage);
  }, [descriptions, showCurrentPageOnly, currentPage]);

  // Reset virtualization range when show page only changes or filter changes
  useEffect(() => {
    // Clear any pending scroll updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    pendingUpdateRef.current = false;
    lastScrollUpdateRef.current = 0;
    
    setVirtualizedRange({ start: 0, end: 100 });
  }, [showCurrentPageOnly, filterCategory, searchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const filteredEquipmentShortSpecs = useMemo(() => {
    return equipmentShortSpecs.filter(spec => !showCurrentPageOnly || spec.page === currentPage);
  }, [equipmentShortSpecs, showCurrentPageOnly, currentPage]);

  const filteredLoops = useMemo(() => {
    return loops.filter(loop => !showCurrentPageOnly || loop.tagIds.some(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag && tag.page === currentPage;
    }));
  }, [loops, showCurrentPageOnly, currentPage, tags]);

  const filteredRelationships = useMemo(() => {
    if (!showCurrentPageOnly) return relationships;
    
    // Filter relationships where both source and target are on the current page
    return relationships.filter(rel => {
      const fromTag = tags.find(t => t.id === rel.from);
      const toTag = tags.find(t => t.id === rel.to);
      const fromDesc = descriptions.find(d => d.id === rel.from);
      const toDesc = descriptions.find(d => d.id === rel.to);
      const fromRawItem = rawTextItems.find(r => r.id === rel.from);
      const toRawItem = rawTextItems.find(r => r.id === rel.to);
      
      const fromPage = fromTag?.page || fromDesc?.page || fromRawItem?.page;
      const toPage = toTag?.page || toDesc?.page || toRawItem?.page;
      
      // Show relationships if at least one entity is on the current page
      // or if showCurrentPageOnly is false (show all relationships)
      return !showCurrentPageOnly || fromPage === currentPage || toPage === currentPage;
    });
  }, [relationships, showCurrentPageOnly, currentPage, tags, descriptions, rawTextItems]);

  // Auto-scroll to selected tag only when selection comes from PDF viewer
  useEffect(() => {
    // Only scroll if selection came from PDF and we have a single selected tag
    if (tagSelectionSource === 'pdf' && selectedTagIds.length === 1 && activeTab === 'tags' && listRef.current) {
      const selectedId = selectedTagIds[0];
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const element = listRef.current.querySelector(`[data-tag-id='${selectedId}']`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedTagIds, tagSelectionSource, activeTab, sortedAndFilteredTags]);

  // Focus on selected description in side panel when selected from PDF viewer
  useEffect(() => {
    if (activeTab === 'descriptions' && selectedDescriptionIds.length === 1 && descriptionListRef.current) {
      const selectedId = selectedDescriptionIds[0];
      const element = descriptionListRef.current.querySelector(`[data-description-id='${selectedId}']`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedDescriptionIds, activeTab, filteredDescriptions]);

  const handleTagClick = useCallback((tag, index, e) => {
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
      setCurrentPage(tag.page);
      setSelectedTagIds([tag.id]);
      lastClickedIndex.current = index;
      // Always ping tag on click to center it on screen
      onPingTag(tag.id);
    }
  }, [sortedAndFilteredTags, selectedTagIds, setSelectedTagIds, setCurrentPage, onPingTag]);
  
  const goToTag = useCallback((tag) => {
    // First, switch to tags tab if not already on it
    if (activeTab !== 'tags') {
      setActiveTab('tags');
    }
    
    // Check if tag is visible with current filters
    const isTagVisible = !showCurrentPageOnly || tag.page === currentPage;
    const isTagInCategory = filterCategory === 'All' || tag.category === filterCategory;
    const isTagInSearch = tag.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Adjust filters immediately and synchronously
    if (!isTagVisible) {
      setShowCurrentPageOnly(false);
    }
    if (!isTagInCategory) {
      setFilterCategory('All');
    }
    if (!isTagInSearch && searchQuery) {
      setSearchQuery('');
    }
    
    // Set the page and selection immediately
    setCurrentPage(tag.page);
    setSelectedTagIds([tag.id]);
    
    // Ping the tag to scroll and center it in PDF viewer
    onPingTag(tag.id);
    
    // Scroll to the tag in SidePanel after a small delay to ensure DOM is updated
    setTimeout(() => {
      if (listRef.current) {
        const element = listRef.current.querySelector(`[data-tag-id='${tag.id}']`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  }, [setCurrentPage, setSelectedTagIds, activeTab, setActiveTab, tags, showCurrentPageOnly, currentPage, filterCategory, searchQuery, setShowCurrentPageOnly, setFilterCategory, setSearchQuery, onPingTag]);

  const handleBulkDelete = useCallback(() => {
    if (selectedTagIds.length > 0) {
      onDeleteTags(selectedTagIds);
      setSelectedTagIds([]);
      lastClickedIndex.current = -1;
    }
  }, [selectedTagIds, onDeleteTags, setSelectedTagIds]);
  
  const handleExport = useCallback(() => {
    exportToExcel(tags, relationships, rawTextItems, descriptions, equipmentShortSpecs, loops, comments);
  }, [tags, relationships, rawTextItems, descriptions, equipmentShortSpecs, loops, comments]);

  const handleDescriptionClick = useCallback((description) => {
    setSelectedDescriptionIds([description.id]);
    if (description.page !== currentPage) {
      setCurrentPage(description.page);
    }
    onPingDescription(description.id);
  }, [currentPage, setCurrentPage, setSelectedDescriptionIds, onPingDescription]);

  const handleEquipmentShortSpecClick = useCallback((spec) => {
    if (selectedEquipmentShortSpecIds.includes(spec.id)) {
      setSelectedEquipmentShortSpecIds(prev => prev.filter(id => id !== spec.id));
    } else {
      setSelectedEquipmentShortSpecIds([spec.id]);
      if (spec.page !== currentPage) {
        setCurrentPage(spec.page);
      }
      onPingEquipmentShortSpec(spec.id);
    }
  }, [selectedEquipmentShortSpecIds, currentPage, setCurrentPage, setSelectedEquipmentShortSpecIds, onPingEquipmentShortSpec]);

  // Refs for scroll optimization
  const scrollTimeoutRef = useRef(null);
  const lastScrollUpdateRef = useRef(0);
  const pendingUpdateRef = useRef(false);

  // Simple and stable virtualization scroll handler
  const handleScroll = useCallback((e) => {
    // Skip virtualization updates during bulk operations
    if (selectedTagIds.length > 1) return;
    if (sortedAndFilteredTags.length <= 100) return;
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll updates for stability
    scrollTimeoutRef.current = setTimeout(() => {
      const { scrollTop, clientHeight } = e.target;
      const itemHeight = 90;
      const overscan = 30; // Large overscan to prevent gaps
      
      const visibleStart = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(clientHeight / itemHeight);
      
      const newStart = Math.max(0, visibleStart - overscan);
      const newEnd = Math.min(
        sortedAndFilteredTags.length, 
        visibleStart + visibleCount + overscan
      );
      
      // Always update - no threshold checking to ensure consistency
      setVirtualizedRange({ start: newStart, end: newEnd });
      
      scrollTimeoutRef.current = null;
    }, 50); // Longer debounce for stability
    
  }, [sortedAndFilteredTags.length, selectedTagIds.length]);

  const RelationshipViewer = useCallback(({ relationships: inputRelationships }) => {
    const [relSearchQuery, setRelSearchQuery] = useState('');
    const [relationshipTypeFilter, setRelationshipTypeFilter] = useState('All');
    
    // Create maps for all entity types
    const entityMaps = useMemo(() => ({
      tags: new Map(tags.map(t => [t.id, t])),
      descriptions: new Map(descriptions.map(d => [d.id, d])),
      rawTextItems: new Map(rawTextItems.map(r => [r.id, r])),
      equipmentShortSpecs: new Map(equipmentShortSpecs.map(e => [e.id, e]))
    }), [tags, descriptions, rawTextItems, equipmentShortSpecs]);

    // Get entity by ID from any type
    const getEntity = useCallback((id) => {
      return entityMaps.tags.get(id) || 
             entityMaps.descriptions.get(id) || 
             entityMaps.rawTextItems.get(id) || 
             entityMaps.equipmentShortSpecs.get(id);
    }, [entityMaps]);

    // Get entity text for display
    const getEntityText = useCallback((entity) => {
      if (!entity) return 'Unknown';
      if (entity.text) return entity.text;
      if (entity.equipmentTag) return entity.equipmentTag;
      return 'Unknown';
    }, []);

    const typeFilteredRelationships = useMemo(() => {
      if (relationshipTypeFilter === 'All') return inputRelationships;
      return inputRelationships.filter(rel => rel.type === relationshipTypeFilter);
    }, [inputRelationships, relationshipTypeFilter]);

    const searchFilteredRelationships = useMemo(() => {
        if (!relSearchQuery) return typeFilteredRelationships;
        const lowerCaseQuery = relSearchQuery.toLowerCase();
        return typeFilteredRelationships.filter(rel => {
            const fromEntity = getEntity(rel.from);
            const toEntity = getEntity(rel.to);
            const fromText = getEntityText(fromEntity).toLowerCase();
            const toText = getEntityText(toEntity).toLowerCase();
            return fromText.includes(lowerCaseQuery) || toText.includes(lowerCaseQuery);
        });
    }, [relSearchQuery, typeFilteredRelationships, getEntity, getEntityText]);

    // Get relationship type counts
    const relationshipTypeCounts = useMemo(() => {
      const counts = {};
      Object.values(RelationshipType).forEach(type => {
        counts[type] = inputRelationships.filter(rel => rel.type === type).length;
      });
      counts['All'] = inputRelationships.length;
      return counts;
    }, [inputRelationships]);

    // Handle relationship click to highlight in PDF
    const handleRelationshipClick = useCallback((relationship) => {
      const fromEntity = getEntity(relationship.from);
      const toEntity = getEntity(relationship.to);
      
      if (fromEntity && toEntity) {
        // Navigate to the page if different
        const targetPage = fromEntity.page || toEntity.page;
        if (targetPage && targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
        
        // Ping the relationship itself (which will highlight the line and entities)
        onPingRelationship(relationship.id);
        
        // Also ping both entities
        if (entityMaps.tags.has(relationship.from)) {
          onPingTag(relationship.from);
        }
        if (entityMaps.tags.has(relationship.to)) {
          onPingTag(relationship.to);
        }
        if (entityMaps.descriptions.has(relationship.from)) {
          onPingDescription(relationship.from);
        }
        if (entityMaps.descriptions.has(relationship.to)) {
          onPingDescription(relationship.to);
        }
        if (entityMaps.equipmentShortSpecs.has(relationship.from)) {
          onPingEquipmentShortSpec(relationship.from);
        }
        if (entityMaps.equipmentShortSpecs.has(relationship.to)) {
          onPingEquipmentShortSpec(relationship.to);
        }
      }
    }, [getEntity, currentPage, setCurrentPage, entityMaps, onPingTag, onPingDescription, onPingEquipmentShortSpec, onPingRelationship]);

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-700 flex-shrink-0 space-y-2">
                <input
                    type="text"
                    placeholder="Search relationships..."
                    value={relSearchQuery}
                    onChange={(e) => setRelSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-sky-500 focus:border-sky-500"
                />
                
                {/* Relationship type filter tabs */}
                <div className="flex flex-wrap gap-1 text-xs">
                  {['All', ...Object.values(RelationshipType)].map(type => (
                    <button
                      key={type}
                      onClick={() => setRelationshipTypeFilter(type)}
                      className={`px-2 py-1 rounded font-medium ${
                        relationshipTypeFilter === type 
                          ? 'bg-sky-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type} ({relationshipTypeCounts[type] || 0})
                    </button>
                  ))}
                </div>
            </div>
            <ul className="flex-grow overflow-y-auto p-2 space-y-2">
                {searchFilteredRelationships.length === 0 && (
                    <li className="text-center text-slate-400 py-4">No relationships found.</li>
                )}
                {searchFilteredRelationships.map(rel => {
                    const fromEntity = getEntity(rel.from);
                    const toEntity = getEntity(rel.to);
                    if (!fromEntity || !toEntity) return null;

                    const renderEntity = (entity) => {
                      const text = getEntityText(entity);
                      const handleClick = () => {
                        if (entityMaps.tags.has(entity.id)) {
                          goToTag(entity);
                        } else if (entityMaps.descriptions.has(entity.id)) {
                          onPingDescription(entity.id);
                          setCurrentPage(entity.page);
                        } else if (entityMaps.equipmentShortSpecs.has(entity.id)) {
                          onPingEquipmentShortSpec(entity.id);
                          setCurrentPage(entity.page);
                        }
                      };

                      return (
                        <span
                          onClick={handleClick}
                          className="font-mono text-sky-400 hover:underline cursor-pointer"
                        >
                          {text}
                        </span>
                      );
                    };

                    // Get relationship type icon and description
                    const getRelationshipDisplay = (type) => {
                      switch (type) {
                        case RelationshipType.Connection:
                          return { icon: '⟶', title: 'Connection' };
                        case RelationshipType.Installation:
                          return { icon: '📌', title: 'Installation' };
                        case RelationshipType.Annotation:
                          return { icon: '📝', title: 'Annotation' };
                        case RelationshipType.Note:
                          return { icon: '🏷️', title: 'Note' };
                        case RelationshipType.Description:
                          return { icon: '📄', title: 'Description' };
                        case RelationshipType.EquipmentShortSpec:
                          return { icon: '⚙️', title: 'Equipment Spec' };
                        default:
                          return { icon: '🔗', title: 'Unknown' };
                      }
                    };

                    const { icon, title } = getRelationshipDisplay(rel.type);

                    return (
                        <li 
                          key={rel.id} 
                          className="p-2 bg-slate-700/30 rounded-md text-sm text-slate-300 flex items-center justify-between hover:bg-slate-700/50 cursor-pointer transition-colors"
                          onClick={() => handleRelationshipClick(rel)}
                          title={`Click to highlight in PDF: ${title}`}
                        >
                            <div className="flex items-center space-x-2 flex-grow">
                                <span className="text-xs text-slate-500 font-medium">{rel.type}</span>
                                <span className="text-slate-300 text-xs">From</span>
                                {renderEntity(fromEntity)}
                                <span className="text-slate-300 text-xs">To</span>
                                {renderEntity(toEntity)}
                                <CommentIndicator
                                  comments={getCommentsForTarget(rel.id)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fromName = fromEntity?.text || 'Unknown';
                                    const toName = toEntity?.text || 'Unknown';
                                    handleOpenComments(rel.id, `From ${fromName} To ${toName}`, 'relationship');
                                  }}
                                  size="sm"
                                  className="ml-2"
                                />
                            </div>
                            <DeleteRelationshipButton onClick={() => {
                              handleDeleteRelationship(rel.id);
                            }} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
  }, [tags, descriptions, rawTextItems, equipmentShortSpecs, currentPage, setCurrentPage, onPingTag, onPingDescription, onPingEquipmentShortSpec, onPingRelationship, goToTag, handleDeleteRelationship]);

  const filterCategories = ['All', Category.Equipment, Category.Line, Category.SpecialItem, Category.Instrument, Category.NotesAndHolds, Category.DrawingNumber];
  
  const totalTagCount = useMemo(() => {
    return tags.filter(tag => !showCurrentPageOnly || tag.page === currentPage).length;
  }, [tags, showCurrentPageOnly, currentPage]);
  
  return (
    <aside 
      className="h-full bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      
      <div className="border-b border-slate-700 flex text-xs">
        <button onClick={() => setActiveTab('tags')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'tags' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Tags ({totalTagCount})</button>
        <button onClick={() => setActiveTab('descriptions')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'descriptions' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Notes ({filteredDescriptions.length})</button>
        <button onClick={() => setActiveTab('equipmentShortSpecs')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'equipmentShortSpecs' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Equipment Specs ({filteredEquipmentShortSpecs.length})</button>
        <button onClick={() => setActiveTab('loops')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'loops' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Loops ({filteredLoops.length})</button>
        <button onClick={() => setActiveTab('relationships')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'relationships' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>Relations ({filteredRelationships.length})</button>
        <button onClick={() => setActiveTab('comments')} className={`flex-1 py-2 px-1 font-semibold ${activeTab === 'comments' ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'}`}>💬 ({comments.length})</button>
      </div>

      {activeTab === 'tags' && (
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-3 space-y-2 border-b border-slate-700 flex-shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 pr-8 text-sm focus:ring-sky-500 focus:border-sky-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-0.5 rounded"
                      title="Clear search"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
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
                    <div className="space-y-1.5 mt-1.5 animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                      <div className="flex items-center justify-between">
                         <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300">
                            <input
                                type="checkbox"
                                checked={showCurrentPageOnly}
                                onChange={(e) => setShowCurrentPageOnly(e.target.checked)}
                                className="rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-600"
                            />
                            <span>Show page only</span>
                        </label>
                         <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300">
                            <input
                                type="checkbox"
                                checked={showRelationshipDetails}
                                onChange={(e) => setShowRelationshipDetails(e.target.checked)}
                                className="rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-600"
                            />
                            <span>Show list details</span>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label htmlFor="sort-order" className="text-sm text-slate-400">Sort:</label>
                        <select
                          id="sort-order"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          className="flex-1 bg-slate-700 border-slate-600 rounded-md px-2 py-1 text-sm focus:ring-sky-500 focus:border-sky-500"
                        >
                          <option value="default">Default (A-Z)</option>
                          <option value="pos-top-bottom">Position (Top → Bottom)</option>
                          <option value="pos-left-right">Position (Left → Right)</option>
                          <option value="length-asc">Length (Short → Long)</option>
                          <option value="length-desc">Length (Long → Short)</option>
                          {filterCategory === Category.Instrument && (
                            <option value="instrument-number-function">Instrument (Number → Function)</option>
                          )}
                        </select>
                      </div>
                      
                      {/* Review & Comments Filter */}
                      <div>
                        <h5 className="text-xs font-semibold text-slate-400 mb-1.5">Review & Comments</h5>
                        <div className="flex text-xs border border-slate-600 rounded">
                          {[
                            { key: 'All', display: 'All', tooltip: 'Show all tags' },
                            { key: 'Reviewed', display: '✅', tooltip: 'Show reviewed tags only' },
                            { key: 'NotReviewed', display: '☐', tooltip: 'Show unreviewed tags only' },
                            { key: 'WithComments', display: '💬+', tooltip: 'Show tags with comments only' },
                            { key: 'WithoutComments', display: '💬-', tooltip: 'Show tags without comments only' }
                          ].map((filterOption, index) => {
                            const baseTags = tags.filter(t => !showCurrentPageOnly || t.page === currentPage)
                              .filter(tag => filterCategory === 'All' || tag.category === filterCategory);
                            
                            let count = 0;
                            let isActive = false;
                            
                            if (filterOption.key === 'All') {
                              // All shows when both filters are 'All'
                              count = baseTags.length;
                              isActive = reviewFilter === 'All' && commentFilter === 'All';
                            } else if (filterOption.key === 'Reviewed') {
                              count = baseTags.filter(t => t.isReviewed === true).length;
                              isActive = reviewFilter === 'Reviewed';
                            } else if (filterOption.key === 'NotReviewed') {
                              count = baseTags.filter(t => t.isReviewed !== true).length;
                              isActive = reviewFilter === 'NotReviewed';
                            } else if (filterOption.key === 'WithComments') {
                              // Apply review filter first, then count comments
                              const reviewFilteredTags = baseTags.filter(tag => {
                                if (reviewFilter === 'All') return true;
                                if (reviewFilter === 'Reviewed') return tag.isReviewed === true;
                                if (reviewFilter === 'NotReviewed') return tag.isReviewed !== true;
                                return true;
                              });
                              count = reviewFilteredTags.filter(t => comments.some(c => c.targetId === t.id)).length;
                              isActive = commentFilter === 'WithComments';
                            } else if (filterOption.key === 'WithoutComments') {
                              // Apply review filter first, then count no comments
                              const reviewFilteredTags = baseTags.filter(tag => {
                                if (reviewFilter === 'All') return true;
                                if (reviewFilter === 'Reviewed') return tag.isReviewed === true;
                                if (reviewFilter === 'NotReviewed') return tag.isReviewed !== true;
                                return true;
                              });
                              count = reviewFilteredTags.filter(t => !comments.some(c => c.targetId === t.id)).length;
                              isActive = commentFilter === 'WithoutComments';
                            }
                            
                            const handleClick = () => {
                              if (filterOption.key === 'All') {
                                setReviewFilter('All');
                                setCommentFilter('All');
                              } else if (filterOption.key === 'Reviewed' || filterOption.key === 'NotReviewed') {
                                setReviewFilter(filterOption.key);
                              } else {
                                setCommentFilter(filterOption.key);
                              }
                            };
                            
                            return (
                              <button 
                                key={filterOption.key} 
                                onClick={handleClick}
                                className={`group relative flex-1 py-1.5 px-1 font-semibold text-center ${
                                  index > 0 ? 'border-l border-slate-600' : ''
                                } ${
                                  isActive ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300 hover:bg-slate-700/30'
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-xs leading-tight">{filterOption.display}</span>
                                  <span className="text-xs text-slate-400 leading-tight">({count})</span>
                                </div>
                                {/* Custom Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-slate-600">
                                  {filterOption.tooltip}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <hr className="border-slate-700" />
                <div className="border-b border-slate-700 flex text-xs">
                  {filterCategories.map((cat, index) => {
                    const baseTags = tags.filter(t => !showCurrentPageOnly || t.page === currentPage);
                    const count = cat === 'All' ? baseTags.length : baseTags.filter(t => t.category === cat).length;
                    const isActive = filterCategory === cat;
                    
                    // Shorten category names
                    const shortName = cat === 'Equipment' ? 'Equip' 
                      : cat === 'Instrument' ? 'Instr'
                      : cat === 'DrawingNumber' ? 'PID NO'
                      : cat === 'NotesAndHolds' ? 'Notes'
                      : cat === 'SpecialItem' ? 'Special'
                      : cat;
                    
                    return (
                      <button 
                        key={cat} 
                        onClick={() => setFilterCategory(cat)} 
                        className={`flex-1 py-1.5 px-1 font-semibold text-center border-r border-slate-600 last:border-r-0 ${
                          isActive ? 'bg-slate-700/50 text-sky-400' : 'text-slate-300'
                        }`} 
                        disabled={count === 0 && cat !== 'All'}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs leading-tight">{shortName}</span>
                          <span className="text-xs text-slate-400 leading-tight">({count})</span>
                        </div>
                      </button>
                    );
                  })}
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
            
            <ul 
              ref={listRef} 
              className="flex-grow overflow-y-auto p-2 divide-y divide-slate-700/80"
              onScroll={handleScroll}
            >
                {sortedAndFilteredTags.length > 100 && (
                  <div style={{ height: `${virtualizedRange.start * 90}px` }} />
                )}
                {virtualizedTags.map((tag, virtualIndex) => {
                  const actualIndex = sortedAndFilteredTags.length > 100 ? 
                    virtualizedRange.start + virtualIndex : 
                    virtualIndex;
                  return (
                    <TagListItem 
                      key={tag.id} 
                      tag={tag} 
                      isSelected={selectedTagIds.includes(tag.id)}
                      onItemClick={(e) => handleTagClick(tag, actualIndex, e)}
                      onGoToTag={goToTag}
                      relationships={relationships}
                      allTags={tags}
                      allRawTextItems={rawTextItems}
                      descriptions={descriptions}
                      equipmentShortSpecs={equipmentShortSpecs}
                      onToggleReviewStatus={handleToggleReviewStatus}
                      onDeleteRelationship={handleDeleteRelationship}
                      onDeleteTag={handleDeleteTag}
                      onUpdateTagText={onUpdateTagText}
                      onDeleteItem={handleDeleteItem}
                      onUpdateItemText={onUpdateRawTextItemText}
                      loops={loops}
                      onUpdateLoop={onUpdateLoop}
                      showDetails={showRelationshipDetails}
                      comments={comments}
                      onOpenComments={handleOpenComments}
                      getCommentsForTarget={getCommentsForTarget}
                    />
                  );
                })}
                {sortedAndFilteredTags.length > 100 && (
                  <div style={{ height: `${Math.max(0, (sortedAndFilteredTags.length - virtualizedRange.end) * 90)}px` }} />
                )}
            </ul>
        </div>
      )}

      {activeTab === 'descriptions' && (
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="text-xs text-slate-400 mb-2">
              Press 'N' to create descriptions from selected items
            </div>
          </div>
          <div ref={descriptionListRef} className="flex-grow overflow-y-auto p-3 space-y-2">
            {filteredDescriptions.length === 0 ? (
              <div className="text-center text-slate-500 mt-8">
                <div className="text-lg mb-2">📝</div>
                <div className="text-sm">{showCurrentPageOnly && descriptions.length > 0 ? `No descriptions on page ${currentPage}` : 'No descriptions yet'}</div>
                <div className="text-xs mt-1">Select items and press 'N' to create</div>
              </div>
            ) : (
              filteredDescriptions.map((description) => {
                const isSelected = selectedDescriptionIds.includes(description.id);
                const isEditing = editingDescriptionId === description.id;
                
                // Find note tags connected to this description
                const relatedNoteTags = relationships
                  .filter(r => r.to === description.id && r.type === RelationshipType.Description)
                  .map(r => tags.find(t => t.id === r.from))
                  .filter(Boolean);
                
                return (
                <div 
                  key={description.id} 
                  data-description-id={description.id}
                  className={`group border rounded-lg p-3 hover:bg-slate-700/50 transition-colors ${
                    isSelected ? 'bg-purple-600/30 border-purple-400' : 'bg-slate-700/30 border-slate-600'
                  }`}
                >
                  {/* Header with controls */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400">
                          {description.metadata.type} {description.metadata.number} - {description.metadata.scope}
                        </div>
                        <CommentIndicator
                          comments={getCommentsForTarget(description.id)}
                          onClick={() => handleOpenComments(description.id, `${description.metadata.type} ${description.metadata.number}`, 'description')}
                          size="sm"
                        />
                      </div>
                      {/* Show related note tags */}
                      {relatedNoteTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {relatedNoteTags.map(noteTag => (
                            <span
                              key={noteTag.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPingTag(noteTag.id);
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-600/30 text-sky-300 rounded text-xs border border-sky-600/50 hover:bg-sky-500/40 hover:text-sky-200 cursor-pointer transition-colors"
                              title={`Click to focus on note tag: ${noteTag.text}`}
                            >
                              <span>📝</span>
                              <span className="font-mono">{noteTag.text}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditButton
                        onClick={() => {
                          if (!isEditing) {
                            setEditingDescriptionId(description.id);
                            setTempDescriptionText(description.text);
                            setTempDescriptionMetadata(description.metadata);
                          }
                        }}
                        title="Edit description"
                      />
                      <DeleteTagButton onClick={() => onDeleteDescriptions([description.id])} />
                    </div>
                  </div>
                  
                  {/* Content - Read or Edit mode */}
                  {isEditing ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <textarea
                        value={tempDescriptionText}
                        onChange={(e) => setTempDescriptionText(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white resize-none"
                        rows={3}
                        placeholder="Enter description text..."
                        autoFocus
                      />
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <select
                          value={tempDescriptionMetadata.type}
                          onChange={(e) => setTempDescriptionMetadata({
                            ...tempDescriptionMetadata,
                            type: e.target.value as 'Note' | 'Hold'
                          })}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                        >
                          <option value="Note">Note</option>
                          <option value="Hold">Hold</option>
                        </select>
                        
                        <select
                          value={tempDescriptionMetadata.scope}
                          onChange={(e) => setTempDescriptionMetadata({
                            ...tempDescriptionMetadata,
                            scope: e.target.value as 'General' | 'Specific'
                          })}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                        >
                          <option value="General">General</option>
                          <option value="Specific">Specific</option>
                        </select>
                        
                        <input
                          type="number"
                          min="1"
                          value={tempDescriptionMetadata.number}
                          onChange={(e) => setTempDescriptionMetadata({
                            ...tempDescriptionMetadata,
                            number: parseInt(e.target.value) || 1
                          })}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                        />
                      </div>
                      
                      <div className="text-xs text-slate-500">
                        Page {description.page} • {description.sourceItems.length} source items
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <CancelButton
                          onClick={() => {
                            setEditingDescriptionId(null);
                            setTempDescriptionText('');
                            setTempDescriptionMetadata({});
                          }}
                        />
                        <SaveButton
                          onClick={() => {
                            onUpdateDescription(description.id, tempDescriptionText, tempDescriptionMetadata);
                            setEditingDescriptionId(null);
                            setTempDescriptionText('');
                            setTempDescriptionMetadata({});
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Read mode */
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleDescriptionClick(description)}
                    >
                      <div className="text-xs text-slate-200 leading-relaxed mb-2">
                        {description.text}
                      </div>
                      <div className="text-xs text-slate-500">
                        Page {description.page} • {description.sourceItems.length} source items
                      </div>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipmentShortSpecs' && (
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="text-xs text-slate-400 mb-2">
              Press 'P' to create Equipment Short Specs from selected Equipment tag and text items
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {filteredEquipmentShortSpecs.length === 0 ? (
              <div className="text-center text-slate-500 mt-8">
                <div className="text-lg mb-2">⚙️</div>
                <div className="text-sm">{showCurrentPageOnly && equipmentShortSpecs.length > 0 ? `No Equipment Short Specs on page ${currentPage}` : 'No Equipment Short Specs yet'}</div>
                <div className="text-xs mt-1">Select Equipment tag and text items, then press 'P' to create</div>
              </div>
            ) : (
              filteredEquipmentShortSpecs.map((spec) => {
                const isSelected = selectedEquipmentShortSpecIds.includes(spec.id);
                const isEditing = editingEquipmentShortSpecId === spec.id;
                
                return (
                <div 
                  key={spec.id} 
                  className={`group border rounded-lg p-3 hover:bg-slate-700/50 transition-colors ${
                    isSelected ? 'bg-orange-600/30 border-orange-400' : 'bg-slate-700/30 border-slate-600'
                  }`}
                  onClick={() => handleEquipmentShortSpecClick(spec)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${CATEGORY_COLORS.Equipment.bg} ${CATEGORY_COLORS.Equipment.text}`}
                        >
                          {spec.metadata.originalEquipmentTag.text}
                        </span>
                        <span className="text-xs text-slate-400">Page {spec.page}</span>
                        <CommentIndicator
                          comments={getCommentsForTarget(spec.id)}
                          onClick={() => handleOpenComments(spec.id, spec.equipmentTag || spec.metadata.originalEquipmentTag.text, 'equipmentSpec')}
                          size="sm"
                        />
                        
                        {/* Show connected Equipment tags */}
                        {(() => {
                          const connectedTagIds = relationships
                            .filter(rel => rel.type === RelationshipType.EquipmentShortSpec && rel.to === spec.id)
                            .map(rel => rel.from);
                          
                          const connectedTags = tags.filter(tag => connectedTagIds.includes(tag.id));
                          
                          if (connectedTags.length > 0) {
                            return (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">🔗</span>
                                <div className="flex gap-1 flex-wrap">
                                  {connectedTags.map(tag => (
                                    <span
                                      key={tag.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPingTag(tag.id);
                                      }}
                                      className="inline-block px-1.5 py-0.5 bg-green-600/30 text-green-300 rounded text-xs border border-green-600/50 hover:bg-green-500/40 hover:text-green-200 cursor-pointer transition-colors"
                                      title={`Click to focus on equipment tag: ${tag.text}`}
                                    >
                                      {tag.text}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <span className="text-xs text-slate-500" title="No Equipment tags connected">
                                ⚠️ Unlinked
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <EditButton
                        onClick={() => {
                          if (!isEditing) {
                            setEditingEquipmentShortSpecId(spec.id);
                            setTempEquipmentShortSpecText(spec.text);
                            setTempEquipmentShortSpecMetadata(spec.metadata);
                          }
                        }}
                        title="Edit Equipment Short Spec"
                      />
                      <DeleteTagButton onClick={() => onDeleteEquipmentShortSpecs([spec.id])} />
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-300 break-words leading-relaxed">
                    {isEditing ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Original Equipment Tag</label>
                            <input
                              type="text"
                              value={tempEquipmentShortSpecMetadata.originalEquipmentTag?.text || ''}
                              onChange={(e) => setTempEquipmentShortSpecMetadata({
                                ...tempEquipmentShortSpecMetadata,
                                originalEquipmentTag: {
                                  ...tempEquipmentShortSpecMetadata.originalEquipmentTag,
                                  text: e.target.value
                                }
                              })}
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="Equipment tag name..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Service</label>
                            <input
                              type="text"
                              value={tempEquipmentShortSpecMetadata.service || ''}
                              onChange={(e) => setTempEquipmentShortSpecMetadata({
                                ...tempEquipmentShortSpecMetadata,
                                service: e.target.value
                              })}
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="Service description..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Short Specification</label>
                            <textarea
                              value={tempEquipmentShortSpecText}
                              onChange={(e) => setTempEquipmentShortSpecText(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              style={{ minHeight: '80px' }}
                              placeholder="Equipment short spec..."
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-2">
                          <CancelButton
                            onClick={() => {
                              setEditingEquipmentShortSpecId(null);
                              setTempEquipmentShortSpecText('');
                              setTempEquipmentShortSpecMetadata({});
                            }}
                          />
                          <SaveButton
                            onClick={() => {
                              onUpdateEquipmentShortSpec(spec.id, tempEquipmentShortSpecText, tempEquipmentShortSpecMetadata);
                              setEditingEquipmentShortSpecId(null);
                              setTempEquipmentShortSpecText('');
                              setTempEquipmentShortSpecMetadata({});
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Service display */}
                        {spec.metadata.service && (
                          <div className="p-2 bg-slate-600/30 rounded border-l-4 border-blue-500">
                            <div className="text-xs text-blue-300 font-semibold mb-1">Service</div>
                            <div className="text-sm text-slate-300">{spec.metadata.service}</div>
                          </div>
                        )}
                        
                        {/* Short Spec display */}
                        <div className="p-2 bg-slate-700/30 rounded">
                          <div className="text-xs text-orange-300 font-semibold mb-1">Short Specification</div>
                          <div className="whitespace-pre-wrap text-sm text-slate-300">
                            {spec.text || 'No specification entered yet'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'loops' && (
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search loops..."
              value={loopSearchQuery}
              onChange={(e) => setLoopSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-sky-500 focus:border-sky-500"
            />
            <div className="text-xs text-slate-400">
              Press 'L' to create loops from selected instrument tags
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {filteredLoops.length === 0 ? (
              <div className="text-center text-slate-500 mt-8">
                <div className="text-lg mb-2">🔗</div>
                <div className="text-sm">No loops created yet</div>
                <div className="text-xs mt-1">Select instrument tags and press 'L' to create</div>
              </div>
            ) : (
              filteredLoops
                .filter(loop => {
                  if (!loopSearchQuery) return true;
                  const loopName = loop.name || loop.id;
                  return loopName.toLowerCase().includes(loopSearchQuery.toLowerCase());
                })
                .sort((a, b) => {
                  const nameA = a.name || a.id;
                  const nameB = b.name || b.id;
                  return nameA.localeCompare(nameB);
                })
                .map(loop => {
                  const loopTags = loop.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
                  
                  // Find top-left tag (smallest y, then smallest x)
                  const getTopLeftTag = () => {
                    if (loopTags.length === 0) return null;
                    return loopTags.reduce((topLeft, tag) => {
                      if (tag.bbox.y1 < topLeft.bbox.y1) return tag;
                      if (tag.bbox.y1 === topLeft.bbox.y1 && tag.bbox.x1 < topLeft.bbox.x1) return tag;
                      return topLeft;
                    });
                  };
                  
                  const handleLoopSelect = () => {
                    setSelectedTagIds(loop.tagIds);
                    const topLeftTag = getTopLeftTag();
                    if (topLeftTag) {
                      onPingTag(topLeftTag.id);
                    }
                  };
                  
                  return (
                    <div 
                      key={loop.id} 
                      className="group border border-slate-600 rounded-lg p-3 bg-slate-700/30 cursor-pointer hover:bg-slate-600/30 transition-colors"
                      onClick={handleLoopSelect}
                      title="Click to select all tags in this loop"
                    >
                      {/* Loop header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-grow">
                          {editingLoopId === loop.id ? (
                            <div className="flex items-center space-x-2 flex-grow">
                              <input
                                type="text"
                                value={editingLoopValue}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setEditingLoopValue(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    handleLoopSave();
                                  } else if (e.key === 'Escape') {
                                    handleLoopCancel();
                                  }
                                }}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sky-300 font-mono font-semibold text-sm flex-grow focus:ring-sky-500 focus:border-sky-500"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <SaveButton onClick={handleLoopSave} />
                              <CancelButton onClick={handleLoopCancel} />
                            </div>
                          ) : (
                            <>
                              <span className="text-sky-300 font-mono font-semibold text-sm">{loop.name || loop.id}</span>
                              <span className="text-xs text-slate-400">
                                ({loopTags.length} tags)
                                {loopTags.length > 0 && ` P. ${loopTags.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ')}`}
                              </span>
                              <CommentIndicator
                                comments={getCommentsForTarget(loop.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenComments(loop.id, loop.name || loop.id, 'loop');
                                }}
                                size="sm"
                              />
                              <EditButton 
                                onClick={() => handleLoopEdit(loop.id)}
                                title="Edit loop name"
                              />
                            </>
                          )}
                        </div>
                        {editingLoopId !== loop.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLoops([loop.id]);
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete loop"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      {/* Loop tags */}
                      <div className="flex flex-wrap gap-1">
                        {loopTags.map(tag => (
                          <div
                            key={tag.id}
                            className="inline-flex items-center bg-slate-600/50 text-slate-300 rounded text-xs font-mono overflow-hidden"
                          >
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onPingTag(tag.id);
                              }}
                              className="px-2 py-1 cursor-pointer hover:bg-slate-500/50 transition-colors"
                              title={`Click to center on tag: ${tag.text}`}
                            >
                              {tag.text} <span className="text-slate-400">P.{tag.page}</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateLoop(loop.id, {
                                  ...loop,
                                  tagIds: loop.tagIds.filter(id => id !== tag.id)
                                });
                              }}
                              className="px-1 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                              title={`Remove ${tag.text} from loop`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'relationships' && <RelationshipViewer relationships={filteredRelationships} />}

      {activeTab === 'comments' && (
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Comment Filters */}
          <div className="p-3 border-b border-slate-700 flex-shrink-0">
            <div className="flex gap-1 text-xs">
              <button 
                onClick={() => setCommentsTabFilter('all')}
                className={`px-2 py-1 rounded ${commentsTabFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                All ({comments.length})
              </button>
              <button 
                onClick={() => setCommentsTabFilter('unresolved')}
                className={`px-2 py-1 rounded ${commentsTabFilter === 'unresolved' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Unresolved ({comments.filter(c => !c.isResolved).length})
              </button>
              <button 
                onClick={() => setCommentsTabFilter('high')}
                className={`px-2 py-1 rounded ${commentsTabFilter === 'high' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                🔴 High ({comments.filter(c => c.priority === 'high').length})
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-grow overflow-y-auto">
            {filteredComments.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {commentsTabFilter === 'all' ? 'No comments yet' : `No ${commentsTabFilter} comments`}
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-700/30 transition-colors ${
                      comment.isResolved 
                        ? 'bg-slate-700/20 border-slate-600/50' 
                        : 'bg-slate-700/40 border-slate-600'
                    }`}
                    onClick={() => handleOpenComments(
                      comment.targetId,
                      getTargetName(comment.targetId, comment.targetType),
                      comment.targetType
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          comment.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          comment.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {comment.priority === 'high' ? '🔴 HIGH' :
                           comment.priority === 'medium' ? '🟡 MED' : '⚪ LOW'}
                        </span>
                        {comment.isResolved && (
                          <span className="text-green-400 text-sm">✅</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm text-sky-400 font-medium">
                        {getTypeDisplayName(comment.targetType)}: {getTargetDetails(comment.targetId, comment.targetType).name}
                      </p>
                      {getTargetDetails(comment.targetId, comment.targetType).metadata && (
                        <p className="text-xs text-slate-500 mt-1">
                          {getTargetDetails(comment.targetId, comment.targetType).metadata}
                        </p>
                      )}
                    </div>
                    
                    <p className={`text-sm ${comment.isResolved ? 'text-slate-400' : 'text-white'} line-clamp-3`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <button onClick={handleExport} className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            <span>Export to Excel</span>
        </button>
      </div>

      {/* Comment Modal */}
      {commentModalOpen && commentTargetId && (
        <CommentModal
          isOpen={commentModalOpen}
          targetId={commentTargetId}
          targetName={commentTargetName}
          targetType={commentTargetType}
          comments={getCommentsForTarget(commentTargetId)}
          onClose={handleCloseComments}
          onCreateComment={handleCreateComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      )}
      
      {/* Resize Handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-sky-500/50 transition-colors ${
          isResizing ? 'bg-sky-500' : 'bg-transparent'
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      >
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col items-center justify-center w-3 h-8 bg-slate-700 border border-slate-600 rounded-sm">
            <div className="w-0.5 h-1 bg-slate-400 mb-0.5"></div>
            <div className="w-0.5 h-1 bg-slate-400 mb-0.5"></div>
            <div className="w-0.5 h-1 bg-slate-400"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};