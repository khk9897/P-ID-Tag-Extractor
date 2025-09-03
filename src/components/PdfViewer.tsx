import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { RelationshipType, Category } from '../types.ts';
import { CATEGORY_COLORS, DEFAULT_COLORS } from '../constants.ts';
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
  selectedEquipmentShortSpecIds,
  setSelectedEquipmentShortSpecIds,
  rawTextItems,
  descriptions,
  equipmentShortSpecs,
  onCreateTag,
  onCreateDescription,
  onCreateHoldDescription,
  onCreateEquipmentShortSpec,
  selectedRawTextItemIds,
  setSelectedRawTextItemIds,
  onDeleteTags,
  onMergeRawTextItems,
  onManualCreateLoop,
  onManualAreaSelect,
  // Viewer state from props
  scale,
  setScale,
  mode,
  setMode,
  relationshipStartTag,
  setRelationshipStartTag,
  visibilitySettings,
  updateVisibilitySettings,
  pingedTagId,
  pingedDescriptionId,
  pingedEquipmentShortSpecId,
  pingedRelationshipId,
  colorSettings,
  scrollToCenter,
  setScrollToCenter,
}) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const isClickOnItem = useRef(false); // Ref to track if mousedown was on an item
  
  const [viewport, setViewport] = useState(null);
  const [rotation, setRotation] = useState(0);
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

  // Use colorSettings with fallback to DEFAULT_COLORS and ensure all properties exist
  const colors = {
    entities: { ...DEFAULT_COLORS.entities, ...(colorSettings?.entities || {}) },
    relationships: { ...DEFAULT_COLORS.relationships, ...(colorSettings?.relationships || {}) },
    highlights: { ...DEFAULT_COLORS.highlights, ...(colorSettings?.highlights || {}) }
  };

  // Helper function to get entity color
  const getEntityColor = useCallback((category) => {
    switch (category) {
      case Category.Equipment:
        return colors.entities.equipment;
      case Category.Line:
        return colors.entities.line;
      case Category.Instrument:
        return colors.entities.instrument;
      case Category.DrawingNumber:
        return colors.entities.drawingNumber;
      case Category.NotesAndHolds:
        return colors.entities.notesAndHolds;
      default:
        return colors.entities.uncategorized;
    }
  }, [colors]);

  // Helper function to get relationship color
  const getRelationshipColor = useCallback((type) => {
    switch (type) {
      case RelationshipType.Connection:
        return colors.relationships.connection;
      case RelationshipType.Installation:
        return colors.relationships.installation;
      case RelationshipType.Annotation:
        return colors.relationships.annotation;
      case RelationshipType.Note:
        return colors.relationships.note;
      default:
        return '#94a3b8'; // Default slate color
    }
  }, [colors]);

  // Helper function to check if a tag should be visible
  const isTagVisible = useCallback((tag) => {
    switch (tag.category) {
      case Category.Equipment:
        return visibilitySettings.tags.equipment;
      case Category.Line:
        return visibilitySettings.tags.line;
      case Category.Instrument:
        return visibilitySettings.tags.instrument;
      case Category.DrawingNumber:
        return visibilitySettings.tags.drawingNumber;
      case Category.NotesAndHolds:
        return visibilitySettings.tags.notesAndHolds;
      default:
        return true;
    }
  }, [visibilitySettings.tags]);

  // Helper function to check if a relationship should be visible
  const isRelationshipVisible = useCallback((relationship) => {
    switch (relationship.type) {
      case RelationshipType.Connection:
        return visibilitySettings.relationships.connection;
      case RelationshipType.Installation:
        return visibilitySettings.relationships.installation;
      case RelationshipType.Annotation:
        return visibilitySettings.relationships.annotation;
      case RelationshipType.Note:
        return visibilitySettings.relationships.note;
      case RelationshipType.Description:
        return visibilitySettings.relationships.description;
      case RelationshipType.EquipmentShortSpec:
        return visibilitySettings.relationships.equipmentShortSpec;
      default:
        return true;
    }
  }, [visibilitySettings.relationships]);

  const isMoved = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ scrollX: 0, scrollY: 0, clientX: 0, clientY: 0 });

  const renderTaskRef = useRef(null);
  const isRendering = useRef(false);

  const renderPage = useCallback(async (pageNumber) => {
    if (!pdfDoc) return;

    // Cancel any existing render task first
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      renderTaskRef.current = null;
    }

    // If already rendering, wait for it to complete
    if (isRendering.current) {
      // Wait for the rendering flag to be cleared
      let waitCount = 0;
      while (isRendering.current && waitCount < 50) { // Max 500ms wait
        await new Promise(resolve => setTimeout(resolve, 10));
        waitCount++;
      }
    }

    // Set rendering flag
    isRendering.current = true;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      
      // Get viewport with original rotation preserved
      const vp = page.getViewport({ scale });
      
      console.log('PDF page info:', {
        rotation: vp.rotation,
        width: vp.width,
        height: vp.height,
        transform: vp.transform
      });

      const canvas = canvasRef.current;
      if (!canvas) {
        isRendering.current = false;
        return;
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        isRendering.current = false;
        return;
      }

      // Set canvas dimensions first
      canvas.height = vp.height;
      canvas.width = vp.width;
      
      // Clear the canvas after setting dimensions
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: vp,
      };
      
      // Create new render task
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      
      // Only set viewport after successful rendering
      setViewport(vp);
      setRotation(vp.rotation);
      
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('PDF rendering error:', error);
      }
    } finally {
      // Always clean up
      renderTaskRef.current = null;
      isRendering.current = false;
    }
  }, [pdfDoc, scale]);

  useLayoutEffect(() => {
    renderPage(currentPage);
    
    // Cleanup function to cancel render task on unmount or dependency change
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }
      isRendering.current = false;
    };
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


  // Handle scrollToCenter requests
  useEffect(() => {
    if (scrollToCenter && viewport && scrollContainerRef.current) {
      const { tagId, descriptionId, equipmentShortSpecId, x, y } = scrollToCenter;
      
      // Find the item to get its coordinates if not provided
      let centerX = x;
      let centerY = y;
      
      if (tagId && (!x || !y)) {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
          const { x1, y1, x2, y2 } = tag.bbox;
          const pdfCenterX = (x1 + x2) / 2;
          const pdfCenterY = (y1 + y2) / 2;
          
          // Transform PDF coordinates to screen coordinates
          const screenCenter = transformPdfCoordinates(pdfCenterX, pdfCenterY);
          centerX = screenCenter.x;
          centerY = screenCenter.y;
        }
      } else if (descriptionId && (!x || !y)) {
        const description = descriptions.find(d => d.id === descriptionId);
        if (description) {
          const { x1, y1, x2, y2 } = description.bbox;
          const pdfCenterX = (x1 + x2) / 2;
          const pdfCenterY = (y1 + y2) / 2;
          
          // Transform PDF coordinates to screen coordinates
          const screenCenter = transformPdfCoordinates(pdfCenterX, pdfCenterY);
          centerX = screenCenter.x;
          centerY = screenCenter.y;
        }
      } else if (equipmentShortSpecId && (!x || !y)) {
        const spec = equipmentShortSpecs.find(s => s.id === equipmentShortSpecId);
        if (spec) {
          const { x1, y1, x2, y2 } = spec.bbox;
          const pdfCenterX = (x1 + x2) / 2;
          const pdfCenterY = (y1 + y2) / 2;
          
          // Transform PDF coordinates to screen coordinates
          const screenCenter = transformPdfCoordinates(pdfCenterX, pdfCenterY);
          centerX = screenCenter.x;
          centerY = screenCenter.y;
        }
      }
      
      if (centerX !== undefined && centerY !== undefined) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scroll position to center the target
        const targetScrollLeft = centerX - containerRect.width / 2;
        const targetScrollTop = centerY - containerRect.height / 2;
        
        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [scrollToCenter, viewport, tags, descriptions, equipmentShortSpecs]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      
      if (e.key === '1') {
        setScale(s => Math.max(0.25, s - 0.25));
        e.preventDefault();
      } else if (e.key === '2') {
        setScale(s => Math.min(10, s + 0.25));
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTagIds.length > 0) {
          e.preventDefault(); // Prevent browser back navigation on Backspace
          onDeleteTags(selectedTagIds);
          setSelectedTagIds([]);
        }
      } else if (e.key.toLowerCase() === 'c') {
        // If multiple tags are selected (2 or more), create sequential connections
        if (selectedTagIds.length >= 2) {
          e.preventDefault();
          
          console.log('Creating sequential connections for:', selectedTagIds.length, 'tags');
          
          // Get selected tags in selection order (not sorted)
          const selectedTags = selectedTagIds
            .map(id => tags.find(tag => tag.id === id))
            .filter(tag => !!tag);
          
          console.log('Found tags:', selectedTags.map(t => `${t.text} (page ${t.page})`));
          
          // Create sequential relationships: A→B, B→C, C→D, etc.
          const newRelationships = [];
          for (let i = 0; i < selectedTags.length - 1; i++) {
            const fromTag = selectedTags[i];
            const toTag = selectedTags[i + 1];
            
            console.log(`Creating connection: ${fromTag.text} (page ${fromTag.page}) → ${toTag.text} (page ${toTag.page})`);
            
            // Check if relationship already exists
            const existsAlready = relationships.some(r => 
              r.from === fromTag.id && r.to === toTag.id && r.type === RelationshipType.Connection
            );
            
            if (!existsAlready) {
              newRelationships.push({
                id: uuidv4(),
                from: fromTag.id,
                to: toTag.id,
                type: RelationshipType.Connection,
              });
            } else {
              console.log('Relationship already exists');
            }
          }
          
          console.log('New relationships to create:', newRelationships.length);
          
          if (newRelationships.length > 0) {
            setRelationships(prev => [...prev, ...newRelationships]);
            console.log('Sequential connections created successfully');
          }
          
          // Clear selection after creating relationships
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        } else {
          // Original behavior for 0-1 selected tags: toggle connect mode
          console.log('Toggling connect mode, selected tags:', selectedTagIds.length);
          if (mode === 'connect') {
            setMode('select');
            setRelationshipStartTag(null);
          } else {
            setMode('connect');
            setRelationshipStartTag(null);
            setSelectedTagIds([]);
            setSelectedRawTextItemIds([]);
          }
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
        if (selectedRawTextItemIds.length >= 2) {
          onMergeRawTextItems(selectedRawTextItemIds);
          setSelectedRawTextItemIds([]);
        } else {
          alert("The 'M' hotkey merges multiple selected text items into one. Select at least 2 text items first.");
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
      } else if (e.key.toLowerCase() === 'h') {
        const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => selectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        if (allSelectedItems.length > 0) {
          onCreateHoldDescription(allSelectedItems);
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        } else {
          alert("Select tags or text items first, then press 'H' to create a hold description.");
        }
      } else if (e.key.toLowerCase() === 'p') {
        const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => selectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        // Check if exactly one Equipment tag is selected
        const equipmentTags = selectedTags.filter(tag => tag.category === Category.Equipment);
        
        if (equipmentTags.length === 1 && allSelectedItems.length > 1) {
          onCreateEquipmentShortSpec(allSelectedItems);
          setSelectedTagIds([]);
          setSelectedRawTextItemIds([]);
        } else if (equipmentTags.length === 0) {
          alert("Select exactly one Equipment tag and some text items, then press 'P' to create an Equipment Short Spec.");
        } else if (equipmentTags.length > 1) {
          alert("Select only one Equipment tag to create an Equipment Short Spec.");
        } else {
          alert("Select an Equipment tag and some text items, then press 'P' to create an Equipment Short Spec.");
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
      } else if (e.key.toLowerCase() === 'l' && mode === 'select' && selectedTagIds.length >= 2) {
        const selectedInstrumentTags = tags.filter(t => 
          selectedTagIds.includes(t.id) && t.category === Category.Instrument
        );
        
        if (selectedInstrumentTags.length >= 2) {
          if (onManualCreateLoop) {
            onManualCreateLoop(selectedTagIds);
            setSelectedTagIds([]);
          }
        } else {
          console.warn('To create a loop, please select at least 2 instrument tags.');
        }
      } else if (e.key.toLowerCase() === 'v') {
        // Toggle all relationships visibility
        const allRelationshipsVisible = Object.values(visibilitySettings.relationships).every(Boolean);
        const newState = !allRelationshipsVisible;
        updateVisibilitySettings({
          relationships: {
            connection: newState,
            installation: newState,
            annotation: newState,
            note: newState,
            description: newState,
            equipmentShortSpec: newState,
          },
        });
      } else if (e.key.toLowerCase() === 'q' && pdfDoc) {
        // Previous page
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key.toLowerCase() === 'w' && pdfDoc) {
        // Next page
        setCurrentPage(prev => Math.min(pdfDoc.numPages, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedTagIds, tags, relationships, setRelationships, setSelectedTagIds, rawTextItems, selectedRawTextItemIds, onCreateTag, onCreateDescription, onCreateHoldDescription, setSelectedRawTextItemIds, onDeleteTags, onMergeRawTextItems, onManualCreateLoop, setMode, setRelationshipStartTag, scale, pdfDoc, setCurrentPage]);
  
  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleWheelEvent = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.25 : 0.25;
        setScale(prevScale => Math.min(10, Math.max(0.25, prevScale + zoomDelta)));
      }
    };

    viewer.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      viewer.removeEventListener('wheel', handleWheelEvent);
    };
  }, [scale]);

  useLayoutEffect(() => {
    if (selectedTagIds.length === 1 && scrollContainerRef.current && viewport) {
      const tagId = selectedTagIds[0];
      const tag = tags.find(t => t.id === tagId);

      if (tag && tag.page === currentPage) {
        // Use the unified scrollToCenter approach with proper rotation handling
        setTimeout(() => {
          setScrollToCenter({ tagId: tag.id, timestamp: Date.now() });
          setTimeout(() => setScrollToCenter(null), 100);
        }, 50);
      }
    }
  }, [selectedTagIds, currentPage, viewport, tags, scale, setScrollToCenter]);

  // Auto-scroll to pinged tag - now handled by scrollToCenter in Workspace
  // This useLayoutEffect is no longer needed as pinged tag scrolling is handled by scrollToCenter

  // Auto-scroll to selected description
  useLayoutEffect(() => {
    if (selectedDescriptionIds.length === 1 && scrollContainerRef.current && viewport) {
      const descriptionId = selectedDescriptionIds[0];
      const description = descriptions.find(d => d.id === descriptionId);
      if (description && description.page === currentPage) {
        // Use the unified scrollToCenter approach with proper rotation handling
        setTimeout(() => {
          setScrollToCenter({ descriptionId: description.id, timestamp: Date.now() });
          setTimeout(() => setScrollToCenter(null), 100);
        }, 50);
      }
    }
  }, [selectedDescriptionIds, descriptions, currentPage, viewport, scale, setScrollToCenter]);

  // Auto-scroll to selected equipment short spec
  useLayoutEffect(() => {
    if (selectedEquipmentShortSpecIds.length === 1 && scrollContainerRef.current && viewport) {
      const specId = selectedEquipmentShortSpecIds[0];
      const spec = equipmentShortSpecs.find(s => s.id === specId);
      if (spec && spec.page === currentPage) {
        // Use the unified scrollToCenter approach with proper rotation handling
        setTimeout(() => {
          setScrollToCenter({ equipmentShortSpecId: spec.id, timestamp: Date.now() });
          setTimeout(() => setScrollToCenter(null), 100);
        }, 50);
      }
    }
  }, [selectedEquipmentShortSpecIds, equipmentShortSpecs, currentPage, viewport, scale, setScrollToCenter]);

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
        const startTag = tags.find(t => t.id === tagId);
        console.log('Setting relationship start tag:', startTag?.text, '(page', startTag?.page, ')');
        setRelationshipStartTag(tagId);
      } else if (relationshipStartTag !== tagId) {
        const startTag = tags.find(t => t.id === relationshipStartTag);
        const endTag = tags.find(t => t.id === tagId);
        console.log(`Creating connection in connect mode: ${startTag?.text} (page ${startTag?.page}) → ${endTag?.text} (page ${endTag?.page})`);
        
        setRelationships(prev => [
          ...prev,
          {
            id: uuidv4(),
            from: relationshipStartTag,
            to: tagId,
            type: RelationshipType.Connection,
          },
        ]);
        console.log('Connection created successfully');
        // For continuous connection, the destination tag becomes the new start tag.
        setRelationshipStartTag(tagId);
      }
    }
  };

  const handleRawTextItemMouseDown = (e, rawTextItemId) => {
    e.stopPropagation();
    isClickOnItem.current = true;
    const isMultiSelect = e.ctrlKey || e.metaKey;

    // Find the clicked item and log its coordinates for instrument tag debugging
    const clickedItem = rawTextItems.find(item => item.id === rawTextItemId);
    if (clickedItem) {
        console.log(`🎯 [INSTRUMENT DEBUG] Selected text: "${clickedItem.text}"`);
        console.log(`📍 Coordinates: X=${clickedItem.bbox.x1.toFixed(1)}-${clickedItem.bbox.x2.toFixed(1)}, Y=${clickedItem.bbox.y1.toFixed(1)}-${clickedItem.bbox.y2.toFixed(1)}`);
        console.log(`📄 Page: ${clickedItem.page}`);
        
        // Check if it matches instrument patterns
        const funcPattern = /^[A-Z]{2,4}$/;
        const numPattern = /^\d{3,4}(?:\s?[A-Z])?$/;
        
        if (funcPattern.test(clickedItem.text)) {
            console.log(`🔤 Type: FUNCTION pattern (${clickedItem.text})`);
        } else if (numPattern.test(clickedItem.text)) {
            console.log(`🔢 Type: NUMBER pattern (${clickedItem.text})`);
        } else {
            console.log(`❓ Type: OTHER (doesn't match instrument patterns)`);
        }
        console.log(`────────────────────────────────`);
    }

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

  // Show all tags for interaction, but apply different styling based on visibility
  const currentTags = tags.filter(t => t.page === currentPage);
  const currentRawTextItems = rawTextItems.filter(t => t.page === currentPage);

 const handleViewerMouseDown = (e) => {
    if (
      (e.target as Element).closest('[data-tag-id]') ||
      (e.target as Element).closest('[data-raw-text-id]') ||
      (e.target as Element).closest('[data-equipment-short-spec-id]')
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
    if (!viewport || !tag || !tag.bbox) return { x: 0, y: 0 };
    
    // Get the center coordinates in PDF coordinate system
    const pdfCenterX = (tag.bbox.x1 + tag.bbox.x2) / 2;
    const pdfCenterY = (tag.bbox.y1 + tag.bbox.y2) / 2;
    
    // Transform based on rotation
    let screenX, screenY;
    
    switch (rotation) {
      case 90:
        screenX = pdfCenterY * scale;
        screenY = pdfCenterX * scale;
        break;
      case 180:
        screenX = (viewport.width / scale - pdfCenterX) * scale;
        screenY = (viewport.height / scale - pdfCenterY) * scale;
        break;
      case 270:
        screenX = (viewport.height / scale - pdfCenterY) * scale;
        screenY = pdfCenterX * scale;
        break;
      default: // 0 degrees
        screenX = pdfCenterX * scale;
        screenY = viewport.height - (pdfCenterY * scale);
        break;
    }
    
    return { x: screenX, y: screenY };
  };

  const currentRelationships = relationships.filter(r => {
    // First check if this relationship type should be visible
    if (!isRelationshipVisible(r)) return false;
    
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
      
      // Get the center coordinates in PDF coordinate system
      const pdfCenterX = (item.bbox.x1 + item.bbox.x2) / 2;
      const pdfCenterY = (item.bbox.y1 + item.bbox.y2) / 2;
      
      // Transform based on rotation
      let screenX, screenY;
      
      switch (rotation) {
        case 90:
          screenX = pdfCenterY * scale;
          screenY = pdfCenterX * scale;
          break;
        case 180:
          screenX = (viewport.width / scale - pdfCenterX) * scale;
          screenY = (viewport.height / scale - pdfCenterY) * scale;
          break;
        case 270:
          screenX = (viewport.height / scale - pdfCenterY) * scale;
          screenY = pdfCenterX * scale;
          break;
        default: // 0 degrees
          screenX = pdfCenterX * scale;
          screenY = viewport.height - (pdfCenterY * scale);
          break;
      }
      
      return { x: screenX, y: screenY };
  }

  // Helper function to transform PDF coordinates to screen coordinates
  const transformPdfCoordinates = (pdfCenterX, pdfCenterY) => {
    if (!viewport) return { x: 0, y: 0 };
    
    let screenX, screenY;
    
    switch (rotation) {
      case 90:
        screenX = pdfCenterY * scale;
        screenY = pdfCenterX * scale;
        break;
      case 180:
        screenX = (viewport.width / scale - pdfCenterX) * scale;
        screenY = (viewport.height / scale - pdfCenterY) * scale;
        break;
      case 270:
        screenX = (viewport.height / scale - pdfCenterY) * scale;
        screenY = viewport.width - (pdfCenterX * scale);
        break;
      default: // 0 degrees
        screenX = pdfCenterX * scale;
        screenY = viewport.height - (pdfCenterY * scale);
        break;
    }
    
    return { x: screenX, y: screenY };
  }

  // Helper function to transform PDF coordinates to screen coordinates
  const transformCoordinates = (x1, y1, x2, y2) => {
    if (!viewport) return { rectX: 0, rectY: 0, rectWidth: 0, rectHeight: 0 };
    
    let rectX, rectY, rectWidth, rectHeight;
    
    switch (rotation) {
      case 90:
        // For 90-degree rotation, coordinates are already swapped in taggingService
        // Use them directly without additional transformation
        rectX = x1 * scale;
        rectY = y1 * scale;
        rectWidth = (x2 - x1) * scale;
        rectHeight = (y2 - y1) * scale;
        break;
      case 180:
        rectX = (viewport.width / scale - x2) * scale;
        rectY = (viewport.height / scale - y2) * scale;
        rectWidth = (x2 - x1) * scale;
        rectHeight = (y2 - y1) * scale;
        break;
      case 270:
        rectX = (viewport.height / scale - y2) * scale;
        rectY = x1 * scale;
        rectWidth = (y2 - y1) * scale;
        rectHeight = (x2 - x1) * scale;
        break;
      default: // 0 degrees
        rectX = x1 * scale;
        rectY = viewport.height - (y2 * scale);
        rectWidth = (x2 - x1) * scale;
        rectHeight = (y2 - y1) * scale;
        break;
    }
    
    return { rectX, rectY, rectWidth, rectHeight };
  };

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
                    <marker id="arrowhead-connect" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={colors.relationships.connection} /></marker>
                    <marker id="arrowhead-install" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={colors.relationships.installation} /></marker>
                    </defs>

                    {currentRawTextItems.map(item => {
                         const { x1, y1, x2, y2 } = item.bbox;
                         const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                         const isSelected = selectedRawTextItemIds.includes(item.id);
                         const isHighlighted = highlightedRawTextItemIds.has(item.id);
                         const isLinked = linkedRawTextItemIds.has(item.id);
                         
                         const getRectProps = () => {
                             if (isSelected) {
                                 return { 
                                     fill: "rgb(56 189 248 / 0.5)", 
                                     stroke: "#38bdf8",
                                     strokeWidth: "2.5", 
                                     strokeDasharray: "none" 
                                 };
                             }
                             if (isHighlighted) {
                                 // 태그 선택 시 관련 Raw Text 강조 - 진한 보라색
                                 return { 
                                     fill: "rgb(139 69 255 / 0.6)", // Violet with 60% opacity
                                     stroke: "#8b5cf6",
                                     strokeWidth: "2.5", 
                                     strokeDasharray: "none" 
                                 };
                             }
                             if (isLinked) {
                                // Annotation 연결된 상태 - 매우 연한 보라색
                                return { 
                                    fill: `${colors.relationships.annotation}4D`, // 30% opacity
                                    stroke: colors.relationships.annotation,
                                    strokeWidth: "1.5", 
                                    strokeDasharray: "none"
                                };
                             }
                             return { 
                                 fill: "transparent",
                                 stroke: "#64748b",
                                 strokeWidth: "2", 
                                 strokeDasharray: "3 3",
                                 className: "group-hover:stroke-sky-400 group-hover:fill-sky-400/30 transition-all"
                             };
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
                    
                    {currentRelationships.map(rel => {
                        const fromTag = tags.find(t => t.id === rel.from);
                        if (!fromTag) return null;
                        
                        const start = getTagCenter(fromTag);
                        let end, strokeColor, marker;
                        
                        if (rel.type === RelationshipType.Annotation) {
                            const toItem = rawTextItems.find(i => i.id === rel.to);
                            if (!toItem) return null;
                            end = getAnnotationTargetCenter(rel.to);
                            strokeColor = getRelationshipColor(rel.type);
                            marker = '';
                        } else {
                            const toTag = tags.find(t => t.id === rel.to);
                            if (!toTag) return null;
                            end = getTagCenter(toTag);
                            
                            strokeColor = getRelationshipColor(rel.type);
                            if (rel.type === RelationshipType.Connection) {
                                marker = 'url(#arrowhead-connect)';
                            } else if (rel.type === RelationshipType.Installation) {
                                marker = 'url(#arrowhead-install)';
                            } else {
                                marker = '';
                            }
                        }

                        // Check if this relationship should be highlighted
                        const isPinged = pingedRelationshipId === rel.id;
                        const lineStrokeWidth = isPinged ? '4' : '2';
                        const lineStrokeColor = isPinged ? '#ef4444' : strokeColor; // red-500 for pinged
                        const dashArray = isPinged ? 'none' : (rel.type === RelationshipType.Annotation || rel.type === RelationshipType.Note ? '3 3' : 'none');

                        return (
                            <g key={rel.id}>
                                <line 
                                    x1={start.x} 
                                    y1={start.y} 
                                    x2={end.x} 
                                    y2={end.y} 
                                    stroke={lineStrokeColor} 
                                    strokeWidth={lineStrokeWidth} 
                                    strokeDasharray={dashArray} 
                                    markerEnd={marker}
                                    className={isPinged ? 'ping-highlight-line' : ''}
                                />
                                {isPinged && (
                                    <line 
                                        x1={start.x} 
                                        y1={start.y} 
                                        x2={end.x} 
                                        y2={end.y} 
                                        stroke="#ef4444" 
                                        strokeWidth="8" 
                                        strokeOpacity="0.3"
                                        strokeDasharray="none"
                                        className="ping-highlight-line-glow"
                                    />
                                )}
                            </g>
                        );
                    })}
                    
                    {currentTags.map(tag => {
                    const { x1, y1, x2, y2 } = tag.bbox;
                    const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                    const isSelected = selectedTagIds.includes(tag.id);
                    const isRelStart = tag.id === relationshipStartTag;
                    const isRelated = relatedTagIds.has(tag.id);
                    const isVisible = isTagVisible(tag);
                    const colors = CATEGORY_COLORS[tag.category];

                    return (
                        <g key={tag.id} data-tag-id={tag.id} onMouseDown={(e) => handleTagMouseDown(e, tag.id)} className="cursor-pointer">
                        <rect 
                          x={rectX} 
                          y={rectY} 
                          width={rectWidth} 
                          height={rectHeight} 
                          stroke={isVisible ? getEntityColor(tag.category) : 'transparent'}
                          strokeWidth={isVisible ? 3 : 0.5}
                          className="transition-all duration-150" 
                          fill={
                            isVisible 
                              ? `${getEntityColor(tag.category)}66` // Add 40% opacity (66 in hex)
                              : 'rgba(255, 255, 255, 0.003)'
                          } 
                          strokeDasharray={isRelStart ? "4 2" : "none"}
                          style={{ pointerEvents: 'all' }}
                        />
                        {isSelected && (
                          <rect 
                            x={rectX - 4} 
                            y={rectY - 4} 
                            width={rectWidth + 8} 
                            height={rectHeight + 8} 
                            fill="none"
                            stroke={colors.highlights?.selected || DEFAULT_COLORS.highlights.selected} 
                            strokeWidth={isVisible ? "4" : "2"} 
                            strokeDasharray={isVisible ? "none" : "4 4"}
                            opacity={isVisible ? "1" : "0.7"}
                            rx="2" 
                          />
                        )}
                        {isRelated && !isSelected && isVisible && (
                            <rect 
                            x={rectX} 
                            y={rectY} 
                            width={rectWidth} 
                            height={rectHeight} 
                            fill={`${colors.highlights?.noteRelated || DEFAULT_COLORS.highlights.noteRelated}66`} 
                            stroke={colors.highlights?.noteRelated || DEFAULT_COLORS.highlights.noteRelated}
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
                      const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                      
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
                      const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                      const isSelected = selectedDescriptionIds.includes(desc.id);

                      return (
                        <g key={desc.id}>
                          <rect
                            x={rectX}
                            y={rectY}
                            width={rectWidth}
                            height={rectHeight}
                            fill={isSelected ? `${colors.entities?.description || DEFAULT_COLORS.entities.description}4D` : `${colors.entities?.description || DEFAULT_COLORS.entities.description}26`}
                            stroke={colors.entities?.description || DEFAULT_COLORS.entities.description}
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
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
                      const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                      
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

                    {/* Pinged Equipment Short Spec highlight */}
                    {pingedEquipmentShortSpecId && (() => {
                      const specToPing = equipmentShortSpecs.find(s => s.id === pingedEquipmentShortSpecId);
                      if (!specToPing || specToPing.page !== currentPage) {
                        return null;
                      }

                      const { x1, y1, x2, y2 } = specToPing.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                      
                      const paddings = [10, 20, 30];

                      return (
                        <g style={{ pointerEvents: 'none' }}>
                            {/* Background highlight */}
                            <rect
                                x={rectX - 5}
                                y={rectY - 5}
                                width={rectWidth + 10}
                                height={rectHeight + 10}
                                className="fill-orange-300 opacity-20"
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
                                    className="fill-none stroke-orange-400 ping-highlight-box"
                                    strokeWidth="3"
                                    rx="4"
                                />
                            ))}
                        </g>
                      );
                    })()}

                    {/* Equipment Short Specs */}
                    {equipmentShortSpecs.filter(spec => spec.page === currentPage).map(spec => {
                      const { x1, y1, x2, y2 } = spec.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
                      const isSelected = selectedEquipmentShortSpecIds.includes(spec.id);

                      return (
                        <g key={spec.id}>
                          <rect
                            data-equipment-short-spec-id={spec.id}
                            x={rectX}
                            y={rectY}
                            width={rectWidth}
                            height={rectHeight}
                            fill={isSelected ? `${colors.entities?.equipmentShortSpec || DEFAULT_COLORS.entities.equipmentShortSpec}4D` : `${colors.entities?.equipmentShortSpec || DEFAULT_COLORS.entities.equipmentShortSpec}26`}
                            stroke={colors.entities?.equipmentShortSpec || DEFAULT_COLORS.entities.equipmentShortSpec}
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isMultiSelect = e.ctrlKey || e.metaKey;
                              if (isMultiSelect) {
                                if (isSelected) {
                                  setSelectedEquipmentShortSpecIds(prev => prev.filter(id => id !== spec.id));
                                } else {
                                  setSelectedEquipmentShortSpecIds(prev => [...prev, spec.id]);
                                }
                              } else {
                                setSelectedEquipmentShortSpecIds([spec.id]);
                              }
                            }}
                            rx="3"
                          />
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
