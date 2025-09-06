// RelationshipRenderStore - 관계선 렌더링 및 OPC 네비게이션 전담
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';
import { RelationshipType, Category } from '../types.ts';

const useRelationshipRenderStore = create(
  immer((set, get) => ({
    // === 관계선 렌더링 상태 ===
    visibleRelationships: [],
    relationshipColors: {
      connection: '#10b981',      // Green for connections
      installation: '#f59e0b',    // Orange for installations
      annotation: '#8b5cf6',      // Purple for annotations
      note: '#ef4444',           // Red for notes
      description: '#06b6d4',     // Cyan for descriptions
      equipmentShortSpec: '#84cc16', // Lime for equipment specs
      offPageConnection: '#f97316'  // Orange-red for OPC
    },
    
    // === OPC 네비게이션 상태 ===
    opcNavigationData: null,
    pendingOpcTarget: null,
    opcConnectionMap: new Map(), // OPC 텍스트 -> 관련 태그들 매핑
    
    // === 관계선 하이라이트 ===
    highlightedRelationshipIds: new Set(),
    pingedRelationshipId: null,
    
    // === 성능 최적화 ===
    relationshipCache: new Map(),
    renderingEnabled: true,
    
    // === Actions: 관계선 렌더링 ===
    setVisibleRelationships: (relationships) => set((state) => {
      state.visibleRelationships = relationships;
    }),
    
    updateVisibleRelationships: (relationships, tagsMap, currentPage, visibilitySettings, showAllRelationships, showOnlySelectedRelationships, selectedTagIds) => set((state) => {
      const visibleRels = [];
      
      for (const r of relationships) {
        // Skip if relationship type is not visible
        const state = get();
        if (!state.isRelationshipVisible(r, visibilitySettings)) continue;
        
        // Skip if not showing all relationships and relationship doesn't match criteria
        if (!showAllRelationships && 
            !(r.type === RelationshipType.Connection || r.type === RelationshipType.Installation)) {
          continue;
        }
        
        const fromTag = tagsMap.get(r.from);
        if (fromTag?.page !== currentPage) continue;
        
        // Connection/Installation relationships are always Tag → Tag
        const toTag = tagsMap.get(r.to);
        if (!toTag || toTag.page !== currentPage) continue;
        
        // Smart filtering for selected entities only
        if (showOnlySelectedRelationships && selectedTagIds.length > 0) {
          const isFromSelected = Array.isArray(selectedTagIds) && selectedTagIds.includes(fromTag.id);
          const isToSelected = Array.isArray(selectedTagIds) && selectedTagIds.includes(toTag.id);
          
          if (!isFromSelected && !isToSelected) continue;
        }
        
        visibleRels.push({
          rel: r,
          fromTag,
          toItem: toTag,
          isAnnotation: false
        });
      }
      
      state.visibleRelationships = visibleRels;
    }),
    
    // === Actions: OPC 네비게이션 ===
    setPendingOpcTarget: (target) => set((state) => {
      state.pendingOpcTarget = target;
    }),
    
    setOpcNavigationData: (data) => set((state) => {
      state.opcNavigationData = data;
    }),
    
    clearOpcNavigation: () => set((state) => {
      state.pendingOpcTarget = null;
      state.opcNavigationData = null;
    }),
    
    // === OPC 관리 함수 ===
    buildOpcConnectionMap: (tags) => set((state) => {
      const opcMap = new Map();
      
      // OPC 태그들을 텍스트별로 그룹화
      const opcTags = tags.filter(tag => tag.category === Category.OffPageConnector);
      
      opcTags.forEach(tag => {
        const normalizedText = tag.text.trim().toUpperCase();
        if (!opcMap.has(normalizedText)) {
          opcMap.set(normalizedText, []);
        }
        opcMap.get(normalizedText).push(tag);
      });
      
      state.opcConnectionMap = opcMap;
    }),
    
    getOpcNavigationInfo: (opcText, currentPage) => {
      const state = get();
      const normalizedText = opcText.trim().toUpperCase();
      const relatedTags = state.opcConnectionMap.get(normalizedText) || [];
      
      // 다른 페이지에 있는 태그 찾기
      const otherPageTags = relatedTags.filter(tag => tag.page !== currentPage);
      
      if (otherPageTags.length > 0) {
        const targetTag = otherPageTags[0];
        return {
          hasConnection: true,
          targetPage: targetTag.page,
          targetTagId: targetTag.id,
          totalConnections: relatedTags.length,
          opcStatus: relatedTags.length === 2 && otherPageTags.length > 0 ? 'connected' : 'invalid'
        };
      }
      
      return {
        hasConnection: false,
        opcStatus: relatedTags.length === 1 ? 'single' : 'invalid',
        totalConnections: relatedTags.length
      };
    },
    
    // === Actions: 하이라이트 관리 ===
    setHighlightedRelationshipIds: (relationshipIds) => set((state) => {
      state.highlightedRelationshipIds = new Set(relationshipIds);
    }),
    
    addHighlightedRelationshipId: (relationshipId) => set((state) => {
      state.highlightedRelationshipIds.add(relationshipId);
    }),
    
    removeHighlightedRelationshipId: (relationshipId) => set((state) => {
      state.highlightedRelationshipIds.delete(relationshipId);
    }),
    
    clearHighlightedRelationshipIds: () => set((state) => {
      state.highlightedRelationshipIds.clear();
    }),
    
    setPingedRelationshipId: (relationshipId) => set((state) => {
      state.pingedRelationshipId = relationshipId;
      
      // Auto-clear after 2 seconds
      setTimeout(() => {
        set((state) => {
          if (state.pingedRelationshipId === relationshipId) {
            state.pingedRelationshipId = null;
          }
        });
      }, 2000);
    }),
    
    // === 렌더링 유틸리티 ===
    getRelationshipColor: (relationshipType) => {
      const state = get();
      return state.relationshipColors[relationshipType] || '#6b7280';
    },
    
    // Helper function to check if a relationship should be visible
    isRelationshipVisible: (relationship, visibilitySettings) => {
      switch (relationship.type) {
        case 'connection':
          return visibilitySettings.relationships?.connection || false;
        case 'installation':
          return visibilitySettings.relationships?.installation || false;
        case 'annotation':
          return visibilitySettings.relationships?.annotation || false;
        case 'note':
          return visibilitySettings.relationships?.note || false;
        case 'description':
          return visibilitySettings.relationships?.description || false;
        case 'equipmentShortSpec':
          return visibilitySettings.relationships?.equipmentShortSpec || false;
        case 'offPageConnection':
          return visibilitySettings.relationships?.offPageConnection || false;
        default:
          return false;
      }
    },
    
    getRelationshipStrokeWidth: (relationship, isPinged = false) => {
      if (isPinged) return '4';
      
      switch (relationship.type) {
        case RelationshipType.Connection:
        case RelationshipType.Installation:
          return '2';
        case RelationshipType.OffPageConnection:
          return '3';
        default:
          return '1.5';
      }
    },
    
    getRelationshipStrokeDashArray: (relationship, isPinged = false) => {
      if (isPinged) return 'none';
      
      switch (relationship.type) {
        case RelationshipType.Annotation:
        case RelationshipType.Note:
          return '3 3';
        case RelationshipType.OffPageConnection:
          return '8 4';
        case RelationshipType.Description:
          return '5 2';
        default:
          return 'none';
      }
    },
    
    getMarkerEnd: (relationshipType) => {
      switch (relationshipType) {
        case RelationshipType.Connection:
          return 'url(#arrowhead-connect)';
        case RelationshipType.Installation:
          return 'url(#arrowhead-install)';
        case RelationshipType.OffPageConnection:
          return 'url(#arrowhead-opc)';
        default:
          return 'none';
      }
    },
    
    // === 성능 최적화 ===
    setRenderingEnabled: (enabled) => set((state) => {
      state.renderingEnabled = enabled;
    }),
    
    cacheRelationshipRender: (relationshipId, renderData) => set((state) => {
      const maxCacheSize = 100;
      if (state.relationshipCache.size >= maxCacheSize) {
        const firstKey = state.relationshipCache.keys().next().value;
        if (firstKey) state.relationshipCache.delete(firstKey);
      }
      
      state.relationshipCache.set(relationshipId, renderData);
    }),
    
    getCachedRelationshipRender: (relationshipId) => {
      const state = get();
      return state.relationshipCache.get(relationshipId);
    },
    
    clearRelationshipCache: () => set((state) => {
      state.relationshipCache.clear();
    }),
    
    // === 유틸리티: 관계선 체크 ===
    isRelationshipHighlighted: (relationshipId) => {
      const state = get();
      return state.highlightedRelationshipIds.has(relationshipId);
    },
    
    isRelationshipPinged: (relationshipId) => {
      const state = get();
      return state.pingedRelationshipId === relationshipId;
    },
    
    // === 고급 기능: 관계선 필터링 ===
    filterRelationshipsByType: (types) => {
      const state = get();
      return state.visibleRelationships.filter(({ rel }) => types.includes(rel.type));
    },
    
    filterRelationshipsByTags: (tagIds) => {
      const state = get();
      return state.visibleRelationships.filter(({ rel }) => 
        tagIds.includes(rel.from) || tagIds.includes(rel.to)
      );
    },
    
    getRelationshipStats: () => {
      const state = get();
      const stats = {};
      
      state.visibleRelationships.forEach(({ rel }) => {
        stats[rel.type] = (stats[rel.type] || 0) + 1;
      });
      
      return {
        total: state.visibleRelationships.length,
        byType: stats,
        highlighted: state.highlightedRelationshipIds.size
      };
    },
    
    // === 초기화 ===
    resetAll: () => set((state) => {
      state.visibleRelationships = [];
      state.opcNavigationData = null;
      state.pendingOpcTarget = null;
      state.opcConnectionMap = new Map();
      state.highlightedRelationshipIds = new Set();
      state.pingedRelationshipId = null;
      state.relationshipCache = new Map();
      state.renderingEnabled = true;
    })
  }))
);

export default useRelationshipRenderStore;