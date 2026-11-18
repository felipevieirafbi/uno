import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  ArrowUpDown,
  SkipForward,
  Flame,
  MessageCircle,
  Pause,
  Smartphone,
  Volume2,
  VolumeX,
  Smile,
  AlertTriangle,
  Bot,
  Zap,
  Layers,
  Eye,
  Handshake,
  Clock,
  History,
  Gauge,
  X,
} from 'lucide-react';
import {
  canDoubleStakes,
  canJumpInCard,
  canPlayCard,
  colorLabelPt,
  findPlayableNumberCombos,
  getLanternaSeat,
  type ActiveColor,
  type CardValue,
  type UnoCard,
  type UnoGameState,
} from '../game/unoRules';
import {
  aiSpeedLabelPt,
  computePerimeterSeats,
  SUIT_HEX,
  type AiSpeedPreset,
  type MoveHistoryEntry,
  type PerimeterSeatSlot,
} from '../game/moveHistory';
import {
  DARK_SIDE_FELT_GRADIENT,
  type CardBackSpec,
  type TableThemeSpec,
} from '../game/themes';
import { isStickerUnlocked, type ZueiraSticker } from '../game/stickers';
import { buildRoomInviteUrl, type LiveTauntEvent } from '../lib/roomService';
import { UnoCardView } from './UnoCardView';
import { ZueiraCardArt, resolveStickerFromEvent } from './ZueiraCardArt';
import { TableActionVfxOverlay } from './TableActionVfxOverlay';

const ACTIVE_COLOR_SWATCH: Record<
  ActiveColor,
  { bg: string; border: string; symbol: string }
> = {
  red: { bg: 'bg-[#E11D48]', border: 'border-rose-300', symbol: '●' },
  blue: { bg: 'bg-[#0284C7]', border: 'border-sky-300', symbol: '◆' },
  yellow: { bg: 'bg-[#EAB308]', border: 'border-amber-200', symbol: '▲' },
  green: { bg: 'bg-[#16A34A]', border: 'border-emerald-300', symbol: '■' },
};

const AVATAR_COLOR_CLASSES: Record<string, string> = {
  red: 'bg-[#E11D48] text-white',
  blue: 'bg-[#0284C7] text-white',
  yellow: 'bg-[#EAB308] text-zinc-950',
  green: 'bg-[#16A34A] text-white',
  purple: 'bg-[#7C3AED] text-white',
  orange: 'bg-[#EA580C] text-white',
};

export interface XRayPeekInfo {
  targetName: string;
  cards: UnoCard[];
}

interface GameTableViewProps {
  mode: 'local' | 'online';
  roomCode: string | null;
  roomName: string;
  roundNumber: number;
  gameState: UnoGameState;
  currentPlayerId: string;
  tableTheme: TableThemeSpec;
  cardBack: CardBackSpec;
  turnSecondsLeft: number | null;
  xrayPeek: XRayPeekInfo | null;
  muted: boolean;
  vibrationEnabled: boolean;
  unreadCount: number;
  roundsWon: number;
  activeTaunt: LiveTauntEvent | null;
  stickersCatalog: ZueiraSticker[];
  tableShaking: boolean;
  moveHistory: MoveHistoryEntry[];
  activeMoveFx: MoveHistoryEntry | null;
  aiSpeed: AiSpeedPreset;
  onCycleAiSpeed: () => void;
  onOpenHistory: () => void;
  onPlayCardRequest: (card: UnoCard) => void;
  onJumpInCardRequest: (card: UnoCard) => void;
  onPlayNumberCombo: (value: CardValue) => void;
  onDoubleStakes: () => void;
  onSendPartnerSignal: (partnerName: string) => void;
  onDrawCard: () => void;
  onPassAfterDraw: () => void;
  onSortHand: () => void;
  onShoutUno: () => void;
  onCatchOpponentUno: (targetSeatId: string) => void;
  onToggleChat: () => void;
  onQuickTauntLoser: (targetName: string) => void;
  onSendQuickSticker: (sticker: ZueiraSticker, targetName: string) => void;
  onToggleMute: () => void;
  onToggleVibration: () => void;
  onOpenPause: () => void;
  onAddBotSeat?: () => void;
}

function getDiscardTiltDeg(cardId: string | undefined): number {
  if (!cardId) return 0;
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 7) - 3) * 1.1;
}

interface OpponentSeatPodProps {
  slot: PerimeterSeatSlot;
  isSideSeat: boolean;
  activeTurnSeatId: string | undefined;
  myTeamId: string | undefined;
  lanternaId: string | undefined;
  phase: UnoGameState['phase'];
  cardBack: CardBackSpec;
  onSendPartnerSignal: (partnerName: string) => void;
  onQuickTauntLoser: (targetName: string) => void;
  onCatchOpponentUno: (targetSeatId: string) => void;
}

const OpponentSeatPod: React.FC<OpponentSeatPodProps> = ({
  slot,
  isSideSeat,
  activeTurnSeatId,
  myTeamId,
  lanternaId,
  phase,
  cardBack,
  onSendPartnerSignal,
  onQuickTauntLoser,
  onCatchOpponentUno,
}) => {
  const opp = slot.seat;
  const isTurn = !opp.eliminated && activeTurnSeatId === opp.id && phase === 'playing';
  const isPartner = Boolean(myTeamId && opp.teamId === myTeamId);
  const isLanterna = !isPartner && lanternaId === opp.id;
  const vulnerableToCatch =
    !opp.eliminated && opp.hand.length === 1 && !opp.saidUno && phase === 'playing';

  const initial = (opp.name.trim()[0] || 'J').toUpperCase();
  const avatarCls = AVATAR_COLOR_CLASSES[opp.avatarColor] || AVATAR_COLOR_CLASSES.blue;
  const fanTiltClass =
    slot.position === 'left'
      ? 'rotate-12'
      : slot.position === 'right'
        ? '-rotate-12'
        : slot.position === 'top-left'
          ? 'sm:rotate-3'
          : slot.position === 'top-right'
            ? 'sm:-rotate-3'
            : '';

  return (
    <div
      data-seat-pos={slot.position}
      className={`flex flex-col rounded-2xl border shadow-lg transition-transform duration-150 ${
        isSideSeat
          ? 'w-[84px] sm:w-[184px] px-2 py-1.5 sm:px-3 sm:py-2.5'
          : 'min-w-0 flex-1 max-w-[172px] sm:flex-initial sm:min-w-[168px] sm:max-w-[218px] px-2.5 py-1.5 sm:px-3 sm:py-2'
      } ${
        opp.eliminated
          ? 'border-rose-500/30 bg-black/55 opacity-55'
          : isTurn
            ? 'scale-[1.03] border-amber-300 bg-[#124E31] ring-2 ring-amber-300/75 shadow-[0_0_24px_rgba(250,204,21,0.3)]'
            : isPartner
              ? 'border-cyan-300/45 bg-black/55'
              : 'border-white/14 bg-black/55'
      }`}
    >
      {/* Avatar Medallion + Name + Card Count */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold shadow-xs ${avatarCls}`}
          >
            {initial}
          </span>
          <span className="truncate text-[11px] sm:text-sm font-bold text-white">
            {opp.name}
          </span>
        </div>
        <span className="hidden sm:inline font-mono-num shrink-0 text-xs font-bold text-amber-300">
          {opp.eliminated
            ? 'KO'
            : `${opp.hand.length} ${opp.hand.length === 1 ? 'carta' : 'cartas'}`}
        </span>
      </div>

      {/* Compact Mobile Count & Score / Status Row */}
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-emerald-200/85">
        <span className="font-mono-num truncate">
          <span className="sm:hidden font-bold text-amber-300">
            {opp.eliminated ? 'KO' : `${opp.hand.length}c`}
          </span>
          <span className="sm:hidden"> · </span>
          {opp.score} pts{isPartner ? ' · Dupla' : ''}
        </span>

        {opp.eliminated ? (
          <span className="font-bold text-rose-300 truncate">Fora</span>
        ) : opp.saidUno && opp.hand.length === 1 ? (
          <span className="font-display font-bold text-amber-300">UNO!</span>
        ) : isTurn ? (
          <span className="font-bold text-amber-200 truncate">Vez!</span>
        ) : !isSideSeat && isPartner ? (
          <button
            type="button"
            onClick={() => onSendPartnerSignal(opp.name)}
            aria-label={`Enviar sinal para dupla ${opp.name}`}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-cyan-700/90 px-2 py-0.5 text-[10px] font-bold text-white transition hover:bg-cyan-600 whitespace-nowrap"
          >
            <Handshake className="h-3 w-3" />
            <span>Sinal</span>
          </button>
        ) : !isSideSeat && isLanterna ? (
          <button
            type="button"
            onClick={() => onQuickTauntLoser(opp.name)}
            aria-label={`Zombar de ${opp.name}`}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold text-white transition hover:bg-rose-500 whitespace-nowrap"
          >
            <Smile className="h-3 w-3" />
            <span>Zombar</span>
          </button>
        ) : null}
      </div>

      {/* Inward-Facing Fanned Card Backs */}
      <div
        className={`mt-1.5 flex items-center justify-center -space-x-2.5 overflow-hidden py-0.5 ${fanTiltClass}`}
      >
        {Array.from({ length: Math.min(opp.hand.length, isSideSeat ? 5 : 6) }).map((_, i) => (
          <div
            key={i}
            style={{
              transform: `rotate(${(i - 2) * 5}deg)`,
            }}
            className={`h-5 w-3.5 sm:h-6 sm:w-4 rounded-xs border border-[#FFFDF9]/85 ${cardBack.outerBgClass} shadow-xs`}
          />
        ))}
        {opp.hand.length > (isSideSeat ? 5 : 6) && (
          <span className="pl-3 font-mono-num text-[10px] font-bold text-emerald-200">
            +{opp.hand.length - (isSideSeat ? 5 : 6)}
          </span>
        )}
      </div>

      {/* Side-Seat Quick Action Button (Partner Signal / Zombar) */}
      {isSideSeat && !opp.eliminated && !isTurn && !vulnerableToCatch && (isPartner || isLanterna) && (
        <button
          type="button"
          onClick={() =>
            isPartner ? onSendPartnerSignal(opp.name) : onQuickTauntLoser(opp.name)
          }
          aria-label={
            isPartner
              ? `Enviar sinal para dupla ${opp.name}`
              : `Zombar de ${opp.name}`
          }
          className={`mt-1.5 inline-flex min-h-[30px] w-full items-center justify-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-white transition whitespace-nowrap ${
            isPartner ? 'bg-cyan-700/90 hover:bg-cyan-600' : 'bg-rose-600/90 hover:bg-rose-500'
          }`}
        >
          {isPartner ? <Handshake className="h-3 w-3 shrink-0" /> : <Smile className="h-3 w-3 shrink-0" />}
          <span>{isPartner ? 'Sinal' : 'Zombar'}</span>
        </button>
      )}

      {vulnerableToCatch && (
        <button
          type="button"
          onClick={() => onCatchOpponentUno(opp.id)}
          aria-label={`Pegar ${opp.name} no pulo sem gritar UNO (+2 cartas)`}
          className="mt-1.5 inline-flex min-h-[34px] w-full items-center justify-center gap-1 rounded-xl bg-rose-600 px-1.5 py-1 text-[10px] sm:text-[11px] font-bold text-white shadow-md transition hover:bg-rose-500"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{isSideSeat ? 'Pulo +2!' : 'Pegar no Pulo (+2)!'}</span>
        </button>
      )}
    </div>
  );
};

export const GameTableView: React.FC<GameTableViewProps> = ({
  mode,
  roomCode,
  roomName,
  roundNumber,
  gameState,
  currentPlayerId,
  tableTheme,
  cardBack,
  turnSecondsLeft,
  xrayPeek,
  muted,
  vibrationEnabled,
  unreadCount,
  roundsWon,
  activeTaunt,
  stickersCatalog,
  tableShaking,
  moveHistory,
  activeMoveFx,
  aiSpeed,
  onCycleAiSpeed,
  onOpenHistory,
  onPlayCardRequest,
  onJumpInCardRequest,
  onPlayNumberCombo,
  onDoubleStakes,
  onSendPartnerSignal,
  onDrawCard,
  onPassAfterDraw,
  onSortHand,
  onShoutUno,
  onCatchOpponentUno,
  onToggleChat,
  onQuickTauntLoser,
  onSendQuickSticker,
  onToggleMute,
  onToggleVibration,
  onOpenPause,
  onAddBotSeat,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharedInvite, setSharedInvite] = useState(false);
  const [quickZoeiraOpen, setQuickZoeiraOpen] = useState(false);
  const [selectedTauntTarget, setSelectedTauntTarget] = useState<string>('');

  const mySeatIdx = gameState.seats.findIndex((s) => s.id === currentPlayerId);
  const mySeat = mySeatIdx !== -1 ? gameState.seats[mySeatIdx] : gameState.seats[0];
  const opponents = gameState.seats.filter((s) => s.id !== mySeat?.id);

  // Clockwise Perimeter Seating Around the Oval Table
  const perimeterSlots = computePerimeterSeats(gameState.seats, mySeat?.id || currentPlayerId);
  const topSlots = perimeterSlots.filter(
    (s) => s.position === 'top-left' || s.position === 'top' || s.position === 'top-right'
  );
  const leftSlot = perimeterSlots.find((s) => s.position === 'left') || null;
  const rightSlot = perimeterSlots.find((s) => s.position === 'right') || null;
  const hasSideSeats = Boolean(leftSlot || rightSlot);
  const hasAnyBots = gameState.seats.some((s) => s.isBot);

  const isMyTurn =
    gameState.phase === 'playing' &&
    !mySeat?.eliminated &&
    gameState.seats[gameState.currentTurnIndex]?.id === mySeat?.id;

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const underlayDiscards = gameState.discardPile.slice(-4, -1);
  const activeTurnSeat = gameState.seats[gameState.currentTurnIndex];
  const lanterna = getLanternaSeat(gameState.seats);
  const swatch = ACTIVE_COLOR_SWATCH[gameState.activeColor];
  const activeSuitHex = SUIT_HEX[gameState.activeColor] || '#FACC15';
  const discardTilt = getDiscardTiltDeg(topDiscard?.id);
  const stakesMult = gameState.stakesMultiplier || 1;
  const targetScore = gameState.houseRules?.targetScore || 0;
  const nextDoubleMult = Math.min(8, stakesMult * 2);
  const canDoubleNow = canDoubleStakes(gameState, currentPlayerId);
  const playableCombos = isMyTurn
    ? findPlayableNumberCombos(gameState, currentPlayerId)
    : [];

  const defaultTauntTargetName =
    lanterna && lanterna.id !== mySeat?.id
      ? lanterna.name
      : opponents[0]?.name || '';
  const effectiveTauntTarget =
    selectedTauntTarget && opponents.some((o) => o.name === selectedTauntTarget)
      ? selectedTauntTarget
      : defaultTauntTargetName;

  const quickStickers = stickersCatalog
    .filter((s) => !s.id.startsWith('sig_') && isStickerUnlocked(s, roundsWon))
    .slice(0, 4);

  const hasAnyPlayable =
    isMyTurn &&
    Boolean(
      mySeat?.hand.some((c) =>
        canPlayCard(
          c,
          topDiscard,
          gameState.activeColor,
          gameState.pendingDraw,
          gameState.drawnPlayableCardId
        )
      )
    );

  const canPassDrawnCard = isMyTurn && Boolean(gameState.drawnPlayableCardId);

  const canShoutUno =
    gameState.phase === 'playing' &&
    !mySeat?.eliminated &&
    Boolean(mySeat && mySeat.hand.length <= 2 && !mySeat.saidUno);

  const activeSticker = activeTaunt
    ? resolveStickerFromEvent(activeTaunt, stickersCatalog)
    : undefined;

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleShareInvite = async () => {
    if (!roomCode) return;
    const inviteUrl = buildRoomInviteUrl(roomCode);
    const shareText = `Vem jogar UnoZueira comigo! Sala ${roomCode}: ${inviteUrl}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `UnoZueira · Sala ${roomCode}`,
          text: `Senta na mesa pra jogar UnoZueira! Código: ${roomCode}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fallback to clipboard below
      }
    }
    navigator.clipboard?.writeText(shareText).catch(() => {});
    setSharedInvite(true);
    window.setTimeout(() => setSharedInvite(false), 2000);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden ${tableTheme.baseBgClass} text-[#FFFDF9] ${
        tableShaking ? 'animate-table-shake' : ''
      }`}
    >
      {/* Dynamic Table Felt Surface (Unlocked Theme or Dramatic Dark Side Crimson!) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: gameState.darkSide
            ? DARK_SIDE_FELT_GRADIENT
            : tableTheme.feltGradient,
        }}
      />
      <div
        className={`pointer-events-none absolute inset-2 sm:inset-3 rounded-[28px] border-4 ${
          gameState.darkSide ? 'border-rose-500/55' : tableTheme.railBorderClass
        } shadow-[inset_0_0_48px_rgba(0,0,0,0.55)]`}
      />

      {/* Oval Casino Felt Inner Track Framing the Perimeter Seats */}
      <div
        aria-hidden="true"
        style={{ borderColor: `${activeSuitHex}38` }}
        className="pointer-events-none absolute left-1/2 top-[46%] h-[54%] w-[90%] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-[999px] border-2 border-dashed bg-black/14 shadow-[inset_0_16px_48px_rgba(0,0,0,0.36)] transition-colors duration-300"
      />

      {/* High-Visibility Center-Stage Taunt Card Slam Overlay */}
      {activeTaunt && activeSticker && (
        <div
          key={activeTaunt.id}
          aria-live="polite"
          className={`animate-taunt-slam pointer-events-none fixed left-1/2 top-[44%] z-30 flex w-[310px] sm:w-[390px] items-center gap-4 rounded-3xl border-2 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.82)] ${
            activeSticker.rarity === 'legendary'
              ? 'border-fuchsia-300 bg-[#180A2E]/96 ring-4 ring-amber-300/60'
              : activeSticker.rarity === 'epic'
                ? 'border-amber-300 bg-[#1B1205]/96 ring-4 ring-amber-400/50'
                : activeSticker.rarity === 'rare'
                  ? 'border-sky-300 bg-[#062436]/96 ring-2 ring-sky-400/40'
                  : 'border-amber-300 bg-[#072918]/96'
          }`}
        >
          <ZueiraCardArt sticker={activeSticker} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold tracking-wide text-emerald-200/90 truncate">
              {activeTaunt.senderName}
              {activeTaunt.targetName ? ` zombou ${activeTaunt.targetName}!` : ' mandou na mesa!'}
            </div>
            <div className="mt-1 font-display text-lg sm:text-xl font-bold leading-tight text-amber-300">
              {activeSticker.title}
            </div>
            <p className="mt-1.5 text-xs sm:text-sm font-medium leading-snug text-white">
              “{activeSticker.tauntLine}”
            </p>
          </div>
        </div>
      )}

      {/* 1. Unified Top Perimeter HUD Bar */}
      <div className="relative z-20 flex items-center justify-between gap-1.5 px-3 pt-2.5 sm:gap-3 sm:px-7 sm:pt-4">
        {/* Left Telemetry Cluster (Zero-Pill Unboxed Text with · Separators) */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/12 bg-black/45 px-2.5 sm:px-3 py-2 shadow-md">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
              <span className="hidden sm:inline truncate sm:max-w-[200px]">{roomName}</span>
              <span className="hidden sm:inline text-emerald-300/60 shrink-0" aria-hidden="true">·</span>
              <span className="font-mono-num text-amber-300 shrink-0">R{roundNumber}</span>
              {targetScore > 0 && (
                <>
                  <span className="text-emerald-300/60 shrink-0" aria-hidden="true">·</span>
                  <span className="font-mono-num text-amber-200 whitespace-nowrap shrink-0">
                    Meta {targetScore}
                  </span>
                </>
              )}
              {stakesMult > 1 && (
                <>
                  <span className="text-emerald-300/60 shrink-0" aria-hidden="true">·</span>
                  <span className="font-mono-num text-rose-300 shrink-0">Mesa {stakesMult}x</span>
                </>
              )}
              {gameState.darkSide && (
                <>
                  <span className="text-emerald-300/60 shrink-0" aria-hidden="true">·</span>
                  <span className="text-rose-300 whitespace-nowrap shrink-0">Sombrio</span>
                </>
              )}
              <span className="text-emerald-300/60 shrink-0" aria-hidden="true">·</span>
              <span className="text-emerald-200/90 whitespace-nowrap shrink-0">
                {gameState.direction === 1 ? '↻' : '↺'}
                <span className="hidden md:inline">
                  {gameState.direction === 1 ? ' Horário' : ' Anti-horário'}
                </span>
              </span>
            </div>
          </div>

          {mode === 'online' && roomCode && (
            <>
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label={`Copiar código da sala ${roomCode}`}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-amber-300/40 bg-[#0A3520] px-2.5 sm:px-3 py-2 font-mono-num text-xs font-bold text-amber-300 shadow-md transition hover:bg-[#10472C]"
              >
                <span>{roomCode}</span>
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleShareInvite}
                aria-label="Compartilhar link de convite da sala"
                className="hidden sm:inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-emerald-300/30 bg-[#0A3520] px-3 py-2 text-xs font-bold text-emerald-100 shadow-md transition hover:bg-[#10472C]"
              >
                <Share2 className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden md:inline">
                  {sharedInvite ? 'Link Copiado!' : 'Convidar'}
                </span>
              </button>
            </>
          )}

          {hasAnyBots && (
            <button
              type="button"
              onClick={onCycleAiSpeed}
              aria-label={`Ritmo das IAs: ${aiSpeedLabelPt(aiSpeed)}. Toque para alternar velocidade`}
              className="hidden md:inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-black/65 whitespace-nowrap"
            >
              <Gauge className="h-4 w-4 text-amber-300" />
              <span>IA: {aiSpeedLabelPt(aiSpeed)}</span>
            </button>
          )}

          {onAddBotSeat && gameState.seats.length < 6 && !gameState.houseRules?.teamMode2v2 && (
            <button
              type="button"
              onClick={onAddBotSeat}
              className="hidden xl:inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-black/65 whitespace-nowrap"
            >
              <Bot className="h-4 w-4 text-amber-300" />
              <span>+ Bot IA</span>
            </button>
          )}
        </div>

        {/* Right Utility Buttons (Histórico [H], Chat [C], Som [M], Vibração [V], Pause [P]) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Ver histórico de jogadas da mesa (${moveHistory.length})`}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHistory();
            }}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-white/15 bg-black/45 px-2.5 sm:px-3 text-emerald-100 shadow-md transition hover:bg-black/65"
          >
            <History className="h-5 w-5 text-amber-300" />
            <span className="ml-1.5 hidden lg:inline text-xs font-bold text-[#FFFDF9] whitespace-nowrap">
              Histórico
            </span>
            {moveHistory.length > 0 && (
              <span className="ml-1 hidden sm:inline font-mono-num text-xs font-bold text-amber-300">
                ({moveHistory.length})
              </span>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Abrir bate-papo e cartinhas de zoeira"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleChat();
            }}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-amber-300/35 bg-[#0A3520] px-2.5 sm:px-3 text-amber-300 shadow-md transition hover:bg-[#114C2F]"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="ml-1.5 hidden sm:inline text-xs font-bold text-[#FFFDF9] whitespace-nowrap">
              Chat &amp; Zoeira
            </span>
            {unreadCount > 0 && (
              <span className="ml-1 font-mono-num text-xs font-bold text-amber-300">
                ({unreadCount})
              </span>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-emerald-100 shadow-md transition hover:bg-black/65"
          >
            {muted ? <VolumeX className="h-5 w-5 text-rose-300" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={vibrationEnabled ? 'Desativar vibração' : 'Ativar vibração'}
            aria-pressed={vibrationEnabled}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleVibration();
            }}
            className={`hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border shadow-md transition ${
              vibrationEnabled
                ? 'border-white/15 bg-black/45 text-amber-300 hover:bg-black/65'
                : 'border-white/10 bg-black/30 text-emerald-100/40 hover:bg-black/50'
            }`}
          >
            <Smartphone className="h-5 w-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pausar partida"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPause();
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-emerald-100 shadow-md transition hover:bg-black/65"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. Upper Table Rim Seats (Top-Left, Top, Top-Right) */}
      {topSlots.length > 0 && (
        <div className="relative z-10 mx-auto flex w-full max-w-5xl items-start justify-center gap-2 sm:gap-5 px-3 pt-1.5 sm:px-6">
          {topSlots.map((slot) => (
            <OpponentSeatPod
              key={slot.seat.id}
              slot={slot}
              isSideSeat={false}
              activeTurnSeatId={activeTurnSeat?.id}
              myTeamId={mySeat?.teamId}
              lanternaId={lanterna?.id}
              phase={gameState.phase}
              cardBack={cardBack}
              onSendPartnerSignal={onSendPartnerSignal}
              onQuickTauntLoser={onQuickTauntLoser}
              onCatchOpponentUno={onCatchOpponentUno}
            />
          ))}
        </div>
      )}

      {/* 3. Middle Oval Table Arena: [Left Seat] — [Center Piles & Directional VFX] — [Right Seat] */}
      <div
        className={`relative z-10 mx-auto my-auto w-full max-w-6xl px-2.5 sm:px-6 ${
          hasSideSeats
            ? 'grid grid-cols-[84px_minmax(0,1fr)_84px] sm:grid-cols-[184px_minmax(0,1fr)_184px] items-center gap-1.5 sm:gap-6'
            : 'flex flex-col items-center justify-center'
        }`}
      >
        {/* Left Table Seat */}
        {hasSideSeats && (
          <div className="flex items-center justify-start">
            {leftSlot ? (
              <OpponentSeatPod
                slot={leftSlot}
                isSideSeat
                activeTurnSeatId={activeTurnSeat?.id}
                myTeamId={mySeat?.teamId}
                lanternaId={lanterna?.id}
                phase={gameState.phase}
                cardBack={cardBack}
                onSendPartnerSignal={onSendPartnerSignal}
                onQuickTauntLoser={onQuickTauntLoser}
                onCatchOpponentUno={onCatchOpponentUno}
              />
            ) : (
              <div className="w-[84px] sm:w-[184px]" aria-hidden="true" />
            )}
          </div>
        )}

        {/* Center Active Battle Arena */}
        <div className="relative flex min-w-0 flex-col items-center justify-center">
          {/* X-Ray Opponent Hand Peek Banner (5s temporary reveal) */}
          {xrayPeek && (
            <div
              role="status"
              className="mb-2 flex flex-col items-center rounded-2xl border border-violet-300/60 bg-[#1E1038]/95 px-3 py-1.5 shadow-xl"
            >
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-violet-200">
                <Eye className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Raio-X · Mão de {xrayPeek.targetName}:</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {xrayPeek.cards.slice(0, 4).map((c) => (
                  <UnoCardView
                    key={c.id}
                    card={c}
                    size="sm"
                    darkSide={Boolean(gameState.darkSide)}
                  />
                ))}
                {xrayPeek.cards.length > 4 && (
                  <span className="font-mono-num text-xs font-bold text-violet-200">
                    +{xrayPeek.cards.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Active Stack Bomb Warning */}
          {gameState.pendingDraw > 0 && (
            <div
              role="status"
              className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-rose-600 px-3 py-1 text-[11px] sm:text-sm font-bold text-white shadow-lg"
            >
              <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-200" />
              <span className="truncate">
                BOMBA:{' '}
                <span className="font-mono-num text-amber-200">+{gameState.pendingDraw}</span>
                {isMyTurn
                  ? hasAnyPlayable
                    ? ' · Rebata!'
                    : ` · Compre +${gameState.pendingDraw}`
                  : ''}
              </span>
            </div>
          )}

          {/* Optional Turn Timer Bar ("Pavio Curto") */}
          {turnSecondsLeft !== null && gameState.phase === 'playing' && (
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-mono-num font-bold">
              <Clock
                className={`h-3.5 w-3.5 ${
                  turnSecondsLeft <= 4 ? 'text-rose-400' : 'text-amber-300'
                }`}
              />
              <span className={turnSecondsLeft <= 4 ? 'text-rose-300' : 'text-emerald-100'}>
                Tempo: {turnSecondsLeft}s
              </span>
            </div>
          )}

          {/* Center Piles + Active-Color Turn Direction Orbit Ring + Flying Card VFX */}
          <div className="relative flex items-center justify-center gap-3 sm:gap-9 py-2">
            {/* Animated Active-Color Turn Direction Orbit Ring */}
            <svg
              aria-hidden="true"
              viewBox="0 0 260 260"
              className={`pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] sm:h-[275px] sm:w-[275px] -translate-x-1/2 -translate-y-1/2 opacity-45 ${
                gameState.direction === 1 ? 'animate-orbit-cw' : 'animate-orbit-ccw'
              }`}
            >
              <circle
                cx="130"
                cy="130"
                r="116"
                fill="none"
                stroke={activeSuitHex}
                strokeWidth="2.5"
                strokeDasharray="18 14"
              />
              <path
                d={
                  gameState.direction === 1
                    ? 'M 126 8 L 138 14 L 126 20 Z'
                    : 'M 134 8 L 122 14 L 134 20 Z'
                }
                fill={activeSuitHex}
              />
              <path
                d={
                  gameState.direction === 1
                    ? 'M 134 240 L 122 246 L 134 252 Z'
                    : 'M 126 240 L 138 246 L 126 252 Z'
                }
                fill={activeSuitHex}
              />
            </svg>

            {/* Flying Played / Drawn Cards & Impact Callout Overlay */}
            <TableActionVfxOverlay activeMoveFx={activeMoveFx} cardBack={cardBack} />

            {/* 3D Layered Draw Pile */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <div className="pointer-events-none absolute top-2 left-2 h-full w-full rounded-2xl border border-white/15 bg-black/50" />
                <div className="pointer-events-none absolute top-1 left-1 h-full w-full rounded-2xl border border-white/25 bg-[#18181B]" />
                <UnoCardView
                  faceDown
                  size="table"
                  cardBack={cardBack}
                  onClick={isMyTurn ? onDrawCard : undefined}
                />
                {isMyTurn && !hasAnyPlayable && !canPassDrawnCard && (
                  <span
                    className={`pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-lg px-2 py-0.5 text-[10px] font-bold shadow-md whitespace-nowrap ${
                      gameState.pendingDraw > 0
                        ? 'bg-rose-600 text-white ring-1 ring-amber-300'
                        : 'bg-amber-400 text-zinc-950'
                    }`}
                  >
                    {gameState.pendingDraw > 0
                      ? `Comprar +${gameState.pendingDraw}`
                      : 'Compre aqui'}
                  </span>
                )}
              </div>
              <span className="mt-1.5 font-mono-num text-[11px] sm:text-xs font-semibold text-emerald-100/85 whitespace-nowrap">
                {gameState.pendingDraw > 0
                  ? `+${gameState.pendingDraw} (${gameState.drawDeck.length})`
                  : `Monte (${gameState.drawDeck.length})`}
              </span>
            </div>

            {/* Fanned Multi-Card Discard Pile */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                {underlayDiscards.map((prevCard, idx) => {
                  const prevTilt = getDiscardTiltDeg(prevCard.id) + (idx - 1) * 7;
                  return (
                    <div
                      key={`${prevCard.id}_under_${idx}`}
                      aria-hidden="true"
                      style={{
                        transform: `translate(${(idx - 1) * 3}px, ${(2 - idx) * 2}px) rotate(${prevTilt}deg)`,
                      }}
                      className="pointer-events-none absolute inset-0 opacity-70"
                    >
                      <UnoCardView
                        card={prevCard}
                        size="table"
                        darkSide={Boolean(gameState.darkSide)}
                      />
                    </div>
                  );
                })}
                <div
                  style={{ transform: `rotate(${discardTilt}deg)` }}
                  className="relative transition-transform duration-150"
                >
                  <UnoCardView
                    card={topDiscard}
                    size="table"
                    darkSide={Boolean(gameState.darkSide)}
                    activeWildTint={gameState.activeColor}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                <span
                  className={`inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border ${swatch.bg} ${swatch.border} text-[8px] sm:text-[9px] text-white`}
                  aria-hidden="true"
                >
                  {swatch.symbol}
                </span>
                <span>{colorLabelPt(gameState.activeColor)}</span>
              </div>
            </div>
          </div>

          {/* Live Action Feed + 1-Tap "Ver o que aconteceu" History & Mobile AI Speed Strip */}
          <div className="mt-1.5 flex max-w-md flex-col items-center gap-1.5 px-1">
            <p
              aria-live="polite"
              className="line-clamp-2 text-center text-[11px] sm:text-sm font-semibold leading-snug text-emerald-100/95"
            >
              {gameState.lastActionText}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-xl border border-amber-300/35 bg-black/45 px-2.5 py-1 text-[11px] font-bold text-amber-200 shadow-sm transition hover:bg-black/65 whitespace-nowrap"
              >
                <History className="h-3.5 w-3.5 text-amber-300" />
                <span>O que aconteceu ({moveHistory.length})</span>
              </button>

              {hasAnyBots && (
                <button
                  type="button"
                  onClick={onCycleAiSpeed}
                  className="inline-flex md:hidden min-h-[32px] items-center gap-1 rounded-xl border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 shadow-sm transition hover:bg-black/65 whitespace-nowrap"
                >
                  <Gauge className="h-3 w-3 text-amber-300" />
                  <span>IA: {aiSpeedLabelPt(aiSpeed)}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Table Seat */}
        {hasSideSeats && (
          <div className="flex items-center justify-end">
            {rightSlot ? (
              <OpponentSeatPod
                slot={rightSlot}
                isSideSeat
                activeTurnSeatId={activeTurnSeat?.id}
                myTeamId={mySeat?.teamId}
                lanternaId={lanterna?.id}
                phase={gameState.phase}
                cardBack={cardBack}
                onSendPartnerSignal={onSendPartnerSignal}
                onQuickTauntLoser={onQuickTauntLoser}
                onCatchOpponentUno={onCatchOpponentUno}
              />
            ) : (
              <div className="w-[84px] sm:w-[184px]" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Player Hand & Thumb Action Strip */}
      <div className="relative z-20 mx-auto w-full max-w-5xl px-3 pb-3 sm:px-6 sm:pb-5">
        {/* 1-Tap Floating Leque Rápido de Zoeira Popover */}
        {quickZoeiraOpen && (
          <div
            role="region"
            aria-label="Leque rápido de zoeira"
            className="mb-2.5 rounded-2xl border border-amber-300/45 bg-[#072818]/98 p-3 shadow-[0_16px_42px_rgba(0,0,0,0.75)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap">
                  Alvo da zoeira:
                </span>
                {opponents.map((opp) => {
                  const activeTarget = effectiveTauntTarget === opp.name;
                  return (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => setSelectedTauntTarget(opp.name)}
                      className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                        activeTarget
                          ? 'bg-amber-400 text-zinc-950'
                          : 'bg-[#0C3C24] text-emerald-100 hover:bg-[#135434]'
                      }`}
                    >
                      {opp.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setQuickZoeiraOpen(false);
                    onToggleChat();
                  }}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-amber-300/40 bg-[#10472C] px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-[#155938] whitespace-nowrap"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Todas &amp; Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickZoeiraOpen(false)}
                  aria-label="Fechar leque rápido de zoeira"
                  className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-xl bg-black/30 text-emerald-100 hover:bg-black/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {quickStickers.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onSendQuickSticker(st, effectiveTauntTarget);
                    setQuickZoeiraOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-[#0B3923] p-2 text-left transition hover:border-amber-300 hover:bg-[#124E31] active:scale-[0.98]"
                >
                  <ZueiraCardArt sticker={st} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-xs font-bold text-amber-300">
                      {st.title}
                    </div>
                    <div className="truncate text-[10px] text-emerald-100/85">
                      {st.tauntLine}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-display text-base font-bold text-white">
              {mySeat?.name || 'Você'}
            </span>
            <span className="text-emerald-300/60" aria-hidden="true">·</span>
            <span className="font-mono-num font-bold text-amber-300">
              {mySeat?.eliminated ? 'Eliminado (25+)' : `${mySeat?.hand.length ?? 0} cartas`}
            </span>
            <span className="text-emerald-300/60" aria-hidden="true">·</span>
            <span className="font-mono-num text-emerald-100/85">
              {targetScore > 0
                ? `${mySeat?.score ?? 0}/${targetScore} pts`
                : `${mySeat?.score ?? 0} pts`}
            </span>
            {isMyTurn && (
              <>
                <span className="text-emerald-300/60" aria-hidden="true">·</span>
                <span className="font-bold text-amber-300">SUA VEZ!</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {canPassDrawnCard && (
              <button
                type="button"
                onClick={onPassAfterDraw}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-md transition hover:bg-amber-300 active:scale-95 whitespace-nowrap"
              >
                <SkipForward className="h-4 w-4" />
                <span>Passar [Espaço]</span>
              </button>
            )}

            {/* Multi-card Same-Number Combo Trigger(s) */}
            {playableCombos.slice(0, 2).map((combo) => (
              <button
                key={combo.value}
                type="button"
                onClick={() => onPlayNumberCombo(combo.value)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 shadow-md transition hover:bg-amber-300 active:scale-95 whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>
                  Combo {combo.cards.length}x &lsquo;{combo.value}&rsquo;
                </span>
              </button>
            ))}

            {/* Truco / Marvel Snap Table Doubler ("Dobrar 2x/4x/8x") */}
            {canDoubleNow && (
              <button
                type="button"
                onClick={onDoubleStakes}
                aria-label={`Dobrar ${nextDoubleMult}x — dobrar valor da mesa`}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-rose-300/60 bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-md transition hover:bg-rose-500 active:scale-95 whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5 text-amber-200" />
                <span>Dobrar {nextDoubleMult}x</span>
              </button>
            )}

            {canShoutUno && (
              <button
                type="button"
                onClick={onShoutUno}
                className="min-h-[42px] rounded-2xl bg-[#E11D48] px-3.5 py-2 font-display text-sm font-bold text-white shadow-lg ring-2 ring-amber-300 transition hover:bg-rose-500 active:scale-95 whitespace-nowrap"
              >
                GRITAR UNO! [U]
              </button>
            )}

            {(mySeat?.hand.length ?? 0) > 1 && !mySeat?.eliminated && (
              <button
                type="button"
                onClick={onSortHand}
                aria-label="Ordenar mão de cartas"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-emerald-100 shadow-md transition hover:bg-black/65 whitespace-nowrap"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-amber-300" />
                <span>Ordenar</span>
              </button>
            )}

            <button
              type="button"
              aria-expanded={quickZoeiraOpen}
              onClick={() => setQuickZoeiraOpen((prev) => !prev)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold shadow-md transition whitespace-nowrap ${
                quickZoeiraOpen
                  ? 'border-amber-300 bg-amber-400 text-zinc-950'
                  : 'border-amber-300/40 bg-[#0A3520] text-amber-300 hover:bg-[#114C2F]'
              }`}
            >
              <Smile className="h-4 w-4" />
              <span>Zoeira</span>
            </button>
          </div>
        </div>

        {/* Scrollable / Centered Tactile Player Hand */}
        <div
          role="region"
          aria-label="Sua mão de cartas"
          className="flex min-h-[120px] sm:min-h-[132px] items-end justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto px-2 pt-4 pb-1"
        >
          {mySeat?.hand.map((card, index) => {
            const playable =
              isMyTurn &&
              canPlayCard(
                card,
                topDiscard,
                gameState.activeColor,
                gameState.pendingDraw,
                gameState.drawnPlayableCardId
              );
            const jumpInPlayable =
              !isMyTurn && canJumpInCard(gameState, currentPlayerId, card);

            return (
              <UnoCardView
                key={card.id}
                card={card}
                playable={playable}
                jumpInPlayable={jumpInPlayable}
                darkSide={Boolean(gameState.darkSide)}
                dimmed={isMyTurn && !playable}
                shortcutLabel={index < 9 ? String(index + 1) : undefined}
                onClick={() =>
                  jumpInPlayable
                    ? onJumpInCardRequest(card)
                    : onPlayCardRequest(card)
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
