// RelationshipStore - 관계 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useRelationshipStore = create(
  immer((set, get) => ({
    // State
    relationships: [],
    relationshipStartTag: null,
    
    // Computed values (getters)
    get relationshipsByType() {
      const relationships = get().relationships;
      const byType = {};
      relationships.forEach(rel => {
        if (!byType[rel.type]) byType[rel.type] = [];
        byType[rel.type].push(rel);
      });
      return byType;
    },
    
    get relationshipsByPage() {
      const relationships = get().relationships;
      const tags = get().allTags || []; // Will need to be provided via context or prop
      const byPage = {};
      
      relationships.forEach(rel => {
        // Find the pages involved in this relationship
        const fromTag = tags.find(tag => tag.id === rel.from);
        const toTag = tags.find(tag => tag.id === rel.to);
        
        if (fromTag && toTag) {
          const fromPage = fromTag.page;
          const toPage = toTag.page;
          
          if (!byPage[fromPage]) byPage[fromPage] = [];
          if (!byPage[toPage]) byPage[toPage] = [];
          
          byPage[fromPage].push(rel);
          if (fromPage !== toPage) {
            byPage[toPage].push(rel);
          }
        }
      });
      
      return byPage;
    },
    
    // Actions
    setRelationships: (relationships) => set((state) => {
      state.relationships = relationships;
    }),
    
    addRelationship: (relationship) => set((state) => {
      state.relationships.push(relationship);
    }),
    
    addRelationships: (newRelationships) => set((state) => {
      state.relationships.push(...newRelationships);
    }),
    
    updateRelationship: (id, updates) => set((state) => {
      const index = state.relationships.findIndex(rel => rel.id === id);
      if (index !== -1) {
        Object.assign(state.relationships[index], updates);
      }
    }),
    
    deleteRelationship: (id) => set((state) => {
      state.relationships = state.relationships.filter(rel => rel.id !== id);
    }),
    
    deleteRelationships: (ids) => set((state) => {
      const idsToDelete = new Set(ids);
      state.relationships = state.relationships.filter(rel => !idsToDelete.has(rel.id));
    }),
    
    // 🟢 Filter relationships by tag involvement
    filterRelationshipsByTag: (tagId) => {
      return get().relationships.filter(rel => rel.from === tagId || rel.to === tagId);
    },
    
    // 🟢 Clean up relationships involving specific tags
    cleanupRelationshipsForTags: (tagIds) => set((state) => {
      const idsToCheck = new Set(tagIds);
      state.relationships = state.relationships.filter(rel => 
        !idsToCheck.has(rel.from) && !idsToCheck.has(rel.to)
      );
    }),
    
    // 🟢 Relationship creation workflow
    setRelationshipStartTag: (tag) => set((state) => {
      state.relationshipStartTag = tag;
    }),
    
    clearRelationshipStartTag: () => set((state) => {
      state.relationshipStartTag = null;
    }),
    
    createRelationshipFromStartTag: (endTag, relationshipType, uuidv4) => set((state) => {
      if (!state.relationshipStartTag || !endTag) return;
      
      const newRelationship = {
        id: uuidv4(),
        from: state.relationshipStartTag.id,
        to: endTag.id,
        type: relationshipType,
        createdAt: Date.now()
      };
      
      state.relationships.push(newRelationship);
      state.relationshipStartTag = null; // Clear after creation
    }),
    
    // Query helpers
    getRelationshipsByType: (type) => {
      return get().relationships.filter(rel => rel.type === type);
    },
    
    getRelationshipById: (id) => {
      return get().relationships.find(rel => rel.id === id);
    },
    
    // Statistics
    get stats() {
      const relationships = get().relationships;
      const totalRelationships = relationships.length;
      const byType = {};
      
      relationships.forEach(rel => {
        byType[rel.type] = (byType[rel.type] || 0) + 1;
      });
      
      return {
        total: totalRelationships,
        byType
      };
    }
  }))
);

export default useRelationshipStore;