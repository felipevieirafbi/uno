import React, { useEffect, useState } from 'react';
import { Lock, RotateCcw, Trash2, Volume2, X, Check } from 'lucide-react';
import {
  STICKER_ART_OPTIONS,
  STICKER_COLOR_PALETTE,
  STICKER_SOUND_OPTIONS,
  sanitizeStickerPatch,
  type CustomStickerEditPatch,
  type StickerArtKind,
  type StickerRarity,
  type ZueiraSticker,
} from '../game/stickers';
import { soundFx, type TauntSoundKind } from '../game/soundEffects';
import { haptics } from '../game/haptics';
import type { ChatMessageItem, LiveTauntEvent } from '../lib/roomService';

export function resolveStickerFromEvent(
  eventOrMsg: Pick<
    LiveTauntEvent & ChatMessageItem,
    | 'stickerId'
    | 'customTitle'
    | 'customBadge'
    | 'customColor'
    | 'customArt'
    | 'rarity'
    | 'soundKind'
  > & { customLine?: string; text?: string },
  catalog: readonly ZueiraSticker[]
): ZueiraSticker | undefined {
  const found = catalog.find((s) => s.id === eventOrMsg.stickerId);
  if (found && !eventOrMsg.customTitle) {
    return found;
  }
  if (found || eventOrMsg.customTitle) {
    return {
      id: eventOrMsg.stickerId || 'custom_remote',
      title: eventOrMsg.customTitle || found?.title || 'ZOEIRA!',
      tauntLine:
        eventOrMsg.customLine || eventOrMsg.text || found?.tauntLine || 'Toma essa na mesa!',
      badgeText: eventOrMsg.customBadge || found?.badgeText || 'ZAP!',
      accentHex: eventOrMsg.customColor || found?.accentHex || '#E11D48',
      artKind: (eventOrMsg.customArt as StickerArtKind) || found?.artKind || 'clown_joker',
      imageUrl:
        (!eventOrMsg.customArt || eventOrMsg.customArt === 'photo') && found?.imageUrl
          ? found.imageUrl
          : undefined,
      soundKind: (eventOrMsg.soundKind as TauntSoundKind) || found?.soundKind || 'horn',
      rarity: (eventOrMsg.rarity as StickerRarity) || found?.rarity || 'common',
      unlockWinsRequired: found?.unlockWinsRequired ?? 0,
      isCustom: found?.isCustom,
      isEdited: found?.isEdited,
    };
  }
  return undefined;
}

interface ZueiraCardArtProps {
  sticker: ZueiraSticker;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
}

const RARITY_FRAME: Record<
  StickerRarity,
  { outer: string; badgeBg: string; showFoil: boolean; label: string }
> = {
  common: {
    outer: 'border-2 border-[#FFFDF9]/90 shadow-md',
    badgeBg: 'bg-zinc-950/85 text-amber-300',
    showFoil: false,
    label: '',
  },
  rare: {
    outer: 'border-2 border-sky-300 ring-2 ring-sky-400/50 shadow-[0_0_18px_rgba(56,189,248,0.45)]',
    badgeBg: 'bg-sky-950/90 text-sky-200',
    showFoil: true,
    label: 'RARA',
  },
  epic: {
    outer: 'border-2 border-amber-200 ring-2 ring-amber-400/70 shadow-[0_0_22px_rgba(250,204,21,0.55)]',
    badgeBg: 'bg-amber-950/90 text-amber-200',
    showFoil: true,
    label: 'ÉPICA',
  },
  legendary: {
    outer: 'border-2 border-fuchsia-200 ring-2 ring-fuchsia-400/80 shadow-[0_0_28px_rgba(232,121,249,0.7)]',
    badgeBg: 'bg-fuchsia-950/90 text-amber-200',
    showFoil: true,
    label: 'LENDÁRIA',
  },
};

export const ZueiraCardArt: React.FC<ZueiraCardArtProps> = ({
  sticker,
  size = 'md',
  locked = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const frame = RARITY_FRAME[sticker.rarity || 'common'];

  const dims =
    size === 'lg'
      ? 'h-32 w-24 rounded-2xl'
      : size === 'md'
        ? 'h-20 w-16 rounded-xl'
        : 'h-14 w-11 rounded-xl';

  return (
    <div
      className={`${dims} ${frame.outer} relative flex shrink-0 flex-col items-center justify-between overflow-hidden p-1 select-none`}
      style={{
        background:
          sticker.rarity === 'legendary'
            ? `linear-gradient(135deg, ${sticker.accentHex} 0%, #9333EA 50%, #E11D48 100%)`
            : sticker.accentHex,
      }}
    >
      {/* Holographic / Foil Shimmer Sweep for Special Unlocked Cards */}
      {frame.showFoil && !locked && (
        <div
          aria-hidden="true"
          className="animate-holo-sweep pointer-events-none absolute inset-y-0 -left-4 w-10 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      )}

      {/* Top Corner Badge */}
      <div className="relative z-10 flex w-full items-center justify-between px-0.5">
        <span
          className={`rounded-md px-1 py-0.5 font-mono-num text-[9px] leading-none font-bold ${frame.badgeBg}`}
        >
          {sticker.badgeText}
        </span>
      </div>

      {/* Center Emblem or Raster Art */}
      <div className="relative z-10 flex flex-1 items-center justify-center w-full overflow-hidden">
        {sticker.artKind === 'photo' && sticker.imageUrl && !imgFailed ? (
          <img
            src={sticker.imageUrl}
            alt={sticker.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-sm" aria-hidden="true">
            {sticker.artKind === 'stack_bomb' && (
              <g>
                <circle cx="32" cy="36" r="19" fill="#18181B" stroke="#FFFDF9" strokeWidth="3" />
                <circle cx="26" cy="29" r="5" fill="#52525B" />
                <path d="M38 18 C43 10, 50 12, 52 7" stroke="#FDE047" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <polygon points="52,4 55,10 61,10 56,14 58,20 52,16 46,20 48,14 43,10 49,10" fill="#FACC15" />
                <text x="32" y="42" textAnchor="middle" fill="#FACC15" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="16">+8!</text>
              </g>
            )}
            {sticker.artKind === 'stop_shield' && (
              <g>
                <polygon points="22,8 42,8 56,22 56,42 42,56 22,56 8,42 8,22" fill="#0369A1" stroke="#FFFDF9" strokeWidth="3.5" />
                <circle cx="32" cy="32" r="14" fill="none" stroke="#FDE047" strokeWidth="4" />
                <line x1="22" y1="42" x2="42" y2="22" stroke="#FDE047" strokeWidth="4.5" strokeLinecap="round" />
              </g>
            )}
            {sticker.artKind === 'siren_uno' && (
              <g>
                <line x1="32" y1="6" x2="32" y2="13" stroke="#FEF08A" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="12" y1="14" x2="18" y2="19" stroke="#FEF08A" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="52" y1="14" x2="46" y2="19" stroke="#FEF08A" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M18 46 L21 24 C22 17, 42 17, 43 24 L46 46 Z" fill="#EF4444" stroke="#FFFDF9" strokeWidth="3" />
                <rect x="14" y="45" width="36" height="9" rx="4" fill="#18181B" stroke="#FFFDF9" strokeWidth="2.5" />
                <text x="32" y="40" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="13">UNO!</text>
              </g>
            )}
            {sticker.artKind === 'boomerang_rev' && (
              <g>
                <circle cx="32" cy="32" r="21" fill="#4C1D95" stroke="#FFFDF9" strokeWidth="3" />
                <path d="M20 26 C26 16, 42 16, 46 27" fill="none" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
                <polygon points="48,29 40,28 47,20" fill="#FACC15" />
                <path d="M44 38 C38 48, 22 48, 18 37" fill="none" stroke="#FFFDF9" strokeWidth="4.5" strokeLinecap="round" />
                <polygon points="16,35 24,36 17,44" fill="#FFFDF9" />
              </g>
            )}
            {sticker.artKind === 'king_uno' && (
              <g>
                <rect x="20" y="24" width="24" height="32" rx="5" fill="#E11D48" stroke="#FFFDF9" strokeWidth="3" />
                <text x="32" y="46" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="17">1</text>
                <polygon points="14,25 18,10 27,19 32,8 37,19 46,10 50,25" fill="#FDE047" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
              </g>
            )}
            {sticker.artKind === 'trophy_duck' && (
              <g>
                <path d="M20 16 H44 V28 C44 37, 20 37, 20 28 Z" fill="#FACC15" stroke="#18181B" strokeWidth="3" />
                <rect x="28" y="36" width="8" height="10" fill="#FACC15" stroke="#18181B" strokeWidth="2.5" />
                <rect x="21" y="46" width="22" height="7" rx="3" fill="#18181B" stroke="#FFFDF9" strokeWidth="2" />
                <circle cx="32" cy="24" r="6" fill="#FEF08A" />
                <polygon points="35,24 41,22 36,27" fill="#EA580C" />
              </g>
            )}
            {sticker.artKind === 'golden_rain' && (
              <g>
                <rect x="12" y="14" width="22" height="32" rx="4" transform="rotate(-12 23 30)" fill="#FDE047" stroke="#18181B" strokeWidth="2.5" />
                <rect x="28" y="16" width="24" height="34" rx="4" transform="rotate(10 40 33)" fill="#F59E0B" stroke="#FFFDF9" strokeWidth="2.5" />
                <text x="38" y="39" textAnchor="middle" fill="#18181B" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="15">+4</text>
              </g>
            )}
            {sticker.artKind === 'vip_crown' && (
              <g>
                <polygon points="10,44 15,16 26,28 32,12 38,28 49,16 54,44" fill="#FACC15" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
                <rect x="12" y="44" width="40" height="8" rx="3" fill="#FFFDF9" stroke="#18181B" strokeWidth="2.5" />
                <circle cx="32" cy="29" r="4" fill="#E11D48" />
              </g>
            )}
            {sticker.artKind === 'immortal_flame' && (
              <g>
                <path d="M32 7 C46 20, 52 33, 44 48 C39 55, 25 55, 20 48 C12 33, 18 20, 32 7 Z" fill="#FACC15" stroke="#FFFDF9" strokeWidth="3" />
                <path d="M32 20 C40 28, 42 38, 37 47 C34 51, 30 51, 27 47 C22 38, 24 28, 32 20 Z" fill="#E11D48" />
                <text x="32" y="44" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="14">10X</text>
              </g>
            )}
            {sticker.artKind === 'clown_joker' && (
              <g>
                <circle cx="32" cy="34" r="18" fill="#FFFDF9" stroke="#18181B" strokeWidth="3" />
                <path d="M16 24 C14 12, 26 12, 32 20 C38 12, 50 12, 48 24" fill="#FACC15" stroke="#18181B" strokeWidth="2.5" />
                <circle cx="26" cy="31" r="2.8" fill="#18181B" />
                <circle cx="38" cy="31" r="2.8" fill="#18181B" />
                <circle cx="32" cy="36" r="4.2" fill="#E11D48" />
                <path d="M23 42 Q32 50 41 42" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}
            {sticker.artKind === 'skull_zap' && (
              <g>
                <polygon points="36,6 18,34 31,34 26,58 46,28 33,28" fill="#FDE047" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
              </g>
            )}
            {sticker.artKind === 'photo' && (
              <text x="32" y="38" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="16">
                {sticker.badgeText}
              </text>
            )}
          </svg>
        )}
      </div>

      {/* Bottom Rarity / Mini Strip */}
      {size === 'lg' && frame.label && (
        <div className="relative z-10 w-full rounded-md bg-black/55 py-0.5 text-center text-[9px] font-bold tracking-wider text-amber-200">
          {frame.label}
        </div>
      )}

      {/* Lock Overlay when not yet unlocked by wins */}
      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/72 p-1 text-center">
          <Lock className="h-5 w-5 text-amber-300" />
          <span className="mt-0.5 font-mono-num text-[9px] font-bold text-amber-200">
            {sticker.unlockWinsRequired}V
          </span>
        </div>
      )}
    </div>
  );
};

interface StickerStudioModalProps {
  open: boolean;
  editingSticker: ZueiraSticker | null;
  onClose: () => void;
  onSaveSticker: (patch: CustomStickerEditPatch, existingSticker: ZueiraSticker | null) => void;
  onResetBaseSticker?: (stickerId: string) => void;
  onDeleteCustomSticker?: (stickerId: string) => void;
}

export const StickerStudioModal: React.FC<StickerStudioModalProps> = ({
  open,
  editingSticker,
  onClose,
  onSaveSticker,
  onResetBaseSticker,
  onDeleteCustomSticker,
}) => {
  const [title, setTitle] = useState('TOMA ESSA!');
  const [tauntLine, setTauntLine] = useState('Já pode ir comprando o baralho inteiro!');
  const [badgeText, setBadgeText] = useState('ZAP!');
  const [accentHex, setAccentHex] = useState('#E11D48');
  const [artKind, setArtKind] = useState<StickerArtKind>('clown_joker');
  const [soundKind, setSoundKind] = useState<TauntSoundKind>('horn');

  useEffect(() => {
    if (!open) return;
    if (editingSticker) {
      setTitle(editingSticker.title);
      setTauntLine(editingSticker.tauntLine);
      setBadgeText(editingSticker.badgeText);
      setAccentHex(editingSticker.accentHex);
      setArtKind(editingSticker.artKind);
      setSoundKind(editingSticker.soundKind);
    } else {
      setTitle('REI DO TRUCO!');
      setTauntLine('Aqui não se cria, compra quietinho!');
      setBadgeText('ZAP!');
      setAccentHex('#7C3AED');
      setArtKind('clown_joker');
      setSoundKind('thunder');
    }
  }, [open, editingSticker]);

  if (!open) return null;

  const previewSticker: ZueiraSticker = {
    id: editingSticker?.id || 'preview',
    ...sanitizeStickerPatch({
      title,
      tauntLine,
      badgeText,
      accentHex,
      artKind,
      soundKind,
    }),
    imageUrl: artKind === 'photo' ? editingSticker?.imageUrl : undefined,
    rarity: editingSticker?.rarity || 'rare',
    unlockWinsRequired: 0,
    isCustom: editingSticker ? editingSticker.isCustom : true,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeStickerPatch({
      title,
      tauntLine,
      badgeText,
      accentHex,
      artKind,
      soundKind,
    });
    soundFx.playTauntSound(cleaned.soundKind);
    haptics.tauntSlam(previewSticker.rarity);
    onSaveSticker(cleaned, editingSticker);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingSticker ? 'Editar cartinha de zoeira' : 'Criar cartinha de zoeira'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-5 text-[#FFFDF9] shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-amber-300">
              {editingSticker ? 'Editar Cartinha de Zoeira' : 'Criar Cartinha de Zoeira'}
            </h3>
            <p className="text-xs text-emerald-100/80">
              Personalize visual, frase e som — aparece na tela da mesa!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar criador de cartinha"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Card Preview */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/12 bg-[#072818] p-3.5">
          <ZueiraCardArt sticker={previewSticker} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-bold text-amber-300 truncate">
              {previewSticker.title}
            </div>
            <p className="mt-1 text-xs leading-snug text-emerald-50 line-clamp-3">
              “{previewSticker.tauntLine}”
            </p>
            <button
              type="button"
              onClick={() => {
                soundFx.playTauntSound(soundKind);
                haptics.tauntSlam(previewSticker.rarity);
              }}
              className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#114B2F] px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-[#165E3B]"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Testar Som &amp; Vibração</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label htmlFor="sticker-title-input" className="block text-xs font-semibold text-emerald-100">
                Título da Cartinha
              </label>
              <input
                id="sticker-title-input"
                type="text"
                maxLength={28}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: REI DO TRUCO!"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#072818] px-3 py-2 text-sm font-semibold text-white focus:border-amber-300 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="sticker-badge-input" className="block text-xs font-semibold text-emerald-100">
                Selo Curto
              </label>
              <input
                id="sticker-badge-input"
                type="text"
                maxLength={6}
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value.toUpperCase())}
                placeholder="ZAP!"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#072818] px-2.5 py-2 text-center font-mono-num text-sm font-bold text-amber-300 uppercase focus:border-amber-300 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sticker-line-input" className="block text-xs font-semibold text-emerald-100">
              Frase de Provocação
            </label>
            <input
              id="sticker-line-input"
              type="text"
              maxLength={90}
              value={tauntLine}
              onChange={(e) => setTauntLine(e.target.value)}
              placeholder="Ex: Vai abrir papelaria com esse tanto de carta?!"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#072818] px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-emerald-100">Cor da Cartinha</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {STICKER_COLOR_PALETTE.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  aria-label={col.label}
                  onClick={() => setAccentHex(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition ${
                    accentHex.toLowerCase() === col.hex.toLowerCase()
                      ? 'scale-110 border-white ring-2 ring-amber-300'
                      : 'border-white/30 opacity-80 hover:opacity-100'
                  }`}
                >
                  {accentHex.toLowerCase() === col.hex.toLowerCase() && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-emerald-100">Ilustração da Carta</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {STICKER_ART_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => setArtKind(opt.kind)}
                  className={`min-h-[38px] rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition whitespace-nowrap ${
                    artKind === opt.kind
                      ? 'border-amber-300 bg-amber-400 text-zinc-950 font-bold'
                      : 'border-white/10 bg-[#072818] text-emerald-100 hover:bg-[#0E442A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-emerald-100">Efeito Sonoro</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {STICKER_SOUND_OPTIONS.map((snd) => (
                <button
                  key={snd.kind}
                  type="button"
                  onClick={() => {
                    setSoundKind(snd.kind);
                    soundFx.playTauntSound(snd.kind);
                  }}
                  className={`min-h-[38px] rounded-xl border px-2 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    soundKind === snd.kind
                      ? 'border-amber-300 bg-[#145334] text-amber-200 font-bold'
                      : 'border-white/10 bg-[#072818] text-emerald-100 hover:bg-[#0E442A]'
                  }`}
                >
                  {snd.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300"
            >
              <span>{editingSticker ? 'Salvar Alterações' : 'Criar Cartinha Agora'}</span>
            </button>

            {editingSticker?.isEdited && !editingSticker.isCustom && onResetBaseSticker && (
              <button
                type="button"
                onClick={() => {
                  onResetBaseSticker(editingSticker.id);
                  onClose();
                }}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-black/25 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-black/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Cartinha Original</span>
              </button>
            )}

            {editingSticker?.isCustom && onDeleteCustomSticker && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomSticker(editingSticker.id);
                  onClose();
                }}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-rose-950/70 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/80"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir Cartinha Criada</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
