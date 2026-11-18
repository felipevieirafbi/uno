import {
  cardLabelPt,
  colorLabelPt,
  type ActiveColor,
  type PlayerSeat,
  type UnoCard,
  type UnoGameState,
} from './unoRules';

export type SeatAnchorPosition =
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right';

export type AiSpeedPreset = 'slow' | 'normal' | 'fast';

const AI_SPEED_STORAGE_KEY = 'unozueira_ai_speed_v1';

export interface PerimeterSeatSlot {
  seat: PlayerSeat;
  position: SeatAnchorPosition;
  /** Relative offset from center table in px-equivalent viewport percentages (-50..50) */
  flightOffsetX: number;
  flightOffsetY: number;
  flightRotateDeg: number;
}

export type MoveEventKind =
  | 'round_start'
  | 'play'
  | 'combo'
  | 'jump_in'
  | 'skip'
  | 'reverse'
  | 'bomb'
  | 'shield'
  | 'xray'
  | 'flip'
  | 'swap'
  | 'rotate'
  | 'draw'
  | 'penalty_draw'
  | 'double'
  | 'challenge_caught'
  | 'challenge_failed'
  | 'uno_shout'
  | 'uno_catch'
  | 'victory';

export interface MoveHistoryEntry {
  id: string;
  seq: number;
  actorId: string;
  actorName: string;
  actorPosition: SeatAnchorPosition;
  targetPosition?: SeatAnchorPosition;
  kind: MoveEventKind;
  playedCards: UnoCard[];
  drawnCount: number;
  activeColor: ActiveColor;
  darkSide: boolean;
  summaryText: string;
  calloutTitle: string;
  calloutSubtitle: string;
  accentHex: string;
  isHeavyImpact: boolean;
  timestampMs: number;
}

export const SUIT_HEX: Record<ActiveColor, string> = {
  red: '#E11D48',
  blue: '#0284C7',
  yellow: '#FACC15',
  green: '#16A34A',
};

export const SEAT_ANCHOR_COORDS: Record<
  SeatAnchorPosition,
  { dx: number; dy: number; rot: number; originRatioX: number; originRatioY: number }
> = {
  bottom: { dx: 0, dy: 210, rot: -8, originRatioX: 0.5, originRatioY: 0.84 },
  left: { dx: -270, dy: 0, rot: -26, originRatioX: 0.14, originRatioY: 0.48 },
  'top-left': { dx: -200, dy: -175, rot: -18, originRatioX: 0.25, originRatioY: 0.18 },
  top: { dx: 0, dy: -195, rot: 14, originRatioX: 0.5, originRatioY: 0.16 },
  'top-right': { dx: 200, dy: -175, rot: 18, originRatioX: 0.75, originRatioY: 0.18 },
  right: { dx: 270, dy: 0, rot: 26, originRatioX: 0.86, originRatioY: 0.48 },
};

/**
 * Maps opponents in clockwise table order starting immediately after `currentPlayerId` (seated at `bottom`).
 * - 1 opponent (2P): ['top']
 * - 2 opponents (3P): ['top-left', 'top-right']
 * - 3 opponents (4P / 2v2): ['left', 'top', 'right'] (partner at 'top' sits directly across!)
 * - 4 opponents (5P): ['left', 'top-left', 'top-right', 'right']
 * - 5 opponents (6P): ['left', 'top-left', 'top', 'top-right', 'right']
 */
export function computePerimeterSeats(
  seats: readonly PlayerSeat[],
  currentPlayerId: string
): PerimeterSeatSlot[] {
  if (seats.length <= 1) return [];
  const myIdx = Math.max(
    0,
    seats.findIndex((s) => s.id === currentPlayerId)
  );
  const total = seats.length;
  const clockwiseOpponents: PlayerSeat[] = [];
  for (let step = 1; step < total; step++) {
    clockwiseOpponents.push(seats[(myIdx + step) % total]);
  }

  const count = clockwiseOpponents.length;
  let layoutPositions: SeatAnchorPosition[];
  if (count === 1) {
    layoutPositions = ['top'];
  } else if (count === 2) {
    layoutPositions = ['top-left', 'top-right'];
  } else if (count === 3) {
    layoutPositions = ['left', 'top', 'right'];
  } else if (count === 4) {
    layoutPositions = ['left', 'top-left', 'top-right', 'right'];
  } else {
    layoutPositions = ['left', 'top-left', 'top', 'top-right', 'right'];
  }

  return clockwiseOpponents.slice(0, layoutPositions.length).map((seat, idx) => {
    const pos = layoutPositions[idx];
    const coords = SEAT_ANCHOR_COORDS[pos];
    return {
      seat,
      position: pos,
      flightOffsetX: coords.dx,
      flightOffsetY: coords.dy,
      flightRotateDeg: coords.rot,
    };
  });
}

export function getSeatPositionForPlayer(
  seats: readonly PlayerSeat[],
  actorId: string,
  currentPlayerId: string
): SeatAnchorPosition {
  if (!actorId || actorId === currentPlayerId) return 'bottom';
  const perimeter = computePerimeterSeats(seats, currentPlayerId);
  return perimeter.find((p) => p.seat.id === actorId)?.position ?? 'top';
}

export function loadAiSpeed(): AiSpeedPreset {
  if (typeof window === 'undefined') return 'normal';
  try {
    const raw = window.localStorage.getItem(AI_SPEED_STORAGE_KEY);
    if (raw === 'slow' || raw === 'normal' || raw === 'fast') return raw;
  } catch {
    // Ignore
  }
  return 'normal';
}

export function saveAiSpeed(speed: AiSpeedPreset): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_SPEED_STORAGE_KEY, speed);
  } catch {
    // Ignore
  }
}

export function cycleAiSpeed(current: AiSpeedPreset): AiSpeedPreset {
  if (current === 'normal') return 'slow';
  if (current === 'slow') return 'fast';
  return 'normal';
}

export function aiSpeedLabelPt(speed: AiSpeedPreset): string {
  if (speed === 'slow') return 'Calmo';
  if (speed === 'fast') return 'Rápido';
  return 'Normal';
}

/**
 * Computes an event-aware AI turn delay so players can clearly read card flights and special effects,
 * especially when multiple AI bots act in sequence.
 */
export function computeBotTurnDelayMs(
  speed: AiSpeedPreset,
  lastEventKind?: MoveEventKind
): number {
  const base = speed === 'slow' ? 1950 : speed === 'fast' ? 760 : 1320;
  const heavyExtra = speed === 'slow' ? 680 : speed === 'fast' ? 240 : 520;
  const isHeavy =
    lastEventKind === 'bomb' ||
    lastEventKind === 'shield' ||
    lastEventKind === 'flip' ||
    lastEventKind === 'swap' ||
    lastEventKind === 'rotate' ||
    lastEventKind === 'skip' ||
    lastEventKind === 'reverse' ||
    lastEventKind === 'combo' ||
    lastEventKind === 'jump_in' ||
    lastEventKind === 'double' ||
    lastEventKind === 'challenge_caught' ||
    lastEventKind === 'challenge_failed' ||
    lastEventKind === 'uno_catch';

  return isHeavy ? base + heavyExtra : base;
}

/**
 * Diffs two consecutive `UnoGameState` snapshots and derives a rich `MoveHistoryEntry`
 * describing who acted, where they sit around the table, what card(s) flew, and what callout to show.
 */
export function deriveMoveHistoryEntry(
  prevState: UnoGameState | null,
  nextState: UnoGameState,
  currentPlayerId: string,
  seq: number,
  nowMs: number = Date.now()
): MoveHistoryEntry | null {
  const activeHex = SUIT_HEX[nextState.activeColor] || '#FACC15';
  const topCard = nextState.discardPile[nextState.discardPile.length - 1];

  // Fresh round deal
  if (!prevState) {
    const starter = nextState.seats[nextState.currentTurnIndex];
    return {
      id: `mh_${seq}_${nowMs}`,
      seq,
      actorId: starter?.id || '',
      actorName: starter?.name || 'Mesa',
      actorPosition: getSeatPositionForPlayer(
        nextState.seats,
        starter?.id || '',
        currentPlayerId
      ),
      kind: 'round_start',
      playedCards: topCard ? [topCard] : [],
      drawnCount: 0,
      activeColor: nextState.activeColor,
      darkSide: Boolean(nextState.darkSide),
      summaryText: nextState.lastActionText || 'Nova rodada distribuída na mesa!',
      calloutTitle: '',
      calloutSubtitle: '',
      accentHex: activeHex,
      isHeavyImpact: false,
      timestampMs: nowMs,
    };
  }

  // Ignore pure hand-sorting where nothing on the table changed
  if (
    prevState.lastActionText === nextState.lastActionText &&
    prevState.currentTurnIndex === nextState.currentTurnIndex &&
    prevState.discardPile.length === nextState.discardPile.length &&
    prevState.drawDeck.length === nextState.drawDeck.length &&
    prevState.pendingDraw === nextState.pendingDraw &&
    prevState.stakesMultiplier === nextState.stakesMultiplier &&
    prevState.phase === nextState.phase
  ) {
    return null;
  }

  const prevTurnSeat = prevState.seats[prevState.currentTurnIndex];

  // 0. New Player / Bot Joined the Table Mid-Round
  if (nextState.seats.length > prevState.seats.length) {
    const joinedSeat = nextState.seats[nextState.seats.length - 1];
    return {
      id: `mh_${seq}_${nowMs}`,
      seq,
      actorId: joinedSeat.id,
      actorName: joinedSeat.name,
      actorPosition: getSeatPositionForPlayer(nextState.seats, joinedSeat.id, currentPlayerId),
      kind: 'round_start',
      playedCards: [],
      drawnCount: 0,
      activeColor: nextState.activeColor,
      darkSide: Boolean(nextState.darkSide),
      summaryText: nextState.lastActionText || `${joinedSeat.name} sentou na mesa!`,
      calloutTitle: '',
      calloutSubtitle: '',
      accentHex: activeHex,
      isHeavyImpact: false,
      timestampMs: nowMs,
    };
  }

  // 1. Table Stakes Doubled ("TRUCO / DOBROU!")
  if ((nextState.stakesMultiplier || 1) > (prevState.stakesMultiplier || 1)) {
    const doublerId = nextState.lastDoublerId || prevTurnSeat?.id || '';
    const doubler = nextState.seats.find((s) => s.id === doublerId) || prevTurnSeat;
    const mult = nextState.stakesMultiplier || 2;
    return {
      id: `mh_${seq}_${nowMs}`,
      seq,
      actorId: doubler?.id || '',
      actorName: doubler?.name || 'Jogador',
      actorPosition: getSeatPositionForPlayer(nextState.seats, doubler?.id || '', currentPlayerId),
      kind: 'double',
      playedCards: [],
      drawnCount: 0,
      activeColor: nextState.activeColor,
      darkSide: Boolean(nextState.darkSide),
      summaryText: nextState.lastActionText,
      calloutTitle: `MESA DOBRADA ${mult}x!`,
      calloutSubtitle: `${doubler?.name || 'Alguém'} aumentou o valor da rodada!`,
      accentHex: '#F43F5E',
      isHeavyImpact: true,
      timestampMs: nowMs,
    };
  }

  // 2. Wild +4 Bluff Challenge Resolution (only when victim actually challenged!)
  if (
    prevState.challengeVictimId &&
    !nextState.challengeVictimId &&
    prevState.discardPile.length === nextState.discardPile.length
  ) {
    const grewSeat = nextState.seats.find((ns) => {
      const ps = prevState.seats.find((p) => p.id === ns.id);
      return ps && ns.hand.length > ps.hand.length;
    });
    const drawnDelta = grewSeat
      ? grewSeat.hand.length -
        (prevState.seats.find((p) => p.id === grewSeat.id)?.hand.length ?? 0)
      : 4;
    const caughtBluff = grewSeat?.id === prevState.challengeAttackerId;
    const failedChallenge =
      !caughtBluff &&
      (drawnDelta > prevState.pendingDraw ||
        nextState.lastActionText.toLowerCase().includes('duvid'));

    if (caughtBluff || failedChallenge) {
      const victimSeat = nextState.seats.find((s) => s.id === prevState.challengeVictimId);
      return {
        id: `mh_${seq}_${nowMs}`,
        seq,
        actorId: victimSeat?.id || '',
        actorName: victimSeat?.name || 'Jogador',
        actorPosition: getSeatPositionForPlayer(
          nextState.seats,
          victimSeat?.id || '',
          currentPlayerId
        ),
        targetPosition: grewSeat
          ? getSeatPositionForPlayer(nextState.seats, grewSeat.id, currentPlayerId)
          : undefined,
        kind: caughtBluff ? 'challenge_caught' : 'challenge_failed',
        playedCards: [],
        drawnCount: Math.max(0, drawnDelta),
        activeColor: nextState.activeColor,
        darkSide: Boolean(nextState.darkSide),
        summaryText: nextState.lastActionText,
        calloutTitle: caughtBluff
          ? 'PEGO NO BLEFE! +4'
          : `BLEFE HONESTO! +${Math.max(6, drawnDelta)}!`,
        calloutSubtitle: nextState.lastActionText,
        accentHex: caughtBluff ? '#FACC15' : '#EF4444',
        isHeavyImpact: true,
        timestampMs: nowMs,
      };
    }
  }

  // 3. UNO Shout or Forgot-UNO Catch Penalty (discardPile unchanged)
  if (nextState.discardPile.length === prevState.discardPile.length) {
    // Check if someone's hand grew (draw or UNO catch or bomb absorbed!)
    const grewSeat = nextState.seats.find((ns) => {
      const ps = prevState.seats.find((p) => p.id === ns.id);
      return ps && ns.hand.length > ps.hand.length;
    });

    if (grewSeat) {
      const prevCount = prevState.seats.find((p) => p.id === grewSeat.id)?.hand.length ?? 0;
      const drawnDelta = grewSeat.hand.length - prevCount;
      const wasUnoCatch = (grewSeat.caughtUnoCount || 0) >
        (prevState.seats.find((p) => p.id === grewSeat.id)?.caughtUnoCount || 0);
      const wasPenalty = prevState.pendingDraw > 0 && nextState.pendingDraw === 0;
      const pos = getSeatPositionForPlayer(nextState.seats, grewSeat.id, currentPlayerId);

      return {
        id: `mh_${seq}_${nowMs}`,
        seq,
        actorId: grewSeat.id,
        actorName: grewSeat.name,
        actorPosition: pos,
        targetPosition: pos,
        kind: wasUnoCatch ? 'uno_catch' : wasPenalty ? 'penalty_draw' : 'draw',
        playedCards: [],
        drawnCount: drawnDelta,
        activeColor: nextState.activeColor,
        darkSide: Boolean(nextState.darkSide),
        summaryText: nextState.lastActionText,
        calloutTitle: wasUnoCatch
          ? 'PEGO SEM UNO! +2'
          : wasPenalty
            ? `COMPROU +${drawnDelta}!`
            : drawnDelta > 1
              ? `+${drawnDelta} CARTAS`
              : '',
        calloutSubtitle: wasUnoCatch || wasPenalty ? `${grewSeat.name} puxou ${drawnDelta} cartas do monte` : '',
        accentHex: wasUnoCatch || wasPenalty ? '#EF4444' : '#38BDF8',
        isHeavyImpact: wasUnoCatch || wasPenalty,
        timestampMs: nowMs,
      };
    }

    // Check UNO shout
    const shoutedSeat = nextState.seats.find((ns) => {
      const ps = prevState.seats.find((p) => p.id === ns.id);
      return ps && !ps.saidUno && ns.saidUno;
    });
    if (shoutedSeat) {
      return {
        id: `mh_${seq}_${nowMs}`,
        seq,
        actorId: shoutedSeat.id,
        actorName: shoutedSeat.name,
        actorPosition: getSeatPositionForPlayer(nextState.seats, shoutedSeat.id, currentPlayerId),
        kind: 'uno_shout',
        playedCards: [],
        drawnCount: 0,
        activeColor: nextState.activeColor,
        darkSide: Boolean(nextState.darkSide),
        summaryText: nextState.lastActionText,
        calloutTitle: 'UNO!!',
        calloutSubtitle: `${shoutedSeat.name} está por 1 carta!`,
        accentHex: '#FACC15',
        isHeavyImpact: true,
        timestampMs: nowMs,
      };
    }

    // Pass after draw
    return {
      id: `mh_${seq}_${nowMs}`,
      seq,
      actorId: prevTurnSeat?.id || '',
      actorName: prevTurnSeat?.name || 'Jogador',
      actorPosition: getSeatPositionForPlayer(
        nextState.seats,
        prevTurnSeat?.id || '',
        currentPlayerId
      ),
      kind: 'draw',
      playedCards: [],
      drawnCount: 0,
      activeColor: nextState.activeColor,
      darkSide: Boolean(nextState.darkSide),
      summaryText: nextState.lastActionText,
      calloutTitle: '',
      calloutSubtitle: '',
      accentHex: activeHex,
      isHeavyImpact: false,
      timestampMs: nowMs,
    };
  }

  // 4. Card(s) Played onto Discard Pile!
  const discardDelta = Math.max(1, nextState.discardPile.length - prevState.discardPile.length);
  const newlyPlayed = nextState.discardPile.slice(-Math.min(discardDelta, 4));
  const primaryCard = newlyPlayed[newlyPlayed.length - 1] || topCard;

  // Identify who played the card(s): check whose hand originally held primaryCard.id!
  const cardOwnerPrev =
    (primaryCard &&
      prevState.seats.find((s) => s.hand.some((c) => c.id === primaryCard.id))) ||
    prevTurnSeat ||
    nextState.seats[0];

  const actorId = cardOwnerPrev?.id || '';
  const actorName = cardOwnerPrev?.name || 'Jogador';
  const actorPos = getSeatPositionForPlayer(nextState.seats, actorId, currentPlayerId);
  const wasJumpIn = Boolean(prevTurnSeat && actorId && prevTurnSeat.id !== actorId);

  // Check if an opponent immediately absorbed penalty cards (when stacking is OFF)
  const victimWhoGrew = nextState.seats.find((ns) => {
    if (ns.id === actorId) return false;
    const ps = prevState.seats.find((p) => p.id === ns.id);
    return ps && ns.hand.length >= ps.hand.length + 2;
  });
  const immediatePenaltyDrawn = victimWhoGrew
    ? victimWhoGrew.hand.length -
      (prevState.seats.find((p) => p.id === victimWhoGrew.id)?.hand.length ?? 0)
    : 0;
  const victimPos = victimWhoGrew
    ? getSeatPositionForPlayer(nextState.seats, victimWhoGrew.id, currentPlayerId)
    : undefined;

  if (nextState.phase === 'round_over') {
    return {
      id: `mh_${seq}_${nowMs}`,
      seq,
      actorId,
      actorName,
      actorPosition: actorPos,
      kind: 'victory',
      playedCards: primaryCard ? [primaryCard] : [],
      drawnCount: 0,
      activeColor: nextState.activeColor,
      darkSide: Boolean(nextState.darkSide),
      summaryText: nextState.lastActionText,
      calloutTitle: `${nextState.winnerName || actorName} BATEU!`,
      calloutSubtitle: 'Fim da rodada!',
      accentHex: '#FACC15',
      isHeavyImpact: true,
      timestampMs: nowMs,
    };
  }

  let kind: MoveEventKind = 'play';
  let calloutTitle = '';
  let calloutSubtitle = '';
  let accentHex = activeHex;
  let isHeavyImpact = false;

  if (wasJumpIn) {
    kind = 'jump_in';
    calloutTitle = 'CORTE NA FRENTE!';
    calloutSubtitle = `${actorName} atravessou a vez com ${cardLabelPt(primaryCard, Boolean(nextState.darkSide))}!`;
    accentHex = '#FACC15';
    isHeavyImpact = true;
  } else if (newlyPlayed.length >= 2) {
    kind = 'combo';
    calloutTitle = `COMBO ${newlyPlayed.length}x '${primaryCard.value}'!`;
    calloutSubtitle = `${actorName} descartou ${newlyPlayed.length} cartas de uma vez!`;
    accentHex = '#FACC15';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'shield') {
    kind = 'shield';
    calloutTitle =
      prevState.pendingDraw > 0
        ? `REBATEU +${nextState.pendingDraw}!`
        : 'ESCUDO ESPELHO!';
    calloutSubtitle = `${actorName} puxou ${colorLabelPt(nextState.activeColor)}`;
    accentHex = '#22D3EE';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'flip') {
    kind = 'flip';
    calloutTitle = nextState.darkSide ? 'LADO SOMBRIO!' : 'LADO CLARO!';
    calloutSubtitle = nextState.darkSide
      ? '+2 agora vale +5 e Bloqueio pula todos!'
      : 'A mesa voltou ao normal!';
    accentHex = nextState.darkSide ? '#F43F5E' : '#34D399';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'xray') {
    kind = 'xray';
    calloutTitle = 'RAIO-X ATIVADO!';
    calloutSubtitle = `${actorName} espiou a mão seguinte (${colorLabelPt(nextState.activeColor)})`;
    accentHex = '#A78BFA';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'wild4' || primaryCard?.value === 'draw2') {
    kind = 'bomb';
    const totalStack =
      nextState.pendingDraw > 0
        ? nextState.pendingDraw
        : immediatePenaltyDrawn || (primaryCard.value === 'wild4' ? 4 : nextState.darkSide ? 5 : 2);
    calloutTitle =
      nextState.pendingDraw > 4 ? `BOMBA +${totalStack}!` : `+${totalStack} NA MESA!`;
    calloutSubtitle =
      primaryCard.color === 'wild'
        ? `${actorName} pediu ${colorLabelPt(nextState.activeColor)}`
        : `${actorName} atacou no ${colorLabelPt(nextState.activeColor)}`;
    accentHex = '#EF4444';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'skip') {
    kind = 'skip';
    calloutTitle = nextState.darkSide ? 'PULOU TODOS!' : 'BLOQUEADO!';
    calloutSubtitle = nextState.lastActionText;
    accentHex = activeHex;
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'reverse') {
    kind = 'reverse';
    calloutTitle = 'INVERTEU O GIRO!';
    calloutSubtitle =
      nextState.seats.filter((s) => !s.eliminated).length === 2
        ? `${actorName} joga novamente!`
        : `Sentido agora ${nextState.direction === 1 ? 'Horário ↻' : 'Anti-horário ↺'}`;
    accentHex = activeHex;
    isHeavyImpact = true;
  } else if (primaryCard?.value === '7' && nextState.houseRules?.sevenSwapHands) {
    kind = 'swap';
    calloutTitle = 'TROCOU DE MÃO!';
    calloutSubtitle = nextState.lastActionText;
    accentHex = '#38BDF8';
    isHeavyImpact = true;
  } else if (primaryCard?.value === '0' && nextState.houseRules?.zeroRotatesHands) {
    kind = 'rotate';
    calloutTitle = 'GIROU AS MÃOS!';
    calloutSubtitle = 'Todo mundo passou as cartas pro lado!';
    accentHex = '#38BDF8';
    isHeavyImpact = true;
  } else if (primaryCard?.value === 'wild') {
    calloutTitle = `COR: ${colorLabelPt(nextState.activeColor).toUpperCase()}!`;
    calloutSubtitle = `${actorName} mudou a cor da mesa`;
    accentHex = activeHex;
    isHeavyImpact = false;
  }

  return {
    id: `mh_${seq}_${nowMs}`,
    seq,
    actorId,
    actorName,
    actorPosition: actorPos,
    targetPosition: victimPos,
    kind,
    playedCards: newlyPlayed,
    drawnCount: immediatePenaltyDrawn,
    activeColor: nextState.activeColor,
    darkSide: Boolean(nextState.darkSide),
    summaryText: nextState.lastActionText,
    calloutTitle,
    calloutSubtitle,
    accentHex,
    isHeavyImpact,
    timestampMs: nowMs,
  };
}
