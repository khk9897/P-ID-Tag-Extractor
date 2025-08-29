export const Category = {
  Equipment: 'Equipment',
  Line: 'Line',
  Instrument: 'Instrument',
  DrawingNumber: 'DrawingNumber',
  NotesAndHolds: 'NotesAndHolds',
  Uncategorized: 'Uncategorized',
};

export const RelationshipType = {
  Connection: 'Connection', // A -> B
  Installation: 'Installation', // A is on B
  Annotation: 'Annotation', // Tag -> Raw Text Item
  Note: 'Note', // Equipment/Line/Instrument -> NotesAndHolds Tag
};
