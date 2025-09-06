// DescriptionStore - Description, Note & Hold 전용 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useDescriptionStore = create(
  immer((set, get) => ({
    // State
    descriptions: [],
    
    // Computed values (getters)
    get descriptionsByType() {
      const descriptions = get().descriptions;
      const byType = {
        Note: [],
        Hold: []
      };
      descriptions.forEach(desc => {
        if (byType[desc.metadata?.type]) {
          byType[desc.metadata.type].push(desc);
        }
      });
      return byType;
    },
    
    get descriptionsByPage() {
      const descriptions = get().descriptions;
      const byPage = {};
      descriptions.forEach(desc => {
        if (!byPage[desc.page]) byPage[desc.page] = [];
        byPage[desc.page].push(desc);
      });
      return byPage;
    },
    
    // Actions
    setDescriptions: (descriptions) => set((state) => {
      state.descriptions = descriptions;
    }),
    
    addDescription: (description) => set((state) => {
      state.descriptions.push(description);
    }),
    
    // 🟢 Complex description creation from selected items
    createDescription: (selectedItems, type = 'Note', uuidv4) => set((state) => {
      if (!selectedItems || selectedItems.length === 0) return;
      
      // Sort by Y coordinate (top to bottom) - in screen coordinate system, smaller Y values are at the top
      const sortedItems = [...selectedItems].sort((a, b) => {
        const yDiff = a.bbox.y1 - b.bbox.y1;
        if (Math.abs(yDiff) > 5) {
          return yDiff;
        }
        return a.bbox.x1 - b.bbox.x1;
      });
      
      // Combine text from selected items
      const combinedText = sortedItems.map(item => item.text || '').join(' ').trim();
      if (!combinedText) return;
      
      // Calculate combined bounding box
      const combinedBbox = selectedItems.reduce((acc, item) => {
        return {
          x1: Math.min(acc.x1, item.bbox.x1),
          y1: Math.min(acc.y1, item.bbox.y1),
          x2: Math.max(acc.x2, item.bbox.x2),
          y2: Math.max(acc.y2, item.bbox.y2),
        };
      }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
      
      // Get page from first item
      const page = selectedItems[0].page;
      
      // Generate page-specific number
      const existingDescriptions = state.descriptions.filter(d => 
        d.page === page && d.metadata?.type === type
      );
      const number = existingDescriptions.length + 1;
      
      const newDescription = {
        id: uuidv4(),
        text: combinedText,
        page,
        bbox: combinedBbox,
        sourceItems: selectedItems,
        metadata: {
          type, // 'Note' or 'Hold'
          scope: 'Page',
          number
        },
        createdAt: Date.now()
      };
      
      state.descriptions.push(newDescription);
    }),

    // 🟢 Complex description creation with auto-linking and item removal
    createDescriptionFromItems: (selectedItems, type = 'Note', tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems) => set((state) => {
      if (!selectedItems || selectedItems.length === 0) return;

      // Sort by Y coordinate (top to bottom) - in screen coordinate system, smaller Y values are at the top
      const sortedItems = [...selectedItems].sort((a, b) => a.bbox.y1 - b.bbox.y1);
      
      // Merge text content
      const text = sortedItems.map(item => item.text).join(' ');
      
      // Calculate merged bounding box
      const mergedBbox = {
        x1: Math.min(...sortedItems.map(item => item.bbox.x1)),
        y1: Math.min(...sortedItems.map(item => item.bbox.y1)),
        x2: Math.max(...sortedItems.map(item => item.bbox.x2)),
        y2: Math.max(...sortedItems.map(item => item.bbox.y2)),
      };

      // Find next available number for this page and type
      const currentPage = sortedItems[0].page;
      const descriptionType = type;
      const existingNumbers = state.descriptions
        .filter(desc => desc.metadata.type === descriptionType && desc.page === currentPage)
        .map(desc => desc.metadata.number);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newDescription = {
        id: uuidv4(),
        text,
        page: sortedItems[0].page,
        bbox: mergedBbox,
        sourceItems: sortedItems,
        metadata: {
          type: descriptionType,
          scope: 'Specific',
          number: nextNumber,
        },
      };

      state.descriptions.push(newDescription);

      // Auto-link with Note/Hold tags (same as in handleAutoLinkNotesAndHolds)
      const extractNumbers = (tagText) => {
        const numberMatches = tagText.match(/\d+/g);
        return numberMatches ? numberMatches.map(num => parseInt(num, 10)) : [];
      };

      const detectNoteHoldType = (tagText) => {
        const lowerText = tagText.toLowerCase();
        if (lowerText.includes('note')) return 'Note';
        if (lowerText.includes('hold')) return 'Hold';
        return null;
      };

      // Find Note/Hold tags on the same page that match this description
      const noteHoldTags = tags.filter(t => 
        t.category === 'NotesAndHolds' && 
        t.page === currentPage
      );

      const newRelationships = [];
      for (const tag of noteHoldTags) {
        const tagType = detectNoteHoldType(tag.text);
        if (!tagType || tagType !== descriptionType) continue;

        const numbers = extractNumbers(tag.text);
        if (numbers.includes(nextNumber)) {
          // Check if relationship doesn't already exist
          const existsAlready = relationships.some(r => 
            r.from === tag.id && r.to === newDescription.id && r.type === 'Description'
          );
          
          if (!existsAlready) {
            newRelationships.push({
              id: uuidv4(),
              from: tag.id,
              to: newDescription.id,
              type: 'Description'
            });
          }
        }
      }

      if (newRelationships.length > 0 && onCreateRelationships) {
        onCreateRelationships(newRelationships);
      }

      // Remove tags that were converted to description
      const tagIdsToRemove = selectedItems
        .filter(item => 'category' in item) // Only tags have category
        .map(tag => tag.id);
      
      if (tagIdsToRemove.length > 0 && onRemoveTags) {
        onRemoveTags(tagIdsToRemove);
      }

      // Remove raw text items that were converted to description  
      const rawItemIdsToRemove = selectedItems
        .filter(item => !('category' in item)) // Only raw items don't have category
        .map(item => item.id);
      
      if (rawItemIdsToRemove.length > 0 && onRemoveRawTextItems) {
        onRemoveRawTextItems(rawItemIdsToRemove);
      }
    }),

    // 🟢 Helper for creating Hold descriptions
    createHoldDescriptionFromItems: (selectedItems, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems) => {
      const store = get();
      store.createDescriptionFromItems(selectedItems, 'Hold', tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems);
    },
    
    updateDescription: (id, text, metadata) => set((state) => {
      const index = state.descriptions.findIndex(desc => desc.id === id);
      if (index !== -1) {
        const currentDesc = state.descriptions[index];
        
        state.descriptions[index] = {
          ...currentDesc,
          text: text !== undefined ? text : currentDesc.text,
          metadata: metadata !== undefined ? { ...currentDesc.metadata, ...metadata } : currentDesc.metadata,
          updatedAt: Date.now()
        };
      }
    }),
    
    deleteDescription: (id) => set((state) => {
      state.descriptions = state.descriptions.filter(desc => desc.id !== id);
    }),
    
    // 🟢 Complex description deletion with restoration
    deleteDescriptions: (descriptionIds, uuidv4, onRestoreItems) => set((state) => {
      const idsToDelete = new Set(descriptionIds);
      
      // Get descriptions to be deleted to restore their source items
      const descriptionsToDelete = state.descriptions.filter(desc => idsToDelete.has(desc.id));
      
      const itemsToRestore = [];
      descriptionsToDelete.forEach(desc => {
        if (desc.sourceItems && desc.sourceItems.length > 0) {
          // Convert source items to proper RawTextItem format
          const convertedItems = desc.sourceItems.map(item => ({
            id: uuidv4(),
            text: item.text || item.str || '',
            page: desc.page,
            bbox: item.bbox || {
              x1: item.transform?.[4] || item.x || 0,
              y1: (item.transform?.[5] || item.y || 0) - (item.height || 0),
              x2: (item.transform?.[4] || item.x || 0) + (item.width || 0),
              y2: item.transform?.[5] || item.y || 0,
            },
          }));
          itemsToRestore.push(...convertedItems);
        } else {
          // Single item restoration
          const restoredItem = {
            id: uuidv4(),
            text: desc.text,
            page: desc.page,
            bbox: desc.bbox,
          };
          itemsToRestore.push(restoredItem);
        }
      });
      
      // Remove descriptions
      state.descriptions = state.descriptions.filter(desc => !idsToDelete.has(desc.id));
      
      // Call external callback to restore items
      if (onRestoreItems && itemsToRestore.length > 0) {
        onRestoreItems(itemsToRestore);
      }
    }),
    
    // Query helpers
    getDescriptionById: (id) => {
      return get().descriptions.find(desc => desc.id === id);
    },
    
    getDescriptionsByType: (type) => {
      return get().descriptions.filter(desc => desc.metadata?.type === type);
    },
    
    getDescriptionsByPage: (page) => {
      return get().descriptions.filter(desc => desc.page === page);
    },
    
    // Update description with intelligent numbering
    updateDescription: (id, text, metadata) => {
      set(produce(draft => {
        const currentDesc = draft.descriptions.find(desc => desc.id === id);
        if (!currentDesc) return;

        let updatedMetadata = metadata;

        // If type changed, recalculate number for the new type on the same page
        if (currentDesc.metadata.type !== metadata.type) {
          const existingNumbers = draft.descriptions
            .filter(desc => 
              desc.id !== id && // Exclude current description
              desc.metadata.type === metadata.type && 
              desc.page === currentDesc.page
            )
            .map(desc => desc.metadata.number);
          
          const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
          updatedMetadata = { ...metadata, number: nextNumber };
        }

        // Update the description
        const index = draft.descriptions.findIndex(desc => desc.id === id);
        if (index !== -1) {
          draft.descriptions[index] = {
            ...currentDesc,
            text,
            metadata: updatedMetadata
          };
        }
      }));
    },
    
    // Statistics
    get stats() {
      const descriptions = get().descriptions;
      const totalDescriptions = descriptions.length;
      const byType = {};
      const byPage = {};
      
      descriptions.forEach(desc => {
        const type = desc.metadata?.type || 'Unknown';
        byType[type] = (byType[type] || 0) + 1;
        byPage[desc.page] = (byPage[desc.page] || 0) + 1;
      });
      
      return {
        total: totalDescriptions,
        byType,
        byPage
      };
    }
  }))
);

export default useDescriptionStore;