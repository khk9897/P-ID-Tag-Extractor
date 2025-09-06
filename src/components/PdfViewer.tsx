import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { RelationshipType, Category } from '../types.ts';
import { CATEGORY_COLORS, DEFAULT_COLORS } from '../constants.ts';
import { TagHighlight, getHighlightTypeFromEntity, getHighlightEffect } from './TagHighlight.tsx';
import { v4 as uuidv4 } from 'uuid';
import { useSidePanelStore } from '../stores/sidePanelStore';
import usePdfViewerStore from '../stores/pdfViewerStore.js';
import useRelationshipRenderStore from '../stores/relationshipRenderStore.js';

// Throttle function for performance
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return (...args) => {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    }
  };
};

// Memoized relationship line component for performance - now using RelationshipRenderStore
const RelationshipLine = React.memo(({ rel, start, end, isPinged }) => {
  const relationshipRenderStore = useRelationshipRenderStore();
  
  const strokeColor = relationshipRenderStore.getRelationshipColor(rel.type);
  const lineStrokeWidth = relationshipRenderStore.getRelationshipStrokeWidth(rel, isPinged);
  const lineStrokeColor = isPinged ? '#ef4444' : strokeColor;
  const dashArray = relationshipRenderStore.getRelationshipStrokeDashArray(rel, isPinged);
  const marker = relationshipRenderStore.getMarkerEnd(rel.type);

  return (
    <g>
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
});

const PdfViewerComponent = ({
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
  onUpdateTagText,
  onUpdateRawTextItemText,
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
  scrollContainerRef,
  showAutoLinkRanges,
  tolerances,
  showAllRelationships,
  setShowAllRelationships,
  showOnlySelectedRelationships,
  setShowOnlySelectedRelationships,
  onOPCTagClick,
}) => {
  // Store hooks - centralized state management
  const pdfViewerStore = usePdfViewerStore();
  const relationshipRenderStore = useRelationshipRenderStore();
  
  // Track component render - reduce frequency for performance
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  
  // Only track every few renders to reduce overhead
  if (renderCountRef.current % 5 === 0) {
    // Performance tracking disabled for optimization
  }
  
  // Use zustand for selection state management - same as TagsPanel
  const {
    selectedTagIds: storeSelectedTagIds,
    actualSelectedRawTextItemIds: storeSelectedRawTextItemIds,
    selectedDescriptionIds: storeSelectedDescriptionIds,
    selectedEquipmentShortSpecIds: storeSelectedEquipmentShortSpecIds,
    tagSelectionSource: storeTagSelectionSource,
    currentPage: storeCurrentPage,
    setSelectedTagIds: storeSetSelectedTagIds,
    actualSetSelectedRawTextItemIds: storeSetSelectedRawTextItemIds,
    setSelectedDescriptionIds: storeSetSelectedDescriptionIds,
    setSelectedEquipmentShortSpecIds: storeSetSelectedEquipmentShortSpecIds,
    setCurrentPage: storeSetCurrentPage
  } = useSidePanelStore();
  
  // Use zustand state if available, otherwise fall back to props for backwards compatibility
  const directSelectedTagIds = useSidePanelStore((state) => state.selectedTagIds);
  const directSelectedRawTextItemIds = useSidePanelStore((state) => state.selectedRawTextItemIds);
  const actualSelectedTagIds = Array.isArray(directSelectedTagIds) ? directSelectedTagIds : (selectedTagIds || []);
  const actualSelectedRawTextItemIds = Array.isArray(directSelectedRawTextItemIds) ? directSelectedRawTextItemIds : (selectedRawTextItemIds || []);
  const actualSelectedDescriptionIds = Array.isArray(storeSelectedDescriptionIds) && storeSelectedDescriptionIds.length > 0 ? storeSelectedDescriptionIds : selectedDescriptionIds;
  const actualSelectedEquipmentShortSpecIds = Array.isArray(storeSelectedEquipmentShortSpecIds) && storeSelectedEquipmentShortSpecIds.length > 0 ? storeSelectedEquipmentShortSpecIds : selectedEquipmentShortSpecIds;
  const actualSetSelectedTagIds = storeSetSelectedTagIds || setSelectedTagIds;
  const actualSetSelectedRawTextItemIds = storeSetSelectedRawTextItemIds || setSelectedRawTextItemIds;
  const actualSetSelectedDescriptionIds = storeSetSelectedDescriptionIds || setSelectedDescriptionIds;
  const actualSetSelectedEquipmentShortSpecIds = storeSetSelectedEquipmentShortSpecIds || setSelectedEquipmentShortSpecIds;
  
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  // Use the ref passed from Workspace, or create a new one if not provided
  const internalScrollRef = scrollContainerRef || useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const isClickOnItem = useRef(false); // Ref to track if mousedown was on an item
  
  // All state now managed by PdfViewerStore and RelationshipRenderStore
  
  // Refs for legacy compatibility
  const scrollTimeoutRef = useRef(null);
  const lastAutoScrollRef = useRef(0);
  const tagSelectionSourceRef = useRef(null);
  const editInputRef = useRef(null);
  
  // Timer for auto-clearing tag selection highlight
  const selectionTimerRef = useRef(null);
  
  // OPC Navigation now handled by RelationshipRenderStore
  
  // OPC Navigation function - now using RelationshipRenderStore
  const handleOpcNavigation = useCallback(() => {
    const opcNavigationData = relationshipRenderStore.opcNavigationData;
    
    if (opcNavigationData) {
      const { targetTagId, targetPage } = opcNavigationData;
      
      // Set pending target for after page change
      relationshipRenderStore.setPendingOpcTarget({ targetTagId, targetPage });
      
      // Navigate to target page
      setCurrentPage(targetPage);
      
      // Clear navigation data
      relationshipRenderStore.clearOpcNavigation();
    }
  }, [relationshipRenderStore, setCurrentPage]);
  
  // Handle OPC target selection after page change - using Stores
  useEffect(() => {
    const pendingOpcTarget = relationshipRenderStore.pendingOpcTarget;
    const viewport = pdfViewerStore.viewport;
    
    if (pendingOpcTarget && currentPage === pendingOpcTarget.targetPage && viewport) {
      const { targetTagId } = pendingOpcTarget;
      
      // Check if target tag exists on current page
      const targetTag = tags.find(t => t.id === targetTagId && t.page === currentPage);
      
      if (targetTag) {
        // Wait for page to render, then select, highlight, and scroll to center
        const timer = setTimeout(() => {
          // Set selection
          actualSetSelectedTagIds([targetTagId], 'viewer');
          
          // Set highlight using PdfViewerStore
          pdfViewerStore.setHighlightedTagIds([targetTagId]);
          
          // Clear pending target AFTER processing is complete
          relationshipRenderStore.setPendingOpcTarget(null);
          
          // Clear highlight after 2 seconds
          setTimeout(() => {
            pdfViewerStore.clearHighlightedTagIds();
          }, 2000);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentPage, relationshipRenderStore.pendingOpcTarget, pdfViewerStore.viewport, tags, actualSetSelectedTagIds, pdfViewerStore, relationshipRenderStore]);
  
  // Highlighting now handled by PdfViewerStore

  // Focus input when editing starts - using PdfViewerStore
  useEffect(() => {
    const editingTagId = pdfViewerStore.editingTagId;
    const editingRawTextId = pdfViewerStore.editingRawTextId;
    
    if ((editingTagId || editingRawTextId) && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [pdfViewerStore.editingTagId, pdfViewerStore.editingRawTextId]);

  // Sync highlighted tags with selected tags - using PdfViewerStore
  useEffect(() => {
    if (Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.length > 0) {
      pdfViewerStore.setHighlightedTagIds(actualSelectedTagIds);
    } else {
      pdfViewerStore.clearHighlightedTagIds();
    }
  }, [actualSelectedTagIds, pdfViewerStore]);

  // Auto-clear tag highlight (not selection) after 3 seconds
  useEffect(() => {
    // Clear existing timer
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }

    // Only set timer if tags are highlighted
    if (highlightedTagIds.size > 0) {
      selectionTimerRef.current = setTimeout(() => {
        pdfViewerStore.clearHighlightedTagIds(); // Clear highlight only
        selectionTimerRef.current = null;
      }, 3000); // 3 seconds
    }

    // Cleanup timer on component unmount
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }
    };
  }, [highlightedTagIds]);

  // Handle editing completion
  const handleEditComplete = useCallback((save = true) => {
    if (save && editingText.trim()) {
      if (editingTagId) {
        onUpdateTagText(editingTagId, editingText.trim());
      } else if (editingRawTextId) {
        onUpdateRawTextItemText(editingRawTextId, editingText.trim());
      }
    }
    
    // Clear editing state
    pdfViewerStore.clearEditing();
  }, [editingTagId, editingRawTextId, editingText, onUpdateTagText, onUpdateRawTextItemText]);

  // Handle input key events
  const handleEditInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditComplete(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditComplete(false);
    }
  }, [handleEditComplete]);

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

  // Helper functions moved to stores (PdfViewerStore and RelationshipRenderStore)

  const isMoved = useRef(false);
  // Panning state now handled by PdfViewerStore

  // Render management refs - still using refs for performance
  const renderTaskRef = useRef(null);
  const renderIdRef = useRef(0);
  const lastRenderedRef = useRef(null);
  
  // Canvas caching now managed by PdfViewerStore

  const renderPage = useCallback(async (pageNumber, isBackground = false) => {
    // Delegate to PdfViewerStore renderPage method
    return await pdfViewerStore.renderPage(
      pdfDoc, pageNumber, scale, isBackground,
      canvasRef, renderIdRef, renderTaskRef, lastRenderedRef, renderQueueRef
    );
  }, [pdfDoc, scale, pdfViewerStore]);

  // Background pre-rendering disabled for performance optimization

  useLayoutEffect(() => {
    // Render current page only (disabled background pre-rendering for performance)
    renderPage(currentPage);
    
    // Cleanup function to cancel render task on unmount or dependency change
    return () => {
      // No pre-render timer to clear
      
      // Invalidate current render ID to cancel any queued renders
      renderIdRef.current++;
      
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }
    };
  }, [currentPage, renderPage, scale]); // Rerender on scale change

  // Clear cache when scale changes to free memory
  useEffect(() => {
    canvasCacheRef.current.clear();
  }, [scale]);

  // Clear selections ONLY when page actually changes
  const prevPageRef = useRef(currentPage);
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      // Page actually changed - clear selections
      actualSetSelectedTagIds([]);
      actualSetSelectedRawTextItemIds([]);
      setRelationshipStartTag(null);
      prevPageRef.current = currentPage;
    }
    
  }, [currentPage]);

  useEffect(() => {
    let newRelatedTagIds = new Set();
    let newHighlightedNoteIds = new Set();

    if (actualSelectedTagIds.length > 0) {
      // For related notes (annotations), show for any selection
      newHighlightedNoteIds = new Set(
        relationships
          .filter(r => r.type === RelationshipType.Annotation && Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(r.from))
          .map(r => r.to)
      );

      // For related instruments (installed on Equipment/Line), only show for single selection
      if (actualSelectedTagIds.length === 1) {
        const selectedTag = tags.find(t => t.id === actualSelectedTagIds[0]);
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
    pdfViewerStore.setHighlightedRawTextItemIds(newHighlightedNoteIds);
  }, [actualSelectedTagIds, relationships, tags]);


  // Scroll logic is now handled in Workspace.tsx

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target as HTMLElement;
      console.log('🎯 PdfViewer handleKeyDown:', e.key, 'target:', target.tagName, 'mode:', mode);
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        console.log('🚫 Ignoring key because input element is focused');
        return;
      }
      
      if (e.key === '1') {
        // Equipment hotkey - trigger manual creation mode
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.Equipment);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.Equipment } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === '2') {
        // Line hotkey
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.Line);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.Line } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === '3') {
        // Special Item hotkey
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.SpecialItem);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.SpecialItem } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === '4') {
        // Instrument hotkey
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.Instrument);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.Instrument } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === '5') {
        // Note/Hold hotkey
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.NotesAndHolds);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.NotesAndHolds } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === '6') {
        // OPC hotkey
        if (actualSelectedRawTextItemIds.length > 0) {
          onCreateTag(rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id)), Category.OffPageConnector);
          actualSetSelectedRawTextItemIds([]);
        } else {
          onManualAreaSelect();
          setTimeout(() => {
            const event = new CustomEvent('manualTagCreate', { detail: { category: Category.OffPageConnector } });
            window.dispatchEvent(event);
          }, 100);
        }
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (actualSelectedTagIds.length > 0) {
          e.preventDefault(); // Prevent browser back navigation on Backspace
          onDeleteTags(actualSelectedTagIds);
          actualSetSelectedTagIds([]);
        }
      } else if (e.key === 'F2') {
        // Edit selected tag or raw text
        if (actualSelectedTagIds.length === 1) {
          const tagId = actualSelectedTagIds[0];
          const tag = tags.find(t => t.id === tagId);
          if (tag) {
            pdfViewerStore.setEditingTagId(tagId);
            pdfViewerStore.setEditingText(tag.text);
          }
        } else if (actualSelectedRawTextItemIds.length === 1) {
          const rawId = actualSelectedRawTextItemIds[0];
          const rawItem = rawTextItems.find(r => r.id === rawId);
          if (rawItem) {
            pdfViewerStore.setEditingRawTextId(rawId);
            pdfViewerStore.setEditingText(rawItem.text);
          }
        }
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'c') {
        // If multiple tags are selected (2 or more), create sequential connections
        if (actualSelectedTagIds.length >= 2) {
          e.preventDefault();
          
          
          // Get selected tags in selection order (not sorted)
          const selectedTags = actualSelectedTagIds
            .map(id => tags.find(tag => tag.id === id))
            .filter(tag => !!tag);
          
          
          // Create sequential relationships: A→B, B→C, C→D, etc.
          const newRelationships = [];
          for (let i = 0; i < selectedTags.length - 1; i++) {
            const fromTag = selectedTags[i];
            const toTag = selectedTags[i + 1];
            
            
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
            }
          }
          
          
          if (newRelationships.length > 0) {
            setRelationships(prev => [...prev, ...newRelationships]);
          }
          
          // Clear selection after creating relationships
          actualSetSelectedTagIds([]);
          console.log('🔴 R key: Clearing actualSelectedRawTextItemIds after relationship creation');
          actualSetSelectedRawTextItemIds([]);
        } else {
          // Original behavior for 0-1 selected tags: toggle connect mode
          if (mode === 'connect') {
            setMode('select');
            setRelationshipStartTag(null);
          } else {
            setMode('connect');
            // If exactly one tag is selected, use it as the start tag
            if (actualSelectedTagIds.length === 1) {
              const startTag = tags.find(t => t.id === actualSelectedTagIds[0]);
              setRelationshipStartTag(actualSelectedTagIds[0]);
              // Keep the selection to show visually
            } else {
              setRelationshipStartTag(null);
              actualSetSelectedTagIds([]);
            }
            actualSetSelectedRawTextItemIds([]);
          }
        }
      } else if (e.key.toLowerCase() === 'k') {
        if (mode === 'manualCreate') {
          setMode('select');
        } else {
          setMode('manualCreate');
          setRelationshipStartTag(null);
          actualSetSelectedTagIds([]);
          actualSetSelectedRawTextItemIds([]);
        }
      } else if (e.key === 'Escape') {
        setMode('select');
        setRelationshipStartTag(null);
        actualSetSelectedTagIds([]);
        actualSetSelectedRawTextItemIds([]);
      } else if (e.key.toLowerCase() === 'm') {
        if (actualSelectedRawTextItemIds.length >= 2) {
          onMergeRawTextItems(actualSelectedRawTextItemIds);
          actualSetSelectedRawTextItemIds([]);
        } else {
          alert("The 'M' hotkey merges multiple selected text items into one. Select at least 2 text items first.");
        }
      } else if (e.key.toLowerCase() === 'n') {
        const selectedTags = tags.filter(tag => Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        if (allSelectedItems.length > 0) {
          onCreateDescription(allSelectedItems);
          actualSetSelectedTagIds([]);
          actualSetSelectedRawTextItemIds([]);
        } else {
          alert("Select tags or text items first, then press 'N' to create a description.");
        }
      } else if (e.key.toLowerCase() === 'h') {
        const selectedTags = tags.filter(tag => Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        if (allSelectedItems.length > 0) {
          onCreateHoldDescription(allSelectedItems);
          actualSetSelectedTagIds([]);
          actualSetSelectedRawTextItemIds([]);
        } else {
          alert("Select tags or text items first, then press 'H' to create a hold description.");
        }
      } else if (e.key.toLowerCase() === 'p') {
        console.log('🅿️ P key pressed - Creating Equipment Short Spec');
        console.log('actualSelectedTagIds:', actualSelectedTagIds);
        console.log('actualSelectedRawTextItemIds:', actualSelectedRawTextItemIds);
        console.log('onCreateEquipmentShortSpec:', typeof onCreateEquipmentShortSpec);
        const selectedTags = tags.filter(tag => Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(tag.id));
        const selectedRawItems = rawTextItems.filter(item => actualSelectedRawTextItemIds.includes(item.id));
        const allSelectedItems = [...selectedTags, ...selectedRawItems];
        
        // Check if exactly one Equipment tag is selected
        const equipmentTags = selectedTags.filter(tag => tag.category === Category.Equipment);
        
        if (equipmentTags.length === 1 && allSelectedItems.length > 1) {
          onCreateEquipmentShortSpec(allSelectedItems);
          actualSetSelectedTagIds([]);
          actualSetSelectedRawTextItemIds([]);
        } else if (equipmentTags.length === 0) {
          alert("Select exactly one Equipment tag and some text items, then press 'P' to create an Equipment Short Spec.");
        } else if (equipmentTags.length > 1) {
          alert("Select only one Equipment tag to create an Equipment Short Spec.");
        } else {
          alert("Select an Equipment tag and some text items, then press 'P' to create an Equipment Short Spec.");
        }
      } else if (e.key.toLowerCase() === 'r' && mode === 'select' && (actualSelectedTagIds.length > 0 || actualSelectedRawTextItemIds.length > 0)) {
        console.log('🔴 R key pressed - Creating relationships');
        console.log('mode:', mode);
        console.log('actualSelectedTagIds:', actualSelectedTagIds);
        console.log('actualSelectedRawTextItemIds:', actualSelectedRawTextItemIds);
        const newRelationships = [];
        const selected = tags.filter(t => Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(t.id));
        
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
            for (const rawId of actualSelectedRawTextItemIds) {
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
            actualSetSelectedTagIds([]);
            actualSetSelectedRawTextItemIds([]);
        }
      } else if (e.key.toLowerCase() === 'i' && mode === 'select' && actualSelectedTagIds.length > 1) {
        const selected = tags.filter(t => Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(t.id));
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
          actualSetSelectedTagIds([]);
        } else {
        }
      } else if (e.key.toLowerCase() === 'l' && mode === 'select' && actualSelectedTagIds.length >= 2) {
        const selectedInstrumentTags = tags.filter(t => 
          Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(t.id) && t.category === Category.Instrument
        );
        
        if (selectedInstrumentTags.length >= 2) {
          if (onManualCreateLoop) {
            onManualCreateLoop(actualSelectedTagIds);
            actualSetSelectedTagIds([]);
          }
        } else {
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
  }, [mode, actualSelectedTagIds, tags, relationships, setRelationships, actualSetSelectedTagIds, rawTextItems, actualSelectedRawTextItemIds, onCreateTag, onCreateDescription, onCreateHoldDescription, onCreateEquipmentShortSpec, actualSetSelectedRawTextItemIds, onDeleteTags, onMergeRawTextItems, onManualCreateLoop, setMode, setRelationshipStartTag, scale, pdfDoc, setCurrentPage]);
  
  // Add wheel and scroll event listeners
  useEffect(() => {
    const viewer = viewerRef.current;
    const scrollContainer = internalScrollRef.current;
    if (!viewer) return;

    const handleWheelEvent = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.25 : 0.25;
        setScale(prevScale => Math.min(10, Math.max(0.25, prevScale + zoomDelta)));
      } else {
        // User is manually scrolling - disable auto-scroll temporarily
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 1000); // Wait 1 second after user stops scrolling
      }
    };

    const handleScroll = () => {
      // User is manually scrolling
      setIsUserScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    viewer.addEventListener('wheel', handleWheelEvent, { passive: false });
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      viewer.removeEventListener('wheel', handleWheelEvent);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scale]);

  // Auto-scroll logic is now handled in Workspace.tsx to avoid state synchronization issues

  const handleTagMouseDown = (e, tagId) => {
    e.stopPropagation();
    isClickOnItem.current = true;
    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (mode === 'select') {
      const clickedTag = tags.find(t => t.id === tagId);
      
      
      
      // Check if this is an OPC tag - call onOPCTagClick if provided
      if (clickedTag && clickedTag.category === Category.OffPageConnector && onOPCTagClick) {
        onOPCTagClick(clickedTag.text);
      }
      
      // Check if this is an OPC tag and if it's connected
      if (clickedTag && clickedTag.category === Category.OffPageConnector) {
        const connectedRelationship = relationships.find(rel => 
          rel.type === RelationshipType.OffPageConnection && 
          (rel.from === tagId || rel.to === tagId)
        );
        
        if (connectedRelationship) {
          // Find the connected tag
          const targetTagId = connectedRelationship.from === tagId ? connectedRelationship.to : connectedRelationship.from;
          const targetTag = tags.find(t => t.id === targetTagId);
          
          if (targetTag && targetTag.page !== currentPage) {
            // Show navigation button
            const rect = e.currentTarget.getBoundingClientRect();
            const navigationData = {
              tagId: tagId,
              x: e.clientX,
              y: e.clientY,
              targetTagId: targetTagId,
              targetPage: targetTag.page,
              referenceText: clickedTag.text
            };
            setOpcNavigationButton(navigationData);
          } else {
          }
        }
      }
      
      if (isMultiSelect) {
        // Add to or remove from tag selection without affecting raw text selection
        actualSetSelectedTagIds(prev =>
          prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId], 'viewer'
        );
      } else {
        // A single click replaces the entire selection with just this one tag.
        actualSetSelectedTagIds([tagId], 'viewer');
        actualSetSelectedRawTextItemIds([]);
      }
    } else if (mode === 'connect') {
      if (!relationshipStartTag) {
        const startTag = tags.find(t => t.id === tagId);
        setRelationshipStartTag(tagId);
        // Also select the tag visually to show it's the start point
        actualSetSelectedTagIds([tagId], 'viewer');
      } else if (relationshipStartTag !== tagId) {
        const startTag = tags.find(t => t.id === relationshipStartTag);
        const endTag = tags.find(t => t.id === tagId);
        
        // Check if relationship already exists
        const existsAlready = relationships.some(r => 
          r.from === relationshipStartTag && r.to === tagId && r.type === RelationshipType.Connection
        );
        
        if (!existsAlready) {
          setRelationships(prev => [
            ...prev,
            {
              id: uuidv4(),
              from: relationshipStartTag,
              to: tagId,
              type: RelationshipType.Connection,
            },
          ]);
        } else {
        }
        
        // For continuous connection, the destination tag becomes the new start tag.
        setRelationshipStartTag(tagId);
        // Update selection to show the new start tag
        actualSetSelectedTagIds([tagId], 'viewer');
      }
    }
  };

  const handleRawTextItemMouseDown = (e, rawTextItemId) => {
    e.stopPropagation();
    isClickOnItem.current = true;
    const isMultiSelect = e.ctrlKey || e.metaKey;

    // Debug raw text item selection
    const clickedItem = rawTextItems.find(item => item.id === rawTextItemId);

    if (isMultiSelect) {
        // Add to or remove from raw text selection without affecting tag selection
        actualSetSelectedRawTextItemIds(prev =>
            prev.includes(rawTextItemId) ? prev.filter(id => id !== rawTextItemId) : [...prev, rawTextItemId]
        );
    } else {
        // A single click replaces the entire selection with just this one raw text item.
        actualSetSelectedRawTextItemIds([rawTextItemId]);
        actualSetSelectedTagIds([]);
    }
  };

  
  // Simple direct filtering for current page (no complex caching)
  const currentTags = useMemo(() => {
    return tags.filter(tag => tag.page === currentPage);
  }, [tags, currentPage]);

  const currentRawTextItems = useMemo(() => {
    return rawTextItems.filter(item => item.page === currentPage);
  }, [rawTextItems, currentPage]);
  
  // Memoize current page descriptions for performance
  const currentDescriptions = useMemo(() => 
    descriptions.filter(desc => desc.page === currentPage),
    [descriptions, currentPage]
  );
  
  // Memoize current page equipment short specs for performance
  const currentEquipmentShortSpecs = useMemo(() => 
    equipmentShortSpecs.filter(spec => spec.page === currentPage),
    [equipmentShortSpecs, currentPage]
  );

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
    
    // Hide OPC navigation button on background click
    setOpcNavigationButton(null);
  
    if (mode === 'manualCreate' && viewerRef.current) {
        const rect = viewerRef.current.getBoundingClientRect();
        startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        pdfViewerStore.setIsDragging(true); // this is for selectionRect
        setSelectionRect({ ...startPoint.current, width: 0, height: 0 });
        return; // Prevent other logic from running
    }
    
    const isSelectionModifier = e.ctrlKey || e.metaKey;

    if (isSelectionModifier && mode === 'select' && viewerRef.current) {
        // Area Selection Logic
        const rect = viewerRef.current.getBoundingClientRect();
        startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        pdfViewerStore.setIsDragging(true);
        setSelectionRect({ ...startPoint.current, width: 0, height: 0 });
    } else if (!isSelectionModifier && mode === 'select' && internalScrollRef.current) {
        // Panning Logic
        setIsPanning(true);
        panStart.current = {
            scrollX: internalScrollRef.current.scrollLeft,
            scrollY: internalScrollRef.current.scrollTop,
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

    if (isPanning && internalScrollRef.current) {
      const dx = e.clientX - panStart.current.clientX;
      const dy = e.clientY - panStart.current.clientY;
      internalScrollRef.current.scrollLeft = panStart.current.scrollX - dx;
      internalScrollRef.current.scrollTop = panStart.current.scrollY - dy;
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
        pdfViewerStore.setIsDragging(false);
        setSelectionRect(null);
      }
      return;
    }
      
    if (isPanning) {
      setIsPanning(false);
    }
    
    // A simple click on the background without movement clears selection
    if (!isMoved.current && !isDragging) {
        actualSetSelectedTagIds([]);
        actualSetSelectedRawTextItemIds([]);
    }

    if (!isDragging || !selectionRect || !viewport) {
      if (isDragging) pdfViewerStore.setIsDragging(false);
      return;
    }
    
    if (mode === 'manualCreate') {
        pdfViewerStore.setIsDragging(false);
        // Check for minimal size to avoid accidental clicks
        if (selectionRect.width > 5 && selectionRect.height > 5) {
            const { x, y, width, height } = selectionRect;
            const bbox = {
                x1: x / scale,
                y1: y / scale,
                x2: (x + width) / scale,
                y2: (y + height) / scale,
            };
            onManualAreaSelect(bbox, currentPage);
        }
        setSelectionRect(null);
        setMode('select');
        return;
    }

    pdfViewerStore.setIsDragging(false);
    
    // Area selection can add both tags and raw items
    const intersectingTags = new Set<string>();
    for (const tag of currentTags) {
      const { x1, y1, x2, y2 } = tag.bbox;
      const tagRect = {
        x: x1 * scale,
        y: y1 * scale,
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
        actualSetSelectedTagIds(prev => Array.from(new Set([...prev, ...intersectingTags])), 'viewer');
    } 
    
    const intersectingRawItems = new Set<string>();
    for (const item of currentRawTextItems) {
        const { x1, y1, x2, y2 } = item.bbox;
        const itemRect = {
            x: x1 * scale,
            y: y1 * scale,
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
        actualSetSelectedRawTextItemIds(prev => Array.from(new Set([...prev, ...intersectingRawItems])));
    }

    setSelectionRect(null);
  };
  
  // getTagCenter now handled by PdfViewerStore

  // Create lookup maps for better performance
  const tagsMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);
  const rawTextMap = useMemo(() => new Map(rawTextItems.map(i => [i.id, i])), [rawTextItems]);
  
  // Update visible relationships using RelationshipRenderStore
  useEffect(() => {
    relationshipRenderStore.updateVisibleRelationships(
      relationships, tagsMap, currentPage, visibilitySettings,
      showAllRelationships, showOnlySelectedRelationships, actualSelectedTagIds
    );
  }, [relationships, tagsMap, currentPage, visibilitySettings.relationships, showAllRelationships, showOnlySelectedRelationships, actualSelectedTagIds, relationshipRenderStore]);

  // Get visible relationships from store
  const currentRelationshipsWithData = relationshipRenderStore.visibleRelationships;
  
  // getAnnotationTargetCenter now handled by PdfViewerStore

  // transformPdfCoordinates now handled by PdfViewerStore

  // coordinatesCache and transformCoordinates now handled by PdfViewerStore

  const getModeStyles = () => {
    switch(mode){
      case 'connect': return 'cursor-crosshair ring-2 ring-blue-500';
      case 'manualCreate': return 'cursor-crosshair ring-2 ring-green-500';
      default: return ''; // Inherit grab/grabbing cursor from parent
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={internalScrollRef} className={`h-full w-full overflow-auto ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}>
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
                         const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);
                         const isSelected = actualSelectedRawTextItemIds.includes(item.id);
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
                    
                    {currentRelationshipsWithData.map(({ rel, fromTag, toItem, isAnnotation }) => {
                        if (!fromTag || !toItem) return null;
                        
                        const start = pdfViewerStore.getTagCenter(fromTag, scale);
                        let end, strokeColor, marker;
                        
                        if (isAnnotation) {
                            end = pdfViewerStore.getAnnotationTargetCenter(rel.to, rawTextMap, scale);
                            strokeColor = relationshipRenderStore.getRelationshipColor(rel.type);
                            marker = '';
                        } else {
                            end = pdfViewerStore.getTagCenter(toItem, scale);
                            strokeColor = relationshipRenderStore.getRelationshipColor(rel.type);
                            
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

                        return (
                            <RelationshipLine
                                key={rel.id}
                                rel={rel}
                                start={start}
                                end={end}
                                strokeColor={strokeColor}
                                marker={marker}
                                isPinged={isPinged}
                            />
                        );
                    })}
                    
                    {currentTags.map(tag => {
                    const { x1, y1, x2, y2 } = tag.bbox;
                    const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);
                    const isSelected = Array.isArray(actualSelectedTagIds) && actualSelectedTagIds.includes(tag.id);
                    const isHighlighted = highlightedTagIds.has(tag.id); // Use highlight state for visual feedback
                    const isRelStart = tag.id === relationshipStartTag;
                    const isRelated = relatedTagIds.has(tag.id);
                    const isVisible = pdfViewerStore.isTagVisible(tag, visibilitySettings);
                    const color = pdfViewerStore.getEntityColor(tag.category, colors);

                    return (
                        <g key={tag.id} data-tag-id={tag.id} onMouseDown={(e) => handleTagMouseDown(e, tag.id)} className="cursor-pointer">
                        {tag.category === Category.OffPageConnector ? (
                          // Render OPC tags as circles
                          (() => {
                            // Check if this OPC tag is connected
                            const isConnected = relationships.some(rel => 
                              rel.type === RelationshipType.OffPageConnection && 
                              (rel.from === tag.id || rel.to === tag.id)
                            );
                            
                            const opcColor = isConnected ? '#10b981' : '#ef4444'; // green : red
                            
                            return (
                              <>
                                <circle 
                                  cx={rectX + rectWidth / 2} 
                                  cy={rectY + rectHeight / 2} 
                                  r={Math.max(rectWidth, rectHeight) / 2 + 5} 
                                  stroke={isVisible ? opcColor : 'transparent'}
                                  strokeWidth={isSelected ? "4" : "2"}
                                  className={`transition-all duration-150 ${isHighlighted ? 'animate-pulse' : ''}`}
                                  fill={
                                    isVisible 
                                      ? isSelected 
                                        ? `${opcColor}CC` // 80% opacity when selected
                                        : `${opcColor}33` // 20% opacity when not selected
                                      : 'rgba(255, 255, 255, 0.003)'
                                  } 
                                  strokeDasharray={isRelStart ? "4 2" : "none"}
                                  style={{ pointerEvents: 'all' }}
                                />
                                {/* Selection indicator circle */}
                                {isSelected && isVisible && (
                                  <circle 
                                    cx={rectX + rectWidth / 2} 
                                    cy={rectY + rectHeight / 2} 
                                    r={Math.max(rectWidth, rectHeight) / 2 + 10} 
                                    fill="none"
                                    stroke="#60a5fa"
                                    strokeWidth="2"
                                    strokeOpacity="0.8"
                                  />
                                )}
                                
                                {/* Unified highlight system for OPC tags */}
                                <TagHighlight
                                  bbox={{ x1: rectX, y1: rectY, x2: rectX + rectWidth, y2: rectY + rectHeight }}
                                  type={isRelated && !isHighlighted ? "related" : "primary"}
                                  effect={getHighlightEffect(isSelected || isHighlighted, false, isRelated)}
                                  isSelected={isSelected && isVisible}
                                  isHighlighted={isHighlighted && isVisible}
                                  isMultiSelection={actualSelectedTagIds.length > 1}
                                  colorSettings={colors}
                                />
                              </>
                            );
                          })()
                        ) : (
                          // Render other tags as rectangles
                          <>
                            <rect 
                              x={rectX} 
                              y={rectY} 
                              width={rectWidth} 
                              height={rectHeight} 
                              stroke={isVisible ? pdfViewerStore.getEntityColor(tag.category, colors) : 'transparent'}
                              strokeWidth={isSelected ? "4" : "2"}
                              className="transition-all duration-150"
                              fill={
                                isVisible 
                                  ? isSelected 
                                    ? `${pdfViewerStore.getEntityColor(tag.category, colors)}CC` // 80% opacity when selected
                                    : `${pdfViewerStore.getEntityColor(tag.category, colors)}33` // 20% opacity when not selected
                                  : 'rgba(255, 255, 255, 0.003)'
                              } 
                              strokeDasharray={isRelStart ? "4 2" : "none"}
                              style={{ pointerEvents: 'all' }}
                            />
                            {/* Unified highlight system for regular tags */}
                            <TagHighlight
                              bbox={{ x1: rectX, y1: rectY, x2: rectX + rectWidth, y2: rectY + rectHeight }}
                              type={isRelated && !isHighlighted ? "related" : "primary"}
                              effect={getHighlightEffect(isSelected || isHighlighted, false, isRelated)}
                              isSelected={isSelected && isVisible}
                              isHighlighted={isHighlighted && isVisible}
                              isMultiSelection={actualSelectedTagIds.length > 1}
                              colorSettings={colors}
                            />
                          </>
                        )}
                        </g>
                    );
                    })}

                    {pingedTagId && (() => {
                      const tagToPing = currentTags.find(t => t.id === pingedTagId);
                      if (!tagToPing) return null;
                      
                      const { x1, y1, x2, y2 } = tagToPing.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);

                      return (
                        <TagHighlight
                          bbox={{ x1: rectX, y1: rectY, x2: rectX + rectWidth, y2: rectY + rectHeight }}
                          type="primary"
                          effect="box"
                          isPinged={true}
                          colorSettings={colors}
                        />
                      );
                    })()}

                    {/* Descriptions */}
                    {visibilitySettings.descriptions && currentDescriptions.map(desc => {
                      const { x1, y1, x2, y2 } = desc.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);
                      const isSelected = actualSelectedDescriptionIds.includes(desc.id);

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
                      const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);

                      return (
                        <TagHighlight
                          bbox={{ x1: rectX, y1: rectY, x2: rectX + rectWidth, y2: rectY + rectHeight }}
                          type="description"
                          effect="box"
                          isPinged={true}
                          colorSettings={colors}
                        />
                      );
                    })()}

                    {/* Pinged Equipment Short Spec highlight */}
                    {pingedEquipmentShortSpecId && (() => {
                      const specToPing = equipmentShortSpecs.find(s => s.id === pingedEquipmentShortSpecId);
                      if (!specToPing || specToPing.page !== currentPage) {
                        return null;
                      }
                      
                      const { x1, y1, x2, y2 } = specToPing.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);

                      return (
                        <TagHighlight
                          bbox={{ x1: rectX, y1: rectY, x2: rectX + rectWidth, y2: rectY + rectHeight }}
                          type="equipment"
                          effect="box"
                          isPinged={true}
                          colorSettings={colors}
                        />
                      );
                    })()}

                    {/* Equipment Short Specs */}
                    {visibilitySettings.equipmentShortSpecs && currentEquipmentShortSpecs.map(spec => {
                      const { x1, y1, x2, y2 } = spec.bbox;
                      const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);
                      const isSelected = actualSelectedEquipmentShortSpecIds.includes(spec.id);

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

                    {/* Auto-link Range Circles */}
                    {showAutoLinkRanges && 
                      tolerances && tolerances[Category.Instrument]?.autoLinkDistance && 
                      currentTags.filter(tag => tag.category === Category.Instrument).map(tag => {
                        const autoLinkDistance = tolerances[Category.Instrument].autoLinkDistance;
                        const { x1, y1, x2, y2 } = tag.bbox;
                        const centerX = (x1 + x2) / 2;
                        const centerY = (y1 + y2) / 2;
                        
                        // Simple transformation based on scale only
                        let displayCenterX, displayCenterY, displayRadius;
                        
                        switch (rotation) {
                          case 90:
                            displayCenterX = centerX * scale;
                            displayCenterY = centerY * scale;
                            displayRadius = autoLinkDistance * scale;
                            break;
                          case 180:
                            displayCenterX = (viewport.width - centerX) * scale;
                            displayCenterY = (viewport.height - centerY) * scale;
                            displayRadius = autoLinkDistance * scale;
                            break;
                          case 270:
                            displayCenterX = (viewport.height - centerY) * scale;
                            displayCenterY = centerX * scale;
                            displayRadius = autoLinkDistance * scale;
                            break;
                          default: // 0 degrees
                            displayCenterX = centerX * scale;
                            displayCenterY = centerY * scale;
                            displayRadius = autoLinkDistance * scale;
                            break;
                        }
                        
                        return (
                          <circle
                            key={`range-${tag.id}`}
                            cx={displayCenterX}
                            cy={displayCenterY}
                            r={displayRadius}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.6"
                            pointerEvents="none"
                          />
                        );
                      })
                    }

                    {selectionRect && <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className={`stroke-2 ${mode === 'manualCreate' ? 'fill-green-400/20 stroke-green-400' : 'fill-sky-400/20 stroke-sky-400'}`} />}
                </svg>
                )}

                {/* Inline Editing Overlay */}
                {(editingTagId || editingRawTextId) && (() => {
                  // Find the item being edited
                  let editingItem = null;
                  if (editingTagId) {
                    editingItem = tags.find(t => t.id === editingTagId && t.page === currentPage);
                  } else if (editingRawTextId) {
                    editingItem = rawTextItems.find(r => r.id === editingRawTextId && r.page === currentPage);
                  }

                  if (!editingItem || !viewport) return null;

                  const { x1, y1, x2, y2 } = editingItem.bbox;
                  const { rectX, rectY, rectWidth, rectHeight } = pdfViewerStore.transformCoordinates(x1, y1, x2, y2, scale);

                  return (
                    <div
                      className="absolute bg-white border-2 border-blue-500 rounded shadow-lg z-50 flex items-center gap-1 px-2 py-1"
                      style={{
                        left: rectX,
                        top: rectY - 35, // Position above the item
                        minWidth: Math.max(rectWidth, 120),
                      }}
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => pdfViewerStore.setEditingText(e.target.value)}
                        onKeyDown={handleEditInputKeyDown}
                        className="flex-1 border-none outline-none bg-white text-gray-800 text-sm font-mono px-1 py-0.5"
                        style={{ 
                          fontSize: '13px',
                          color: '#1f2937',
                          backgroundColor: '#ffffff'
                        }}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <button
                        onClick={() => handleEditComplete(true)}
                        className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-700 transition-colors"
                        title="저장 (Enter)"
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditComplete(false)}
                        className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-600 transition-colors"
                        title="취소 (Esc)"
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })()}
            </div>
        </div>
      </div>
      
      {/* OPC Navigation Button */}
      {opcNavigationButton && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: opcNavigationButton.x + 10,
            top: opcNavigationButton.y - 10,
          }}
        >
          <button
            onClick={handleOpcNavigation}
            className="pointer-events-auto bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-200 animate-fade-in"
          >
            <span className="text-sm font-medium">Go to {opcNavigationButton.referenceText}</span>
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">P{opcNavigationButton.targetPage}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// Export memoized component for better performance
export const PdfViewer = React.memo(PdfViewerComponent, (prevProps, nextProps) => {
  // Custom comparison function for critical props only
  // Note: selection states are now managed by zustand, so we compare less props
  return (
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.scale === nextProps.scale &&
    prevProps.mode === nextProps.mode &&
    prevProps.tags === nextProps.tags &&
    prevProps.relationships === nextProps.relationships &&
    prevProps.rawTextItems === nextProps.rawTextItems &&
    prevProps.descriptions === nextProps.descriptions &&
    prevProps.equipmentShortSpecs === nextProps.equipmentShortSpecs &&
    prevProps.visibilitySettings === nextProps.visibilitySettings &&
    prevProps.showAutoLinkRanges === nextProps.showAutoLinkRanges &&
    prevProps.pingedTagId === nextProps.pingedTagId &&
    prevProps.pingedDescriptionId === nextProps.pingedDescriptionId &&
    prevProps.pingedEquipmentShortSpecId === nextProps.pingedEquipmentShortSpecId &&
    prevProps.pingedRelationshipId === nextProps.pingedRelationshipId
  );
});
