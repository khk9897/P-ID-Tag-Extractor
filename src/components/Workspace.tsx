import React, { useState, useCallback } from 'react';
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
  showRelationships,
  setShowRelationships,
  isSidePanelVisible,
}) => {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedRawTextItemIds, setSelectedRawTextItemIds] = useState([]);
  const [selectedDescriptionIds, setSelectedDescriptionIds] = useState([]);
  const [selectedEquipmentShortSpecIds, setSelectedEquipmentShortSpecIds] = useState([]);
  const [manualCreationData, setManualCreationData] = useState(null); // {bbox, page}
  const [pingedTagId, setPingedTagId] = useState(null);
  const [pingedDescriptionId, setPingedDescriptionId] = useState(null);
  const [pingedEquipmentShortSpecId, setPingedEquipmentShortSpecId] = useState(null);

  const handleDeselectTag = (tagId) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
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
    // Find the tag to get its page
    const tag = tags.find(t => t.id === tagId);
    if (tag && tag.page !== currentPage) {
      setCurrentPage(tag.page);
    }
    
    setPingedTagId(tagId);
    // Clear after animation is over
    setTimeout(() => setPingedTagId(null), 2000);
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
  }, [equipmentShortSpecs, currentPage, setCurrentPage]);

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
        setSelectedTagIds={setSelectedTagIds}
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
        showRelationships={showRelationships}
        setShowRelationships={setShowRelationships}
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
          setSelectedTagIds={setSelectedTagIds}
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
          onManualCreateLoop={onManualCreateLoop}
          onManualAreaSelect={handleManualAreaSelect}
          // Pass down viewer state
          scale={scale}
          setScale={setScale}
          mode={mode}
          setMode={setMode}
          relationshipStartTag={relationshipStartTag}
          setRelationshipStartTag={setRelationshipStartTag}
          showRelationships={showRelationships}
          setShowRelationships={setShowRelationships}
          pingedTagId={pingedTagId}
          pingedDescriptionId={pingedDescriptionId}
          pingedEquipmentShortSpecId={pingedEquipmentShortSpecId}
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