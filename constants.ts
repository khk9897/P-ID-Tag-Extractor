import { Category } from './types.ts';

export const DEFAULT_PATTERNS = {
  [Category.Equipment]: 'P-\\d{3,}|TK-\\d{3,}|E-\\d{3,}',
  [Category.Line]: '\\d+"-.+?-\\d+',
  [Category.Instrument]: '[PTFL][IT][ -]?\\d{3,}',
};

export const CATEGORY_COLORS = {
  [Category.Equipment]: {
    border: 'border-sky-400',
    bg: 'bg-sky-500/20',
    text: 'text-sky-400',
  },
  [Category.Line]: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
  [Category.Instrument]: {
    border: 'border-amber-400',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
  [Category.Uncategorized]: {
    border: 'border-slate-500',
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
  },
};
