// RawTextStore - Raw text item 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useRawTextStore = create(
  immer((set, get) => ({
    // State
    rawTextItems: [],
    
    // Computed values (getters)
    get itemsByPage() {
      const items = get().rawTextItems;
      const byPage = {};
      items.forEach(item => {
        if (!byPage[item.page]) byPage[item.page] = [];
        byPage[item.page].push(item);
      });
      return byPage;
    },
    
    // Actions
    setRawTextItems: (items) => set((state) => {
      state.rawTextItems = items;
    }),
    
    addRawTextItems: (newItems) => set((state) => {
      state.rawTextItems.push(...newItems);
    }),
    
    updateRawTextItemText: (itemId, newText) => set((state) => {
      const index = state.rawTextItems.findIndex(item => item.id === itemId);
      if (index !== -1) {
        state.rawTextItems[index].text = newText;
      }
    }),
    
    deleteRawTextItems: (itemIdsToDelete, onCleanupRelationships) => set((state) => {
      const idsToDelete = new Set(itemIdsToDelete);
      state.rawTextItems = state.rawTextItems.filter(item => !idsToDelete.has(item.id));
      
      // Call external callback to cleanup relationships
      if (onCleanupRelationships) onCleanupRelationships(idsToDelete);
    }),
    
    // 🟢 Complex merge functionality
    mergeRawTextItems: (itemIdsToMerge, uuidv4, onCleanupRelationships) => set((state) => {
      if (!itemIdsToMerge || itemIdsToMerge.length < 2) return;

      const itemsToMerge = state.rawTextItems.filter(item => itemIdsToMerge.includes(item.id));
      if (itemsToMerge.length < 2) return;

      // All items must be on the same page
      const page = itemsToMerge[0].page;
      if (itemsToMerge.some(item => item.page !== page)) {
        return;
      }

      // Sort items by position (top to bottom, then left to right)
      const sortedItems = [...itemsToMerge].sort((a, b) => {
        // First sort by vertical position (top to bottom, smaller y values first in screen coordinates)
        const yDiff = a.bbox.y1 - b.bbox.y1;
        if (Math.abs(yDiff) > 5) { // Allow small vertical tolerance for alignment
          return yDiff;
        }
        // If vertically aligned, sort by horizontal position (left to right)
        return a.bbox.x1 - b.bbox.x1;
      });

      // Combine text with spaces
      const combinedText = sortedItems.map(item => item.text).join(' ');
      
      // Calculate combined bounding box
      const combinedBbox = itemsToMerge.reduce((acc, item) => {
        return {
          x1: Math.min(acc.x1, item.bbox.x1),
          y1: Math.min(acc.y1, item.bbox.y1),
          x2: Math.max(acc.x2, item.bbox.x2),
          y2: Math.max(acc.y2, item.bbox.y2),
        };
      }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

      // Create new merged item
      const mergedItem = {
        id: uuidv4(),
        text: combinedText,
        page,
        bbox: combinedBbox,
      };

      // Remove original items and add merged item
      const idsToRemove = new Set(itemIdsToMerge);
      state.rawTextItems = state.rawTextItems.filter(item => !idsToRemove.has(item.id));
      state.rawTextItems.push(mergedItem);

      // Call external callback to cleanup relationships
      if (onCleanupRelationships) onCleanupRelationships(idsToRemove);
    }),
    
    // Query helpers
    getRawTextItemsByPage: (page) => {
      return get().rawTextItems.filter(item => item.page === page);
    },
    
    getRawTextItemById: (id) => {
      return get().rawTextItems.find(item => item.id === id);
    },
    
    // Statistics
    get stats() {
      const items = get().rawTextItems;
      const totalItems = items.length;
      const byPage = {};
      
      items.forEach(item => {
        byPage[item.page] = (byPage[item.page] || 0) + 1;
      });
      
      return {
        total: totalItems,
        byPage
      };
    }
  }))
);

export default useRawTextStore;