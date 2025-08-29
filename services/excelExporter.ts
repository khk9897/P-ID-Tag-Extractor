import { Category, RelationshipType } from '../types.ts';

export const exportToExcel = (tags, relationships, rawTextItems) => {
  const equipment = tags.filter(t => t.category === Category.Equipment);
  const lines = tags.filter(t => t.category === Category.Line);
  const instruments = tags.filter(t => t.category === Category.Instrument);
  const drawingNumbers = tags.filter(t => t.category === Category.DrawingNumber);
  const notesAndHolds = tags.filter(t => t.category === Category.NotesAndHolds);

  // Create a map for quick lookup of drawing number by page
  const pageToDrawingNumberMap = new Map(drawingNumbers.map(tag => [tag.page, tag.text]));
  const rawTextItemMap = new Map(rawTextItems.map(item => [item.id, item.text]));

  const getTagText = (id) => tags.find(t => t.id === id)?.text || '';
  
  const getDescriptionsForTag = (tagId) => {
    const annotations = relationships
        .filter(r => r.from === tagId && r.type === RelationshipType.Annotation)
        .map(r => rawTextItemMap.get(r.to))
        .filter(Boolean)
        .join(' | ');
    
    const notes = relationships
        .filter(r => r.from === tagId && r.type === RelationshipType.Note)
        .map(r => getTagText(r.to))
        .filter(Boolean)
        .join(' | ');

    return [annotations, notes].filter(Boolean).join(' | ');
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Instruments Installed': instrumentsInstalled,
      'Description': description,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'From': from,
      'To': to,
      'Instruments Installed': instrumentsInstalled,
      'Description': description,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Installed On': installedOn,
      'Description': description,
    };
  });

  // 4. Notes & Holds List Data
  const notesAndHoldsData = notesAndHolds.map(tag => {
    const drawingNumber = pageToDrawingNumberMap.get(tag.page) || '';
    return {
      'Note / Hold': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
    };
  });
  
  const wb = (window as any).XLSX.utils.book_new();
  
  const wsEquipment = (window as any).XLSX.utils.json_to_sheet(equipmentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsEquipment, 'Equipment List');

  const wsLines = (window as any).XLSX.utils.json_to_sheet(lineData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsLines, 'Line List');

  const wsInstruments = (window as any).XLSX.utils.json_to_sheet(instrumentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsInstruments, 'Instrument List');

  const wsNotes = (window as any).XLSX.utils.json_to_sheet(notesAndHoldsData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsNotes, 'Notes and Holds');
  
  (window as any).XLSX.writeFile(wb, 'P&ID_Tag_Export.xlsx');
};