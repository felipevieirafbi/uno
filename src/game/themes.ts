export type TableThemeId = 'emerald_classic' | 'boteco_raiz' | 'casino_royal' | 'cyber_neon';
export type CardBackId = 'classic_red' | 'gold_vip' | 'holo_cyber';

export interface TableThemeSpec {
  id: TableThemeId;
  name: string;
  subtitle: string;
  unlockWinsRequired: number;
  feltGradient: string;
  railBorderClass: string;
  baseBgClass: string;
  swatchHex: string;
}

export interface CardBackSpec {
  id: CardBackId;
  name: string;
  unlockWinsRequired: number;
  outerBgClass: string;
  ovalBgClass: string;
  labelClass: string;
  swatchHex: string;
}

export const TABLE_THEMES: TableThemeSpec[] = [
  {
    id: 'emerald_classic',
    name: 'Feltro Imperial',
    subtitle: 'Mesa clássica verde esmeralda e mogno',
    unlockWinsRequired: 0,
    feltGradient: 'radial-gradient(circle at 50% 46%, #115735 0%, #0B3B24 52%, #062114 100%)',
    railBorderClass: 'border-[#3B2216]/80',
    baseBgClass: 'bg-[#072818]',
    swatchHex: '#115735',
  },
  {
    id: 'boteco_raiz',
    name: 'Boteco Raiz',
    subtitle: 'Pano verde musgo e madeira imbuia de resenha',
    unlockWinsRequired: 1,
    feltGradient: 'radial-gradient(circle at 50% 46%, #24532B 0%, #16371B 54%, #0B1F0E 100%)',
    railBorderClass: 'border-[#6B3E1E]/85',
    baseBgClass: 'bg-[#0B1F0E]',
    swatchHex: '#3A6B24',
  },
  {
    id: 'casino_royal',
    name: 'Cassino Royal',
    subtitle: 'Feltro safira meia-noite com friso dourado',
    unlockWinsRequired: 3,
    feltGradient: 'radial-gradient(circle at 50% 46%, #123D6B 0%, #0A2544 54%, #051326 100%)',
    railBorderClass: 'border-amber-500/45',
    baseBgClass: 'bg-[#051326]',
    swatchHex: '#123D6B',
  },
  {
    id: 'cyber_neon',
    name: 'Arena Neon',
    subtitle: 'Mesa noturna violeta com borda elétrica',
    unlockWinsRequired: 5,
    feltGradient: 'radial-gradient(circle at 50% 46%, #31145C 0%, #1B0B38 54%, #0C051C 100%)',
    railBorderClass: 'border-fuchsia-400/50',
    baseBgClass: 'bg-[#0C051C]',
    swatchHex: '#4C1D95',
  },
];

export const DARK_SIDE_FELT_GRADIENT =
  'radial-gradient(circle at 50% 46%, #580C28 0%, #2C0615 54%, #120209 100%)';

export const CARD_BACKS: CardBackSpec[] = [
  {
    id: 'classic_red',
    name: 'Rubi Clássico',
    unlockWinsRequired: 0,
    outerBgClass: 'bg-[#18181B] border-amber-400/30',
    ovalBgClass: 'bg-[#E11D48]',
    labelClass: 'text-amber-300',
    swatchHex: '#E11D48',
  },
  {
    id: 'gold_vip',
    name: 'Ouro Imperial',
    unlockWinsRequired: 2,
    outerBgClass: 'bg-[#1C1917] border-amber-300/75',
    ovalBgClass: 'bg-[#D97706]',
    labelClass: 'text-[#FFFDF9]',
    swatchHex: '#D97706',
  },
  {
    id: 'holo_cyber',
    name: 'Prisma Neon',
    unlockWinsRequired: 4,
    outerBgClass: 'bg-[#0F172A] border-cyan-300/70',
    ovalBgClass: 'bg-[#7C3AED]',
    labelClass: 'text-cyan-200',
    swatchHex: '#7C3AED',
  },
];

const APPEARANCE_KEY = 'unozueira_appearance_v1';

export interface AppearancePrefs {
  tableTheme: TableThemeId;
  cardBack: CardBackId;
}

export function loadAppearancePrefs(): AppearancePrefs {
  if (typeof window === 'undefined') {
    return { tableTheme: 'emerald_classic', cardBack: 'classic_red' };
  }
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return { tableTheme: 'emerald_classic', cardBack: 'classic_red' };
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    const validTheme = TABLE_THEMES.some((t) => t.id === parsed.tableTheme)
      ? parsed.tableTheme!
      : 'emerald_classic';
    const validBack = CARD_BACKS.some((b) => b.id === parsed.cardBack)
      ? parsed.cardBack!
      : 'classic_red';
    return { tableTheme: validTheme, cardBack: validBack };
  } catch {
    return { tableTheme: 'emerald_classic', cardBack: 'classic_red' };
  }
}

export function saveAppearancePrefs(prefs: AppearancePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function getActiveTableTheme(id: TableThemeId, roundsWon: number): TableThemeSpec {
  const found = TABLE_THEMES.find((t) => t.id === id);
  if (found && roundsWon >= found.unlockWinsRequired) return found;
  return TABLE_THEMES[0];
}

export function getActiveCardBack(id: CardBackId, roundsWon: number): CardBackSpec {
  const found = CARD_BACKS.find((b) => b.id === id);
  if (found && roundsWon >= found.unlockWinsRequired) return found;
  return CARD_BACKS[0];
}
