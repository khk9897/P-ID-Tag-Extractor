import { Category, RelationshipType } from '../types.ts';

export const exportToExcel = (tags, relationships) => {
  const equipment = tags.filter(t => t.category === Category.Equipment);
  const lines = tags.filter(t => t.category === Category.Line);
  const instruments = tags.filter(t => t.category === Category.Instrument);
  const drawingNumbers = tags.filter(t => t.category === Category.DrawingNumber);

  // Create a map for quick lookup of drawing number by page
  const pageToDrawingNumberMap = new Map(drawingNumbers.map(tag => [tag.page, tag.text]));

  const getTagText = (id) => tags.find(t => t.id === id)?.text || '';

  // 1. Equipment List Data
  const equipmentData = equipment.map(tag => {
    const instrumentsInstalled = relationships
      .filter(r => r.to === tag.id && r.type === RelationshipType.Installation)
      .map(r => getTagText(r.from))
      .filter(Boolean)
      .join(', ');
    
    const drawingNumber = pageToDrawingNumberMap.get(tag.page) || '';

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Instruments Installed': instrumentsInstalled,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'From': from,
      'To': to,
      'Instruments Installed': instrumentsInstalled,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Drawing Number': drawingNumber,
      'Installed On': installedOn,
    };
  });
  
  const wb = (window as any).XLSX.utils.book_new();
  
  const wsEquipment = (window as any).XLSX.utils.json_to_sheet(equipmentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsEquipment, 'Equipment List');

  const wsLines = (window as any).XLSX.utils.json_to_sheet(lineData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsLines, 'Line List');

  const wsInstruments = (window as any).XLSX.utils.json_to_sheet(instrumentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsInstruments, 'Instrument List');
  
  (window as any).XLSX.writeFile(wb, 'P&ID_Tag_Export.xlsx');
};