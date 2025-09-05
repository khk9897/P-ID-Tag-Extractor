import { Tag, Description, EquipmentShortSpec, Relationship, Comment, Category, Loop } from '../types';

interface FilterOptions {
  searchQuery?: string;
  currentPage?: number;
  showCurrentPageOnly?: boolean;
  filterCategory?: string;
  reviewFilter?: string;
  commentFilter?: string;
  comments?: Comment[];
}

// Optimized single-pass filter function
export function filterTags(tags: Tag[], options: FilterOptions): Tag[] {
  const { 
    searchQuery = '', 
    currentPage, 
    showCurrentPageOnly = false, 
    filterCategory = 'All',
    reviewFilter = 'All',
    commentFilter = 'All',
    comments = []
  } = options;

  const searchLower = searchQuery.toLowerCase();
  
  return tags.filter(tag => {
    // Page filter
    if (showCurrentPageOnly && currentPage !== undefined && tag.page !== currentPage) {
      return false;
    }
    
    // Category filter
    if (filterCategory !== 'All' && tag.category !== filterCategory) {
      return false;
    }
    
    // Search filter
    if (searchQuery && !tag.text.toLowerCase().includes(searchLower)) {
      return false;
    }
    
    // Review filter
    if (reviewFilter === 'Reviewed' && !tag.isReviewed) {
      return false;
    } else if (reviewFilter === 'Not Reviewed' && tag.isReviewed) {
      return false;
    }
    
    // Comment filter
    if (commentFilter !== 'All') {
      const hasComments = comments.some(c => c.targetId === tag.id);
      if (commentFilter === 'WithComments' && !hasComments) {
        return false;
      } else if (commentFilter === 'WithoutComments' && hasComments) {
        return false;
      }
    }
    
    return true;
  });
}

export function filterDescriptions(
  descriptions: Description[], 
  searchQuery: string,
  currentPage?: number,
  showCurrentPageOnly?: boolean
): Description[] {
  const searchLower = searchQuery.toLowerCase();
  
  return descriptions.filter(desc => {
    if (showCurrentPageOnly && currentPage !== undefined && desc.page !== currentPage) {
      return false;
    }
    
    if (searchQuery) {
      const searchableText = `${desc.text} ${desc.metadata?.type || ''} ${desc.metadata?.scope || ''} ${desc.metadata?.number || ''}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
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

export function filterEquipmentShortSpecs(
  specs: EquipmentShortSpec[],
  searchQuery: string,
  currentPage?: number,
  showCurrentPageOnly?: boolean
): EquipmentShortSpec[] {
  const searchLower = searchQuery.toLowerCase();
  
  return specs.filter(spec => {
    if (showCurrentPageOnly && currentPage !== undefined && spec.page !== currentPage) {
      return false;
    }
    
    if (searchQuery) {
      const searchableText = `${spec.text} ${spec.metadata?.originalEquipmentTag?.text || ''} ${spec.metadata?.service || ''}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
}

export function sortEquipmentShortSpecs(specs: EquipmentShortSpec[]): EquipmentShortSpec[] {
  return [...specs].sort((a, b) => {
    const tagA = a.metadata?.originalEquipmentTag?.text || '';
    const tagB = b.metadata?.originalEquipmentTag?.text || '';
    return tagA.localeCompare(tagB);
  });
}

export function filterRelationships(
  relationships: Relationship[],
  tags: Tag[],
  searchQuery: string
): Relationship[] {
  if (!searchQuery) return relationships;
  
  const searchLower = searchQuery.toLowerCase();
  const tagMap = new Map(tags.map(t => [t.id, t]));
  
  return relationships.filter(rel => {
    const sourceTag = tagMap.get(rel.from);
    const targetTag = tagMap.get(rel.to);
    
    return (
      (sourceTag && sourceTag.text.toLowerCase().includes(searchLower)) ||
      (targetTag && targetTag.text.toLowerCase().includes(searchLower))
    );
  });
}

export function filterComments(
  comments: Comment[],
  filter: string
): Comment[] {
  switch (filter) {
    case 'unresolved':
      return comments.filter(c => !c.isResolved);
    case 'resolved':
      return comments.filter(c => c.isResolved);
    case 'high':
      return comments.filter(c => c.priority === 'high');
    case 'medium':
      return comments.filter(c => c.priority === 'medium');
    case 'low':
      return comments.filter(c => c.priority === 'low');
    default:
      return comments;
  }
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