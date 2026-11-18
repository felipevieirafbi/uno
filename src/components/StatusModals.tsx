import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Home,
  Trophy,
  Bot,
  Smartphone,
  Volume2,
  VolumeX,
  Share2,
  ShieldAlert,
  ArrowLeftRight,
  Lock,
  Check,
} from 'lucide-react';
import {
  colorLabelPt,
  computeRoundAwards,
  countHandColors,
  pickDominantSuitColor,
  type ActiveColor,
  type PlayerSeat,
  type UnoCard,
} from '../game/unoRules';
import type { ZueiraSticker } from '../game/stickers';
import {
  CARD_BACKS,
  TABLE_THEMES,
  type AppearancePrefs,
  type CardBackId,
  type TableThemeId,
} from '../game/themes';
import { shareOrDownloadScorecard } from '../game/scorecardShare';
import { PWAInstallButton } from './PWAInstallButton';
import { ZueiraCardArt } from './ZueiraCardArt';

interface WildColorModalProps {
  pendingCard: UnoCard | null;
  myHand?: UnoCard[];
  activeColor?: ActiveColor;
  bluffChallengeEnabled?: boolean;
  onChooseColor: (color: ActiveColor) => void;
  onCancel: () => void;
}

const COLOR_OPTIONS: Array<{ color: ActiveColor; hex: string; symbol: string }> = [
  { color: 'red', hex: '#E11D48', symbol: '●' },
  { color: 'blue', hex: '#0284C7', symbol: '◆' },
  { color: 'yellow', hex: '#EAB308', symbol: '▲' },
  { color: 'green', hex: '#16A34A', symbol: '■' },
];

export const WildColorModal: React.FC<WildColorModalProps> = ({
  pendingCard,
  myHand = [],
  activeColor,
  bluffChallengeEnabled = true,
  onChooseColor,
  onCancel,
}) => {
  if (!pendingCard) return null;

  const remainingHand = myHand.filter((c) => c.id !== pendingCard.id);
  const colorCounts = countHandColors(remainingHand);
  const dominantColor = pickDominantSuitColor(remainingHand);
  const maxSuitCount = Math.max(
    colorCounts.red,
    colorCounts.blue,
    colorCounts.yellow,
    colorCounts.green
  );
  const isWild4Bluff =
    pendingCard.value === 'wild4' &&
    Boolean(activeColor && colorCounts[activeColor] > 0) &&
    bluffChallengeEnabled;

  const subtitle =
    pendingCard.value === 'wild4'
      ? 'Largue o +4 na mesa e escolha a cor do próximo turno!'
      : pendingCard.value === 'shield'
        ? 'Escudo Espelho ativado! Escolha a cor da mesa após rebater.'
        : pendingCard.value === 'xray'
           ? 'Raio-X ativado! Escolha a cor e espie as cartas do próximo rival.'
          : 'Defina a cor ativa para o próximo turno.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolher cor do Coringa"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#0B3B24] p-6 text-center text-[#FFFDF9] shadow-2xl">
        <h3 className="font-display text-2xl font-bold text-amber-300">
          Escolha a Nova Cor!
        </h3>
        <p className="mt-1 text-xs text-emerald-100/80">{subtitle}</p>

        {pendingCard.value === 'wild4' && bluffChallengeEnabled && (
          <p
            className={`mt-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold ${
              isWild4Bluff
                ? 'bg-amber-400/15 text-amber-200'
                : 'bg-emerald-950/80 text-emerald-200'
            }`}
          >
            {isWild4Bluff
              ? `Atenção: você tem ${colorLabelPt(activeColor!)} na mão (blefe se alguém gritar DUVIDO!)`
              : 'Jogada limpa: se desafiarem seu +4, o rival compra +6!'}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {COLOR_OPTIONS.map((opt) => {
            const count = colorCounts[opt.color];
            const isBest = maxSuitCount > 0 && opt.color === dominantColor;
            return (
              <button
                key={opt.color}
                type="button"
                onClick={() => onChooseColor(opt.color)}
                style={{ backgroundColor: opt.hex }}
                className={`flex min-h-[66px] flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-white shadow-lg transition hover:scale-[1.03] active:scale-95 ${
                  isBest ? 'ring-3 ring-white' : ''
                }`}
              >
                <span className="flex items-center gap-1.5 font-display text-base font-bold">
                  <span aria-hidden="true">{opt.symbol}</span>
                  <span>{colorLabelPt(opt.color)}</span>
                </span>
                <span className="mt-0.5 font-mono-num text-[11px] font-semibold text-white/90">
                  {count} {count === 1 ? 'carta' : 'cartas'}
                  {isBest ? ' ★' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 min-h-[44px] w-full rounded-xl bg-black/25 text-xs font-semibold text-emerald-100 hover:bg-black/40"
        >
          Cancelar jogada
        </button>
      </div>
    </div>
  );
};

interface SwapHandModalProps {
  open: boolean;
  opponents: PlayerSeat[];
  myTeamId?: '' | 'A' | 'B';
  onSelectTarget: (targetSeatId: string) => void;
  onCancel: () => void;
}

export const SwapHandModal: React.FC<SwapHandModalProps> = ({
  open,
  opponents,
  myTeamId,
  onSelectTarget,
  onCancel,
}) => {
  if (!open) return null;
  const activeOpponents = opponents.filter((o) => !o.eliminated);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolher jogador para trocar de mão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-amber-300">
              Carta 7 · Trocar de Mão!
            </h3>
            <p className="text-xs text-emerald-100/80">
              Roube a mão enxuta de quem está quase batendo!
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {activeOpponents.map((opp) => {
            const isPartner = Boolean(myTeamId && opp.teamId === myTeamId);
            return (
              <button
                key={opp.id}
                type="button"
                onClick={() => onSelectTarget(opp.id)}
                className="flex min-h-[50px] w-full items-center justify-between rounded-2xl border border-white/15 bg-[#072818] px-4 py-2.5 text-left transition hover:border-amber-300 hover:bg-[#10472C]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">
                    {opp.name}
                    {isPartner ? ' (Sua Dupla)' : ''}
                  </div>
                  <div className="text-[11px] text-emerald-200/75">
                    {opp.hand.length === 1 ? 'UNO! Só 1 carta!' : `${opp.hand.length} cartas na mão`}
                  </div>
                </div>
                <span className="ml-2 font-mono-num text-sm font-bold text-amber-300 whitespace-nowrap">
                  Trocar →
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 min-h-[44px] w-full rounded-xl bg-black/25 text-xs font-semibold text-emerald-100 hover:bg-black/40"
        >
          Cancelar jogada
        </button>
      </div>
    </div>
  );
};

interface Wild4ChallengeModalProps {
  open: boolean;
  attackerName: string;
  prevColorLabel: string;
  pendingDraw: number;
  canCounterWithCard: boolean;
  onChallengeBluff: () => void;
  onAcceptDraw: () => void;
  onDismissToCounter?: () => void;
}

export const Wild4ChallengeModal: React.FC<Wild4ChallengeModalProps> = ({
  open,
  attackerName,
  prevColorLabel,
  pendingDraw,
  canCounterWithCard,
  onChallengeBluff,
  onAcceptDraw,
  onDismissToCounter,
}) => {
  if (!open) return null;
  const drawCount = Math.max(4, pendingDraw);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Desafio de blefe do Coringa +4"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-amber-300 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-amber-300">
              DUVIDO DO +4?!
            </h3>
            <p className="text-xs text-emerald-100/90">
              <strong>{attackerName}</strong> jogou um +4 em você! Acha que tinha{' '}
              <strong>{prevColorLabel}</strong> escondido na mão?
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#072818] p-3 text-xs leading-relaxed text-emerald-100/90">
          <div>
            • Se <strong>blefou</strong>: {attackerName} compra <strong>+4</strong> e a vez continua sua!
          </div>
          <div className="mt-1">
            • Se <strong>não blefou</strong>: você paga a língua e compra <strong>+{drawCount + 2}</strong>!
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onChallengeBluff}
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98]"
          >
            <span>DUVIDO! Desafiar Blefe</span>
          </button>

          <button
            type="button"
            onClick={onAcceptDraw}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#072818] px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-[#0E442A]"
          >
            <span>Aceitar +{drawCount} sem desafiar</span>
          </button>

          {canCounterWithCard && onDismissToCounter && (
            <button
              type="button"
              onClick={onDismissToCounter}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/45 bg-cyan-950/70 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-900/80"
            >
              <span>Rebater com +4 / Escudo da minha mão</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  open: boolean;
  roomLabel: string;
  pausedByName?: string;
  roundNumber: number;
  playerCardsCount: number;
  savedMessagesCount: number;
  roundsWon: number;
  appearance: AppearancePrefs;
  muted: boolean;
  vibrationEnabled: boolean;
  canAddBot: boolean;
  onChangeAppearance: (next: AppearancePrefs) => void;
  onToggleMute: () => void;
  onToggleVibration: () => void;
  onAddBot: () => void;
  onResume: () => void;
  onSaveAndExitToTitle: () => void;
  onRestartRound: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  roomLabel,
  pausedByName,
  roundNumber,
  playerCardsCount,
  savedMessagesCount,
  roundsWon,
  appearance,
  muted,
  vibrationEnabled,
  canAddBot,
  onChangeAppearance,
  onToggleMute,
  onToggleVibration,
  onAddBot,
  onResume,
  onSaveAndExitToTitle,
  onRestartRound,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partida pausada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-400/35 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
            <Pause className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-amber-300">
              Partida em Pausa
            </h2>
            <p className="text-xs text-emerald-100/80">
              {pausedByName
                ? `Pausada por ${pausedByName} · Tudo salvo automaticamente`
                : `${roomLabel} · Progresso e histórico de chat salvos`}
            </p>
          </div>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-[#072818] p-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-200/70">
              Rodada
            </div>
            <div className="mt-1 font-mono-num text-2xl font-bold text-white">
              {roundNumber}
            </div>
          </div>
          <div className="rounded-2xl bg-[#072818] p-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-200/70">
              Suas Cartas
            </div>
            <div className="mt-1 font-mono-num text-2xl font-bold text-amber-300">
              {playerCardsCount}
            </div>
          </div>
          <div className="rounded-2xl bg-[#072818] p-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-200/70">
              Mensagens
            </div>
            <div className="mt-1 font-mono-num text-2xl font-bold text-emerald-300">
              {savedMessagesCount}
            </div>
          </div>
        </div>

        {/* Sound & Vibration Toggles */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#072818] px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-[#0D4128]"
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-amber-300" />}
            <span>Som: {muted ? 'OFF' : 'ON'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleVibration}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#072818] px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-[#0D4128]"
          >
            <Smartphone className="h-4 w-4 text-amber-300" />
            <span>Vibração: {vibrationEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Quick Table Felt & Card Back Switcher */}
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#072818] p-3">
          <div className="text-xs font-semibold text-emerald-100">
            Pano da Mesa &amp; Verso ({roundsWon} vitórias)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {TABLE_THEMES.map((th) => {
              const unlocked = roundsWon >= th.unlockWinsRequired;
              const selected = appearance.tableTheme === th.id && unlocked;
              return (
                <button
                  key={th.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() =>
                    onChangeAppearance({ ...appearance, tableTheme: th.id as TableThemeId })
                  }
                  className={`flex min-h-[36px] items-center justify-between rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
                    selected
                      ? 'border-amber-300 bg-[#145334] text-amber-200'
                      : unlocked
                        ? 'border-white/10 bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                        : 'border-white/5 bg-black/25 text-emerald-200/40 cursor-not-allowed'
                  }`}
                >
                  <span className="truncate">{th.name}</span>
                  {!unlocked ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 font-mono-num text-[10px]">
                      <Lock className="h-3 w-3" />
                      {th.unlockWinsRequired}V
                    </span>
                  ) : selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            {CARD_BACKS.map((cb) => {
              const unlocked = roundsWon >= cb.unlockWinsRequired;
              const selected = appearance.cardBack === cb.id && unlocked;
              return (
                <button
                  key={cb.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() =>
                    onChangeAppearance({ ...appearance, cardBack: cb.id as CardBackId })
                  }
                  className={`flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-semibold transition ${
                    selected
                      ? 'border-amber-300 bg-[#145334] text-amber-200'
                      : unlocked
                        ? 'border-white/10 bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                        : 'border-white/5 bg-black/25 text-emerald-200/40 cursor-not-allowed'
                  }`}
                >
                  <span className="truncate">{cb.name}</span>
                  {!unlocked && (
                    <span className="font-mono-num text-[9px]">({cb.unlockWinsRequired}V)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>Continuar Jogando</span>
          </button>

          <button
            type="button"
            onClick={onSaveAndExitToTitle}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#072818] px-4 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-[#0D4128]"
          >
            <Home className="h-4 w-4 text-amber-300" />
            <span>Salvar e Continuar Depois</span>
          </button>

          {canAddBot && (
            <button
              type="button"
              onClick={onAddBot}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-[#08301D] px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-[#0D4128]"
            >
              <Bot className="h-4 w-4 text-amber-300" />
              <span>Adicionar Jogador IA na Mesa</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestartRound}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-black/25 px-4 py-2 text-xs font-semibold text-emerald-200/85 transition hover:bg-black/40"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reiniciar Esta Rodada</span>
          </button>
        </div>

        <div className="mt-4 flex justify-center border-t border-white/10 pt-3">
          <PWAInstallButton compact />
        </div>
      </div>
    </div>
  );
};

interface RoundOverModalProps {
  open: boolean;
  winnerId: string;
  winnerName: string;
  winningTeamId?: '' | 'A' | 'B';
  stakesMultiplier?: number;
  targetScore?: number;
  currentPlayerId: string;
  roundNumber: number;
  seats: PlayerSeat[];
  newlyUnlockedStickers: ZueiraSticker[];
  onNextRound: () => void;
  onRestartTournament?: () => void;
  onExitToTitle: () => void;
}

export const RoundOverModal: React.FC<RoundOverModalProps> = ({
  open,
  winnerId,
  winnerName,
  winningTeamId,
  stakesMultiplier = 1,
  targetScore = 0,
  currentPlayerId,
  roundNumber,
  seats,
  newlyUnlockedStickers,
  onNextRound,
  onRestartTournament,
  onExitToTitle,
}) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'busy' | 'done'>('idle');

  if (!open) return null;

  const mySeat = seats.find((s) => s.id === currentPlayerId);
  const didWin =
    winnerId === currentPlayerId ||
    Boolean(winningTeamId && mySeat?.teamId && mySeat.teamId === winningTeamId);
  const ranked = [...seats].sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  const isChampionshipOver = Boolean(targetScore > 0 && leader && leader.score >= targetScore);
  const didWinChampionship =
    isChampionshipOver &&
    Boolean(
      leader?.id === currentPlayerId ||
        (leader?.teamId && mySeat?.teamId && leader.teamId === mySeat.teamId)
    );
  const awards = computeRoundAwards(seats);

  const handleShareScorecard = async () => {
    if (shareStatus === 'busy') return;
    setShareStatus('busy');
    await shareOrDownloadScorecard({
      roundNumber,
      winnerName: isChampionshipOver && leader ? leader.name : winnerName,
      stakesMultiplier,
      seats,
      awards,
      targetScore,
      isChampionshipOver,
    });
    setShareStatus('done');
    window.setTimeout(() => setShareStatus('idle'), 2600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado da rodada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
        <div className="text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              isChampionshipOver
                ? 'bg-amber-400 text-zinc-950 shadow-lg'
                : 'bg-amber-400/20 text-amber-300'
            }`}
          >
            <Trophy className="h-8 w-8" />
          </div>
          {isChampionshipOver && (
            <div className="mt-2 font-mono-num text-xs font-bold text-amber-200">
              META DE {targetScore} PONTOS ATINGIDA!
            </div>
          )}
          <h2 className="mt-2 font-display text-3xl font-bold text-amber-300">
            {isChampionshipOver
              ? didWinChampionship
                ? 'Campeão do Torneio!'
                : `${leader?.name || winnerName} Levou o Torneio!`
              : didWin
                ? winningTeamId
                  ? 'Sua Dupla Bateu!'
                  : 'Você Bateu!'
                : `${winnerName} Venceu!`}
          </h2>
          <p className="mt-1 text-xs text-emerald-100/80">
            Fim da Rodada {roundNumber}
            {stakesMultiplier > 1 ? ` · Mesa Dobrada ${stakesMultiplier}x!` : ''}
            {targetScore > 0 ? ` · Torneio ${targetScore} pts` : ' · Placar acumulado'}
          </p>
        </div>

        {/* Celebratory Banner when Winning Unlocks a Special Foil/Holo Taunt Card! */}
        {didWin && newlyUnlockedStickers.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-[#144B2F] p-3.5 shadow-lg">
            <div className="text-xs font-bold text-amber-300">
              Nova Cartinha Especial Desbloqueada!
            </div>
            {newlyUnlockedStickers.map((st) => (
              <div key={st.id} className="mt-2 flex items-center gap-3">
                <ZueiraCardArt sticker={st} size="md" />
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-white">{st.title}</div>
                  <p className="text-xs text-emerald-100/90">{st.tauntLine}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pódio da Zueira Funny Awards */}
        {awards.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/12 bg-[#072818] p-3.5">
            <div className="text-xs font-bold text-amber-300">Pódio da Zueira</div>
            <div className="mt-2 space-y-2">
              {awards.map((aw) => (
                <div key={aw.id} className="border-t border-white/8 pt-1.5 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-amber-200">{aw.title}</span>
                    <span className="font-semibold text-white truncate">{aw.playerName}</span>
                  </div>
                  <div className="text-[11px] text-emerald-200/75">{aw.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {ranked.map((seat, idx) => {
            const pct =
              targetScore > 0
                ? Math.max(0, Math.min(100, Math.round((seat.score / targetScore) * 100)))
                : 0;
            return (
              <div
                key={seat.id}
                className={`rounded-2xl px-4 py-2.5 ${
                  seat.id === winnerId || (winningTeamId && seat.teamId === winningTeamId)
                    ? 'border border-amber-300/45 bg-[#124D30]'
                    : 'bg-[#072818]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono-num text-xs font-bold text-amber-300">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {seat.name}
                      {seat.eliminated ? ' (25+)' : ''}
                    </span>
                  </div>
                  <div className="text-right font-mono-num text-sm font-bold text-amber-300 whitespace-nowrap">
                    {targetScore > 0 ? `${seat.score}/${targetScore} pts` : `${seat.score} pts`} ·{' '}
                    {seat.hand.length} cartas
                  </div>
                </div>
                {targetScore > 0 && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {isChampionshipOver && onRestartTournament ? (
            <button
              type="button"
              data-start="true"
              onClick={onRestartTournament}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Novo Campeonato (Zerar Placar)</span>
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onNextRound}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Jogar Próxima Rodada</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareScorecard}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/45 bg-[#124B30] px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-[#175C3B]"
          >
            <Share2 className="h-4 w-4 text-amber-300" />
            <span>
              {shareStatus === 'busy'
                ? 'Gerando Card...'
                : shareStatus === 'done'
                  ? 'Card do Placar Salvo / Pronto!'
                  : 'Compartilhar Card do Placar (PNG)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onExitToTitle}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#072818] px-4 py-2.5 text-xs font-semibold text-emerald-100 transition hover:bg-[#0D4128]"
          >
            <Home className="h-4 w-4" />
            <span>Voltar ao Menu Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
