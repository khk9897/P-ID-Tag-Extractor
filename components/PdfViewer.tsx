import React, { useState, useEffect, useRef, useCallback } from 'https://esm.sh/react@19.1.1';
import { RelationshipType, Category } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@11.1.0';

const ManualTagPopover = ({ popoverData, onConfirm, onCancel, viewport }) => {
    const [selectedCategory, setSelectedCategory] = useState(Category.Equipment);
    if (!popoverData || !viewport) return null;

    const { rawTextItem, x, y } = popoverData;
    const categories = [Category.Equipment, Category.Line, Category.Instrument];

    const popoverStyle = {
      transform: `translate(${x}px, ${y}px)`,
      position: 'absolute',
      top: 0,
      left: 0,
    };
    
    return (
        <div style={popoverStyle} className="manual-tag-popover absolute z-30 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 w-64 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm">Create Tag</h4>
                <button onClick={onCancel} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <p className="font-mono text-white bg-slate-900 p-2 rounded text-center text-md mb-3 break-words">{rawTextItem.text}</p>
            <div className="space-y-2">
                <label htmlFor="category-select" className="text-xs font-semibold text-slate-300">Category</label>
                <select 
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
                 <button onClick={onCancel} className="px-3 py-1.5 text-sm font-semibold text-slate-300 bg-transparent rounded-md hover:bg-slate-700 transition-colors">Cancel</button>
                 <button onClick={() => onConfirm(rawTextItem, selectedCategory)} className="px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors">Create</button>
            </div>
        </div>
    );
};


export const PdfViewer = ({
  pdfDoc,
  tags,
  setTags,
  relationships,
  setRelationships,
  currentPage,
  setCurrentPage,
  selectedTagIds,
  setSelectedTagIds,
  rawTextItems,
  onCreateTag,
}) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  
  const [scale, setScale] = useState(1.5);
  const [viewport, setViewport] = useState(null);
  const [mode, setMode] = useState('select');
  const [relationshipStartTag, setRelationshipStartTag] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [relatedTagIds, setRelatedTagIds] = useState(new Set());
  const [showRelationships, setShowRelationships] = useState(true);
  const [manualTagPopover, setManualTagPopover] = useState(null);

  const renderPage = useCallback(async (pageNumber) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNumber);
    const vp = page.getViewport({ scale });
    setViewport(vp);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = vp.height;
    canvas.width = vp.width;

    const renderContext = {
      canvasContext: context,
      viewport: vp,
    };
    await page.render(renderContext).promise;
  }, [pdfDoc, scale]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage, scale]);

  useEffect(() => {
    if (selectedTagIds.length === 1) {
      const selectedTag = tags.find(t => t.id === selectedTagIds[0]);
      if (selectedTag && (selectedTag.category === Category.Equipment || selectedTag.category === Category.Line)) {
        const relatedIds = relationships
          .filter(r => r.type === RelationshipType.Installation && r.to === selectedTag.id)
          .map(r => r.from);
        setRelatedTagIds(new Set(relatedIds));
        return;
      }
    }
    setRelatedTagIds(new Set());
  }, [selectedTagIds, relationships, tags]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'c') {
        setMode('connect');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
      } else if (e.key === 'Escape') {
        setMode('select');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
        setManualTagPopover(null);
      } else if (e.key.toLowerCase() === 'i' && mode === 'select' && selectedTagIds.length > 1) {
        const selected = tags.filter(t => selectedTagIds.includes(t.id));
        const baseTags = selected.filter(t => t.category === Category.Equipment || t.category === Category.Line);
        const instrumentTags = selected.filter(t => t.category === Category.Instrument);

        if (baseTags.length === 1 && instrumentTags.length >= 1) {
          const baseTag = baseTags[0];
          const newRelationships = instrumentTags.map(inst => ({
            id: uuidv4(),
            from: inst.id,
            to: baseTag.id,
            type: RelationshipType.Installation,
          }));
          
          const existingRels = new Set(relationships.map(r => `${r.from}-${r.to}-${r.type}`));
          const uniqueNewRels = newRelationships.filter(r => !existingRels.has(`${r.from}-${r.to}-${r.type}`));

          if (uniqueNewRels.length > 0) {
              setRelationships(prev => [...prev, ...uniqueNewRels]);
          }
          setSelectedTagIds([]);
          console.info(`Created ${uniqueNewRels.length} new installation relationship(s).`);
        } else {
          console.warn('To create an installation, please select exactly one Equipment or Line, and one or more Instruments.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedTagIds, tags, relationships, setRelationships, setSelectedTagIds]);
  
  useEffect(() => {
    if (selectedTagIds.length === 1 && scrollContainerRef.current && viewport) {
      const tagId = selectedTagIds[0];
      const tag = tags.find(t => t.id === tagId);

      if (tag && tag.page === currentPage) {
        const { x1, y1, x2, y2 } = tag.bbox;
        const tagCenterX = ((x1 + x2) / 2) * scale;
        const tagCenterY = viewport.height - (((y1 + y2) / 2) * scale);

        const container = scrollContainerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const canvasWrapper = viewerRef.current;
        if (!canvasWrapper) return;
        
        const canvasRect = canvasWrapper.getBoundingClientRect();
        const scrollContainerRect = container.getBoundingClientRect();

        const wrapperLeftOffset = (canvasRect.left - scrollContainerRect.left) + container.scrollLeft;
        const wrapperTopOffset = (canvasRect.top - scrollContainerRect.top) + container.scrollTop;

        container.scrollTo({
          left: (wrapperLeftOffset + tagCenterX) - containerWidth / 2,
          top: (wrapperTopOffset + tagCenterY) - containerHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedTagIds, currentPage, viewport, tags, scale]);

  const handleTagClick = (e, tagId) => {
    e.stopPropagation();
    const isMultiSelect = e.ctrlKey || e.metaKey;
    setManualTagPopover(null);

    if (mode === 'select') {
      if (isMultiSelect) {
        setSelectedTagIds(prev =>
          prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
      } else {
        setSelectedTagIds([tagId]);
      }
    } else if (mode === 'connect') {
      if (!relationshipStartTag) {
        setRelationshipStartTag(tagId);
      } else if (relationshipStartTag !== tagId) {
        setRelationships(prev => [
          ...prev,
          {
            id: uuidv4(),
            from: relationshipStartTag,
            to: tagId,
            type: RelationshipType.Connection,
          },
        ]);
        setRelationshipStartTag(null);
        setMode('select');
      }
    }
  };

  const currentTags = tags.filter(t => t.page === currentPage);
  const currentRawTextItems = rawTextItems.filter(t => t.page === currentPage);

  const handleMouseDown = (e) => {
    // Close popover if click is outside of it
    if (manualTagPopover && !(e.target as Element).closest('.manual-tag-popover')) {
      setManualTagPopover(null);
    }
      
    if (mode !== 'select' || !viewerRef.current || (e.target as Element).closest('[data-tag-id]') || (e.target as Element).closest('[data-raw-text-id]')) {
      return;
    }
    const rect = viewerRef.current.getBoundingClientRect();
    startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
    if (!e.ctrlKey && !e.metaKey) {
        setSelectedTagIds([]);
    }
    setSelectionRect({ ...startPoint.current, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !viewerRef.current) return;
    const rect = viewerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPoint.current.x, currentX);
    const y = Math.min(startPoint.current.y, currentY);
    const width = Math.abs(startPoint.current.x - currentX);
    const height = Math.abs(startPoint.current.y - currentY);
    setSelectionRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDragging || !selectionRect || !viewport) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    
    const newSelectedIds = new Set(selectedTagIds);
    for (const tag of currentTags) {
      const { x1, y1, x2, y2 } = tag.bbox;
      const tagRect = {
        x: x1 * scale,
        y: viewport.height - (y2 * scale),
        width: (x2 - x1) * scale,
        height: (y2 - y1) * scale
      };
      if (
        selectionRect.x < tagRect.x + tagRect.width &&
        selectionRect.x + selectionRect.width > tagRect.x &&
        selectionRect.y < tagRect.y + tagRect.height &&
        selectionRect.y + selectionRect.height > tagRect.y
      ) {
        newSelectedIds.add(tag.id);
      }
    }
    setSelectedTagIds(Array.from(newSelectedIds));
    setSelectionRect(null);
  };
  
  const getTagCenter = (tag) => {
    if (!viewport) return { x: 0, y: 0 };
    const centerX = ((tag.bbox.x1 + tag.bbox.x2) / 2) * scale;
    const centerY = ((tag.bbox.y1 + tag.bbox.y2) / 2) * scale;
    return { x: centerX, y: viewport.height - centerY };
  };

  const currentRelationships = relationships.filter(r => {
    const fromTag = tags.find(t => t.id === r.from);
    const toTag = tags.find(t => t.id === r.to);
    return fromTag?.page === currentPage && toTag?.page === currentPage;
  });

  const getModeStyles = () => {
    switch(mode){
      case 'connect': return 'cursor-crosshair ring-2 ring-blue-500';
      default: return 'cursor-default';
    }
  };

  const handleRawTextClick = (e, rawTextItem) => {
    e.stopPropagation();
    if (!viewport) return;
    const { x2, y1 } = rawTextItem.bbox;
    
    const popoverX = x2 * scale + 10;
    const popoverY = viewport.height - (y1 * scale);
    
    setManualTagPopover({ rawTextItem, x: popoverX, y: popoverY });
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-800/80 backdrop-blur-sm p-2 rounded-xl shadow-lg flex items-center space-x-4">
        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors">Prev</button>
        <span>Page {currentPage} of {pdfDoc.numPages}</span>
        <button onClick={() => setCurrentPage(Math.min(pdfDoc.numPages, currentPage + 1))} disabled={currentPage === pdfDoc.numPages} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 transition-colors">Next</button>
        <div className="h-6 w-px bg-slate-600"></div>
        <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-300">Zoom:</span>
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors">-</button>
            <span className="w-12 text-center text-sm font-semibold text-white">{(scale * 100).toFixed(0)}%</span>
            <button onClick={() => setScale(s => s + 0.25)} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors">+</button>
        </div>
        <div className="h-6 w-px bg-slate-600"></div>
        <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-300">Mode:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${mode === 'select' ? 'bg-slate-600' : 'bg-blue-500'}`}>{mode}</span>
             <button
                onClick={() => setShowRelationships(prev => !prev)}
                title={showRelationships ? "Hide relationship lines" : "Show relationship lines"}
                className={`p-1.5 rounded-md transition-colors ${showRelationships ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                {showRelationships ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.012 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.303 6.546A10.048 10.048 0 00.458 10c1.274 4.057 5.012 7 9.542 7 .847 0 1.669-.101 2.454-.293z" />
                  </svg>
                )}
              </button>
            <span className="text-xs text-slate-400">(Hotkeys: C - Connect, I - Install, Esc - Select)</span>
        </div>
      </div>
      
      <div ref={scrollContainerRef} className="h-full w-full overflow-auto">
        <div className="p-4 pt-20 flex justify-center min-h-full">
            <div 
                ref={viewerRef} 
                className={`relative shadow-2xl ${getModeStyles()}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves viewer
            >
                <canvas ref={canvasRef} />
                <ManualTagPopover 
                    popoverData={manualTagPopover}
                    onConfirm={(item, cat) => {
                        onCreateTag(item, cat);
                        setManualTagPopover(null);
                    }}
                    onCancel={() => setManualTagPopover(null)}
                    viewport={viewport}
                />
                {viewport && (
                <svg className="absolute top-0 left-0" width={viewport.width} height={viewport.height}>
                    <defs>
                    <marker id="arrowhead-connect" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" /></marker>
                    <marker id="arrowhead-install" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#facc15" /></marker>
                    </defs>

                    {currentRawTextItems.map(item => {
                         const { x1, y1, x2, y2 } = item.bbox;
                         const rectX = x1 * scale;
                         const rectY = viewport.height - (y2 * scale);
                         const rectWidth = (x2 - x1) * scale;
                         const rectHeight = (y2 - y1) * scale;
                         return (
                            <g key={item.id} data-raw-text-id={item.id} onClick={(e) => handleRawTextClick(e, item)} className="cursor-pointer group">
                                <rect 
                                    x={rectX} y={rectY} width={rectWidth} height={rectHeight} 
                                    className="fill-transparent stroke-slate-600/80 group-hover:stroke-sky-400 group-hover:fill-sky-400/20 transition-all" 
                                    strokeWidth="1" strokeDasharray="3 3" 
                                />
                            </g>
                         )
                    })}
                    
                    {showRelationships && currentRelationships.map(rel => {
                    const fromTag = tags.find(t => t.id === rel.from);
                    const toTag = tags.find(t => t.id === rel.to);
                    if (!fromTag || !toTag) return null;
                    const start = getTagCenter(fromTag);
                    const end = getTagCenter(toTag);
                    const isConnect = rel.type === RelationshipType.Connection;
                    return <line key={rel.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={isConnect ? '#38bdf8' : '#facc15'} strokeWidth="2" markerEnd={isConnect ? 'url(#arrowhead-connect)' : 'url(#arrowhead-install)'} />;
                    })}
                    
                    {currentTags.map(tag => {
                    const { x1, y1, x2, y2 } = tag.bbox;
                    const rectX = x1 * scale;
                    const rectY = viewport.height - (y2 * scale);
                    const rectWidth = (x2 - x1) * scale;
                    const rectHeight = (y2 - y1) * scale;
                    const isSelected = selectedTagIds.includes(tag.id);
                    const isRelStart = tag.id === relationshipStartTag;
                    const isRelated = relatedTagIds.has(tag.id);
                    const colors = CATEGORY_COLORS[tag.category];

                    return (
                        <g key={tag.id} data-tag-id={tag.id} onClick={(e) => handleTagClick(e, tag.id)} className="cursor-pointer">
                        <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} className={`fill-opacity-20 stroke-2 transition-all duration-150 ${colors.bg.replace('bg-', 'fill-')} ${colors.border.replace('border-', 'stroke-')}`} strokeDasharray={isRelStart ? "4 2" : "none"} />
                        {isSelected && <rect x={rectX - 2} y={rectY - 2} width={rectWidth + 4} height={rectHeight + 4} className="fill-none stroke-pink-500" strokeWidth="3" />}
                        {isRelated && !isSelected && (
                            <rect 
                            x={rectX} 
                            y={rectY} 
                            width={rectWidth} 
                            height={rectHeight} 
                            className="fill-violet-500/20 stroke-violet-500" 
                            strokeWidth="2"
                            />
                        )}
                        </g>
                    );
                    })}

                    {selectionRect && <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className="fill-sky-400/20 stroke-sky-400 stroke-2" />}
                </svg>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};