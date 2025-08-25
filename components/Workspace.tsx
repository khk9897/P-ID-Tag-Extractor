import React, { useState } from 'https://esm.sh/react@19.1.1';
import { PdfViewer } from './PdfViewer.tsx';
import { SidePanel } from './SidePanel.tsx';
import { SelectionPanel } from './SelectionPanel.tsx';

export const Workspace = ({
  pdfDoc,
  tags,
  setTags,
  relationships,
  setRelationships,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const goToTag = (tag) => {
    setCurrentPage(tag.page);
    setSelectedTagIds([tag.id]);
  };

  const handleDeselectTag = (tagId) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };
  
  const handleClearSelection = () => {
    setSelectedTagIds([]);
  };
  
  return (
    <div className="flex h-full bg-slate-900 relative">
      <SidePanel 
        tags={tags} 
        onTagSelect={goToTag}
        currentPage={currentPage}
        selectedTagIds={selectedTagIds}
        relationships={relationships}
        setRelationships={setRelationships}
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
        />
      </div>
      <SelectionPanel
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        allTags={tags}
        relationships={relationships}
        onDeselect={handleDeselectTag}
        onClear={handleClearSelection}
      />
    </div>
  );
};
