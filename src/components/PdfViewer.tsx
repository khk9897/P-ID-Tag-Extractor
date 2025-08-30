import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { RelationshipType, Category } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { v4 as uuidv4 } from 'uuid';

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
  selectedDescriptionIds,
  setSelectedDescriptionIds,
  rawTextItems,
  descriptions,
  onCreateTag,
  onCreateDescription,
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
  pingedTagId,
  pingedDescriptionId,
}) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const isClickOnItem = useRef(false); // Ref to track if mousedown was on an item
  
  const [viewport, setViewport] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // For selection rect
  const [selectionRect, setSelectionRect] = useState(null);
  const [relatedTagIds, setRelatedTagIds] = useState(new Set());
  const [highlightedRawTextItemIds, setHighlightedRawTextItemIds] = useState(new Set());

  const linkedRawTextItemIds = useMemo(() => {
    return new Set(
      relationships
        .filter(r => r.type === RelationshipType.Annotation)
        .map(r => r.to)
    );
  }, [relationships]);

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
    let newRelatedTagIds = new Set();
    let newHighlightedNoteIds = new Set();

    if (selectedTagIds.length > 0) {
      // For related notes (annotations), show for any selection
      newHighlightedNoteIds = new Set(
        relationships
          .filter(r => r.type === RelationshipType.Annotation && selectedTagIds.includes(r.from))
          .map(r => r.to)
      );

      // For related instruments (installed on Equipment/Line), only show for single selection
      if (selectedTagIds.length === 1) {
        const selectedTag = tags.find(t => t.id === selectedTagIds[0]);
        if (selectedTag && (selectedTag.category === Category.Equipment || selectedTag.category === Category.Line)) {
          newRelatedTagIds = new Set(
            relationships
              .filter(r => r.type === RelationshipType.Installation && r.to === selectedTag.id)
              .map(r => r.from)
          );
        }
      }
    }
    
    setRelatedTagIds(newRelatedTagIds);
    setHighlightedRawTextItemIds(newHighlightedNoteIds);
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
        if (mode === 'connect') {
          setMode('select');
          setRelationshipStartTag(null);
        } else {
          setMode('connect');
          setRelationshipStartTag(null);
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        }
      } else if (e.key.toLowerCase() === 'k') {
        if (mode === 'manualCreate') {
          setMode('select');
        } else {
          setMode('manualCreate');
          setRelationshipStartTag(null);
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        }
      } else if (e.key === 'Escape') {
        setMode('select');
        setRelationshipStartTag(null);
        setSelectedTagIds([]);
        setSelectedRawTextItemIds([]);
      } else if (e.key.toLowerCase() === 'm') {
        const selectedRawItems = rawTextItems.filter(item => selectedRawTextItemIds.includes(item.id));
        if (selectedRawItems.length === 2) {
          // Sort to ensure consistent naming, e.g., "PIC-101" instead of "101-PIC"
          // Assume vertical alignment means top part comes first (higher Y values are at the top in PDF coordinates).
          selectedRawItems.sort((a, b) => b.bbox.y1 - a.bbox.y1);
          onCreateTag(selectedRawItems, Category.Instrument);
          setSelectedRawTextItemIds([]);
        } else {
            alert("The 'M' hotkey creates an Instrument tag from exactly TWO selected text items. For other cases, use the action panel at the bottom.");
        }
      } else if (e.key.toLowerCase() === 'n') {
        const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => selectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        if (allSelectedItems.length > 0) {
          onCreateDescription(allSelectedItems);
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        } else {
          alert("Select tags or text items first, then press 'N' to create a description.");
        }
      } else if (e.key.toLowerCase() === 'r' && mode === 'select' && (selectedTagIds.length > 0 || selectedRawTextItemIds.length > 0)) {
        const newRelationships = [];
        const selected = tags.filter(t => selectedTagIds.includes(t.id));
        
        // Specifically identify Equipment, Line, or Instrument tags
        const itemTagCategories = [Category.Equipment, Category.Line, Category.Instrument];
        const itemTags = selected.filter(t => itemTagCategories.includes(t.category));

        // VALIDATION: Ensure at most one item tag is selected
        if (itemTags.length > 1) {
            alert("Please select only one Equipment, Line, or Instrument tag at a time to create relationships.");
            return; // Stop processing
        }
        
        // Proceed if there is exactly one item tag.
        if (itemTags.length === 1) {
            const itemTag = itemTags[0];
            const noteTags = selected.filter(t => t.category === Category.NotesAndHolds);

            // Create Note relationships (item -> note)
            for (const noteTag of noteTags) {
                newRelationships.push({
                    id: uuidv4(),
                    from: itemTag.id,
                    to: noteTag.id,
                    type: RelationshipType.Note,
                });
            }
            
            // Create Annotation relationships (item -> raw text)
            for (const rawId of selectedRawTextItemIds) {
                newRelationships.push({
                    id: uuidv4(),
                    from: itemTag.id,
                    to: rawId,
                    type: RelationshipType.Annotation,
                });
            }
        }
        
        if (newRelationships.length > 0) {
            const existingRels = new Set(relationships.map(r => `${r.from}-${r.to}-${r.type}`));
            const uniqueNewRels = newRelationships.filter(r => !existingRels.has(`${r.from}-${r.to}-${r.type}`));
    
            if (uniqueNewRels.length > 0) {
                setRelationships(prev => [...prev, ...uniqueNewRels]);
            }
            setSelectedTagIds([]);
            setSelectedRawTextItemIds([]);
            console.info(`Created ${uniqueNewRels.length} new relationship(s).`);
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

  const handleTagMouseDown = (e, tagId) => {
    e.stopPropagation();
    isClickOnItem.current = true;
    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (mode === 'select') {
      if (isMultiSelect) {
        // Add to or remove from tag selection without affecting raw text selection
        setSelectedTagIds(prev =>
          prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
      } else {
        // A single click replaces the entire selection with just this one tag.
        setSelectedTagIds([tagId]);
        setSelectedRawTextItemIds([]);
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
        // For continuous connection, the destination tag becomes the new start tag.
        setRelationshipStartTag(tagId);
      }
    }
  };

  const handleRawTextItemMouseDown = (e, rawTextItemId) => {
    e.stopPropagation();
    isClickOnItem.current = true;
    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (isMultiSelect) {
        // Add to or remove from raw text selection without affecting tag selection
        setSelectedRawTextItemIds(prev =>
            prev.includes(rawTextItemId) ? prev.filter(id => id !== rawTextItemId) : [...prev, rawTextItemId]
        );
    } else {
        // A single click replaces the entire selection with just this one raw text item.
        setSelectedRawTextItemIds([rawTextItemId]);
        setSelectedTagIds([]);
    }
  };

  const currentTags = tags.filter(t => t.page === currentPage);
  const currentRawTextItems = rawTextItems.filter(t => t.page === currentPage);

 const handleViewerMouseDown = (e) => {
    if (
      (e.target as Element).closest('[data-tag-id]') ||
      (e.target as Element).closest('[data-raw-text-id]')
    ) {
      // The item's own onMouseDown will fire and set the isClickOnItem ref.
      return;
    }
  
    isClickOnItem.current = false; // A true background click
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

  const handleMouseUp = (e) => {
    // If the interaction started on an item, don't clear selection or process area selection.
    // This is more robust than checking e.target on mouseup, which can be affected by re-renders.
    if (isClickOnItem.current) {
      if (isDragging) { // This can happen if user clicks item and drags off
        setIsDragging(false);
        setSelectionRect(null);
      }
      return;
    }
      
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
    
    // Area selection can add both tags and raw items
    const intersectingTags = new Set<string>();
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
        setSelectedTagIds(prev => Array.from(new Set([...prev, ...intersectingTags])));
    } 
    
    const intersectingRawItems = new Set<string>();
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
        setSelectedRawTextItemIds(prev => Array.from(new Set([...prev, ...intersectingRawItems])));
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
    // Annotations can link to raw text items which don't have a page property in the same way
    if (r.type === RelationshipType.Annotation) {
        const toItem = rawTextItems.find(item => item.id === r.to);
        return fromTag?.page === currentPage && toItem?.page === currentPage;
    }
    const toTag = tags.find(t => t.id === r.to);
    return fromTag?.page === currentPage && toTag?.page === currentPage;
  });
  
  const getAnnotationTargetCenter = (rawTextItemId) => {
      if (!viewport) return { x: 0, y: 0 };
      const item = rawTextItems.find(i => i.id === rawTextItemId);
      if (!item) return { x: 0, y: 0 };
      const centerX = ((item.bbox.x1 + item.bbox.x2) / 2) * scale;
      const centerY = ((item.bbox.y1 + item.bbox.y2) / 2) * scale;
      return { x: centerX, y: viewport.height - centerY };
  }

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
                <svg className="absolute top-0 left-0" width={viewport.width} height={viewport.height} style={{ overflow: 'visible' }}>
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
                         const isHighlighted = highlightedRawTextItemIds.has(item.id);
                         const isLinked = linkedRawTextItemIds.has(item.id);
                         
                         const getRectProps = () => {
                             if (isSelected) {
                                 return { fill: "rgb(56 189 248 / 0.5)", className: "stroke-sky-400", strokeWidth: "2.5", strokeDasharray: "none" };
                             }
                             if (isHighlighted) {
                                 return { fill: "rgb(139 69 255 / 0.4)", className: "stroke-violet-500", strokeWidth: "2.5", strokeDasharray: "none" };
                             }
                             if (isLinked) {
                                return { fill: "rgb(20 184 166 / 0.3)", className: "stroke-teal-500", strokeWidth: "2", strokeDasharray: "none" };
                             }
                             return { className: "fill-transparent stroke-slate-600/80 group-hover:stroke-sky-400 group-hover:fill-sky-400/30 transition-all", strokeWidth: "2", strokeDasharray: "3 3" };
                         };

                         return (
                            <g key={item.id} data-raw-text-id={item.id} onMouseDown={(e) => handleRawTextItemMouseDown(e, item.id)} className="cursor-pointer group">
                                <rect 
                                    x={rectX} y={rectY} width={rectWidth} height={rectHeight} 
                                    {...getRectProps()}
                                />
                            </g>
                         )
                    })}
                    
                    {showRelationships && currentRelationships.map(rel => {
                        const fromTag = tags.find(t => t.id === rel.from);
                        if (!fromTag) return null;
                        
                        const start = getTagCenter(fromTag);
                        let end, strokeColor, marker;
                        
                        if (rel.type === RelationshipType.Annotation) {
                            const toItem = rawTextItems.find(i => i.id === rel.to);
                            if (!toItem) return null;
                            end = getAnnotationTargetCenter(rel.to);
                            strokeColor = '#94a3b8'; // slate-400
                            marker = '';
                        } else {
                            const toTag = tags.find(t => t.id === rel.to);
                            if (!toTag) return null;
                            end = getTagCenter(toTag);
                            
                            if (rel.type === RelationshipType.Connection) {
                                strokeColor = '#38bdf8';
                                marker = 'url(#arrowhead-connect)';
                            } else if (rel.type === RelationshipType.Installation) {
                                strokeColor = '#facc15';
                                marker = 'url(#arrowhead-install)';
                            } else if (rel.type === RelationshipType.Note) {
                                strokeColor = '#2dd4bf'; // teal-400
                                marker = '';
                            } else {
                                return null;
                            }
                        }

                        return <line key={rel.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={strokeColor} strokeWidth="2" strokeDasharray={rel.type === RelationshipType.Annotation || rel.type === RelationshipType.Note ? '3 3' : 'none'} markerEnd={marker} />;
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
                        <g key={tag.id} data-tag-id={tag.id} onMouseDown={(e) => handleTagMouseDown(e, tag.id)} className="cursor-pointer">
                        <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} className={`stroke-[3] transition-all duration-150 ${colors.border.replace('border-', 'stroke-')}`} fill={colors.bg.includes('sky') ? 'rgb(14 165 233 / 0.4)' : colors.bg.includes('rose') ? 'rgb(244 63 94 / 0.4)' : colors.bg.includes('amber') ? 'rgb(245 158 11 / 0.4)' : colors.bg.includes('indigo') ? 'rgb(99 102 241 / 0.4)' : colors.bg.includes('teal') ? 'rgb(20 184 166 / 0.4)' : 'rgb(100 116 139 / 0.4)'} strokeDasharray={isRelStart ? "4 2" : "none"} />
                        {isSelected && <rect x={rectX - 4} y={rectY - 4} width={rectWidth + 8} height={rectHeight + 8} className="fill-none stroke-red-500" strokeWidth="4" rx="2" />}
                        {isRelated && !isSelected && (
                            <rect 
                            x={rectX} 
                            y={rectY} 
                            width={rectWidth} 
                            height={rectHeight} 
                            fill="rgb(139 69 255 / 0.4)" 
                            className="stroke-violet-500" 
                            strokeWidth="3"
                            />
                        )}
                        </g>
                    );
                    })}

                    {pingedTagId && (() => {
                      const tagToPing = currentTags.find(t => t.id === pingedTagId);
                      if (!tagToPing) return null;

                      const { x1, y1, x2, y2 } = tagToPing.bbox;
                      const rectX = x1 * scale;
                      const rectY = viewport.height - (y2 * scale);
                      const rectWidth = (x2 - x1) * scale;
                      const rectHeight = (y2 - y1) * scale;
                      
                      const paddings = [10, 20, 30];

                      return (
                        <g style={{ pointerEvents: 'none' }}>
                            {paddings.map((padding, index) => (
                                <rect
                                    key={index}
                                    x={rectX - padding}
                                    y={rectY - padding}
                                    width={rectWidth + padding * 2}
                                    height={rectHeight + padding * 2}
                                    className="fill-none stroke-red-500 ping-highlight-box"
                                    rx="4"
                                />
                            ))}
                        </g>
                      );
                    })()}

                    {/* Descriptions */}
                    {descriptions.filter(desc => desc.page === currentPage).map(desc => {
                      const { x1, y1, x2, y2 } = desc.bbox;
                      const rectX = x1 * scale;
                      const rectY = viewport.height - (y2 * scale);
                      const rectWidth = (x2 - x1) * scale;
                      const rectHeight = (y2 - y1) * scale;
                      const isSelected = selectedDescriptionIds.includes(desc.id);

                      return (
                        <g key={desc.id}>
                          <rect
                            x={rectX}
                            y={rectY}
                            width={rectWidth}
                            height={rectHeight}
                            className={`cursor-pointer stroke-2 ${isSelected ? 'fill-purple-500/30 stroke-purple-400' : 'fill-purple-500/15 stroke-purple-500'} hover:fill-purple-500/25`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const isMultiSelect = e.ctrlKey || e.metaKey;
                              if (isMultiSelect) {
                                if (isSelected) {
                                  setSelectedDescriptionIds(prev => prev.filter(id => id !== desc.id));
                                } else {
                                  setSelectedDescriptionIds(prev => [...prev, desc.id]);
                                }
                              } else {
                                setSelectedDescriptionIds([desc.id]);
                              }
                            }}
                            rx="3"
                          />
                        </g>
                      );
                    })}

                    {/* Pinged Description highlight */}
                    {pingedDescriptionId && (() => {
                      const descToPing = descriptions.find(d => d.id === pingedDescriptionId);
                      if (!descToPing || descToPing.page !== currentPage) {
                        return null;
                      }

                      const { x1, y1, x2, y2 } = descToPing.bbox;
                      const rectX = x1 * scale;
                      const rectY = viewport.height - (y2 * scale);
                      const rectWidth = (x2 - x1) * scale;
                      const rectHeight = (y2 - y1) * scale;
                      
                      const paddings = [10, 20, 30];

                      return (
                        <g style={{ pointerEvents: 'none' }}>
                            {/* Background highlight */}
                            <rect
                                x={rectX - 5}
                                y={rectY - 5}
                                width={rectWidth + 10}
                                height={rectHeight + 10}
                                className="fill-purple-300 opacity-20"
                                rx="4"
                            />
                            {/* Animated rings */}
                            {paddings.map((padding, index) => (
                                <rect
                                    key={index}
                                    x={rectX - padding}
                                    y={rectY - padding}
                                    width={rectWidth + padding * 2}
                                    height={rectHeight + padding * 2}
                                    className="fill-none stroke-purple-400 ping-highlight-box"
                                    strokeWidth="3"
                                    rx="4"
                                />
                            ))}
                        </g>
                      );
                    })()}

                    {selectionRect && <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className={`stroke-2 ${mode === 'manualCreate' ? 'fill-green-400/20 stroke-green-400' : 'fill-sky-400/20 stroke-sky-400'}`} />}
                </svg>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
