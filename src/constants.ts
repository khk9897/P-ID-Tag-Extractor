import { Category, ColorSettings } from './types.ts';

export const DEFAULT_PATTERNS = {
  [Category.Equipment]: '^([^-]*-){2}[^-]*$',
  [Category.Line]: '^(?=.{10,25}$)(?=.*")([^-]*-){3,}[^-]*$',
  [Category.Instrument]: {
    func: '[A-Z]{2,4}',
    num: '\\d{3,4}(?:\\s?[A-Z])?'
  },
  [Category.DrawingNumber]: '[A-Z\\d-]{5,}-[A-Z\\d-]{5,}-\\d{3,}',
  [Category.NotesAndHolds]: '^(NOTE|HOLD).*',
  [Category.SpecialItem]: '',
  [Category.OffPageConnector]: '^[A-Z0-9]{1,3}$',
};

export const DEFAULT_TOLERANCES = {
    [Category.Instrument]: {
        vertical: 15, // px for combining parts
        horizontal: 20, // px for combining parts
        autoLinkDistance: 30, // px for auto-linking notes
    },
    [Category.OffPageConnector]: {
        vertical: 15, // px for combining drawing number with reference
        horizontal: 20, // px for combining drawing number with reference
        autoLinkDistance: 30, // px for auto-linking related elements
    },
};

export const DEFAULT_SETTINGS = {
    autoGenerateLoops: true, // Auto-generate loops after tag extraction
    autoRemoveWhitespace: true, // Auto-remove whitespace from tags (except NotesAndHolds)
    hyphenSettings: {
        equipment: false,
        line: false,
        instrument: true, // Default to true for instruments
        drawingNumber: false,
        notesAndHolds: false,
        specialItem: true, // Default to true for special items
        offPageConnector: false, // OPC tags don't typically need hyphen handling
    },
};

export const CATEGORY_COLORS = {
  [Category.Equipment]: {
    border: 'border-orange-400',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
  },
  [Category.Line]: {
    border: 'border-rose-400',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
  },
  [Category.Instrument]: {
    border: 'border-amber-400',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
  [Category.DrawingNumber]: {
    border: 'border-indigo-400',
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
  },
  [Category.NotesAndHolds]: {
    border: 'border-teal-400',
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
  },
  [Category.SpecialItem]: {
    border: 'border-purple-400',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
  },
  [Category.OffPageConnector]: {
    border: 'border-violet-400',
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
  },
  [Category.Uncategorized]: {
    border: 'border-slate-500',
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
  },
};

export const DEFAULT_COLORS: ColorSettings = {
  entities: {
    equipment: '#f97316',      // Orange
    line: '#fb7185',           // Rose
    instrument: '#fbbf24',     // Amber
    drawingNumber: '#818cf8',  // Indigo
    notesAndHolds: '#14b8a6',  // Teal
    specialItem: '#c084fc',    // Purple
    offPageConnector: '#8b5cf6', // Violet
    uncategorized: '#94a3b8',  // Slate
    description: '#a855f7',     // Purple (for Note & Hold descriptions)
    equipmentShortSpec: '#fb923c', // Light Orange (for equipment short specs)
  },
  relationships: {
    connection: '#38bdf8',      // Sky blue (arrow line)
    installation: '#facc15',    // Yellow (arrow line)
    annotation: '#a78bfa',      // Purple-400 (line & linked raw text)
    note: '#14b8a6',           // Teal (line connecting to notes)
    offPageConnection: '#8b5cf6', // Violet (OPC connection line)
  },
  highlights: {
    primary: '#ef4444',        // Red-500 (primary selection/ping)
    note: '#8b5cf6',          // Violet-500 (note-related items)
    equipment: '#f97316',     // Orange-500 (equipment-related items)
    description: '#a855f7',   // Purple-500 (description items)
    related: '#6366f1',       // Indigo-500 (related tags)
    // Legacy support
    noteRelated: '#6366f1',   // Keep for backward compatibility
    selected: '#ef4444',      // Keep for backward compatibility
  },
};

export const EXTERNAL_LINKS = {
  NOTION_GUIDE: 'https://www.notion.so/gs-enc/P-ID-Smart-Digitizer-262e12e04a1080f49111c88cd60a32dc',
  REGEX_HELPER: 'https://chatgpt.com/g/g-dB9e8cEts-regex-helper',
};
