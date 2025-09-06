// ContentStore - 레거시 호환성을 위한 통합 인터페이스
// DEPRECATED: 새로운 코드에서는 DescriptionStore, EquipmentShortSpecStore 직접 사용 권장
import { create } from 'zustand';
import useDescriptionStore from './descriptionStore.js';
import useEquipmentShortSpecStore from './equipmentShortSpecStore.js';

const useContentStore = create((set, get) => ({
  // Proxy getters for backward compatibility
  get descriptions() {
    return useDescriptionStore.getState().descriptions;
  },
  
  get equipmentShortSpecs() {
    return useEquipmentShortSpecStore.getState().equipmentShortSpecs;
  },

  // Proxy methods for backward compatibility
  setDescriptions: (descriptions) => {
    useDescriptionStore.getState().setDescriptions(descriptions);
  },
  
  setEquipmentShortSpecs: (specs) => {
    useEquipmentShortSpecStore.getState().setEquipmentShortSpecs(specs);
  },
  
  updateDescription: (id, text, metadata) => {
    useDescriptionStore.getState().updateDescription(id, text, metadata);
  },
  
  updateEquipmentShortSpec: (id, text) => {
    useEquipmentShortSpecStore.getState().updateEquipmentShortSpec(id, text);
  },

  // Complex operations - delegate to appropriate stores
  createDescriptionFromItems: (selectedItems, type, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems) => {
    useDescriptionStore.getState().createDescriptionFromItems(
      selectedItems, type, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems
    );
  },

  createEquipmentShortSpecFromItems: (selectedItems, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems) => {
    useEquipmentShortSpecStore.getState().createEquipmentShortSpecFromItems(
      selectedItems, tags, relationships, uuidv4, onCreateRelationships, onRemoveTags, onRemoveRawTextItems
    );
  }
}));

export default useContentStore;