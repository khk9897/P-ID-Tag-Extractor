import { Category, RelationshipType } from '../types.ts';
import * as XLSX from 'xlsx';

export const exportToExcel = (tags, relationships, rawTextItems, descriptions = [], equipmentShortSpecs = [], loops = [], comments = []) => {
  const equipment = tags.filter(t => t.category === Category.Equipment);
  const lines = tags.filter(t => t.category === Category.Line);
  const instruments = tags.filter(t => t.category === Category.Instrument);
  const drawingNumbers = tags.filter(t => t.category === Category.DrawingNumber);

  // Create a map for quick lookup of drawing number by page
  const pageToDrawingNumberMap = new Map(drawingNumbers.map(tag => [tag.page, tag.text]));
  const rawTextItemMap = new Map(rawTextItems.map(item => [item.id, item.text]));

  const getTagText = (id) => tags.find(t => t.id === id)?.text || '';
  
  const getLoopForTag = (tagId) => {
    const loop = loops.find(l => l.tagIds.includes(tagId));
    return loop ? loop.id : '';
  };
  
  const getDescriptionsForTag = (tagId) => {
    return relationships
        .filter(r => r.from === tagId && r.type === RelationshipType.Annotation)
        .map(r => rawTextItemMap.get(r.to))
        .filter(Boolean)
        .join(' | ');
  };

  const getNotesForTag = (tagId) => {
    return relationships
      .filter(r => r.from === tagId && r.type === RelationshipType.Note)
      .map(r => getTagText(r.to))
      .filter(Boolean)
      .join(', ');
  };

  const getCommentsForEntity = (entityId) => {
    const entityComments = comments.filter(c => c.targetId === entityId);
    if (entityComments.length === 0) return '';
    
    return entityComments.map(c => {
      const priorityIcon = c.priority === 'high' ? '🔴' : c.priority === 'medium' ? '🟡' : '⚪';
      const resolvedIcon = c.isResolved ? '✅' : '🕐';
      return `${priorityIcon} ${resolvedIcon} ${c.content} (${c.author})`;
    }).join(' | ');
  };


  // 1. Equipment List Data
  const equipmentData = equipment.map(tag => {
    const instrumentsInstalled = relationships
      .filter(r => r.to === tag.id && r.type === RelationshipType.Installation)
      .map(r => getTagText(r.from))
      .filter(Boolean)
      .join(', ');
    
    const drawingNumber = pageToDrawingNumberMap.get(tag.page) || '';
    const description = getDescriptionsForTag(tag.id);
    const noteAndHold = getNotesForTag(tag.id);
    const loopNumber = getLoopForTag(tag.id);

    return {
      'Tag': tag.text,
      'Loop No': loopNumber,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Instruments Installed': instrumentsInstalled,
      'Related': description,
      'Note & Hold': noteAndHold,
      'Comments': getCommentsForEntity(tag.id),
    };
  });

  // 2. Line List Data
  const lineData = lines.map(tag => {
    const from = relationships
      .filter(r => r.to === tag.id && r.type === RelationshipType.Connection)
      .map(r => getTagText(r.from))
      .filter(Boolean)
      .join(', ');

    const to = relationships
      .filter(r => r.from === tag.id && r.type === RelationshipType.Connection)
      .map(r => getTagText(r.to))
      .filter(Boolean)
      .join(', ');

    const instrumentsInstalled = relationships
      .filter(r => r.to === tag.id && r.type === RelationshipType.Installation)
      .map(r => getTagText(r.from))
      .filter(Boolean)
      .join(', ');
      
    const drawingNumber = pageToDrawingNumberMap.get(tag.page) || '';
    const description = getDescriptionsForTag(tag.id);
    const noteAndHold = getNotesForTag(tag.id);
    const loopNumber = getLoopForTag(tag.id);

    return {
      'Tag': tag.text,
      'Loop No': loopNumber,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'From': from,
      'To': to,
      'Instruments Installed': instrumentsInstalled,
      'Related': description,
      'Note & Hold': noteAndHold,
      'Comments': getCommentsForEntity(tag.id),
    };
  });

  // 3. Instrument List Data
  const instrumentData = instruments.map(tag => {
    const installedOn = relationships
      .filter(r => r.from === tag.id && r.type === RelationshipType.Installation)
      .map(r => getTagText(r.to))
      .filter(Boolean)
      .join(', ');

    const drawingNumber = pageToDrawingNumberMap.get(tag.page) || '';
    const description = getDescriptionsForTag(tag.id);
    const noteAndHold = getNotesForTag(tag.id);
    const loopNumber = getLoopForTag(tag.id);

    return {
      'Tag': tag.text,
      'Loop No': loopNumber,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Installed On': installedOn,
      'Related': description,
      'Note & Hold': noteAndHold,
      'Comments': getCommentsForEntity(tag.id),
    };
  });

  // 4. Description Data
  const descriptionData = descriptions.map(desc => {
    const drawingNumber = pageToDrawingNumberMap.get(desc.page) || '';
    
    return {
      'Type': desc.metadata.type,
      'Number': desc.metadata.number,
      'Scope': desc.metadata.scope,
      'Text': desc.text,
      'Page': desc.page,
      'Drawing Number': drawingNumber,
      'Comments': getCommentsForEntity(desc.id),
    };
  });

  // 5. Equipment Short Spec Data
  const equipmentShortSpecData = equipmentShortSpecs.map(spec => {
    const drawingNumber = pageToDrawingNumberMap.get(spec.page) || '';
    
    return {
      'Equipment Tag': spec.metadata.originalEquipmentTag.text,
      'Service': spec.metadata.service || '',
      'Short Spec': spec.text,
      'Page': spec.page,
      'Drawing Number': drawingNumber,
      'Comments': getCommentsForEntity(spec.id),
    };
  });

  // 6. Comments Data - Dedicated worksheet for all comments
  const commentData = comments.map(comment => {
    // Get target entity information
    const getTargetInfo = (targetId, targetType) => {
      switch (targetType) {
        case 'tag':
          const tag = tags.find(t => t.id === targetId);
          return {
            name: tag ? tag.text : 'Unknown Tag',
            page: tag ? tag.page : '',
            category: tag ? tag.category : ''
          };
        case 'description':
          const desc = descriptions.find(d => d.id === targetId);
          return {
            name: desc ? `${desc.metadata.type} ${desc.metadata.number}` : 'Unknown Description',
            page: desc ? desc.page : '',
            category: 'Description'
          };
        case 'equipmentSpec':
          const spec = equipmentShortSpecs.find(s => s.id === targetId);
          return {
            name: spec ? spec.metadata.originalEquipmentTag.text : 'Unknown Equipment Spec',
            page: spec ? spec.page : '',
            category: 'Equipment Spec'
          };
        case 'loop':
          const loop = loops.find(l => l.id === targetId);
          const loopTags = loop ? loop.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) : [];
          return {
            name: loop ? (loop.name || loop.id) : 'Unknown Loop',
            page: loopTags.length > 0 ? loopTags.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ') : '',
            category: 'Loop'
          };
        case 'relationship':
          const rel = relationships.find(r => r.id === targetId);
          if (!rel) return { name: 'Unknown Relationship', page: '', category: 'Relationship' };
          const fromEntity = [...tags, ...descriptions].find(e => e.id === rel.from);
          const toEntity = [...tags, ...descriptions].find(e => e.id === rel.to);
          return {
            name: `${fromEntity?.text || 'Unknown'} → ${toEntity?.text || 'Unknown'}`,
            page: fromEntity ? fromEntity.page : (toEntity ? toEntity.page : ''),
            category: 'Relationship'
          };
        default:
          return { name: 'Unknown', page: '', category: 'Unknown' };
      }
    };

    const targetInfo = getTargetInfo(comment.targetId, comment.targetType);
    const drawingNumber = targetInfo.page ? (pageToDrawingNumberMap.get(targetInfo.page) || '') : '';
    
    // Convert target type to user-friendly name
    const getTypeDisplayName = (targetType) => {
      switch (targetType) {
        case 'tag': return 'Tags';
        case 'description': return 'Notes';
        case 'equipmentSpec': return 'Equipment Specs';
        case 'relationship': return 'Relations';
        case 'loop': return 'Loops';
        default: return targetType;
      }
    };

    return {
      'Target Type': getTypeDisplayName(comment.targetType),
      'Target Name': targetInfo.name,
      'Category': targetInfo.category,
      'Page': targetInfo.page,
      'Drawing Number': drawingNumber,
      'Priority': comment.priority.toUpperCase(),
      'Status': comment.isResolved ? 'Resolved' : 'Open',
      'Content': comment.content,
      'Author': comment.author,
      'Created': new Date(comment.timestamp).toLocaleString(),
    };
  });
  
  const wb = XLSX.utils.book_new();
  
  const wsEquipment = XLSX.utils.json_to_sheet(equipmentData);
  XLSX.utils.book_append_sheet(wb, wsEquipment, 'Equipment List');

  const wsLines = XLSX.utils.json_to_sheet(lineData);
  XLSX.utils.book_append_sheet(wb, wsLines, 'Line List');

  const wsInstruments = XLSX.utils.json_to_sheet(instrumentData);
  XLSX.utils.book_append_sheet(wb, wsInstruments, 'Instrument List');

  const wsDescriptions = XLSX.utils.json_to_sheet(descriptionData);
  XLSX.utils.book_append_sheet(wb, wsDescriptions, 'Descriptions');

  const wsEquipmentShortSpecs = XLSX.utils.json_to_sheet(equipmentShortSpecData);
  XLSX.utils.book_append_sheet(wb, wsEquipmentShortSpecs, 'Equipment Short Specs');

  const wsComments = XLSX.utils.json_to_sheet(commentData);
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');
  
  XLSX.writeFile(wb, 'P&ID_Tag_Export.xlsx');
};