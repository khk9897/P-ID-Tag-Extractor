import { Category, RelationshipType } from '../types.ts';

export const exportToExcel = (tags, relationships) => {
  const equipment = tags.filter(t => t.category === Category.Equipment);
  const lines = tags.filter(t => t.category === Category.Line);
  const instruments = tags.filter(t => t.category === Category.Instrument);
  const drawingNumbers = tags.filter(t => t.category === Category.DrawingNumber);

  const getTagText = (id) => tags.find(t => t.id === id)?.text || '';

  // 1. Equipment List Data
  const equipmentData = equipment.map(tag => {
    const instrumentsInstalled = relationships
      .filter(r => r.to === tag.id && r.type === RelationshipType.Installation)
      .map(r => getTagText(r.from))
      .filter(Boolean)
      .join(', ');
    
    return {
      'Tag': tag.text,
      'Page': tag.page,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
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

    return {
      'Tag': tag.text,
      'Page': tag.page,
      'Installed On': installedOn,
    };
  });
  
  // 4. Drawing List Data
  const drawingData = drawingNumbers.map(tag => ({
    'Drawing Number': tag.text,
    'Page': tag.page,
  }));


  const wb = (window as any).XLSX.utils.book_new();
  
  const wsEquipment = (window as any).XLSX.utils.json_to_sheet(equipmentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsEquipment, 'Equipment List');

  const wsLines = (window as any).XLSX.utils.json_to_sheet(lineData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsLines, 'Line List');

  const wsInstruments = (window as any).XLSX.utils.json_to_sheet(instrumentData);
  (window as any).XLSX.utils.book_append_sheet(wb, wsInstruments, 'Instrument List');
  
  if (drawingData.length > 0) {
    const wsDrawings = (window as any).XLSX.utils.json_to_sheet(drawingData);
    (window as any).XLSX.utils.book_append_sheet(wb, wsDrawings, 'Drawing List');
  }

  (window as any).XLSX.writeFile(wb, 'P&ID_Tag_Export.xlsx');
};
