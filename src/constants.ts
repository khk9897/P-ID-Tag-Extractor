import { Category, ColorSettings } from './types.ts';

export const DEFAULT_PATTERNS = {
  [Category.Equipment]: '^([^-]*-){2}[^-]*$',
  [Category.Line]: '^(?=.{10,25}$)(?=.*")([^-]*-){3,}[^-]*$',
  [Category.Instrument]: {
    func: '[A-Z]{2,4}',
    num: '\\d{4}(?:\\s?[A-Z])?'
  },
  [Category.DrawingNumber]: '[A-Z\\d-]{5,}-[A-Z\\d-]{5,}-\\d{3,}',
  [Category.NotesAndHolds]: '^(NOTE|HOLD).*',
};

export const DEFAULT_TOLERANCES = {
    [Category.Instrument]: {
        vertical: 15, // px for combining parts
        horizontal: 20, // px for combining parts
        autoLinkDistance: 30, // px for auto-linking notes
    },
};

export const DEFAULT_SETTINGS = {
    autoGenerateLoops: true, // Auto-generate loops after tag extraction
};

export const CATEGORY_COLORS = {
  [Category.Equipment]: {
    border: 'border-sky-400',
    bg: 'bg-sky-500/20',
    text: 'text-sky-400',
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
  [Category.Uncategorized]: {
    border: 'border-slate-500',
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
  },
};

export const DEFAULT_COLORS: ColorSettings = {
  tags: {
    equipment: '#38bdf8',      // Sky blue
    line: '#fb7185',           // Rose
    instrument: '#fbbf24',     // Amber
    drawingNumber: '#818cf8',  // Indigo
    notesAndHolds: '#14b8a6',  // Teal
    uncategorized: '#94a3b8',  // Slate
  },
  relationships: {
    connection: '#38bdf8',      // Sky blue
    installation: '#facc15',    // Yellow
    annotation: '#a78bfa',      // Purple-400 (for linked Raw Text Items)
    note: '#14b8a6',           // Teal (same as NotesAndHolds)
    noteRelated: '#6366f1',    // Indigo-500 (different from note color)
    description: '#f472b6',     // Pink
    equipmentShortSpec: '#10b981', // Emerald
  },
};
