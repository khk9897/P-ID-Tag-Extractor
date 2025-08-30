export const Category = {
  Equipment: 'Equipment',
  Line: 'Line',
  Instrument: 'Instrument',
  DrawingNumber: 'DrawingNumber',
  NotesAndHolds: 'NotesAndHolds',
  Uncategorized: 'Uncategorized',
} as const;

export type CategoryType = typeof Category[keyof typeof Category];

export const RelationshipType = {
  Connection: 'Connection', // A -> B
  Installation: 'Installation', // A is on B
  Annotation: 'Annotation', // Tag -> Raw Text Item
  Note: 'Note', // Equipment/Line/Instrument -> NotesAndHolds Tag
  Description: 'Description', // NotesAndHolds Tag -> Description
  EquipmentShortSpec: 'EquipmentShortSpec', // Equipment Tag -> Equipment Short Spec
} as const;

export type RelationshipTypeValue = typeof RelationshipType[keyof typeof RelationshipType];

// Core data structure interfaces
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RawTextItem {
  id: string;
  text: string;
  page: number;
  bbox: BoundingBox;
}

export interface Tag {
  id: string;
  text: string;
  page: number;
  bbox: BoundingBox;
  category: CategoryType;
  sourceItems: RawTextItem[];
}

export interface Description {
  id: string;
  text: string;
  page: number;
  bbox: BoundingBox;
  sourceItems: (Tag | RawTextItem)[];
  metadata: {
    type: 'Note' | 'Hold';
    scope: 'General' | 'Specific';
    number: number;
  };
}

export interface EquipmentShortSpec {
  id: string;
  text: string;
  page: number;
  bbox: BoundingBox;
  sourceItems: (Tag | RawTextItem)[];
  metadata: {
    originalEquipmentTag: Tag;
  };
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: RelationshipTypeValue;
}

// Component prop interfaces
export interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
  onOpenSettings: () => void;
  onImportProject: (file: File) => void;
  onExportProject: () => void;
  pdfDoc: any; // TODO: Add proper PDF.js types
  currentPage: number;
  setCurrentPage: (page: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  mode: ViewMode;
  onToggleSidePanel: () => void;
  onAutoLinkDescriptions: () => void;
  onAutoLinkNotesAndHolds: () => void;
  onAutoLinkEquipmentShortSpecs: () => void;
  onAutoLinkAll: () => void;
  onRemoveWhitespace: () => void;
}

export type ViewMode = 'select' | 'connect' | 'manualCreate';

export interface PdfUploadProps {
  onFileSelect: (file: File) => void;
}

export interface WorkspaceProps {
  pdfDoc: any; // TODO: Add proper PDF.js types
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  relationships: Relationship[];
  setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>;
  rawTextItems: RawTextItem[];
  descriptions: Description[];
  setDescriptions: React.Dispatch<React.SetStateAction<Description[]>>;
  equipmentShortSpecs: EquipmentShortSpec[];
  setEquipmentShortSpecs: React.Dispatch<React.SetStateAction<EquipmentShortSpec[]>>;
  onCreateTag: (itemsToConvert: RawTextItem[], category: CategoryType) => void;
  onCreateManualTag: (tagData: ManualTagData) => void;
  onCreateDescription: (selectedItems: (Tag | RawTextItem)[]) => void;
  onCreateEquipmentShortSpec: (selectedItems: (Tag | RawTextItem)[]) => void;
  onDeleteTags: (tagIds: string[]) => void;
  onUpdateTagText: (tagId: string, newText: string) => void;
  onDeleteDescriptions: (descriptionIds: string[]) => void;
  onUpdateDescription: (id: string, text: string, metadata: Description['metadata']) => void;
  onDeleteEquipmentShortSpecs: (equipmentShortSpecIds: string[]) => void;
  onUpdateEquipmentShortSpec: (id: string, text: string, metadata?: EquipmentShortSpec['metadata']) => void;
  onDeleteRawTextItems: (itemIds: string[]) => void;
  onUpdateRawTextItemText: (itemId: string, newText: string) => void;
  onAutoLinkDescriptions: () => void;
  onAutoLinkNotesAndHolds: () => void;
  onAutoLinkEquipmentShortSpecs: () => void;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  relationshipStartTag: Tag | null;
  setRelationshipStartTag: (tag: Tag | null) => void;
  showRelationships: boolean;
  setShowRelationships: (show: boolean) => void;
  isSidePanelVisible: boolean;
}

export interface ManualTagData {
  text: string;
  bbox: BoundingBox;
  page: number;
  category: CategoryType;
}

// Settings and configuration interfaces
export interface InstrumentPattern {
  func: string;
  num: string;
}

export interface PatternConfig {
  [Category.Equipment]: string;
  [Category.Line]: string;
  [Category.Instrument]: InstrumentPattern;
  [Category.DrawingNumber]: string;
  [Category.NotesAndHolds]: string;
}

export interface ToleranceConfig {
  [Category.Instrument]: {
    vertical: number;
    horizontal: number;
    autoLinkDistance: number;
  };
}

export interface SettingsModalProps {
  patterns: PatternConfig;
  tolerances: ToleranceConfig;
  onSave: (patterns: PatternConfig, tolerances: ToleranceConfig) => void;
  onClose: () => void;
}

// Project data interfaces
export interface ProjectData {
  pdfFileName: string;
  exportDate: string;
  tags: Tag[];
  relationships: Relationship[];
  rawTextItems: RawTextItem[];
  descriptions: Description[];
  equipmentShortSpecs: EquipmentShortSpec[];
  settings: {
    patterns: PatternConfig;
    tolerances: ToleranceConfig;
  };
}

// Progress tracking interface
export interface ProcessingProgress {
  current: number;
  total: number;
}
