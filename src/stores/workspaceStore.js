// WorkspaceStore - Workspace 컴포넌트 상태 관리 전담
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useWorkspaceStore = create(
  immer((set, get) => ({
    // === 선택 관리 ===
    selectedTagIds: [],
    selectedDescriptionIds: [],
    selectedEquipmentShortSpecIds: [],
    tagSelectionSource: null, // 'pdf' | 'panel' | null
    
    // === 수동 생성 데이터 ===
    manualCreationData: null, // {bbox, page}
    
    // === 핑 효과 관리 ===
    pingedTagId: null,
    pingedDescriptionId: null,
    pingedEquipmentShortSpecId: null,
    pingedRelationshipId: null,
    
    // === 편집 상태 ===
    isEditingTag: false,
    editTagText: '',
    editingRawTextItems: new Set(),
    
    // === PdfViewer 편집 상태 (PdfViewerStore에서 통합) ===
    editingTagId: null,
    editingRawTextId: null,
    editingText: '',
    
    // === Actions: 선택 관리 ===
    setSelectedTagIds: (ids) => set((state) => {
      state.selectedTagIds = ids;
    }),
    
    addSelectedTagId: (id) => set((state) => {
      if (!state.selectedTagIds.includes(id)) {
        state.selectedTagIds.push(id);
      }
    }),
    
    removeSelectedTagId: (id) => set((state) => {
      state.selectedTagIds = state.selectedTagIds.filter(tagId => tagId !== id);
    }),
    
    setSelectedDescriptionIds: (ids) => set((state) => {
      state.selectedDescriptionIds = ids;
    }),
    
    addSelectedDescriptionId: (id) => set((state) => {
      if (!state.selectedDescriptionIds.includes(id)) {
        state.selectedDescriptionIds.push(id);
      }
    }),
    
    removeSelectedDescriptionId: (id) => set((state) => {
      state.selectedDescriptionIds = state.selectedDescriptionIds.filter(descId => descId !== id);
    }),
    
    setSelectedEquipmentShortSpecIds: (ids) => set((state) => {
      state.selectedEquipmentShortSpecIds = ids;
    }),
    
    addSelectedEquipmentShortSpecId: (id) => set((state) => {
      if (!state.selectedEquipmentShortSpecIds.includes(id)) {
        state.selectedEquipmentShortSpecIds.push(id);
      }
    }),
    
    removeSelectedEquipmentShortSpecId: (id) => set((state) => {
      state.selectedEquipmentShortSpecIds = state.selectedEquipmentShortSpecIds.filter(specId => specId !== id);
    }),
    
    setTagSelectionSource: (source) => set((state) => {
      state.tagSelectionSource = source;
    }),
    
    // === Actions: 선택 해제 ===
    handleDeselectTag: (tagId) => set((state) => {
      state.selectedTagIds = state.selectedTagIds.filter(id => id !== tagId);
      
      // 모든 태그가 선택 해제되면 소스도 클리어
      if (state.selectedTagIds.length === 0) {
        state.tagSelectionSource = null;
      }
    }),
    
    handleDeselectDescription: (descriptionId) => set((state) => {
      state.selectedDescriptionIds = state.selectedDescriptionIds.filter(id => id !== descriptionId);
    }),
    
    handleDeselectEquipmentShortSpec: (equipmentShortSpecId) => set((state) => {
      state.selectedEquipmentShortSpecIds = state.selectedEquipmentShortSpecIds.filter(id => id !== equipmentShortSpecId);
    }),
    
    handleClearSelection: () => set((state) => {
      state.selectedTagIds = [];
      state.selectedDescriptionIds = [];
      state.selectedEquipmentShortSpecIds = [];
      state.tagSelectionSource = null;
    }),
    
    // === Actions: 수동 생성 관리 ===
    setManualCreationData: (data) => set((state) => {
      state.manualCreationData = data;
    }),
    
    handleManualAreaSelect: (bbox, page) => set((state) => {
      state.manualCreationData = { bbox, page };
    }),
    
    handleClearManualCreation: () => set((state) => {
      state.manualCreationData = null;
    }),
    
    // === Actions: 핑 효과 관리 ===
    setPingedTagId: (tagId) => set((state) => {
      state.pingedTagId = tagId;
      
      // Auto-clear after 3 seconds
      if (tagId) {
        setTimeout(() => {
          set((state) => {
            if (state.pingedTagId === tagId) {
              state.pingedTagId = null;
            }
          });
        }, 3000);
      }
    }),
    
    setPingedDescriptionId: (descriptionId) => set((state) => {
      state.pingedDescriptionId = descriptionId;
      
      // Auto-clear after 3 seconds
      if (descriptionId) {
        setTimeout(() => {
          set((state) => {
            if (state.pingedDescriptionId === descriptionId) {
              state.pingedDescriptionId = null;
            }
          });
        }, 3000);
      }
    }),
    
    setPingedEquipmentShortSpecId: (equipmentShortSpecId) => set((state) => {
      state.pingedEquipmentShortSpecId = equipmentShortSpecId;
      
      // Auto-clear after 3 seconds
      if (equipmentShortSpecId) {
        setTimeout(() => {
          set((state) => {
            if (state.pingedEquipmentShortSpecId === equipmentShortSpecId) {
              state.pingedEquipmentShortSpecId = null;
            }
          });
        }, 3000);
      }
    }),
    
    setPingedRelationshipId: (relationshipId) => set((state) => {
      state.pingedRelationshipId = relationshipId;
      
      // Auto-clear after 3 seconds
      if (relationshipId) {
        setTimeout(() => {
          set((state) => {
            if (state.pingedRelationshipId === relationshipId) {
              state.pingedRelationshipId = null;
            }
          });
        }, 3000);
      }
    }),
    
    // === Actions: 편집 상태 관리 ===
    setIsEditingTag: (isEditing) => set((state) => {
      state.isEditingTag = isEditing;
    }),
    
    setEditTagText: (text) => set((state) => {
      state.editTagText = text;
    }),
    
    handleStartEditTag: (tag) => set((state) => {
      state.isEditingTag = true;
      state.editTagText = tag.text;
    }),
    
    handleCancelTagEdit: () => set((state) => {
      state.isEditingTag = false;
      state.editTagText = '';
    }),
    
    setEditingRawTextItems: (items) => set((state) => {
      state.editingRawTextItems = items;
    }),
    
    addEditingRawTextItem: (itemId) => set((state) => {
      const newSet = new Set(state.editingRawTextItems);
      newSet.add(itemId);
      state.editingRawTextItems = newSet;
    }),
    
    removeEditingRawTextItem: (itemId) => set((state) => {
      const newSet = new Set(state.editingRawTextItems);
      newSet.delete(itemId);
      state.editingRawTextItems = newSet;
    }),
    
    clearEditingRawTextItems: () => set((state) => {
      state.editingRawTextItems = new Set();
    }),
    
    // === Actions: PdfViewer 편집 상태 (PdfViewerStore에서 통합) ===
    setEditingTagId: (tagId) => set((state) => {
      state.editingTagId = tagId;
      state.editingRawTextId = null;
    }),
    
    setEditingRawTextId: (rawTextId) => set((state) => {
      state.editingRawTextId = rawTextId;
      state.editingTagId = null;
    }),
    
    setEditingText: (text) => set((state) => {
      state.editingText = text;
    }),
    
    clearEditing: () => set((state) => {
      state.editingTagId = null;
      state.editingRawTextId = null;
      state.editingText = '';
    }),
    
    // === 유틸리티 메서드 ===
    hasSelectedItems: () => {
      const state = get();
      return state.selectedTagIds.length > 0 || 
             state.selectedDescriptionIds.length > 0 || 
             state.selectedEquipmentShortSpecIds.length > 0;
    },
    
    getSelectedItemsCount: () => {
      const state = get();
      return state.selectedTagIds.length + 
             state.selectedDescriptionIds.length + 
             state.selectedEquipmentShortSpecIds.length;
    },
    
    isTagSelected: (tagId) => {
      const state = get();
      return state.selectedTagIds.includes(tagId);
    },
    
    isDescriptionSelected: (descriptionId) => {
      const state = get();
      return state.selectedDescriptionIds.includes(descriptionId);
    },
    
    isEquipmentShortSpecSelected: (equipmentShortSpecId) => {
      const state = get();
      return state.selectedEquipmentShortSpecIds.includes(equipmentShortSpecId);
    },
    
    isTagPinged: (tagId) => {
      const state = get();
      return state.pingedTagId === tagId;
    },
    
    isDescriptionPinged: (descriptionId) => {
      const state = get();
      return state.pingedDescriptionId === descriptionId;
    },
    
    isEquipmentShortSpecPinged: (equipmentShortSpecId) => {
      const state = get();
      return state.pingedEquipmentShortSpecId === equipmentShortSpecId;
    },
    
    isRelationshipPinged: (relationshipId) => {
      const state = get();
      return state.pingedRelationshipId === relationshipId;
    },
    
    // === 유틸리티 메서드: PdfViewer 편집 상태 체크 ===
    isEditingTag: (tagId) => {
      const state = get();
      return state.editingTagId === tagId;
    },
    
    isEditingRawText: (rawTextId) => {
      const state = get();
      return state.editingRawTextId === rawTextId;
    },
    
    hasActiveEdit: () => {
      const state = get();
      return !!(state.editingTagId || state.editingRawTextId);
    },
    
    // === 초기화 ===
    resetAll: () => set((state) => {
      state.selectedTagIds = [];
      state.selectedDescriptionIds = [];
      state.selectedEquipmentShortSpecIds = [];
      state.tagSelectionSource = null;
      state.manualCreationData = null;
      state.pingedTagId = null;
      state.pingedDescriptionId = null;
      state.pingedEquipmentShortSpecId = null;
      state.pingedRelationshipId = null;
      state.isEditingTag = false;
      state.editTagText = '';
      state.editingRawTextItems = new Set();
      state.editingTagId = null;
      state.editingRawTextId = null;
      state.editingText = '';
    })
  }))
);

export default useWorkspaceStore;