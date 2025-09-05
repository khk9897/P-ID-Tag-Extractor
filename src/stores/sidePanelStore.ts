import { create } from 'zustand';
import { Category, CommentPriority } from '../types';

interface SidePanelState {
  // View state
  activeTab: string;
  showCurrentPageOnly: boolean;
  showRelationshipDetails: boolean;
  sidebarWidth: number;
  isResizing: boolean;
  
  // Selection state (moved from component props)
  selectedTagIds: string[];
  selectedDescriptionIds: string[];
  selectedEquipmentShortSpecIds: string[];
  tagSelectionSource: 'viewer' | 'panel' | null;
  
  // Relationship Maps for O(1) lookup performance
  relationshipsByFrom: Map<string, any[]>;
  relationshipsByTo: Map<string, any[]>;
  relationshipsByType: Map<string, any[]>;
  
  // Page state
  currentPage: number;
  
  // Performance mode for large files
  isLargeFile: boolean;
  performanceMode: boolean;
  
  // Filter state
  searchQuery: string;
  debouncedSearchQuery: string;
  loopSearchQuery: string;
  filterCategory: string;
  reviewFilter: string;
  commentFilter: string;
  commentsTabFilter: string;
  sortOrder: string;
  
  // Edit state
  editingLoopId: string | null;
  editingLoopValue: string;
  editingDescriptionId: string | null;
  editingEquipmentShortSpecId: string | null;
  tempEquipmentShortSpecText: string;
  tempEquipmentShortSpecMetadata: Record<string, any>;
  tempDescriptionText: string;
  tempDescriptionMetadata: Record<string, any>;
  
  // UI state
  sections: Record<string, boolean>;
  virtualizedRange: { start: number; end: number };
  
  // Comment modal state
  commentModalOpen: boolean;
  commentTargetId: string | null;
  commentTargetName: string;
  commentTargetType: string | null;
  
  // Actions
  setActiveTab: (tab: string) => void;
  
  // Relationship Map actions
  updateRelationshipMaps: (relationships: any[]) => void;
  setShowCurrentPageOnly: (show: boolean) => void;
  setShowRelationshipDetails: (show: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setIsResizing: (resizing: boolean) => void;
  
  // Selection actions
  setSelectedTagIds: (ids: string[], source?: 'viewer' | 'panel') => void;
  setSelectedDescriptionIds: (ids: string[]) => void;
  setSelectedEquipmentShortSpecIds: (ids: string[]) => void;
  clearAllSelections: () => void;
  
  // Page actions
  setCurrentPage: (page: number) => void;
  
  // Performance mode actions
  setIsLargeFile: (isLarge: boolean) => void;
  setPerformanceMode: (enabled: boolean) => void;
  
  setSearchQuery: (query: string) => void;
  setDebouncedSearchQuery: (query: string) => void;
  setLoopSearchQuery: (query: string) => void;
  setFilterCategory: (category: string) => void;
  setReviewFilter: (filter: string) => void;
  setCommentFilter: (filter: string) => void;
  setCommentsTabFilter: (filter: string) => void;
  setSortOrder: (order: string) => void;
  
  setEditingLoopId: (id: string | null) => void;
  setEditingLoopValue: (value: string) => void;
  setEditingDescriptionId: (id: string | null) => void;
  setEditingEquipmentShortSpecId: (id: string | null) => void;
  setTempEquipmentShortSpecText: (text: string) => void;
  setTempEquipmentShortSpecMetadata: (metadata: Record<string, any>) => void;
  setTempDescriptionText: (text: string) => void;
  setTempDescriptionMetadata: (metadata: Record<string, any>) => void;
  
  toggleSection: (section: string) => void;
  setVirtualizedRange: (range: { start: number; end: number }) => void;
  
  openCommentModal: (targetId: string, targetName: string, targetType: string) => void;
  closeCommentModal: () => void;
  
  resetFilters: () => void;
}

// Load initial values from localStorage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const useSidePanelStore = create<SidePanelState>((set) => ({
  // Initial state
  activeTab: 'tags',
  showCurrentPageOnly: true,
  showRelationshipDetails: true,
  sidebarWidth: loadFromLocalStorage('sidebarWidth', 320),
  isResizing: false,
  
  // Selection state
  selectedTagIds: [],
  selectedDescriptionIds: [],
  selectedEquipmentShortSpecIds: [],
  tagSelectionSource: null,
  
  // Relationship Maps
  relationshipsByFrom: new Map(),
  relationshipsByTo: new Map(),
  relationshipsByType: new Map(),
  
  // Page state
  currentPage: 1,
  
  // Performance mode
  isLargeFile: false,
  performanceMode: false,
  
  searchQuery: '',
  debouncedSearchQuery: '',
  loopSearchQuery: '',
  filterCategory: 'All',
  reviewFilter: 'All',
  commentFilter: 'All',
  commentsTabFilter: 'all',
  sortOrder: 'default',
  
  editingLoopId: null,
  editingLoopValue: '',
  editingDescriptionId: null,
  editingEquipmentShortSpecId: null,
  tempEquipmentShortSpecText: '',
  tempEquipmentShortSpecMetadata: {},
  tempDescriptionText: '',
  tempDescriptionMetadata: {},
  
  sections: { viewOptions: true },
  virtualizedRange: { start: 0, end: 100 },
  
  commentModalOpen: false,
  commentTargetId: null,
  commentTargetName: '',
  commentTargetType: null,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Relationship Map update function for O(1) lookup performance
  updateRelationshipMaps: (relationships) => {
    const byFrom = new Map();
    const byTo = new Map();
    const byType = new Map();
    
    relationships.forEach(rel => {
      // Group by 'from'
      if (!byFrom.has(rel.from)) {
        byFrom.set(rel.from, []);
      }
      byFrom.get(rel.from).push(rel);
      
      // Group by 'to'
      if (!byTo.has(rel.to)) {
        byTo.set(rel.to, []);
      }
      byTo.get(rel.to).push(rel);
      
      // Group by 'type'
      if (!byType.has(rel.type)) {
        byType.set(rel.type, []);
      }
      byType.get(rel.type).push(rel);
    });
    
    set({
      relationshipsByFrom: byFrom,
      relationshipsByTo: byTo,
      relationshipsByType: byType
    });
  },
  
  setShowCurrentPageOnly: (show) => set({ showCurrentPageOnly: show }),
  setShowRelationshipDetails: (show) => set({ showRelationshipDetails: show }),
  setSidebarWidth: (width) => {
    localStorage.setItem('sidebarWidth', width.toString());
    set({ sidebarWidth: width });
  },
  setIsResizing: (resizing) => set({ isResizing: resizing }),
  
  // Selection actions
  setSelectedTagIds: (ids, source = 'panel') => set((state) => ({ 
    selectedTagIds: typeof ids === 'function' ? ids(state.selectedTagIds) : ids, 
    tagSelectionSource: source 
  })),
  setSelectedDescriptionIds: (ids) => set((state) => ({ 
    selectedDescriptionIds: typeof ids === 'function' ? ids(state.selectedDescriptionIds) : ids 
  })),
  setSelectedEquipmentShortSpecIds: (ids) => set((state) => ({ 
    selectedEquipmentShortSpecIds: typeof ids === 'function' ? ids(state.selectedEquipmentShortSpecIds) : ids 
  })),
  clearAllSelections: () => set({
    selectedTagIds: [],
    selectedDescriptionIds: [],
    selectedEquipmentShortSpecIds: [],
    tagSelectionSource: null
  }),
  
  // Page actions
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Performance mode actions
  setIsLargeFile: (isLarge) => set({ 
    isLargeFile: isLarge,
    // Auto-enable performance mode for files > 100 pages
    performanceMode: isLarge 
  }),
  setPerformanceMode: (enabled) => set({ performanceMode: enabled }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDebouncedSearchQuery: (query) => set({ debouncedSearchQuery: query }),
  setLoopSearchQuery: (query) => set({ loopSearchQuery: query }),
  setFilterCategory: (category) => set({ filterCategory: category }),
  setReviewFilter: (filter) => set({ reviewFilter: filter }),
  setCommentFilter: (filter) => set({ commentFilter: filter }),
  setCommentsTabFilter: (filter) => set({ commentsTabFilter: filter }),
  setSortOrder: (order) => set({ sortOrder: order }),
  
  setEditingLoopId: (id) => set({ editingLoopId: id }),
  setEditingLoopValue: (value) => set({ editingLoopValue: value }),
  setEditingDescriptionId: (id) => set({ editingDescriptionId: id }),
  setEditingEquipmentShortSpecId: (id) => set({ editingEquipmentShortSpecId: id }),
  setTempEquipmentShortSpecText: (text) => set({ tempEquipmentShortSpecText: text }),
  setTempEquipmentShortSpecMetadata: (metadata) => set({ tempEquipmentShortSpecMetadata: metadata }),
  setTempDescriptionText: (text) => set({ tempDescriptionText: text }),
  setTempDescriptionMetadata: (metadata) => set({ tempDescriptionMetadata: metadata }),
  
  toggleSection: (section) => set((state) => ({
    sections: { ...state.sections, [section]: !state.sections[section] }
  })),
  setVirtualizedRange: (range) => set({ virtualizedRange: range }),
  
  openCommentModal: (targetId, targetName, targetType) => set({
    commentModalOpen: true,
    commentTargetId: targetId,
    commentTargetName: targetName,
    commentTargetType: targetType,
  }),
  closeCommentModal: () => set({
    commentModalOpen: false,
    commentTargetId: null,
    commentTargetName: '',
    commentTargetType: null,
  }),
  
  resetFilters: () => set({
    searchQuery: '',
    debouncedSearchQuery: '',
    filterCategory: 'All',
    reviewFilter: 'All',
    commentFilter: 'All',
    sortOrder: 'default',
  }),
}));