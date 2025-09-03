import React, { useState, useCallback } from 'react';
import { PdfViewer } from './PdfViewer.tsx';
import { SidePanel } from './SidePanel.tsx';
import { SelectionPanel } from './SelectionPanel.tsx';
import { CommentIndicator } from './CommentIndicator.tsx';
import { WorkspaceProps } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';

// Button components for compact panel
const DeleteRelationshipButton = React.memo(({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-0.5 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
    title="Delete relationship"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
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
      <path d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
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
    title="Delete"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
));

export const Workspace: React.FC<WorkspaceProps> = ({
  pdfDoc,
  tags,
  setTags,
  relationships,
  setRelationships,
  rawTextItems,
  descriptions,
  setDescriptions,
  equipmentShortSpecs,
  setEquipmentShortSpecs,
  loops,
  setLoops,
  onCreateTag,
  onCreateManualTag,
  onCreateDescription,
  onCreateHoldDescription,
  onCreateEquipmentShortSpec,
  onDeleteTags,
  onUpdateTagText,
  onDeleteDescriptions,
  onUpdateDescription,
  onDeleteEquipmentShortSpecs,
  onUpdateEquipmentShortSpec,
  onMergeRawTextItems,
  onDeleteRawTextItems,
  onUpdateRawTextItemText,
  onAutoLinkDescriptions,
  onAutoLinkNotesAndHolds,
  onAutoLinkEquipmentShortSpecs,
  onAutoGenerateLoops,
  onManualCreateLoop,
  onDeleteLoops,
  onUpdateLoop,
  showConfirmation,
  // Viewer state from App
  currentPage,
  setCurrentPage,
  scale,
  setScale,
  mode,
  setMode,
  relationshipStartTag,
  setRelationshipStartTag,
  visibilitySettings,
  updateVisibilitySettings,
  toggleTagVisibility,
  toggleRelationshipVisibility,
  toggleAllTags,
  toggleAllRelationships,
  isSidePanelVisible,
  showAutoLinkRanges,
  tolerances,
  // Comment system
  comments,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  getCommentsForTarget,
  // Color settings
  colorSettings,
  // Performance settings
  showAllRelationships,
  setShowAllRelationships,
  showOnlySelectedRelationships,
  setShowOnlySelectedRelationships,
}) => {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedRawTextItemIds, setSelectedRawTextItemIds] = useState([]);
  const [selectedDescriptionIds, setSelectedDescriptionIds] = useState([]);
  const [selectedEquipmentShortSpecIds, setSelectedEquipmentShortSpecIds] = useState([]);
  const [tagSelectionSource, setTagSelectionSource] = useState(null); // 'pdf' | 'panel' | null
  const [manualCreationData, setManualCreationData] = useState(null); // {bbox, page}
  const [pingedTagId, setPingedTagId] = useState(null);
  const [pingedDescriptionId, setPingedDescriptionId] = useState(null);
  const [pingedEquipmentShortSpecId, setPingedEquipmentShortSpecId] = useState(null);
  const [pingedRelationshipId, setPingedRelationshipId] = useState(null);
  const [scrollToCenter, setScrollToCenter] = useState(null);
  
  // Compact panel editing states
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [editTagText, setEditTagText] = useState('');
  const [editingRawTextItems, setEditingRawTextItems] = useState(new Set());

  // Show compact tag detail when sidepanel is hidden and exactly one tag is selected
  const shouldShowCompactTagDetail = !isSidePanelVisible && selectedTagIds.length === 1;
  const selectedTag = shouldShowCompactTagDetail ? tags.find(tag => tag.id === selectedTagIds[0]) : null;

  const handleDeselectTag = (tagId) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    if (selectedTagIds.length <= 1) {
      setTagSelectionSource(null);
    }
  };
  
  const handleDeselectRawTextItem = (itemId) => {
    setSelectedRawTextItemIds(prev => prev.filter(id => id !== itemId));
  };

  const handleDeselectDescription = (descriptionId) => {
    setSelectedDescriptionIds(prev => prev.filter(id => id !== descriptionId));
  };

  const handleClearSelection = () => {
    setSelectedTagIds([]);
    setSelectedRawTextItemIds([]);
    setSelectedDescriptionIds([]);
    setTagSelectionSource(null);
  };
  
  const handleManualAreaSelect = (bbox, page) => {
    setManualCreationData({ bbox, page });
  };

  const handleManualTagCreate = ({ text, category }) => {
    if (manualCreationData) {
      onCreateManualTag({
        ...manualCreationData,
        text,
        category,
      });
      setManualCreationData(null);
    }
  };

  const handleClearManualCreation = () => {
    setManualCreationData(null);
  };

  // Compact panel tag editing handlers
  const handleStartEditTag = (tag) => {
    setIsEditingTag(true);
    setEditTagText(tag.text);
  };

  const handleSaveTagEdit = () => {
    if (editTagText.trim() && editTagText !== selectedTag.text && selectedTag) {
      onUpdateTagText(selectedTag.id, editTagText.trim());
    }
    setIsEditingTag(false);
    setEditTagText('');
  };

  const handleCancelTagEdit = () => {
    setIsEditingTag(false);
    setEditTagText('');
  };

  const handleDeleteRelationship = (relId) => {
    setRelationships(prev => prev.filter(r => r.id !== relId));
  };

  const handlePingTag = useCallback((tagId) => {
    // Find the tag to get its page
    const tag = tags.find(t => t.id === tagId);
    if (tag && tag.page !== currentPage) {
      setCurrentPage(tag.page);
    }
    
    setPingedTagId(tagId);
    // Clear after animation is over
    setTimeout(() => setPingedTagId(null), 2000);
    
    // Scroll to center the tag
    setScrollToCenter({ tagId, timestamp: Date.now() });
    // Clear scroll request after a short delay
    setTimeout(() => setScrollToCenter(null), 100);
  }, [tags, currentPage, setCurrentPage]);

  const handlePingDescription = useCallback((descriptionId) => {
    // Find the description to get its page
    const description = descriptions.find(d => d.id === descriptionId);
    if (description && description.page !== currentPage) {
      setCurrentPage(description.page);
    }
    
    setPingedDescriptionId(descriptionId);
    // Clear after animation is over
    setTimeout(() => setPingedDescriptionId(null), 2000);
    
    // Scroll to center the description using proper coordinate transformation
    if (description) {
      setScrollToCenter({ descriptionId, timestamp: Date.now() });
      setTimeout(() => setScrollToCenter(null), 100);
    }
  }, [descriptions, currentPage, setCurrentPage]);

  const handlePingEquipmentShortSpec = useCallback((equipmentShortSpecId) => {
    // Find the equipment short spec to get its page
    const spec = equipmentShortSpecs.find(s => s.id === equipmentShortSpecId);
    if (spec && spec.page !== currentPage) {
      setCurrentPage(spec.page);
    }
    
    setPingedEquipmentShortSpecId(equipmentShortSpecId);
    // Clear after animation is over
    setTimeout(() => setPingedEquipmentShortSpecId(null), 2000);
    
    // Scroll to center the equipment short spec using proper coordinate transformation
    if (spec) {
      setScrollToCenter({ equipmentShortSpecId, timestamp: Date.now() });
      setTimeout(() => setScrollToCenter(null), 100);
    }
  }, [equipmentShortSpecs, currentPage, setCurrentPage]);

  const handlePingRelationship = useCallback((relationshipId) => {
    // Find the relationship to get the page of related entities
    const relationship = relationships.find(r => r.id === relationshipId);
    if (relationship) {
      // Find entities to determine page
      const fromEntity = [...tags, ...descriptions, ...rawTextItems, ...equipmentShortSpecs].find(e => e.id === relationship.from);
      const toEntity = [...tags, ...descriptions, ...rawTextItems, ...equipmentShortSpecs].find(e => e.id === relationship.to);
      
      const targetPage = fromEntity?.page || toEntity?.page;
      if (targetPage && targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
    
    setPingedRelationshipId(relationshipId);
    // Clear after animation is over
    setTimeout(() => setPingedRelationshipId(null), 2000);
  }, [relationships, tags, descriptions, rawTextItems, equipmentShortSpecs, currentPage, setCurrentPage]);

  return (
    <div className="flex h-full bg-slate-900 relative">
      {isSidePanelVisible && <SidePanel 
        tags={tags} 
        setTags={setTags}
        rawTextItems={rawTextItems}
        descriptions={descriptions}
        equipmentShortSpecs={equipmentShortSpecs}
        setEquipmentShortSpecs={setEquipmentShortSpecs}
        loops={loops}
        setLoops={setLoops}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={(ids) => {
          setSelectedTagIds(ids);
          // When selecting from panel, mark the source
          setTagSelectionSource('panel');
        }}
        tagSelectionSource={tagSelectionSource}
        selectedDescriptionIds={selectedDescriptionIds}
        setSelectedDescriptionIds={setSelectedDescriptionIds}
        selectedEquipmentShortSpecIds={selectedEquipmentShortSpecIds}
        setSelectedEquipmentShortSpecIds={setSelectedEquipmentShortSpecIds}
        relationships={relationships}
        setRelationships={setRelationships}
        onDeleteTags={onDeleteTags}
        onUpdateTagText={onUpdateTagText}
        onDeleteDescriptions={onDeleteDescriptions}
        onUpdateDescription={onUpdateDescription}
        onDeleteEquipmentShortSpecs={onDeleteEquipmentShortSpecs}
        onUpdateEquipmentShortSpec={onUpdateEquipmentShortSpec}
        onMergeRawTextItems={onMergeRawTextItems}
        onDeleteRawTextItems={onDeleteRawTextItems}
        onUpdateRawTextItemText={onUpdateRawTextItemText}
        onAutoLinkDescriptions={onAutoLinkDescriptions}
        onAutoLinkNotesAndHolds={onAutoLinkNotesAndHolds}
        onAutoLinkEquipmentShortSpecs={onAutoLinkEquipmentShortSpecs}
        onAutoGenerateLoops={onAutoGenerateLoops}
        onManualCreateLoop={onManualCreateLoop}
        onDeleteLoops={onDeleteLoops}
        onUpdateLoop={onUpdateLoop}
        showConfirmation={showConfirmation}
        onPingTag={handlePingTag}
        onPingDescription={handlePingDescription}
        onPingEquipmentShortSpec={handlePingEquipmentShortSpec}
        onPingRelationship={handlePingRelationship}
        visibilitySettings={visibilitySettings}
        updateVisibilitySettings={updateVisibilitySettings}
        toggleTagVisibility={toggleTagVisibility}
        toggleRelationshipVisibility={toggleRelationshipVisibility}
        toggleAllTags={toggleAllTags}
        toggleAllRelationships={toggleAllRelationships}
        comments={comments}
        onCreateComment={onCreateComment}
        onUpdateComment={onUpdateComment}
        onDeleteComment={onDeleteComment}
        getCommentsForTarget={getCommentsForTarget}
      />}
      <div className="flex-grow h-full overflow-auto bg-slate-800/30">
        <PdfViewer
          pdfDoc={pdfDoc}
          tags={tags}
          setTags={setTags}
          relationships={relationships}
          setRelationships={setRelationships}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          selectedTagIds={selectedTagIds}
          setSelectedTagIds={(ids) => {
            setSelectedTagIds(ids);
            // When selecting from PDF, mark the source
            setTagSelectionSource('pdf');
          }}
          selectedDescriptionIds={selectedDescriptionIds}
          setSelectedDescriptionIds={setSelectedDescriptionIds}
          selectedEquipmentShortSpecIds={selectedEquipmentShortSpecIds}
          setSelectedEquipmentShortSpecIds={setSelectedEquipmentShortSpecIds}
          rawTextItems={rawTextItems}
          descriptions={descriptions}
          equipmentShortSpecs={equipmentShortSpecs}
          onCreateTag={onCreateTag}
          onCreateDescription={onCreateDescription}
          onCreateHoldDescription={onCreateHoldDescription}
          onCreateEquipmentShortSpec={onCreateEquipmentShortSpec}
          selectedRawTextItemIds={selectedRawTextItemIds}
          setSelectedRawTextItemIds={setSelectedRawTextItemIds}
          onDeleteTags={onDeleteTags}
          onMergeRawTextItems={onMergeRawTextItems}
          onManualCreateLoop={onManualCreateLoop}
          onManualAreaSelect={handleManualAreaSelect}
          onUpdateTagText={onUpdateTagText}
          onUpdateRawTextItemText={onUpdateRawTextItemText}
          // Pass down viewer state
          scale={scale}
          setScale={setScale}
          mode={mode}
          setMode={setMode}
          relationshipStartTag={relationshipStartTag}
          setRelationshipStartTag={setRelationshipStartTag}
          visibilitySettings={visibilitySettings}
          updateVisibilitySettings={updateVisibilitySettings}
          pingedTagId={pingedTagId}
          pingedDescriptionId={pingedDescriptionId}
          pingedEquipmentShortSpecId={pingedEquipmentShortSpecId}
          pingedRelationshipId={pingedRelationshipId}
          colorSettings={colorSettings}
          scrollToCenter={scrollToCenter}
          setScrollToCenter={setScrollToCenter}
          showAutoLinkRanges={showAutoLinkRanges}
          tolerances={tolerances}
          showAllRelationships={showAllRelationships}
          setShowAllRelationships={setShowAllRelationships}
          showOnlySelectedRelationships={showOnlySelectedRelationships}
          setShowOnlySelectedRelationships={setShowOnlySelectedRelationships}
        />
      </div>
      <SelectionPanel
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        allTags={tags}
        relationships={relationships}
        onDeselect={handleDeselectTag}
        onClear={handleClearSelection}
        rawTextItems={rawTextItems}
        selectedRawTextItemIds={selectedRawTextItemIds}
        onDeselectRawTextItem={handleDeselectRawTextItem}
        onCreateTag={onCreateTag}
        manualCreationData={manualCreationData}
        onManualTagCreate={handleManualTagCreate}
        onClearManualCreation={handleClearManualCreation}
      />

      {/* Compact Tag Detail Panel */}
      {shouldShowCompactTagDetail && selectedTag && (
        <div className="fixed left-4 top-20 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto">
          {/* Display the selected tag just like in SidePanel but without selection styling */}
          <div className="group p-2 rounded-md hover:bg-slate-700/50">
            <div className="flex justify-between items-start">
              <div className="flex-grow mr-2">
                <div className="flex items-center space-x-2 flex-grow min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedTag.isReviewed || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      setTags(prev => prev.map(tag => 
                        tag.id === selectedTag.id 
                          ? { ...tag, isReviewed: !tag.isReviewed }
                          : tag
                      ));
                    }}
                    className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                    title="Mark as reviewed"
                  />
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white ${CATEGORY_COLORS[selectedTag.category]?.bg || 'bg-slate-600'} ${CATEGORY_COLORS[selectedTag.category]?.border || 'border-slate-600'} border flex-shrink-0`}>
                    {selectedTag.category === 'Equipment' ? 'E' :
                     selectedTag.category === 'Line' ? 'L' :
                     selectedTag.category === 'Instrument' ? 'I' :
                     selectedTag.category === 'DrawingNumber' ? 'D' :
                     selectedTag.category === 'NotesAndHolds' ? 'N' : 'U'}
                  </span>
                  {isEditingTag ? (
                    <div className="flex items-center space-x-1 flex-grow">
                      <input
                        type="text"
                        value={editTagText}
                        onChange={(e) => setEditTagText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTagEdit();
                          if (e.key === 'Escape') handleCancelTagEdit();
                        }}
                        onBlur={handleSaveTagEdit}
                        autoFocus
                        className="font-mono text-sm text-white bg-slate-600 border border-sky-500 rounded px-1 flex-grow"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-sm text-white truncate">
                      {selectedTag.text}
                    </span>
                  )}
                  <CommentIndicator
                    comments={getCommentsForTarget?.(selectedTag.id) || []}
                    onClick={() => {
                      // CommentIndicator expects a click handler - this would typically open a comment modal
                      // For now, we'll just log that the comment button was clicked
                      console.log('Comment clicked for tag:', selectedTag.text);
                    }}
                    size="sm"
                    className="flex-shrink-0 ml-2"
                  />
                </div>

                {/* Instrument loops display */}
                {selectedTag.category === 'Instrument' && (() => {
                  const tagLoops = loops?.filter(loop => loop.tagIds.includes(selectedTag.id)) || [];
                  return tagLoops.length > 0 && (
                    <div className="mt-1">
                      {tagLoops.map(loop => (
                        <div key={loop.id} className="mb-1">
                          <span className="text-xs text-blue-400 font-mono ml-8">
                            Loop: {loop.name || loop.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Tag comments indicator */}
                {(() => {
                  const tagComments = comments?.filter(comment => 
                    comment.targetType === 'tag' && comment.targetId === selectedTag.id
                  ) || [];
                  
                  return tagComments.length > 0 && (
                    <div className="mt-1 ml-8">
                      <span className="text-xs text-yellow-400">
                        💬 {tagComments.length} comment{tagComments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })()}
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <span className="text-xs text-slate-400">P. {selectedTag.page}</span>
                <EditButton 
                  onClick={() => handleStartEditTag(selectedTag)} 
                  title="Edit tag text"
                />
                <DeleteTagButton 
                  onClick={() => {
                    if (confirm(`Delete tag "${selectedTag.text}"?`)) {
                      onDeleteTags([selectedTag.id]);
                      setSelectedTagIds([]);
                    }
                  }} 
                />
                <button
                  onClick={() => setSelectedTagIds([])}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700 ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Relationships section */}
            {(() => {
              // Calculate all relationships just like in SidePanel
              const outgoingConnections = relationships.filter(r => r.from === selectedTag.id && r.type === 'Connection');
              const incomingConnections = relationships.filter(r => r.to === selectedTag.id && r.type === 'Connection');
              const installationTarget = relationships.find(r => r.from === selectedTag.id && r.type === 'Installation');
              const installedInstruments = relationships.filter(r => r.to === selectedTag.id && r.type === 'Installation');
              const annotationRelationships = relationships.filter(r => (r.from === selectedTag.id || r.to === selectedTag.id) && r.type === 'Annotation');
              const noteRelationships = relationships.filter(r => r.from === selectedTag.id && r.type === 'Note');
              const notedByRelationships = relationships.filter(r => r.to === selectedTag.id && r.type === 'Note');
              const descriptionRelationships = relationships.filter(r => r.from === selectedTag.id && r.type === 'Description');
              const describedByRelationships = relationships.filter(r => r.to === selectedTag.id && r.type === 'Description');
              const equipmentShortSpecRelationships = relationships.filter(r => r.from === selectedTag.id && r.type === 'EquipmentShortSpec');
              
              const hasRelationships = outgoingConnections.length > 0 || incomingConnections.length > 0 || 
                installationTarget || installedInstruments.length > 0 || annotationRelationships.length > 0 || 
                noteRelationships.length > 0 || notedByRelationships.length > 0 || descriptionRelationships.length > 0 || 
                describedByRelationships.length > 0 || equipmentShortSpecRelationships.length > 0;

              const renderRelationship = (otherId, otherText) => (
                <button
                  key={otherId}
                  onClick={(e) => {
                    e.stopPropagation();
                    const otherTag = tags.find(t => t.id === otherId);
                    if (otherTag) {
                      setSelectedTagIds([otherTag.id]);
                      setCurrentPage(otherTag.page);
                      setTagSelectionSource('panel');
                      // Ping the tag to scroll and center it in PDF viewer
                      handlePingTag(otherTag.id);
                    }
                  }}
                  className="text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
                >
                  {otherText}
                </button>
              );

              const tagMap = new Map(tags.map(t => [t.id, t]));

              return hasRelationships && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1 text-xs text-slate-300">
                  {/* Outgoing Connections */}
                  {outgoingConnections.map(rel => {
                    const otherTag = tagMap.get(rel.to);
                    return otherTag ? (
                      <div key={rel.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-300 text-xs">To</span>
                          {renderRelationship(otherTag.id, otherTag.text)}
                        </div>
                        <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                      </div>
                    ) : null;
                  })}
                  
                  {/* Incoming Connections */}
                  {incomingConnections.map(rel => {
                    const otherTag = tagMap.get(rel.from);
                    return otherTag ? (
                      <div key={rel.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-300 text-xs">From</span>
                          {renderRelationship(otherTag.id, otherTag.text)}
                        </div>
                        <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                      </div>
                    ) : null;
                  })}

                  {/* Installation relationships */}
                  {installationTarget && tagMap.get(installationTarget.to) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span title="Installation">📌</span>
                        <span className="text-slate-400">Installed on:</span>
                        {renderRelationship(installationTarget.to, tagMap.get(installationTarget.to).text)}
                      </div>
                      <DeleteRelationshipButton onClick={() => handleDeleteRelationship(installationTarget.id)} />
                    </div>
                  )}

                  {installedInstruments.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold">Installed Instruments:</span>
                      <div className="pl-3 space-y-0.5 mt-1">
                        {installedInstruments.map(rel => {
                          const instrument = tagMap.get(rel.from);
                          return instrument ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div>
                                {renderRelationship(instrument.id, instrument.text)}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
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
                          const otherId = rel.from === selectedTag.id ? rel.to : rel.from;
                          const otherEntity = rawTextItems.find(r => r.id === otherId);
                          const isEditing = editingRawTextItems.has(otherId);
                          
                          return otherEntity ? (
                            <div key={rel.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-1.5 flex-grow min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    defaultValue={otherEntity.text}
                                    onBlur={(e) => {
                                      if (e.target.value.trim() !== otherEntity.text) {
                                        onUpdateRawTextItemText(otherId, e.target.value.trim());
                                      }
                                      setEditingRawTextItems(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(otherId);
                                        return newSet;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') e.target.blur();
                                      if (e.key === 'Escape') {
                                        setEditingRawTextItems(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(otherId);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    autoFocus
                                    className="text-slate-300 font-mono bg-slate-600 border border-sky-500 rounded px-1 flex-grow text-xs"
                                  />
                                ) : (
                                  <span className="text-slate-300 font-mono truncate max-w-[180px]">"{otherEntity.text}"</span>
                                )}
                              </div>
                              <div className="flex items-center flex-shrink-0">
                                <EditButton 
                                  onClick={() => {
                                    setEditingRawTextItems(prev => {
                                      const newSet = new Set(prev);
                                      newSet.add(otherId);
                                      return newSet;
                                    });
                                  }}
                                />
                                <DeleteTagButton onClick={() => onDeleteRawTextItems([otherId])} />
                                <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Note relationships */}
                  {noteRelationships.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold">Notes:</span>
                      <div className="pl-3 space-y-0.5 mt-1">
                        {noteRelationships.map(rel => {
                          const noteTag = tagMap.get(rel.to);
                          return noteTag ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5">
                                <span title="Note">📝</span>
                                {renderRelationship(noteTag.id, noteTag.text)}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {notedByRelationships.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold">Note for:</span>
                      <div className="pl-3 space-y-0.5 mt-1">
                        {notedByRelationships.map(rel => {
                          const targetTag = tagMap.get(rel.from);
                          return targetTag ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div>
                                {renderRelationship(targetTag.id, targetTag.text)}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Description relationships */}
                  {(descriptionRelationships.length > 0 || describedByRelationships.length > 0) && (
                    <div>
                      <span className="text-slate-400 font-semibold">Descriptions:</span>
                      <div className="pl-3 space-y-0.5 mt-1">
                        {descriptionRelationships.map(rel => {
                          const description = descriptions.find(d => d.id === rel.to);
                          return description ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div className="text-purple-300">
                                📄 {description.metadata.type} {description.metadata.number}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
                        })}
                        {describedByRelationships.map(rel => {
                          const description = descriptions.find(d => d.id === rel.from);
                          return description ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div className="text-purple-300">
                                📄 {description.metadata.type} {description.metadata.number}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Equipment short spec relationships */}
                  {equipmentShortSpecRelationships.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold">Equipment Specs:</span>
                      <div className="pl-3 space-y-0.5 mt-1">
                        {equipmentShortSpecRelationships.map(rel => {
                          const spec = equipmentShortSpecs.find(s => s.id === rel.to);
                          return spec ? (
                            <div key={rel.id} className="flex items-center justify-between">
                              <div className="text-orange-300">
                                ⚙️ {spec.text}
                              </div>
                              <DeleteRelationshipButton onClick={() => handleDeleteRelationship(rel.id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      
    </div>
  );
};