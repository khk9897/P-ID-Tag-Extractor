import React, { useState, useCallback } from 'https://esm.sh/react@19.1.1';
import { PdfViewer } from './PdfViewer.tsx';
import { SidePanel } from './SidePanel.tsx';
import { SelectionPanel } from './SelectionPanel.tsx';

export const Workspace = ({
  pdfDoc,
  tags,
  setTags,
  relationships,
  setRelationships,
  rawTextItems,
  onCreateTag,
  onCreateManualTag,
  onDeleteTags,
  onUpdateTagText,
  onDeleteRawTextItems,
  onUpdateRawTextItemText,
  onAutoLinkDescriptions,
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
  showRelationships,
}) => {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedRawTextItemIds, setSelectedRawTextItemIds] = useState([]);
  const [manualCreationData, setManualCreationData] = useState(null); // {bbox, page}
  const [pingedTagId, setPingedTagId] = useState(null);

  const handleDeselectTag = (tagId) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };
  
  const handleDeselectRawTextItem = (itemId) => {
    setSelectedRawTextItemIds(prev => prev.filter(id => id !== itemId));
  };

  const handleClearSelection = () => {
    setSelectedTagIds([]);
    setSelectedRawTextItemIds([]);
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

  const handlePingTag = useCallback((tagId) => {
    setPingedTagId(tagId);
    // Clear after animation is over
    setTimeout(() => setPingedTagId(null), 2000);
  }, []);

  return (
    <div className="flex h-full bg-slate-900 relative">
      <SidePanel 
        tags={tags} 
        setTags={setTags}
        rawTextItems={rawTextItems}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        relationships={relationships}
        setRelationships={setRelationships}
        onDeleteTags={onDeleteTags}
        onUpdateTagText={onUpdateTagText}
        onDeleteRawTextItems={onDeleteRawTextItems}
        onUpdateRawTextItemText={onUpdateRawTextItemText}
        onAutoLinkDescriptions={onAutoLinkDescriptions}
        showConfirmation={showConfirmation}
        onPingTag={handlePingTag}
      />
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
          setSelectedTagIds={setSelectedTagIds}
          rawTextItems={rawTextItems}
          onCreateTag={onCreateTag}
          selectedRawTextItemIds={selectedRawTextItemIds}
          setSelectedRawTextItemIds={setSelectedRawTextItemIds}
          onDeleteTags={onDeleteTags}
          onManualAreaSelect={handleManualAreaSelect}
          // Pass down viewer state
          scale={scale}
          setScale={setScale}
          mode={mode}
          setMode={setMode}
          relationshipStartTag={relationshipStartTag}
          setRelationshipStartTag={setRelationshipStartTag}
          showRelationships={showRelationships}
          pingedTagId={pingedTagId}
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
    </div>
  );
};