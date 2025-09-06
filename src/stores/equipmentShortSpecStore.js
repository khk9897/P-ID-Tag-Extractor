// EquipmentShortSpecStore - Equipment Short Spec 전용 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useEquipmentShortSpecStore = create(
  immer((set, get) => ({
    // State
    equipmentShortSpecs: [],
    
    // Computed values (getters)
    get equipmentShortSpecsByPage() {
      const specs = get().equipmentShortSpecs;
      const byPage = {};
      specs.forEach(spec => {
        if (!byPage[spec.page]) byPage[spec.page] = [];
        byPage[spec.page].push(spec);
      });
      return byPage;
    },
    
    // Actions
    setEquipmentShortSpecs: (specs) => set((state) => {
      state.equipmentShortSpecs = specs;
    }),
    
    createEquipmentShortSpec: (selectedItems, uuidv4) => set((state) => {
      if (!selectedItems || selectedItems.length === 0) return;
      
      // Sort items by position
      const sortedItems = [...selectedItems].sort((a, b) => {
        const yDiff = a.bbox.y1 - b.bbox.y1;
        if (Math.abs(yDiff) > 5) {
          return yDiff;
        }
        return a.bbox.x1 - b.bbox.x1;
      });
      
      const combinedText = sortedItems.map(item => item.text || '').join(' ').trim();
      if (!combinedText) return;
      
      const combinedBbox = selectedItems.reduce((acc, item) => {
        return {
          x1: Math.min(acc.x1, item.bbox.x1),
          y1: Math.min(acc.y1, item.bbox.y1),
          x2: Math.max(acc.x2, item.bbox.x2),
          y2: Math.max(acc.y2, item.bbox.y2),
        };
      }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
      
      const newSpec = {
        id: uuidv4(),
        text: combinedText,
        page: selectedItems[0].page,
        bbox: combinedBbox,
        sourceItems: selectedItems,
        createdAt: Date.now()
      };
      
      state.equipmentShortSpecs.push(newSpec);
    }),

    // 🟢 Complex equipment short spec creation with auto-linking and item removal
    createEquipmentShortSpecFromItems: (selectedItems, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems) => set((state) => {
      if (!selectedItems || selectedItems.length === 0) return;

      // Find Equipment tags - support multiple equipment tags (e.g., A/B/C/D/E)
      const equipmentTags = selectedItems.filter(item => 'category' in item && item.category === 'Equipment');
      
      if (equipmentTags.length === 0) {
        return;
      }

      // Use the first equipment tag as the primary one for metadata
      const primaryEquipmentTag = equipmentTags[0];
      const nonTagItems = selectedItems.filter(item => !('category' in item));

      if (nonTagItems.length === 0) {
        return;
      }

      // Sort all items by Y coordinate (top to bottom)
      const sortedItems = [...selectedItems].sort((a, b) => a.bbox.y1 - b.bbox.y1);
      
      // Sort non-tag items by Y coordinate (top to bottom)
      const sortedNonTagItems = nonTagItems.sort((a, b) => a.bbox.y1 - b.bbox.y1);
      
      // Get the topmost non-Equipment item for Service metadata
      const serviceItem = sortedNonTagItems[0];
      const serviceText = serviceItem ? serviceItem.text : '';
      
      // Exclude the first item (service) from the short spec text content
      const shortSpecItems = sortedNonTagItems.slice(1); // Skip first item (service)
      
      // Merge text content from remaining non-tag items with line breaks for different Y positions
      let text = '';
      let previousY = null;
      const yTolerance = 5; // Y coordinate tolerance for considering items on the same line
      
      for (let i = 0; i < shortSpecItems.length; i++) {
        const item = shortSpecItems[i];
        const currentY = item.bbox.y1;
        
        // Add line break if this item is on a significantly different Y coordinate
        if (previousY !== null && Math.abs(currentY - previousY) > yTolerance) {
          text += '\n';
        } else if (text.length > 0 && !text.endsWith('\n')) {
          // Add space if on same line and not first item
          text += ' ';
        }
        
        text += item.text;
        previousY = currentY;
      }
      
      // Calculate merged bounding box from all items
      const mergedBbox = {
        x1: Math.min(...sortedItems.map(item => item.bbox.x1)),
        y1: Math.min(...sortedItems.map(item => item.bbox.y1)),
        x2: Math.max(...sortedItems.map(item => item.bbox.x2)),
        y2: Math.max(...sortedItems.map(item => item.bbox.y2)),
      };

      const newEquipmentShortSpec = {
        id: uuidv4(),
        text,
        page: sortedItems[0].page,
        bbox: mergedBbox,
        sourceItems: sortedItems,
        metadata: {
          originalEquipmentTag: primaryEquipmentTag,
          service: serviceText,
        },
      };

      state.equipmentShortSpecs.push(newEquipmentShortSpec);

      // Auto-link with Equipment tags using the same logic as handleAutoLinkEquipmentShortSpecs
      const extractBasePattern = (tagText) => {
        const abPattern = tagText.match(/^(.+?)([A-Z](?:\/[A-Z])+|[A-Z])$/);
        if (abPattern) {
          const base = abPattern[1];
          const suffix = abPattern[2];
          return { base, suffix };
        }
        return { base: tagText };
      };

      const findMatchingEquipmentTags = (shortSpec, equipmentTags) => {
        const originalTag = shortSpec.metadata.originalEquipmentTag;
        const { base: originalBase, suffix: originalSuffix } = extractBasePattern(originalTag.text);
        
        const originalHasABPattern = originalSuffix && originalSuffix.includes('/');
        const textHasABPattern = /[A-Z]\/[A-Z]|[A-Z],[A-Z]|[A-Z]\s*&\s*[A-Z]/.test(shortSpec.text);
        const hasABPattern = originalHasABPattern || textHasABPattern;
        
        const matchingTags = [];
        
        for (const tag of equipmentTags) {
          const { base: tagBase, suffix: tagSuffix } = extractBasePattern(tag.text);
          
          // Exact match
          if (tag.text === originalTag.text) {
            matchingTags.push(tag);
            continue;
          }
          
          // Base pattern match (same page only)
          if (tagBase === originalBase && tag.page === shortSpec.page) {
            if (hasABPattern) {
              matchingTags.push(tag);
            } else if (!tagSuffix) {
              matchingTags.push(tag);
            }
          }
        }
        return matchingTags;
      };

      // Find all Equipment tags on the page that match the pattern
      const allEquipmentTags = tags.filter(t => t.category === 'Equipment');
      const matchingTags = findMatchingEquipmentTags(newEquipmentShortSpec, allEquipmentTags);

      // Track existing relationships to avoid duplicates
      const existingRelationshipKeys = new Set(
        relationships
          .filter(r => r.type === 'EquipmentShortSpec')
          .map(r => `${r.from}-${r.to}`)
      );

      // Create relationships with all matching Equipment tags
      const newRelationships = [];
      for (const tag of matchingTags) {
        const relationshipKey = `${tag.id}-${newEquipmentShortSpec.id}`;
        if (!existingRelationshipKeys.has(relationshipKey)) {
          newRelationships.push({
            id: uuidv4(),
            from: tag.id,
            to: newEquipmentShortSpec.id,
            type: 'EquipmentShortSpec',
          });
          existingRelationshipKeys.add(relationshipKey);
        }
      }

      if (newRelationships.length > 0 && onCreateRelationships) {
        onCreateRelationships(newRelationships);
      }

      // Remove all selected Equipment tags from tags
      const equipmentTagIds = equipmentTags.map(tag => tag.id);
      if (equipmentTagIds.length > 0 && onRemoveTags) {
        onRemoveTags(equipmentTagIds);
      }

      // Remove raw text items that were converted
      const rawItemIdsToRemove = nonTagItems
        .filter(item => !('category' in item))
        .map(item => item.id);
      
      if (rawItemIdsToRemove.length > 0 && onRemoveRawTextItems) {
        onRemoveRawTextItems(rawItemIdsToRemove);
      }
    }),
    
    updateEquipmentShortSpec: (id, text) => set((state) => {
      const index = state.equipmentShortSpecs.findIndex(spec => spec.id === id);
      if (index !== -1) {
        state.equipmentShortSpecs[index].text = text;
        state.equipmentShortSpecs[index].updatedAt = Date.now();
      }
    }),
    
    deleteEquipmentShortSpec: (id) => set((state) => {
      state.equipmentShortSpecs = state.equipmentShortSpecs.filter(spec => spec.id !== id);
    }),
    
    deleteEquipmentShortSpecs: (ids, uuidv4, onRestoreItems) => set((state) => {
      const idsToDelete = new Set(ids);
      
      // Restore source items similar to descriptions
      const specsToDelete = state.equipmentShortSpecs.filter(spec => idsToDelete.has(spec.id));
      
      const itemsToRestore = [];
      specsToDelete.forEach(spec => {
        if (spec.sourceItems && spec.sourceItems.length > 0) {
          const convertedItems = spec.sourceItems.map(item => ({
            id: uuidv4(),
            text: item.text || item.str || '',
            page: spec.page,
            bbox: item.bbox || {
              x1: item.transform?.[4] || item.x || 0,
              y1: (item.transform?.[5] || item.y || 0) - (item.height || 0),
              x2: (item.transform?.[4] || item.x || 0) + (item.width || 0),
              y2: item.transform?.[5] || item.y || 0,
            },
          }));
          itemsToRestore.push(...convertedItems);
        } else {
          const restoredItem = {
            id: uuidv4(),
            text: spec.text,
            page: spec.page,
            bbox: spec.bbox,
          };
          itemsToRestore.push(restoredItem);
        }
      });
      
      state.equipmentShortSpecs = state.equipmentShortSpecs.filter(spec => !idsToDelete.has(spec.id));
      
      if (onRestoreItems && itemsToRestore.length > 0) {
        onRestoreItems(itemsToRestore);
      }
    }),
    
    // Query helpers
    getEquipmentShortSpecById: (id) => {
      return get().equipmentShortSpecs.find(spec => spec.id === id);
    },
    
    getEquipmentShortSpecsByPage: (page) => {
      return get().equipmentShortSpecs.filter(spec => spec.page === page);
    },
    
    // Statistics
    get stats() {
      const specs = get().equipmentShortSpecs;
      return {
        total: specs.length,
        byPage: specs.reduce((acc, spec) => {
          acc[spec.page] = (acc[spec.page] || 0) + 1;
          return acc;
        }, {})
      };
    }
  }))
);

export default useEquipmentShortSpecStore;