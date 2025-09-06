// TagStore - 태그 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// 현재 App.tsx에서 사용하는 Tag 구조와 동일하게 유지
const useTagStore = create(
  immer((set, get) => ({
    // State
    tags: [],
    selectedTagIds: [],
    
    // Computed values (getters)
    get selectedTags() {
      const state = get();
      return state.tags.filter(tag => state.selectedTagIds.includes(tag.id));
    },
    
    get tagsByPage() {
      const tags = get().tags;
      const byPage = {};
      tags.forEach(tag => {
        if (!byPage[tag.page]) byPage[tag.page] = [];
        byPage[tag.page].push(tag);
      });
      return byPage;
    },
    
    // Actions
    createTag: (tagData) => set((state) => {
      const newTag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        isReviewed: false,
        ...tagData
      };
      state.tags.push(newTag);
    }),
    
    // 🟢 NEW: Complex tag creation from raw text items
    createTagFromItems: (itemsToConvert, category, appSettings, uuidv4) => set((state) => {
      if (!itemsToConvert || itemsToConvert.length === 0) return;

      // All items must be on the same page
      const page = itemsToConvert[0].page;
      if (itemsToConvert.some(item => item.page !== page)) {
        return;
      }

      // Sort items by position (top to bottom, then left to right)
      const sortedItems = [...itemsToConvert].sort((a, b) => {
        const yDiff = a.bbox.y1 - b.bbox.y1;
        if (Math.abs(yDiff) > 5) {
          return yDiff;
        }
        return a.bbox.x1 - b.bbox.x1;
      });
      
      // Combine text with appropriate separator based on category settings
      const shouldUseHyphen = (() => {
        switch (category) {
          case 'Equipment': return appSettings.hyphenSettings.equipment;
          case 'Line': return appSettings.hyphenSettings.line;
          case 'Instrument': return appSettings.hyphenSettings.instrument;
          case 'DrawingNumber': return appSettings.hyphenSettings.drawingNumber;
          case 'NotesAndHolds': return appSettings.hyphenSettings.notesAndHolds;
          case 'SpecialItem': return appSettings.hyphenSettings.specialItem;
          default: return false;
        }
      })();
      
      const rawCombinedText = shouldUseHyphen
        ? sortedItems.map(item => item.text).join('-')
        : sortedItems.map(item => item.text).join('');
      
      // Apply whitespace removal based on settings (except for NotesAndHolds)
      const combinedText = (appSettings.autoRemoveWhitespace && category !== 'NotesAndHolds') 
        ? rawCombinedText.replace(/\s+/g, '') 
        : rawCombinedText;
      
      const combinedBbox = itemsToConvert.reduce((acc, item) => {
        return {
          x1: Math.min(acc.x1, item.bbox.x1),
          y1: Math.min(acc.y1, item.bbox.y1),
          x2: Math.max(acc.x2, item.bbox.x2),
          y2: Math.max(acc.y2, item.bbox.y2),
        };
      }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

      const newTag = {
        id: uuidv4(),
        text: combinedText,
        page,
        bbox: combinedBbox,
        category,
        sourceItems: itemsToConvert,
        createdAt: Date.now(),
        isReviewed: false
      };

      state.tags.push(newTag);
    }),
    
    createManualTag: (tagData, appSettings, uuidv4) => set((state) => {
      const { text, bbox, page, category } = tagData;
      if (!text || !bbox || !page || !category) {
        return;
      }

      // Apply whitespace removal based on settings (except for NotesAndHolds)
      const cleanedText = (appSettings.autoRemoveWhitespace && category !== 'NotesAndHolds') 
        ? text.replace(/\s+/g, '') 
        : text;

      const newTag = {
        id: uuidv4(),
        text: cleanedText,
        page,
        bbox,
        category,
        sourceItems: [], // Manual tags have no source items
        createdAt: Date.now(),
        isReviewed: false
      };

      state.tags.push(newTag);
    }),
    
    updateTag: (id, updates) => set((state) => {
      const index = state.tags.findIndex(tag => tag.id === id);
      if (index !== -1) {
        Object.assign(state.tags[index], updates);
      }
    }),
    
    updateTagText: (tagId, newText) => set((state) => {
      const index = state.tags.findIndex(tag => tag.id === tagId);
      if (index !== -1) {
        state.tags[index].text = newText;
      }
    }),
    
    deleteTag: (id) => set((state) => {
      state.tags = state.tags.filter(tag => tag.id !== id);
      state.selectedTagIds = state.selectedTagIds.filter(tagId => tagId !== id);
    }),
    
    deleteTags: (ids) => set((state) => {
      state.tags = state.tags.filter(tag => !ids.includes(tag.id));
      state.selectedTagIds = state.selectedTagIds.filter(tagId => !ids.includes(tagId));
    }),
    
    // 🟢 NEW: Complex tag deletion with restoration to raw text items
    deleteTagsWithRestore: (tagIdsToDelete, uuidv4, onRestoreItems, onCleanupRelationships, onCleanupComments) => set((state) => {
      const idsToDelete = new Set(tagIdsToDelete);

      // Find the tags being deleted
      const tagsToRevert = state.tags.filter(tag => idsToDelete.has(tag.id));
      
      const itemsToRestore = [];
      
      for (const tag of tagsToRevert) {
        if (tag.sourceItems && tag.sourceItems.length > 0) {
          // It was a manually created tag, restore the original source items
          // Convert source items to proper RawTextItem format
          const convertedItems = tag.sourceItems.map(item => ({
            id: uuidv4(),
            text: item.str || item.text, // Handle both formats
            page: tag.page,
            bbox: item.bbox || {
              x1: item.transform[4],
              y1: item.transform[5] - item.height,
              x2: item.transform[4] + item.width,
              y2: item.transform[5],
            },
          }));
          itemsToRestore.push(...convertedItems);
        } else {
          // It was an originally detected tag. Revert to a single raw item.
          const restoredItem = {
            id: uuidv4(), // Generate new unique ID for the raw item
            text: tag.text,
            page: tag.page,
            bbox: tag.bbox,
          };
          itemsToRestore.push(restoredItem);
        }
      }

      // Remove the tags from store
      state.tags = state.tags.filter(tag => !idsToDelete.has(tag.id));
      state.selectedTagIds = state.selectedTagIds.filter(tagId => !idsToDelete.has(tagId));
      
      // Call external callbacks to handle related data
      if (onRestoreItems) onRestoreItems(itemsToRestore);
      if (onCleanupRelationships) onCleanupRelationships(idsToDelete);
      if (onCleanupComments) onCleanupComments(idsToDelete);
    }),
    
    selectTag: (id) => set((state) => {
      if (!state.selectedTagIds.includes(id)) {
        state.selectedTagIds.push(id);
      }
    }),
    
    unselectTag: (id) => set((state) => {
      state.selectedTagIds = state.selectedTagIds.filter(tagId => tagId !== id);
    }),
    
    toggleTagSelection: (id) => set((state) => {
      const index = state.selectedTagIds.indexOf(id);
      if (index === -1) {
        state.selectedTagIds.push(id);
      } else {
        state.selectedTagIds.splice(index, 1);
      }
    }),
    
    selectMultipleTags: (ids) => set((state) => {
      const newIds = ids.filter(id => !state.selectedTagIds.includes(id));
      state.selectedTagIds.push(...newIds);
    }),
    
    clearSelection: () => set((state) => {
      state.selectedTagIds = [];
    }),
    
    toggleReviewStatus: (id) => set((state) => {
      const tag = state.tags.find(tag => tag.id === id);
      if (tag) {
        tag.isReviewed = !tag.isReviewed;
      }
    }),
    
    // Bulk operations
    setTags: (tags) => set((state) => {
      state.tags = tags;
    }),
    
    addTags: (newTags) => set((state) => {
      state.tags.push(...newTags);
    }),
    
    // Query helpers
    getTagsByPage: (page) => {
      return get().tags.filter(tag => tag.page === page);
    },
    
    getTagsByCategory: (category) => {
      return get().tags.filter(tag => tag.category === category);
    },
    
    getTagById: (id) => {
      return get().tags.find(tag => tag.id === id);
    },
    
    // Statistics
    get stats() {
      const tags = get().tags;
      const totalTags = tags.length;
      const reviewedTags = tags.filter(tag => tag.isReviewed).length;
      const byCategory = {};
      
      tags.forEach(tag => {
        byCategory[tag.category] = (byCategory[tag.category] || 0) + 1;
      });
      
      return {
        total: totalTags,
        reviewed: reviewedTags,
        unreviewed: totalTags - reviewedTags,
        byCategory
      };
    }
  }))
);

export default useTagStore;