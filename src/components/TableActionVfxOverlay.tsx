import React from 'react';
import { SEAT_ANCHOR_COORDS, type MoveHistoryEntry } from '../game/moveHistory';
import type { CardBackSpec } from '../game/themes';
import { UnoCardView } from './UnoCardView';

interface TableActionVfxOverlayProps {
  activeMoveFx: MoveHistoryEntry | null;
  cardBack: CardBackSpec;
}

export const TableActionVfxOverlay: React.FC<TableActionVfxOverlayProps> = ({
  activeMoveFx,
  cardBack,
}) => {
  if (!activeMoveFx || activeMoveFx.kind === 'round_start') return null;

  const actorCoords = SEAT_ANCHOR_COORDS[activeMoveFx.actorPosition] || SEAT_ANCHOR_COORDS.top;
  const targetCoords = activeMoveFx.targetPosition
    ? SEAT_ANCHOR_COORDS[activeMoveFx.targetPosition]
    : null;

  const playedSlice = activeMoveFx.playedCards.slice(-3);
  const drawnVisualCount = Math.min(4, Math.max(0, activeMoveFx.drawnCount));

  return (
    <div
      key={activeMoveFx.id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center overflow-visible"
    >
      {/* 1. Directional Played Card(s) Flying from Acting Seat -> Discard Pile */}
      {playedSlice.map((card, idx) => {
        const spreadX = (idx - (playedSlice.length - 1) * 0.5) * 18;
        const flyStyle = {
          '--fly-x': `${Math.round(actorCoords.dx * 0.72 + spreadX)}px`,
          '--fly-y': `${Math.round(actorCoords.dy * 0.72)}px`,
          '--fly-rot': `${actorCoords.rot + idx * 8}deg`,
          animationDelay: `${idx * 65}ms`,
        } as React.CSSProperties;

        return (
          <div
            key={`${activeMoveFx.id}_play_${card.id}_${idx}`}
            style={flyStyle}
            className="animate-card-fly-in absolute left-1/2 top-1/2 translate-x-5 sm:translate-x-10 -translate-y-1/2 drop-shadow-[0_18px_28px_rgba(0,0,0,0.68)]"
          >
            <UnoCardView
              card={card}
              size="table"
              darkSide={activeMoveFx.darkSide}
              activeWildTint={activeMoveFx.activeColor}
            />
          </div>
        );
      })}

      {/* 2. Directional Drawn/Penalty Card(s) Flying from Draw Deck -> Target Seat */}
      {targetCoords &&
        drawnVisualCount > 0 &&
        Array.from({ length: drawnVisualCount }).map((_, idx) => {
          const flyOutStyle = {
            '--fly-x': `${Math.round(targetCoords.dx * 0.78)}px`,
            '--fly-y': `${Math.round(targetCoords.dy * 0.78)}px`,
            '--fly-rot': `${targetCoords.rot + (idx - 1) * 9}deg`,
            animationDelay: `${idx * 85}ms`,
          } as React.CSSProperties;

          return (
            <div
              key={`${activeMoveFx.id}_draw_${idx}`}
              style={flyOutStyle}
              className="animate-card-fly-out absolute left-1/2 top-1/2 -translate-x-12 sm:-translate-x-20 -translate-y-1/2 drop-shadow-[0_14px_22px_rgba(0,0,0,0.65)]"
            >
              <UnoCardView faceDown size="sm" cardBack={cardBack} />
            </div>
          );
        })}

      {/* 3. High-Clarity Table Impact Callout Badge */}
      {activeMoveFx.calloutTitle && (
        <div
          style={{ borderColor: activeMoveFx.accentHex }}
          className="animate-impact-callout absolute -top-11 sm:-top-14 left-1/2 z-30 w-max max-w-[270px] sm:max-w-[340px] rounded-2xl border-2 bg-[#062114]/96 px-3.5 py-2 text-center shadow-[0_18px_40px_rgba(0,0,0,0.82)]"
        >
          <div
            style={{ color: activeMoveFx.accentHex }}
            className="font-display text-sm sm:text-base font-bold tracking-tight leading-none"
          >
            {activeMoveFx.calloutTitle}
          </div>
          {activeMoveFx.calloutSubtitle && (
            <div className="mt-1 truncate text-[11px] sm:text-xs font-semibold text-white/95">
              {activeMoveFx.calloutSubtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
