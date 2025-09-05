import { Tag, Description, EquipmentShortSpec, Comment, Category } from '../types';

export type SortOrder = 'default' | 'page' | 'alphabetical' | 'category' | 'instrument-number-function';

// Optimized tag sorting
export function sortTags(tags: Tag[], sortOrder: SortOrder): Tag[] {
  const sorted = [...tags]; // Create a copy to avoid mutating original
  
  switch (sortOrder) {
    case 'page':
      return sorted.sort((a, b) => {
        const pageDiff = a.page - b.page;
        if (pageDiff !== 0) return pageDiff;
        return a.text.localeCompare(b.text);
      });
      
    case 'alphabetical':
      return sorted.sort((a, b) => a.text.localeCompare(b.text));
      
    case 'category':
      const categoryOrder: Record<string, number> = {
        [Category.Equipment]: 1,
        [Category.Line]: 2,
        [Category.Instrument]: 3,
        [Category.DrawingNumber]: 4,
        [Category.NotesAndHolds]: 5,
      };
      
      return sorted.sort((a, b) => {
        const orderA = categoryOrder[a.category] || 999;
        const orderB = categoryOrder[b.category] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.text.localeCompare(b.text);
      });
      
    case 'instrument-number-function':
      // Special sorting for instruments: parse number and function
      return sorted.sort((a, b) => {
        if (a.category !== Category.Instrument || b.category !== Category.Instrument) {
          return a.text.localeCompare(b.text);
        }
        
        const parseInstrument = (text: string) => {
          const match = text.match(/^([A-Z]+)-?(\d+)([A-Z]*)/);
          if (!match) return { func: text, num: 0, suffix: '' };
          return {
            func: match[1],
            num: parseInt(match[2]) || 0,
            suffix: match[3] || ''
          };
        };
        
        const instA = parseInstrument(a.text);
        const instB = parseInstrument(b.text);
        
        // Sort by number first
        if (instA.num !== instB.num) {
          return instA.num - instB.num;
        }
        
        // Then by function
        if (instA.func !== instB.func) {
          return instA.func.localeCompare(instB.func);
        }
        
        // Finally by suffix
        return instA.suffix.localeCompare(instB.suffix);
      });
      
    default:
      return sorted;
  }
}

export function sortDescriptions(descriptions: Description[]): Description[] {
  return [...descriptions].sort((a, b) => {
    const pageDiff = a.page - b.page;
    if (pageDiff !== 0) return pageDiff;
    
    const typeA = a.metadata?.type || '';
    const typeB = b.metadata?.type || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    
    const numA = parseInt(String(a.metadata?.number || '0'));
    const numB = parseInt(String(b.metadata?.number || '0'));
    return numA - numB;
  });
}

export function sortEquipmentShortSpecs(specs: EquipmentShortSpec[]): EquipmentShortSpec[] {
  return [...specs].sort((a, b) => {
    const tagA = a.metadata?.originalEquipmentTag?.text || '';
    const tagB = b.metadata?.originalEquipmentTag?.text || '';
    return tagA.localeCompare(tagB);
  });
}

export function sortComments(comments: Comment[]): Comment[] {
  const priorityOrder: Record<string, number> = {
    'high': 1,
    'medium': 2,
    'low': 3
  };
  
  return [...comments].sort((a, b) => {
    // Unresolved first
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? 1 : -1;
    }
    
    // Then by priority
    const priorityA = priorityOrder[a.priority] || 999;
    const priorityB = priorityOrder[b.priority] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Finally by timestamp
    return b.timestamp - a.timestamp;
  });
}