import type { TauntSoundKind } from './soundEffects';

export type StickerArtKind =
  | 'photo'
  | 'stop_shield'
  | 'siren_uno'
  | 'boomerang_rev'
  | 'stack_bomb'
  | 'king_uno'
  | 'trophy_duck'
  | 'golden_rain'
  | 'vip_crown'
  | 'immortal_flame'
  | 'clown_joker'
  | 'skull_zap';

export type StickerRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ZueiraSticker {
  id: string;
  title: string;
  tauntLine: string;
  accentHex: string;
  artKind: StickerArtKind;
  imageUrl?: string;
  badgeText: string;
  soundKind: TauntSoundKind;
  rarity: StickerRarity;
  unlockWinsRequired: number;
  isCustom?: boolean;
  isEdited?: boolean;
}

export interface CustomStickerEditPatch {
  title: string;
  tauntLine: string;
  accentHex: string;
  artKind: StickerArtKind;
  badgeText: string;
  soundKind: TauntSoundKind;
}

const CUSTOM_STICKERS_KEY = 'unozueira_custom_stickers_v1';
const EDITED_STICKERS_KEY = 'unozueira_edited_stickers_v1';

export const STICKER_COLOR_PALETTE: Array<{ label: string; hex: string }> = [
  { label: 'Vermelho Rubi', hex: '#E11D48' },
  { label: 'Azul Elétrico', hex: '#0284C7' },
  { label: 'Ouro Solar', hex: '#D97706' },
  { label: 'Verde Esmeralda', hex: '#16A34A' },
  { label: 'Roxo Coringa', hex: '#7C3AED' },
  { label: 'Laranja Fogo', hex: '#EA580C' },
];

export const STICKER_ART_OPTIONS: Array<{ kind: StickerArtKind; label: string }> = [
  { kind: 'stack_bomb', label: 'Bomba +8' },
  { kind: 'clown_joker', label: 'Coringa Zombador' },
  { kind: 'skull_zap', label: 'Raio Fatal' },
  { kind: 'stop_shield', label: 'Placa Bloqueio' },
  { kind: 'siren_uno', label: 'Sirene UNO' },
  { kind: 'boomerang_rev', label: 'Bumerangue' },
  { kind: 'king_uno', label: 'Coroa 1 Carta' },
  { kind: 'trophy_duck', label: 'Troféu Pato' },
];

export const STICKER_SOUND_OPTIONS: Array<{ kind: TauntSoundKind; label: string }> = [
  { kind: 'horn', label: 'Buzina' },
  { kind: 'laugh', label: 'Risada' },
  { kind: 'boing', label: 'Mola' },
  { kind: 'siren', label: 'Sirene' },
  { kind: 'thunder', label: 'Trovão' },
  { kind: 'royal', label: 'Clarim Real' },
];

export const BASE_ZUEIRA_STICKERS: ZueiraSticker[] = [
  {
    id: 'chora_mais4',
    title: 'CHORA NO +4!',
    tauntLine: 'Aceita que dói menos, toma +4 no colo!',
    accentHex: '#E11D48',
    artKind: 'photo',
    imageUrl: '/src/assets/images/sticker_chora_mais4_1795035836132.jpg',
    badgeText: '+4!',
    soundKind: 'horn',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'compra_tudo',
    title: 'COLECIONADOR!',
    tauntLine: 'Vai abrir papelaria com esse tanto de carta?!',
    accentHex: '#16A34A',
    artKind: 'photo',
    imageUrl: '/src/assets/images/sticker_compra_tudo_1795035837432.jpg',
    badgeText: '20+',
    soundKind: 'boing',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'lanterna_patinho',
    title: 'FREGUÊS VIP!',
    tauntLine: 'Tá na lanterna! Já separa o café pra galera!',
    accentHex: '#D97706',
    artKind: 'photo',
    imageUrl: '/src/assets/images/sticker_lanterna_patinho_1795035836992.jpg',
    badgeText: 'PATO',
    soundKind: 'laugh',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'empilhou_bomba',
    title: 'SEGURA A BOMBA!',
    tauntLine: 'Empilhei sem dó! Passa adiante se for capaz!',
    accentHex: '#DC2626',
    artKind: 'stack_bomb',
    badgeText: '+8!',
    soundKind: 'horn',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'bloqueado_bb',
    title: 'PASSA A VEZ!',
    tauntLine: 'Sentadinho aí só assistindo a rodada!',
    accentHex: '#0284C7',
    artKind: 'stop_shield',
    badgeText: 'STOP',
    soundKind: 'boing',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'esqueceu_uno',
    title: 'CADÊ O UNO?!',
    tauntLine: 'Dormiu no ponto e esqueceu de gritar UNO!',
    accentHex: '#EA580C',
    artKind: 'siren_uno',
    badgeText: 'PEGO!',
    soundKind: 'siren',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'reverteu_cara',
    title: 'VOLTA PRA TU!',
    tauntLine: 'Bateu e voltou! Toma o bumerangue!',
    accentHex: '#7C3AED',
    artKind: 'boomerang_rev',
    badgeText: 'REV',
    soundKind: 'boing',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  {
    id: 'respeita_pai',
    title: 'SÓ FALTA UMA!',
    tauntLine: 'Pode ir embaralhando que essa rodada já é minha!',
    accentHex: '#D97706',
    artKind: 'king_uno',
    badgeText: '1X',
    soundKind: 'laugh',
    rarity: 'common',
    unlockWinsRequired: 0,
  },
  // Special Unlockable Foil / Holographic Cards by Career Wins!
  {
    id: 'sp_trofeu_pato',
    title: 'TROFÉU DE PATO!',
    tauntLine: 'Primeira vitória garantida! Toma essa taça de consolação!',
    accentHex: '#0284C7',
    artKind: 'trophy_duck',
    badgeText: 'RARA',
    soundKind: 'royal',
    rarity: 'rare',
    unlockWinsRequired: 1,
  },
  {
    id: 'sp_chuva_dourada',
    title: 'TEMPESTADE +4!',
    tauntLine: 'Choveu +4 dourado sem guarda-chuva na sua mão!',
    accentHex: '#B45309',
    artKind: 'golden_rain',
    badgeText: 'OURO',
    soundKind: 'thunder',
    rarity: 'epic',
    unlockWinsRequired: 3,
  },
  {
    id: 'sp_rei_camarote',
    title: 'DONO DA MESA!',
    tauntLine: '5 vitórias no bolso! Reverencia quem manda no feltro!',
    accentHex: '#BE123C',
    artKind: 'vip_crown',
    badgeText: 'VIP',
    soundKind: 'royal',
    rarity: 'epic',
    unlockWinsRequired: 5,
  },
  {
    id: 'sp_lenda_imortal',
    title: 'LENDA IMORTAL!',
    tauntLine: '10 vitórias! Pode guardar o baralho que ninguém me pega!',
    accentHex: '#6D28D9',
    artKind: 'immortal_flame',
    badgeText: 'MITO',
    soundKind: 'legendary',
    rarity: 'legendary',
    unlockWinsRequired: 10,
  },
];

// Alias kept for existing imports
export const ZUEIRA_STICKERS = BASE_ZUEIRA_STICKERS;

// Quick 1-tap Partner Signals for 2v2 Duos Mode ("Sinais de Truco")
export const PARTNER_SIGNALS: ZueiraSticker[] = [
  {
    id: 'sig_piscada',
    title: 'SINAL: PISCADINHA!',
    tauntLine: 'Piscou um olho pro parceiro... tem carta boa aí ou é blefe?!',
    accentHex: '#0284C7',
    artKind: 'clown_joker',
    badgeText: '2X2',
    soundKind: 'boing',
    rarity: 'rare',
    unlockWinsRequired: 0,
  },
  {
    id: 'sig_segura4',
    title: 'SINAL: SOLTA A BOMBA!',
    tauntLine: 'Levantou a sobrancelha pedindo +4 na cabeça do rival!',
    accentHex: '#E11D48',
    artKind: 'stack_bomb',
    badgeText: 'SINAL',
    soundKind: 'horn',
    rarity: 'rare',
    unlockWinsRequired: 0,
  },
  {
    id: 'sig_muda_cor',
    title: 'SINAL: MUDA ESSA COR!',
    tauntLine: 'Coçou a orelha pedindo pro parceiro trocar a cor da mesa!',
    accentHex: '#16A34A',
    artKind: 'boomerang_rev',
    badgeText: 'COR!',
    soundKind: 'royal',
    rarity: 'rare',
    unlockWinsRequired: 0,
  },
];

export function isStickerUnlocked(sticker: ZueiraSticker, roundsWon: number): boolean {
  if (sticker.isCustom) return true;
  return roundsWon >= (sticker.unlockWinsRequired || 0);
}

export function getNewlyUnlockedStickers(prevWins: number, nextWins: number): ZueiraSticker[] {
  if (nextWins <= prevWins) return [];
  return BASE_ZUEIRA_STICKERS.filter(
    (s) => s.unlockWinsRequired > prevWins && s.unlockWinsRequired <= nextWins
  );
}

export function sanitizeStickerPatch(input: Partial<CustomStickerEditPatch>): CustomStickerEditPatch {
  const title = (input.title || '').trim().slice(0, 28) || 'ZOEIRA PURA!';
  const tauntLine =
    (input.tauntLine || '').trim().slice(0, 90) || 'Aceita que dói menos na rodada!';
  const badgeText = (input.badgeText || '').trim().toUpperCase().slice(0, 6) || 'ZAP!';
  const validHex = /^#[0-9A-Fa-f]{6}$/.test(input.accentHex || '')
    ? input.accentHex!
    : '#E11D48';
  const allowedArts: StickerArtKind[] = [
    'photo',
    'stop_shield',
    'siren_uno',
    'boomerang_rev',
    'stack_bomb',
    'king_uno',
    'trophy_duck',
    'golden_rain',
    'vip_crown',
    'immortal_flame',
    'clown_joker',
    'skull_zap',
  ];
  const artKind: StickerArtKind =
    input.artKind && allowedArts.includes(input.artKind) ? input.artKind : 'clown_joker';

  const allowedSounds: TauntSoundKind[] = [
    'horn',
    'laugh',
    'boing',
    'siren',
    'thunder',
    'royal',
    'legendary',
  ];
  const soundKind: TauntSoundKind =
    input.soundKind && allowedSounds.includes(input.soundKind) ? input.soundKind : 'horn';

  return {
    title,
    tauntLine,
    accentHex: validHex,
    artKind,
    badgeText,
    soundKind,
  };
}

export function mergeStickersCatalog(
  editsMap: Record<string, CustomStickerEditPatch>,
  customStickers: ZueiraSticker[]
): ZueiraSticker[] {
  const mergedBase = BASE_ZUEIRA_STICKERS.map((base) => {
    const patch = editsMap[base.id];
    if (!patch) return base;
    return {
      ...base,
      title: patch.title,
      tauntLine: patch.tauntLine,
      accentHex: patch.accentHex,
      artKind: patch.artKind,
      badgeText: patch.badgeText,
      soundKind: patch.soundKind,
      isEdited: true,
    };
  });
  return [...customStickers, ...mergedBase];
}

export function loadCustomStickersFromStorage(): ZueiraSticker[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_STICKERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 16).map((item, idx) => {
      const clean = sanitizeStickerPatch(item);
      return {
        id:
          typeof item.id === 'string' && /^custom_[a-zA-Z0-9_-]{1,28}$/.test(item.id)
            ? item.id
            : `custom_${idx + 1}`,
        ...clean,
        rarity: 'rare',
        unlockWinsRequired: 0,
        isCustom: true,
      };
    });
  } catch {
    return [];
  }
}

export function saveCustomStickersToStorage(list: ZueiraSticker[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(list.slice(0, 16)));
  } catch {
    // Ignore quota errors
  }
}

export function loadStickerEditsFromStorage(): Record<string, CustomStickerEditPatch> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(EDITED_STICKERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CustomStickerEditPatch>>;
    const out: Record<string, CustomStickerEditPatch> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object') {
        out[key] = sanitizeStickerPatch(val);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStickerEditsToStorage(map: Record<string, CustomStickerEditPatch>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EDITED_STICKERS_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

export function getStickerById(
  id: string,
  catalog: readonly ZueiraSticker[] = BASE_ZUEIRA_STICKERS
): ZueiraSticker | undefined {
  return catalog.find((s) => s.id === id) || BASE_ZUEIRA_STICKERS.find((s) => s.id === id);
}
