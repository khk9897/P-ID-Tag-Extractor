import { Category, RelationshipType } from '../types.ts';
import * as XLSX from 'xlsx';

export const exportToExcel = (tags, relationships, rawTextItems, descriptions = [], equipmentShortSpecs = [], loops = []) => {
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
  
  XLSX.writeFile(wb, 'P&ID_Tag_Export.xlsx');
};