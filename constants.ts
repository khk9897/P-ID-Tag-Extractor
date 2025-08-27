import { Category } from './types.ts';

export const DEFAULT_PATTERNS = {
  [Category.Equipment]: '^([^-]*-){2}[^-]*$',
  [Category.Line]: '^([^-]*-){3,}[^-]*$',
  [Category.Instrument]: {
    func: '[A-Z]{2,4}',
    num: '\\d{4}(?:\\s?[A-Z])?'
  },
  [Category.DrawingNumber]: '[A-Z\\d-]{5,}-[A-Z\\d-]{5,}-\\d{3,}',
  [Category.NotesAndHolds]: '^(NOTE|HOLD).*',
};

export const DEFAULT_TOLERANCES = {
    [Category.Instrument]: {
        vertical: 15, // px
        horizontal: 20, // px
    },
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