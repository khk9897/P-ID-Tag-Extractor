import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'https://esm.sh/react@19.1.1';
import { RelationshipType, Category } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@11.1.0';

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
  selectedRawTextItemIds,
  setSelectedRawTextItemIds,
  onDeleteTags,
  onManualAreaSelect,
  // Viewer state from props
  scale,
  setScale,
  mode,
  setMode,
  relationshipStartTag,
  setRelationshipStartTag,
  showRelationships,
}) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  
  const [viewport, setViewport] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // For selection rect
  const [selectionRect, setSelectionRect] = useState(null);
  const [relatedTagIds, setRelatedTagIds] = useState(new Set());

  const isMoved = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ scrollX: 0, scrollY: 0, clientX: 0, clientY: 0 });

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

  useLayoutEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage, scale]); // Rerender on scale change

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
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      
      if (e.key === '1') {
        setScale(s => Math.min(10, s + 0.25));
        e.preventDefault();
      } else if (e.key === '2') {
        setScale(s => Math.max(0.25, s - 0.25));
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTagIds.length > 0) {
          e.preventDefault(); // Prevent browser back navigation on Backspace
          onDeleteTags(selectedTagIds);
          setSelectedTagIds([]);
        }
      } else if (e.key.toLowerCase() === 'c') {
        setMode('connect');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
      } else if (e.key.toLowerCase() === 'k') {
        setMode('manualCreate');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
        setSelectedRawTextItemIds([]);
      } else if (e.key === 'Escape') {
        setMode('select');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
        setSelectedRawTextItemIds([]);
      } else if (e.key.toLowerCase() === 'm') {
        const selectedRawItems = rawTextItems.filter(item => selectedRawTextItemIds.includes(item.id));
        if (selectedRawItems.length === 2) {
          // Sort to ensure consistent naming, e.g., "PIC-101" instead of "101-PIC"
          // Assume vertical alignment means top part comes first.
          selectedRawItems.sort((a, b) => b.bbox.y1 - a.bbox.y1);
          onCreateTag(selectedRawItems, Category.Instrument);
          setSelectedRawTextItemIds([]);
        } else {
            alert("The 'M' hotkey creates an Instrument tag from exactly TWO selected text items. For other cases, use the action panel at the bottom.");
        }
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
  }, [mode, selectedTagIds, tags, relationships, setRelationships, setSelectedTagIds, rawTextItems, selectedRawTextItemIds, onCreateTag, setSelectedRawTextItemIds, onDeleteTags, setMode, setRelationshipStartTag, setScale]);
  
  useLayoutEffect(() => {
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
    setSelectedRawTextItemIds([]); // Clear other selection type

    const isMultiSelect = e.ctrlKey || e.metaKey;

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

  const handleRawTextItemMouseDown = (e, rawTextItemId) => {
    e.stopPropagation();
    setSelectedTagIds([]); // Clear other selection type

    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (isMultiSelect) {
        setSelectedRawTextItemIds(prev =>
            prev.includes(rawTextItemId) ? prev.filter(id => id !== rawTextItemId) : [...prev, rawTextItemId]
        );
    } else {
        setSelectedRawTextItemIds([rawTextItemId]);
    }
  };

  const currentTags = tags.filter(t => t.page === currentPage);
  const currentRawTextItems = rawTextItems.filter(t => t.page === currentPage);

 const handleViewerMouseDown = (e) => {
    if (
      (e.target as Element).closest('[data-tag-id]') ||
      (e.target as Element).closest('[data-raw-text-id]')
    ) {
      return;
    }
  
    isMoved.current = false;
  
    if (mode === 'manualCreate' && viewerRef.current) {
        const rect = viewerRef.current.getBoundingClientRect();
        startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setIsDragging(true); // this is for selectionRect
        setSelectionRect({ ...startPoint.current, width: 0, height: 0 });
        return; // Prevent other logic from running
    }
    
    const isSelectionModifier = e.ctrlKey || e.metaKey;

    if (isSelectionModifier && mode === 'select' && viewerRef.current) {
        // Area Selection Logic
        const rect = viewerRef.current.getBoundingClientRect();
        startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setIsDragging(true);
        setSelectionRect({ ...startPoint.current, width: 0, height: 0 });
    } else if (!isSelectionModifier && mode === 'select' && scrollContainerRef.current) {
        // Panning Logic
        setIsPanning(true);
        panStart.current = {
            scrollX: scrollContainerRef.current.scrollLeft,
            scrollY: scrollContainerRef.current.scrollTop,
            clientX: e.clientX,
            clientY: e.clientY,
        };
        e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning || isDragging) {
      isMoved.current = true;
    }

    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panStart.current.clientX;
      const dy = e.clientY - panStart.current.clientY;
      scrollContainerRef.current.scrollLeft = panStart.current.scrollX - dx;
      scrollContainerRef.current.scrollTop = panStart.current.scrollY - dy;
      return;
    }

    if (isDragging && viewerRef.current) {
      const rect = viewerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
  
      const x = Math.min(startPoint.current.x, currentX);
      const y = Math.min(startPoint.current.y, currentY);
      const width = Math.abs(startPoint.current.x - currentX);
      const height = Math.abs(startPoint.current.y - currentY);
      setSelectionRect({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    // A simple click on the background without movement clears selection
    if (!isMoved.current && !isDragging) {
        setSelectedTagIds([]);
        setSelectedRawTextItemIds([]);
    }

    if (!isDragging || !selectionRect || !viewport) {
      if (isDragging) setIsDragging(false);
      return;
    }
    
    if (mode === 'manualCreate') {
        setIsDragging(false);
        // Check for minimal size to avoid accidental clicks
        if (selectionRect.width > 5 && selectionRect.height > 5) {
            const { x, y, width, height } = selectionRect;
            const bbox = {
                x1: x / scale,
                y1: (viewport.height - (y + height)) / scale,
                x2: (x + width) / scale,
                y2: (viewport.height - y) / scale,
            };
            onManualAreaSelect(bbox, currentPage);
        }
        setSelectionRect(null);
        setMode('select');
        return;
    }

    setIsDragging(false);
    
    // Prioritize selecting existing tags over raw text items
    const intersectingTags = new Set();
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
        intersectingTags.add(tag.id);
      }
    }
    
    if(intersectingTags.size > 0){
        setSelectedTagIds(prev => Array.from(new Set([...prev, ...Array.from(intersectingTags)])));
        setSelectedRawTextItemIds([]); // Ensure only one type is selected
    } else {
        const intersectingRawItems = new Set();
         for (const item of currentRawTextItems) {
            const { x1, y1, x2, y2 } = item.bbox;
            const itemRect = {
              x: x1 * scale,
              y: viewport.height - (y2 * scale),
              width: (x2 - x1) * scale,
              height: (y2 - y1) * scale
            };
            if (
                selectionRect.x < itemRect.x + itemRect.width &&
                selectionRect.x + selectionRect.width > itemRect.x &&
                selectionRect.y < itemRect.y + itemRect.height &&
                selectionRect.y + selectionRect.height > itemRect.y
            ) {
                intersectingRawItems.add(item.id);
            }
         }
         if (intersectingRawItems.size > 0) {
            setSelectedRawTextItemIds(prev => Array.from(new Set([...prev, ...Array.from(intersectingRawItems)])));
            setSelectedTagIds([]); // Ensure only one type is selected
         }
    }

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
      case 'manualCreate': return 'cursor-crosshair ring-2 ring-green-500';
      default: return ''; // Inherit grab/grabbing cursor from parent
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={scrollContainerRef} className={`h-full w-full overflow-auto ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}>
        <div className="p-4 grid place-items-center min-h-full">
            <div 
                ref={viewerRef} 
                className={`relative shadow-2xl ${getModeStyles()}`}
                onMouseDown={handleViewerMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves viewer
            >
                <canvas ref={canvasRef} />
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
                         const isSelected = selectedRawTextItemIds.includes(item.id);
                         return (
                            <g key={item.id} data-raw-text-id={item.id} onMouseDown={(e) => handleRawTextItemMouseDown(e, item.id)} className="cursor-pointer group">
                                <rect 
                                    x={rectX} y={rectY} width={rectWidth} height={rectHeight} 
                                    className={isSelected ? "fill-sky-400/30 stroke-sky-400" : "fill-transparent stroke-slate-600/80 group-hover:stroke-sky-400 group-hover:fill-sky-400/20 transition-all"} 
                                    strokeWidth="1.5"
                                    strokeDasharray={isSelected ? "none" : "3 3"} 
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

                    {selectionRect && <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className={`stroke-2 ${mode === 'manualCreate' ? 'fill-green-400/20 stroke-green-400' : 'fill-sky-400/20 stroke-sky-400'}`} />}
                </svg>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};