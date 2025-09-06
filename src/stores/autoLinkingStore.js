// AutoLinkingStore - 모든 Auto-linking 로직 전담
import { create } from 'zustand';

const useAutoLinkingStore = create((set, get) => ({
  // State
  isAutoLinking: false,
  
  // Actions
  setIsAutoLinking: (isLinking) => set({ isAutoLinking: isLinking }),

  // 🟢 Auto-link Descriptions (Instrument tags with raw text items)
  autoLinkDescriptions: (tags, rawTextItems, relationships, tolerances, uuidv4, calculateMinDistanceToCorners, onCreateRelationships, onShowAutoLinkRanges, onAlert, showConfirmation) => {
    const autoLinkDistance = tolerances?.Instrument?.autoLinkDistance;
    if (typeof autoLinkDistance !== 'number') {
      onAlert("Auto-link distance is not configured. Please check your settings.");
      return;
    }

    const performLinking = () => {
      onShowAutoLinkRanges(false);
      
      const instrumentTags = tags.filter(t => t.category === 'Instrument');
      const existingAnnotationTargets = new Set(
        relationships
          .filter(r => r.type === 'Annotation')
          .map(r => r.to)
      );
      const unlinkedRawItems = rawTextItems.filter(item => !existingAnnotationTargets.has(item.id));
      const newRelationships = [];

      // For each non-tag item, find the closest instrument tag within distance
      for (const item of unlinkedRawItems) {
        if (existingAnnotationTargets.has(item.id)) continue;

        const pageInstrumentTags = instrumentTags.filter(tag => tag.page === item.page);
        let closestTag = null;
        let minDistance = Infinity;

        for (const instTag of pageInstrumentTags) {
          const instCenter = {
            x: (instTag.bbox.x1 + instTag.bbox.x2) / 2,
            y: (instTag.bbox.y1 + instTag.bbox.y2) / 2
          };

          const distance = calculateMinDistanceToCorners(instCenter.x, instCenter.y, item.bbox);
          
          if (distance <= autoLinkDistance && distance < minDistance) {
            minDistance = distance;
            closestTag = instTag;
          }
        }

        // Create relationship only with the closest instrument tag
        if (closestTag) {
          newRelationships.push({
            id: uuidv4(),
            from: closestTag.id,
            to: item.id,
            type: 'Annotation'
          });
          existingAnnotationTargets.add(item.id); 
        }
      }
      
      if (newRelationships.length > 0) {
        const existingRelsSet = new Set(relationships.map(r => `${r.from}-${r.to}-${r.type}`));
        const uniqueNewRels = newRelationships.filter(r => !existingRelsSet.has(`${r.from}-${r.to}-${r.type}`));
        
        if (uniqueNewRels.length > 0) {
          onCreateRelationships(uniqueNewRels);
          onAlert(`${uniqueNewRels.length} new description link(s) created.`);
        } else {
          onAlert('No new description links could be found. They may already exist.');
        }
      } else {
        onAlert('No new description links could be found with the current settings.');
      }
    };

    // Show range circles first
    onShowAutoLinkRanges(true);
    
    // Show confirmation after a brief delay to display ranges
    setTimeout(() => {
      showConfirmation(
        `This will automatically create description links for all Instrument tags based on the current distance setting (${autoLinkDistance}px). This may create many relationships. Do you want to proceed?`,
        () => {
          onShowAutoLinkRanges(false);
          performLinking();
        }
      );
    }, 500);
  },

  // 🟢 Auto-link Notes and Holds
  autoLinkNotesAndHolds: (tags, descriptions, uuidv4, onCreateRelationships, onAlert, showConfirmation) => {
    const detectNoteHoldType = (tagText) => {
      const lowerText = tagText.toLowerCase();
      if (lowerText.includes('note')) return 'Note';
      if (lowerText.includes('hold')) return 'Hold';
      return null;
    };

    const extractNumbers = (tagText) => {
      // Extract numbers from text (handles comma-separated values)
      const numberMatches = tagText.match(/\d+/g);
      return numberMatches ? numberMatches.map(num => parseInt(num, 10)) : [];
    };

    const performLinking = () => {
      const newRelationships = [];
      const noteHoldTags = tags.filter(t => t.category === 'NotesAndHolds');

      for (const tag of noteHoldTags) {
        const tagType = detectNoteHoldType(tag.text);
        if (!tagType) continue;

        const numbers = extractNumbers(tag.text);
        if (numbers.length === 0) continue;

        // Find matching descriptions on the same page
        const matchingDescriptions = descriptions.filter(desc => 
          desc.page === tag.page && 
          desc.metadata?.type === tagType &&
          numbers.includes(desc.metadata.number)
        );

        for (const desc of matchingDescriptions) {
          const relationshipKey = `${tag.id}-${desc.id}`;
          const existsAlready = newRelationships.some(r => 
            r.from === tag.id && r.to === desc.id && r.type === 'Description'
          );
          
          if (!existsAlready) {
            newRelationships.push({
              id: uuidv4(),
              from: tag.id,
              to: desc.id,
              type: 'Description'
            });
          }
        }
      }

      if (newRelationships.length > 0) {
        onCreateRelationships(newRelationships);
        onAlert(`${newRelationships.length} new Note/Hold link(s) created.`);
      } else {
        onAlert('No new Note/Hold links could be found.');
      }
    };

    showConfirmation(
      'This will automatically link Note/Hold tags with their corresponding descriptions based on numbers. Continue?',
      performLinking
    );
  },

  // 🟢 Auto-link Equipment Short Specs
  autoLinkEquipmentShortSpecs: (tags, equipmentShortSpecs, relationships, uuidv4, onCreateRelationships, onAlert, showConfirmation) => {
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
      const originalTag = shortSpec.metadata?.originalEquipmentTag;
      if (!originalTag) return [];

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

    const performLinking = () => {
      const newRelationships = [];
      const equipmentTags = tags.filter(t => t.category === 'Equipment');
      
      // Track existing relationships to avoid duplicates
      const existingRelationshipKeys = new Set(
        relationships
          .filter(r => r.type === 'EquipmentShortSpec')
          .map(r => `${r.from}-${r.to}`)
      );

      for (const spec of equipmentShortSpecs) {
        const matchingTags = findMatchingEquipmentTags(spec, equipmentTags);
        
        for (const tag of matchingTags) {
          const relationshipKey = `${tag.id}-${spec.id}`;
          if (!existingRelationshipKeys.has(relationshipKey)) {
            newRelationships.push({
              id: uuidv4(),
              from: tag.id,
              to: spec.id,
              type: 'EquipmentShortSpec'
            });
            existingRelationshipKeys.add(relationshipKey);
          }
        }
      }

      if (newRelationships.length > 0) {
        onCreateRelationships(newRelationships);
        onAlert(`${newRelationships.length} new Equipment Short Spec link(s) created.`);
      } else {
        onAlert('No new Equipment Short Spec links could be found.');
      }
    };

    showConfirmation(
      'This will automatically link Equipment tags with their corresponding Short Specs based on tag patterns. Continue?',
      performLinking
    );
  },

  // 🟢 Auto-link All (runs all auto-linking functions in sequence)
  autoLinkAll: async (tags, rawTextItems, relationships, descriptions, equipmentShortSpecs, tolerances, uuidv4, calculateMinDistanceToCorners, onCreateRelationships, onShowAutoLinkRanges, onAlert, showConfirmation) => {
    const store = get();
    
    showConfirmation(
      'This will run all auto-linking functions in sequence: Descriptions, Notes & Holds, and Equipment Short Specs. Continue?',
      async () => {
        try {
          set({ isAutoLinking: true });

          // 1. Auto-link Descriptions
          await new Promise((resolve) => {
            store.autoLinkDescriptions(
              tags, rawTextItems, relationships, tolerances, uuidv4, 
              calculateMinDistanceToCorners, onCreateRelationships, onShowAutoLinkRanges,
              (message) => {
                console.log('Descriptions:', message);
                resolve();
              },
              (message, callback) => callback() // Skip confirmation for batch operation
            );
          });

          // Small delay between operations
          await new Promise(resolve => setTimeout(resolve, 100));

          // 2. Auto-link Notes and Holds
          await new Promise((resolve) => {
            store.autoLinkNotesAndHolds(
              tags, descriptions, uuidv4, onCreateRelationships,
              (message) => {
                console.log('Notes & Holds:', message);
                resolve();
              },
              (message, callback) => callback() // Skip confirmation for batch operation
            );
          });

          // Small delay between operations
          await new Promise(resolve => setTimeout(resolve, 100));

          // 3. Auto-link Equipment Short Specs
          await new Promise((resolve) => {
            store.autoLinkEquipmentShortSpecs(
              tags, equipmentShortSpecs, relationships, uuidv4, onCreateRelationships,
              (message) => {
                console.log('Equipment Short Specs:', message);
                resolve();
              },
              (message, callback) => callback() // Skip confirmation for batch operation
            );
          });

          set({ isAutoLinking: false });
          onAlert('All auto-linking operations completed successfully!');
        } catch (error) {
          set({ isAutoLinking: false });
          onAlert(`Auto-linking failed: ${error.message}`);
        }
      }
    );
  },

  // 🟢 Header Auto-link All Action
  handleAutoLinkAll: async () => {
    try {
      // Import required stores dynamically
      const { default: useTagStore } = await import('./tagStore.js');
      const { default: useRawTextStore } = await import('./rawTextStore.js');
      const { default: useRelationshipStore } = await import('./relationshipStore.js');
      const { default: useDescriptionStore } = await import('./descriptionStore.js');
      const { default: useEquipmentShortSpecStore } = await import('./equipmentShortSpecStore.js');
      const { default: useSettingsStore } = await import('./settingsStore.js');

      const tagStore = useTagStore.getState();
      const rawTextStore = useRawTextStore.getState();
      const relationshipStore = useRelationshipStore.getState();
      const descriptionStore = useDescriptionStore.getState();
      const equipmentShortSpecStore = useEquipmentShortSpecStore.getState();
      const settingsStore = useSettingsStore.getState();

      set({ isAutoLinking: true });

      // Run all auto-linking operations
      await Promise.all([
        new Promise((resolve) => {
          get().autoLinkDescriptions(
            tagStore.tags,
            rawTextStore.rawTextItems,
            relationshipStore.relationships,
            settingsStore.tolerances,
            // Add required dependencies here
            null, // uuidv4
            null, // calculateMinDistanceToCorners
            null, // onCreateRelationships
            () => {}, // onShowAutoLinkRanges
            console.log, // onAlert
            () => resolve() // showConfirmation
          );
        }),
        new Promise((resolve) => {
          get().autoLinkNotesAndHolds(
            tagStore.tags,
            descriptionStore.descriptions,
            relationshipStore.relationships,
            settingsStore.tolerances,
            null, // uuidv4
            null, // calculateMinDistanceToCorners
            null, // onCreateRelationships
            () => {}, // onShowAutoLinkRanges
            console.log, // onAlert
            () => resolve() // showConfirmation
          );
        }),
        new Promise((resolve) => {
          get().autoLinkEquipmentShortSpecs(
            tagStore.tags,
            equipmentShortSpecStore.equipmentShortSpecs,
            relationshipStore.relationships,
            settingsStore.tolerances,
            null, // uuidv4
            null, // calculateMinDistanceToCorners
            null, // onCreateRelationships
            () => {}, // onShowAutoLinkRanges
            console.log, // onAlert
            () => resolve() // showConfirmation
          );
        })
      ]);

      set({ isAutoLinking: false });
      console.log('All auto-linking completed successfully!');
    } catch (error) {
      set({ isAutoLinking: false });
      console.error('Auto-linking failed:', error);
    }
  }
}));

export default useAutoLinkingStore;