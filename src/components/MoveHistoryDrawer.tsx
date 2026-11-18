import React from 'react';
import { History, Gauge, X } from 'lucide-react';
import { colorLabelPt } from '../game/unoRules';
import {
  SUIT_HEX,
  type AiSpeedPreset,
  type MoveHistoryEntry,
  type SeatAnchorPosition,
} from '../game/moveHistory';
import type { CardBackSpec } from '../game/themes';
import { UnoCardView } from './UnoCardView';

const SEAT_LABEL_PT: Record<SeatAnchorPosition, string> = {
  bottom: 'Sua mão (Sul)',
  left: 'Esquerda',
  'top-left': 'Canto Sup. Esq.',
  top: 'Frente (Norte)',
  'top-right': 'Canto Sup. Dir.',
  right: 'Direita',
};

function formatRelativeSeconds(timestampMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (diffSec <= 2) return 'agora';
  if (diffSec < 60) return `há ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  return `há ${mins}m`;
}

interface MoveHistoryDrawerProps {
  open: boolean;
  mode: 'local' | 'online';
  roundNumber: number;
  entries: MoveHistoryEntry[];
  aiSpeed: AiSpeedPreset;
  cardBack: CardBackSpec;
  onChangeAiSpeed: (speed: AiSpeedPreset) => void;
  onClose: () => void;
}

export const MoveHistoryDrawer: React.FC<MoveHistoryDrawerProps> = ({
  open,
  mode,
  roundNumber,
  entries,
  aiSpeed,
  cardBack,
  onChangeAiSpeed,
  onClose,
}) => {
  if (!open) return null;

  const nowMs = Date.now();
  const reversedEntries = [...entries].reverse();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Histórico de jogadas da mesa"
      className="fixed inset-0 z-40 flex justify-end bg-black/72"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-amber-300/30 bg-[#062415] text-[#FFFDF9] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-white">
                Histórico da Mesa
              </h2>
              <p className="text-xs text-emerald-200/80">
                Rodada {roundNumber} · {entries.length}{' '}
                {entries.length === 1 ? 'evento registrado' : 'eventos registrados'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar histórico de jogadas"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-black/35 text-emerald-100 transition hover:bg-black/55"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI Turn Speed Control ("Ritmo das IAs") */}
        <div className="border-b border-white/10 bg-[#0A3520]/80 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Gauge className="h-4 w-4" />
              <span>Ritmo das IAs na mesa</span>
            </div>
            <span className="text-[11px] text-emerald-200/80">
              {mode === 'local' ? 'IAs aguardam enquanto aberto' : 'Cadência dos bots'}
            </span>
          </div>

          <div
            role="group"
            aria-label="Velocidade das jogadas das IAs"
            className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-black/35 p-1"
          >
            {(
              [
                { id: 'slow', label: 'Calmo', hint: '2,0s' },
                { id: 'normal', label: 'Normal', hint: '1,3s' },
                { id: 'fast', label: 'Rápido', hint: '0,8s' },
              ] as const
            ).map((opt) => {
              const active = aiSpeed === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeAiSpeed(opt.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center rounded-lg py-1.5 px-2 text-xs font-bold transition ${
                    active
                      ? 'bg-amber-400 text-zinc-950 shadow-sm'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`font-mono-num text-[10px] ${
                      active ? 'text-zinc-800' : 'text-emerald-200/70'
                    }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chronological Move Log (Newest on Top) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-2.5">
          {reversedEntries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-center text-sm text-emerald-200/80">
              Nenhuma jogada registrada ainda nesta rodada. Assim que as cartas forem lançadas, tudo aparece aqui passo a passo!
            </div>
          ) : (
            reversedEntries.map((entry, idx) => {
              const isLatest = idx === 0;
              const suitHex = SUIT_HEX[entry.activeColor] || '#FACC15';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                    isLatest
                      ? 'border-amber-300/65 bg-[#0E4429] shadow-md'
                      : 'border-white/10 bg-black/30'
                  }`}
                >
                  {/* Visual Mini Card or Draw Stack Thumbnail */}
                  <div className="relative flex shrink-0 items-center justify-center">
                    {entry.playedCards.length > 0 ? (
                      <div className="relative flex items-center">
                        {entry.playedCards.length > 1 && (
                          <div className="mr-[-26px] -rotate-6 scale-90 opacity-85">
                            <UnoCardView
                              card={entry.playedCards[0]}
                              size="sm"
                              darkSide={entry.darkSide}
                            />
                          </div>
                        )}
                        <UnoCardView
                          card={entry.playedCards[entry.playedCards.length - 1]}
                          size="sm"
                          darkSide={entry.darkSide}
                          activeWildTint={entry.activeColor}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <UnoCardView faceDown size="sm" cardBack={cardBack} />
                        {entry.drawnCount > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 rounded-md bg-rose-600 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-white shadow">
                            +{entry.drawnCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Move Explanation */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-200/80">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono-num font-bold text-amber-300">
                          #{entry.seq}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate font-semibold text-white">
                          {entry.actorName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{SEAT_LABEL_PT[entry.actorPosition]}</span>
                      </div>
                      <span className="font-mono-num shrink-0 text-[10px] text-emerald-200/70">
                        {formatRelativeSeconds(entry.timestampMs, nowMs)}
                      </span>
                    </div>

                    {entry.calloutTitle && (
                      <div
                        style={{ color: entry.accentHex }}
                        className="mt-0.5 font-display text-xs font-bold tracking-tight"
                      >
                        {entry.calloutTitle}
                      </div>
                    )}

                    <p className="mt-0.5 text-xs sm:text-[13px] font-medium leading-snug text-white/95">
                      {entry.summaryText}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-200/80">
                      <span
                        style={{ backgroundColor: suitHex }}
                        className="inline-block h-2.5 w-2.5 rounded-full border border-white/50"
                        aria-hidden="true"
                      />
                      <span>Cor na mesa: {colorLabelPt(entry.activeColor)}</span>
                      {entry.darkSide && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-300">Lado Sombrio</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
