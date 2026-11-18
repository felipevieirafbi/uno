export type CardColor = 'red' | 'blue' | 'yellow' | 'green' | 'wild';
export type ActiveColor = 'red' | 'blue' | 'yellow' | 'green';

export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'flip'
  | 'wild'
  | 'wild4'
  | 'shield'
  | 'xray';

export type BotStyle = 'aggressive' | 'trickster' | 'calm';
export type AvatarColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange';

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface PlayerSeat {
  id: string;
  name: string;
  isBot: boolean;
  botStyle: BotStyle;
  avatarColor: AvatarColor;
  score: number;
  saidUno: boolean;
  hand: UnoCard[];
  eliminated?: boolean;
  teamId?: '' | 'A' | 'B';
  attackCardsPlayed?: number;
  maxCardsHeld?: number;
  caughtUnoCount?: number;
}

export interface HouseRulesConfig {
  stackDrawCards: boolean; // Empilhar +2, +4 e +5 Sombrio
  allowPlayDrawnCard: boolean; // Jogar na hora a carta comprada se servir
  zeroRotatesHands: boolean; // Carta 0 gira todas as mãos na direção da mesa
  sevenSwapHands?: boolean; // Carta 7 troca de mão com um adversário escolhido
  jumpInRule?: boolean; // Corte na frente com carta idêntica (cor + valor)
  chaosDeck?: boolean; // Cartas especiais Escudo Espelho, Raio-X e Virada Sombria
  mercyElimination?: boolean; // Regra da Piedade: 25+ cartas elimina da rodada
  bluffChallengeWild4?: boolean; // Desafio "DUVIDO!" no Coringa +4
  comboSameNumber?: boolean; // Descartar 2+ cartas do mesmo número num combo só
  teamMode2v2?: boolean; // Modo Duplas 2x2 (4 jogadores frente a frente)
  turnTimerSeconds?: number; // 0 = livre, 12 = turbo, 20 = rápido
  targetScore?: number; // 0 = livre, 150 / 300 / 500 = meta do campeonato
}

export const DEFAULT_HOUSE_RULES: HouseRulesConfig = {
  stackDrawCards: true,
  allowPlayDrawnCard: true,
  zeroRotatesHands: true,
  sevenSwapHands: true,
  jumpInRule: true,
  chaosDeck: true,
  mercyElimination: true,
  bluffChallengeWild4: true,
  comboSameNumber: true,
  teamMode2v2: false,
  turnTimerSeconds: 0,
  targetScore: 0,
};

export type MatchPhase = 'lobby' | 'playing' | 'paused' | 'round_over';

export interface UnoGameState {
  phase: MatchPhase;
  activeColor: ActiveColor;
  direction: 1 | -1;
  currentTurnIndex: number;
  pendingDraw: number;
  drawnPlayableCardId: string;
  houseRules: HouseRulesConfig;
  winnerId: string;
  winnerName: string;
  lastActionText: string;
  seats: PlayerSeat[];
  drawDeck: UnoCard[];
  discardPile: UnoCard[];
  darkSide?: boolean;
  stakesMultiplier?: number;
  lastDoublerId?: string;
  winningTeamId?: '' | 'A' | 'B';
  challengeAttackerId?: string;
  challengeAttackerName?: string;
  challengeVictimId?: string;
  challengePrevColor?: ActiveColor | '';
  challengeWasBluffing?: boolean;
}

export interface SerializedSeat {
  id: string;
  name: string;
  isBot: boolean;
  botStyle: string;
  avatarColor: AvatarColor;
  score: number;
  saidUno: boolean;
  handCodes: string[];
  eliminated?: boolean;
  teamId?: string;
  attackCardsPlayed?: number;
  maxCardsHeld?: number;
  caughtUnoCount?: number;
}

export interface SerializedStatePayload {
  phase: MatchPhase;
  activeColor: ActiveColor;
  direction: 1 | -1;
  currentTurnIndex: number;
  pendingDraw: number;
  drawnPlayableCardId?: string;
  houseRules?: HouseRulesConfig;
  winnerId: string;
  winnerName: string;
  lastActionText: string;
  seats: SerializedSeat[];
  drawDeckCodes: string[];
  discardPileCodes: string[];
  darkSide?: boolean;
  stakesMultiplier?: number;
  lastDoublerId?: string;
  winningTeamId?: string;
  challengeAttackerId?: string;
  challengeAttackerName?: string;
  challengeVictimId?: string;
  challengePrevColor?: string;
  challengeWasBluffing?: boolean;
}

export interface RoundAward {
  id: string;
  title: string;
  playerName: string;
  detail: string;
}

export const BOT_ROSTER: Array<{ name: string; style: BotStyle; avatarColor: AvatarColor }> = [
  { name: 'Tia Zuleide (IA)', style: 'aggressive', avatarColor: 'purple' },
  { name: 'Zé Coringa (IA)', style: 'trickster', avatarColor: 'yellow' },
  { name: 'Capivara Zen (IA)', style: 'calm', avatarColor: 'green' },
  { name: 'Rei do +4 (IA)', style: 'aggressive', avatarColor: 'orange' },
  { name: 'Dona Bete (IA)', style: 'trickster', avatarColor: 'blue' },
];

const SUIT_COLORS: ActiveColor[] = ['red', 'blue', 'yellow', 'green'];
const NUMBER_VALUES: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ALL_DIGITS: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES: CardValue[] = ['skip', 'reverse', 'draw2'];

export function createFullDeck(includeChaosCards = false): UnoCard[] {
  const deck: UnoCard[] = [];
  let seq = 1;

  for (const color of SUIT_COLORS) {
    deck.push({ id: `c${seq++}`, color, value: '0' });
    for (const val of NUMBER_VALUES) {
      deck.push({ id: `c${seq++}`, color, value: val });
      deck.push({ id: `c${seq++}`, color, value: val });
    }
    for (const act of ACTION_VALUES) {
      deck.push({ id: `c${seq++}`, color, value: act });
      deck.push({ id: `c${seq++}`, color, value: act });
    }
    if (includeChaosCards) {
      deck.push({ id: `c${seq++}`, color, value: 'flip' });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c${seq++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `c${seq++}`, color: 'wild', value: 'wild4' });
  }

  if (includeChaosCards) {
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `c${seq++}`, color: 'wild', value: 'shield' });
      deck.push({ id: `c${seq++}`, color: 'wild', value: 'xray' });
    }
  }

  return deck;
}

export function shuffleCards<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function sortHandCards(hand: readonly UnoCard[]): UnoCard[] {
  const colorOrder: Record<CardColor, number> = {
    red: 0,
    blue: 1,
    yellow: 2,
    green: 3,
    wild: 4,
  };
  const valueOrder: Record<CardValue, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    skip: 10,
    reverse: 11,
    draw2: 12,
    flip: 13,
    wild: 14,
    xray: 15,
    shield: 16,
    wild4: 17,
  };
  return [...hand].sort((a, b) => {
    if (colorOrder[a.color] !== colorOrder[b.color]) {
      return colorOrder[a.color] - colorOrder[b.color];
    }
    return valueOrder[a.value] - valueOrder[b.value];
  });
}

export function encodeCard(card: UnoCard): string {
  return `${card.id}:${card.color}:${card.value}`;
}

export function decodeCard(code: string): UnoCard {
  const [id, color, value] = code.split(':');
  return {
    id: id || 'c0',
    color: (color as CardColor) || 'red',
    value: (value as CardValue) || '0',
  };
}

export function serializeGameState(state: UnoGameState): SerializedStatePayload {
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  return {
    phase: state.phase,
    activeColor: state.activeColor,
    direction: state.direction,
    currentTurnIndex: state.currentTurnIndex,
    pendingDraw: Math.max(0, Math.min(60, state.pendingDraw)),
    drawnPlayableCardId: (state.drawnPlayableCardId || '').slice(0, 24),
    houseRules: {
      stackDrawCards: Boolean(rules.stackDrawCards),
      allowPlayDrawnCard: Boolean(rules.allowPlayDrawnCard),
      zeroRotatesHands: Boolean(rules.zeroRotatesHands),
      sevenSwapHands: Boolean(rules.sevenSwapHands),
      jumpInRule: Boolean(rules.jumpInRule),
      chaosDeck: Boolean(rules.chaosDeck),
      mercyElimination: Boolean(rules.mercyElimination),
      bluffChallengeWild4: Boolean(rules.bluffChallengeWild4),
      comboSameNumber: Boolean(rules.comboSameNumber),
      teamMode2v2: Boolean(rules.teamMode2v2),
      turnTimerSeconds: Math.max(0, Math.min(60, Math.round(rules.turnTimerSeconds || 0))),
      targetScore: Math.max(0, Math.min(2000, Math.round(rules.targetScore || 0))),
    },
    winnerId: state.winnerId.slice(0, 128),
    winnerName: state.winnerName.slice(0, 40),
    lastActionText: state.lastActionText.slice(0, 160),
    darkSide: Boolean(state.darkSide),
    stakesMultiplier: Math.max(1, Math.min(16, Math.round(state.stakesMultiplier || 1))),
    lastDoublerId: (state.lastDoublerId || '').slice(0, 128),
    winningTeamId: (state.winningTeamId || '').slice(0, 4),
    challengeAttackerId: (state.challengeAttackerId || '').slice(0, 128),
    challengeAttackerName: (state.challengeAttackerName || '').slice(0, 40),
    challengeVictimId: (state.challengeVictimId || '').slice(0, 128),
    challengePrevColor: (state.challengePrevColor || '').slice(0, 16),
    challengeWasBluffing: Boolean(state.challengeWasBluffing),
    seats: state.seats.slice(0, 6).map((s) => ({
      id: s.id.slice(0, 128),
      name: s.name.slice(0, 40),
      isBot: s.isBot,
      botStyle: s.botStyle,
      avatarColor: s.avatarColor,
      score: Math.max(0, Math.min(999999, Math.round(s.score))),
      saidUno: s.saidUno,
      handCodes: s.hand.slice(0, 120).map(encodeCard),
      eliminated: Boolean(s.eliminated),
      teamId: (s.teamId || '').slice(0, 4),
      attackCardsPlayed: Math.max(0, Math.min(999, Math.round(s.attackCardsPlayed || 0))),
      maxCardsHeld: Math.max(0, Math.min(200, Math.round(s.maxCardsHeld ?? s.hand.length))),
      caughtUnoCount: Math.max(0, Math.min(99, Math.round(s.caughtUnoCount || 0))),
    })),
    drawDeckCodes: state.drawDeck.slice(0, 140).map(encodeCard),
    discardPileCodes: state.discardPile.slice(-130).map(encodeCard),
  };
}

export function deserializeGameState(payload: SerializedStatePayload): UnoGameState {
  return {
    phase: payload.phase,
    activeColor: payload.activeColor,
    direction: payload.direction,
    currentTurnIndex: payload.currentTurnIndex,
    pendingDraw: payload.pendingDraw ?? 0,
    drawnPlayableCardId: payload.drawnPlayableCardId || '',
    houseRules: payload.houseRules
      ? {
          stackDrawCards: Boolean(payload.houseRules.stackDrawCards),
          allowPlayDrawnCard: Boolean(payload.houseRules.allowPlayDrawnCard),
          zeroRotatesHands: Boolean(payload.houseRules.zeroRotatesHands),
          sevenSwapHands: Boolean(payload.houseRules.sevenSwapHands),
          jumpInRule: Boolean(payload.houseRules.jumpInRule),
          chaosDeck: Boolean(payload.houseRules.chaosDeck),
          mercyElimination: Boolean(payload.houseRules.mercyElimination),
          bluffChallengeWild4: Boolean(payload.houseRules.bluffChallengeWild4),
          comboSameNumber: Boolean(payload.houseRules.comboSameNumber),
          teamMode2v2: Boolean(payload.houseRules.teamMode2v2),
          turnTimerSeconds: Number(payload.houseRules.turnTimerSeconds) || 0,
          targetScore: Math.max(0, Math.min(2000, Number(payload.houseRules.targetScore) || 0)),
        }
      : { ...DEFAULT_HOUSE_RULES },
    winnerId: payload.winnerId,
    winnerName: payload.winnerName,
    lastActionText: payload.lastActionText,
    darkSide: Boolean(payload.darkSide),
    stakesMultiplier: Math.max(1, Number(payload.stakesMultiplier) || 1),
    lastDoublerId: payload.lastDoublerId || '',
    winningTeamId: (payload.winningTeamId as '' | 'A' | 'B') || '',
    challengeAttackerId: payload.challengeAttackerId || '',
    challengeAttackerName: payload.challengeAttackerName || '',
    challengeVictimId: payload.challengeVictimId || '',
    challengePrevColor: (payload.challengePrevColor as ActiveColor | '') || '',
    challengeWasBluffing: Boolean(payload.challengeWasBluffing),
    seats: payload.seats.map((s) => {
      const hand = s.handCodes.map(decodeCard);
      return {
        id: s.id,
        name: s.name,
        isBot: s.isBot,
        botStyle: (s.botStyle as BotStyle) || 'calm',
        avatarColor: s.avatarColor || 'red',
        score: s.score,
        saidUno: s.saidUno,
        hand,
        eliminated: Boolean(s.eliminated),
        teamId: (s.teamId as '' | 'A' | 'B') || '',
        attackCardsPlayed: Number(s.attackCardsPlayed) || 0,
        maxCardsHeld: Math.max(hand.length, Number(s.maxCardsHeld) || 0),
        caughtUnoCount: Number(s.caughtUnoCount) || 0,
      };
    }),
    drawDeck: payload.drawDeckCodes.map(decodeCard),
    discardPile: payload.discardPileCodes.map(decodeCard),
  };
}

export function cardPointValue(card: UnoCard): number {
  if (card.color === 'wild') return 50;
  if (
    card.value === 'skip' ||
    card.value === 'reverse' ||
    card.value === 'draw2' ||
    card.value === 'flip'
  ) {
    return 20;
  }
  return Number(card.value) || 0;
}

export function calculateWinnerPoints(
  seats: readonly PlayerSeat[],
  winnerId: string,
  winningTeamId: '' | 'A' | 'B' = ''
): number {
  let total = 0;
  for (const seat of seats) {
    if (seat.id === winnerId) continue;
    if (winningTeamId && seat.teamId === winningTeamId) continue;
    for (const c of seat.hand) {
      total += cardPointValue(c);
    }
  }
  return total;
}

/**
 * Checks whether a card is legal given topDiscard, activeColor, optional pendingDraw stack,
 * and optional drawnPlayableCardId constraint (after drawing 1 card).
 */
export function canPlayCard(
  card: UnoCard,
  topDiscard: UnoCard | undefined,
  activeColor: ActiveColor,
  pendingDraw = 0,
  drawnPlayableCardId = ''
): boolean {
  if (drawnPlayableCardId && card.id !== drawnPlayableCardId) {
    return false;
  }

  if (pendingDraw > 0) {
    if (card.value === 'shield') return true;
    if (!topDiscard) return card.value === 'draw2' || card.value === 'wild4';
    if (topDiscard.value === 'wild4') {
      return card.value === 'wild4';
    }
    return card.value === 'draw2' || card.value === 'wild4';
  }

  if (!topDiscard) return true;
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topDiscard.value) return true;
  return false;
}

/**
 * Checks whether a player can "Jump-In" ("Cortar na Frente") out of turn with an exact color+value twin.
 */
export function canJumpInCard(state: UnoGameState, seatId: string, card: UnoCard): boolean {
  if (state.phase !== 'playing') return false;
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  if (!rules.jumpInRule) return false;
  if (state.pendingDraw > 0 || state.challengeVictimId || state.drawnPlayableCardId) return false;

  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1 || seatIdx === state.currentTurnIndex) return false;
  const seat = state.seats[seatIdx];
  if (seat.eliminated) return false;

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  if (!topDiscard || topDiscard.color === 'wild' || card.color === 'wild') return false;
  return card.color === topDiscard.color && card.value === topDiscard.value;
}

export function getNextSeatIndex(
  currentIndex: number,
  direction: 1 | -1,
  seatCount: number,
  steps = 1
): number {
  if (seatCount <= 0) return 0;
  const offset = (steps * direction) % seatCount;
  return (currentIndex + offset + seatCount * 4) % seatCount;
}

export function getNextActiveSeatIndex(
  seats: readonly PlayerSeat[],
  currentIndex: number,
  direction: 1 | -1,
  steps = 1
): number {
  const n = seats.length;
  if (n <= 0) return 0;
  const activeCount = seats.filter((s) => !s.eliminated).length;
  if (activeCount <= 1) {
    const survivor = seats.findIndex((s) => !s.eliminated);
    return survivor !== -1 ? survivor : 0;
  }

  let idx = currentIndex;
  let remaining = steps;
  let guard = 0;
  while (remaining > 0 && guard < n * 6) {
    idx = (idx + direction + n * 4) % n;
    guard++;
    if (!seats[idx]?.eliminated) {
      remaining--;
    }
  }
  return idx;
}

function drawFromDeckInternal(
  drawDeck: UnoCard[],
  discardPile: UnoCard[],
  count: number,
  rng: () => number = Math.random
): { drawn: UnoCard[]; nextDrawDeck: UnoCard[]; nextDiscardPile: UnoCard[] } {
  let deck = [...drawDeck];
  let discard = [...discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0 && discard.length > 1) {
      const top = discard[discard.length - 1];
      const recyclable = discard.slice(0, -1);
      deck = shuffleCards(recyclable, rng);
      discard = [top];
    }
    if (deck.length === 0) break;
    const card = deck.shift()!;
    drawn.push(card);
  }

  return { drawn, nextDrawDeck: deck, nextDiscardPile: discard };
}

export function dealNewRound(
  seatsInput: Array<Omit<PlayerSeat, 'hand' | 'saidUno'>>,
  rng: () => number = Math.random,
  startingTurnIndex = 0,
  houseRules: HouseRulesConfig = DEFAULT_HOUSE_RULES
): UnoGameState {
  const deck = shuffleCards(createFullDeck(Boolean(houseRules.chaosDeck)), rng);
  const enable2v2 = Boolean(houseRules.teamMode2v2) && seatsInput.length === 4;

  const seats: PlayerSeat[] = seatsInput.map((s, idx) => ({
    ...s,
    saidUno: false,
    eliminated: false,
    teamId: enable2v2 ? (idx % 2 === 0 ? 'A' : 'B') : '',
    attackCardsPlayed: 0,
    maxCardsHeld: 7,
    caughtUnoCount: 0,
    hand: [],
  }));

  for (let c = 0; c < 7; c++) {
    for (const seat of seats) {
      const card = deck.shift();
      if (card) seat.hand.push(card);
    }
  }

  let startIdx = deck.findIndex(
    (c) => c.color !== 'wild' && !ACTION_VALUES.includes(c.value) && c.value !== 'flip'
  );
  if (startIdx === -1) {
    startIdx = deck.findIndex((c) => c.color !== 'wild');
  }
  if (startIdx === -1) startIdx = 0;

  const [firstDiscard] = deck.splice(startIdx, 1);
  const activeColor: ActiveColor =
    firstDiscard.color === 'wild' ? 'red' : (firstDiscard.color as ActiveColor);
  const validStartTurn = seats.length > 0 ? startingTurnIndex % seats.length : 0;

  return {
    phase: 'playing',
    activeColor,
    direction: 1,
    currentTurnIndex: validStartTurn,
    pendingDraw: 0,
    drawnPlayableCardId: '',
    houseRules: { ...houseRules },
    winnerId: '',
    winnerName: '',
    lastActionText: enable2v2
      ? `Modo Duplas 2x2! Vez de ${seats[validStartTurn]?.name ?? 'Jogador'}.`
      : `Rodada começou! Vez de ${seats[validStartTurn]?.name ?? 'Jogador'}.`,
    darkSide: false,
    stakesMultiplier: 1,
    lastDoublerId: '',
    winningTeamId: '',
    challengeAttackerId: '',
    challengeAttackerName: '',
    challengeVictimId: '',
    challengePrevColor: '',
    challengeWasBluffing: false,
    seats,
    drawDeck: deck,
    discardPile: [firstDiscard],
  };
}

export function colorLabelPt(color: ActiveColor): string {
  switch (color) {
    case 'red':
      return 'Vermelho';
    case 'blue':
      return 'Azul';
    case 'yellow':
      return 'Amarelo';
    case 'green':
      return 'Verde';
  }
}

export function cardLabelPt(card: UnoCard, darkSide = false): string {
  switch (card.value) {
    case 'skip':
      return darkSide ? 'Pular Todos' : 'Bloqueio';
    case 'reverse':
      return 'Inverter';
    case 'draw2':
      return darkSide ? '+5 Sombrio' : '+2';
    case 'flip':
      return 'Virada!';
    case 'wild':
      return 'Coringa';
    case 'wild4':
      return '+4 Coringa';
    case 'shield':
      return 'Escudo Espelho';
    case 'xray':
      return 'Raio-X';
    default:
      return card.value;
  }
}

function rotateHandsInDirection(seats: PlayerSeat[], direction: 1 | -1): PlayerSeat[] {
  const activeIndices = seats
    .map((s, idx) => (!s.eliminated ? idx : -1))
    .filter((idx) => idx !== -1);
  if (activeIndices.length < 2) return seats;

  const nextSeats = [...seats];
  const m = activeIndices.length;
  for (let pos = 0; pos < m; pos++) {
    const targetSeatIdx = activeIndices[pos];
    const donorPos = (pos - direction + m * 2) % m;
    const donorSeatIdx = activeIndices[donorPos];
    const incomingHand = seats[donorSeatIdx].hand;
    nextSeats[targetSeatIdx] = {
      ...seats[targetSeatIdx],
      hand: incomingHand,
      maxCardsHeld: Math.max(seats[targetSeatIdx].maxCardsHeld ?? 0, incomingHand.length),
      saidUno: incomingHand.length === 1 ? seats[targetSeatIdx].saidUno : false,
    };
  }
  return nextSeats;
}

function buildVictoryState(
  state: UnoGameState,
  winnerSeatIdx: number,
  seatsCopy: PlayerSeat[],
  discardPile: UnoCard[],
  drawDeck: UnoCard[],
  activeColor: ActiveColor,
  customMessage?: string
): UnoGameState {
  const winnerSeat = seatsCopy[winnerSeatIdx];
  const teamId = winnerSeat.teamId || '';
  const mult = Math.max(1, state.stakesMultiplier || 1);
  const rawPoints = Math.max(10, calculateWinnerPoints(seatsCopy, winnerSeat.id, teamId));
  const bonus = rawPoints * mult;

  const partner =
    teamId !== ''
      ? seatsCopy.find((s, i) => i !== winnerSeatIdx && s.teamId === teamId)
      : undefined;

  const displayWinner = partner ? `${winnerSeat.name} & ${partner.name}` : winnerSeat.name;
  const finalSeats = seatsCopy.map((s, idx) => {
    if (idx === winnerSeatIdx || (teamId && s.teamId === teamId)) {
      return { ...s, score: s.score + bonus };
    }
    return s;
  });

  const multTag = mult > 1 ? ` (Mesa ${mult}x!)` : '';
  return {
    ...state,
    phase: 'round_over',
    activeColor,
    pendingDraw: 0,
    drawnPlayableCardId: '',
    challengeAttackerId: '',
    challengeAttackerName: '',
    challengeVictimId: '',
    challengePrevColor: '',
    challengeWasBluffing: false,
    winnerId: winnerSeat.id,
    winnerName: displayWinner,
    winningTeamId: teamId,
    lastActionText:
      customMessage || `${displayWinner} venceu a rodada (+${bonus} pts)${multTag}!`,
    seats: finalSeats,
    drawDeck,
    discardPile,
  };
}

function applyMercyCheck(
  state: UnoGameState,
  seatsInput: PlayerSeat[],
  drawDeckInput: UnoCard[],
  discardPile: UnoCard[],
  activeColor: ActiveColor,
  nextTurnIdx: number,
  direction: 1 | -1,
  actionText: string,
  rng: () => number
): {
  roundOverState?: UnoGameState;
  seats: PlayerSeat[];
  drawDeck: UnoCard[];
  turnIdx: number;
  actionText: string;
} {
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  if (!rules.mercyElimination) {
    return {
      seats: seatsInput,
      drawDeck: drawDeckInput,
      turnIdx: nextTurnIdx,
      actionText,
    };
  }

  let deck = [...drawDeckInput];
  const knockedOutNames: string[] = [];
  const seats = seatsInput.map((s) => {
    if (!s.eliminated && s.hand.length >= 25) {
      knockedOutNames.push(s.name);
      deck = [...deck, ...shuffleCards(s.hand, rng)];
      return {
        ...s,
        maxCardsHeld: Math.max(s.maxCardsHeld ?? 0, s.hand.length),
        hand: [],
        saidUno: false,
        eliminated: true,
      };
    }
    return s;
  });

  if (knockedOutNames.length === 0) {
    return { seats, drawDeck: deck, turnIdx: nextTurnIdx, actionText };
  }

  const eliminationNote = ` 💥 ${knockedOutNames.join(', ')} estourou 25+ cartas e foi eliminado!`;
  const combinedText = `${actionText}${eliminationNote}`;

  const survivors = seats
    .map((s, idx) => ({ seat: s, idx }))
    .filter((x) => !x.seat.eliminated);

  if (survivors.length === 1) {
    return {
      roundOverState: buildVictoryState(
        state,
        survivors[0].idx,
        seats,
        discardPile,
        deck,
        activeColor,
        `${combinedText} ${survivors[0].seat.name} sobreviveu e levou a rodada!`
      ),
      seats,
      drawDeck: deck,
      turnIdx: survivors[0].idx,
      actionText: combinedText,
    };
  }

  // In 2v2 mode, if all survivors belong to the same team, that duo wins immediately!
  const firstTeam = survivors[0]?.seat.teamId;
  if (firstTeam && survivors.every((x) => x.seat.teamId === firstTeam)) {
    return {
      roundOverState: buildVictoryState(
        state,
        survivors[0].idx,
        seats,
        discardPile,
        deck,
        activeColor,
        `${combinedText} Dupla sobrevivente venceu!`
      ),
      seats,
      drawDeck: deck,
      turnIdx: survivors[0].idx,
      actionText: combinedText,
    };
  }

  let adjustedTurn = nextTurnIdx;
  if (seats[adjustedTurn]?.eliminated) {
    adjustedTurn = getNextActiveSeatIndex(seats, adjustedTurn, direction, 1);
  }

  return {
    seats,
    drawDeck: deck,
    turnIdx: adjustedTurn,
    actionText: combinedText,
  };
}

function clearChallengeFields(): {
  challengeAttackerId: string;
  challengeAttackerName: string;
  challengeVictimId: string;
  challengePrevColor: ActiveColor | '';
  challengeWasBluffing: boolean;
} {
  return {
    challengeAttackerId: '',
    challengeAttackerName: '',
    challengeVictimId: '',
    challengePrevColor: '',
    challengeWasBluffing: false,
  };
}

export function applyPlayCard(
  state: UnoGameState,
  seatId: string,
  cardId: string,
  chosenWildColor?: ActiveColor,
  calledUno = false,
  rng: () => number = Math.random,
  swapTargetSeatId?: string
): UnoGameState {
  if (state.phase !== 'playing') return state;
  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1 || seatIdx !== state.currentTurnIndex) return state;

  const currentSeat = state.seats[seatIdx];
  if (currentSeat.eliminated) return state;

  const cardIdx = currentSeat.hand.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return state;

  const card = currentSeat.hand[cardIdx];
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  if (
    !canPlayCard(
      card,
      topDiscard,
      state.activeColor,
      state.pendingDraw,
      state.drawnPlayableCardId
    )
  ) {
    return state;
  }

  const nextHand = currentSeat.hand.filter((c) => c.id !== cardId);
  const nextDiscardPileBase = [...state.discardPile, card];
  const nextActiveColor: ActiveColor =
    card.color === 'wild' ? chosenWildColor || 'red' : (card.color as ActiveColor);

  const isAttackCard =
    card.value === 'draw2' ||
    card.value === 'wild4' ||
    card.value === 'skip' ||
    card.value === 'shield';

  let seatsCopy: PlayerSeat[] = state.seats.map((s, idx) =>
    idx === seatIdx
      ? {
          ...s,
          hand: nextHand,
          attackCardsPlayed: (s.attackCardsPlayed || 0) + (isAttackCard ? 1 : 0),
          saidUno: nextHand.length === 1 ? calledUno || s.saidUno : false,
        }
      : s
  );

  // Check victory BEFORE rotating/swapping hands
  if (nextHand.length === 0) {
    return buildVictoryState(
      state,
      seatIdx,
      seatsCopy,
      nextDiscardPileBase,
      state.drawDeck,
      nextActiveColor
    );
  }

  const isDark = Boolean(state.darkSide);
  let nextDarkSide = isDark;
  let nextDirection: 1 | -1 = state.direction;
  let nextTurnIndex = state.currentTurnIndex;
  let nextPendingDraw = state.pendingDraw;
  let drawDeck = [...state.drawDeck];
  let discardPile = nextDiscardPileBase;
  let challengePatch = clearChallengeFields();
  let actionSummary = `${currentSeat.name} jogou ${cardLabelPt(card, isDark)} (${colorLabelPt(nextActiveColor)})`;

  const activeSeatCount = seatsCopy.filter((s) => !s.eliminated).length;
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;

  // 1. Escudo Espelho ('shield')
  if (card.value === 'shield') {
    if (state.pendingDraw > 0) {
      nextDirection = (state.direction * -1) as 1 | -1;
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      nextPendingDraw = state.pendingDraw;
      const target = seatsCopy[nextTurnIndex];
      actionSummary = `🛡️ ${currentSeat.name} usou ESCUDO ESPELHO (${colorLabelPt(nextActiveColor)}) e rebateu +${nextPendingDraw} para ${target.name}!`;
    } else {
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      actionSummary = `🛡️ ${currentSeat.name} usou Escudo Espelho e mudou para ${colorLabelPt(nextActiveColor)}!`;
    }
  }
  // 2. Raio-X ('xray')
  else if (card.value === 'xray') {
    nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
    const peekTarget = seatsCopy[nextTurnIndex];
    actionSummary = `👁️ ${currentSeat.name} usou RAIO-X (${colorLabelPt(nextActiveColor)}) e espiou a mão de ${peekTarget.name}!`;
  }
  // 3. Virada Sombria ('flip')
  else if (card.value === 'flip') {
    nextDarkSide = !isDark;
    nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
    actionSummary = nextDarkSide
      ? `🌑 ${currentSeat.name} VIROU A MESA PRO LADO SOMBRIO! (+2 vira +5 e Bloqueio pula todos!)`
      : `☀️ ${currentSeat.name} trouxe a mesa de volta pro Lado Claro!`;
  }
  // 4. Carta 0 Gira Mãos
  else if (card.value === '0' && rules.zeroRotatesHands && activeSeatCount >= 2) {
    seatsCopy = rotateHandsInDirection(seatsCopy, nextDirection);
    nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
    actionSummary = `${currentSeat.name} jogou 0 e girou todas as mãos da mesa!`;
  }
  // 5. Carta 7 Troca de Mão com Rival Escolhido
  else if (card.value === '7' && rules.sevenSwapHands && activeSeatCount >= 2) {
    let targetIdx = swapTargetSeatId
      ? seatsCopy.findIndex((s, i) => i !== seatIdx && !s.eliminated && s.id === swapTargetSeatId)
      : -1;
    if (targetIdx === -1) {
      let bestCount = Infinity;
      seatsCopy.forEach((s, i) => {
        if (i !== seatIdx && !s.eliminated && s.hand.length < bestCount) {
          bestCount = s.hand.length;
          targetIdx = i;
        }
      });
    }
    if (targetIdx !== -1) {
      const myNewHand = seatsCopy[targetIdx].hand;
      const theirNewHand = seatsCopy[seatIdx].hand;
      const targetName = seatsCopy[targetIdx].name;
      seatsCopy[seatIdx] = {
        ...seatsCopy[seatIdx],
        hand: myNewHand,
        maxCardsHeld: Math.max(seatsCopy[seatIdx].maxCardsHeld ?? 0, myNewHand.length),
        saidUno: myNewHand.length === 1 ? seatsCopy[seatIdx].saidUno : false,
      };
      seatsCopy[targetIdx] = {
        ...seatsCopy[targetIdx],
        hand: theirNewHand,
        maxCardsHeld: Math.max(seatsCopy[targetIdx].maxCardsHeld ?? 0, theirNewHand.length),
        saidUno: theirNewHand.length === 1 ? seatsCopy[targetIdx].saidUno : false,
      };
      actionSummary = `🔄 ${currentSeat.name} jogou 7 e trocou de mão com ${targetName}!`;
    }
    nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
  }
  // 6. Reverse
  else if (card.value === 'reverse') {
    if (activeSeatCount === 2) {
      nextTurnIndex = seatIdx;
      actionSummary = `${currentSeat.name} inverteu e joga de novo!`;
    } else {
      nextDirection = (state.direction * -1) as 1 | -1;
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      actionSummary = `${currentSeat.name} inverteu o sentido da mesa!`;
    }
  }
  // 7. Skip (or Dark Side Skip Everyone!)
  else if (card.value === 'skip') {
    if (isDark && activeSeatCount >= 2) {
      nextTurnIndex = seatIdx;
      actionSummary = `⚡ ${currentSeat.name} pulou TODOS no Lado Sombrio e joga de novo!`;
    } else {
      const skippedIdx = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 2);
      actionSummary = `${currentSeat.name} bloqueou ${seatsCopy[skippedIdx].name}!`;
    }
  }
  // 8. Draw +2 (or Dark Side +5!)
  else if (card.value === 'draw2') {
    const drawStep = isDark ? 5 : 2;
    if (rules.stackDrawCards && state.pendingDraw + drawStep <= 55) {
      nextPendingDraw = state.pendingDraw + drawStep;
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      const nextPlayer = seatsCopy[nextTurnIndex];
      actionSummary =
        state.pendingDraw > 0
          ? `${currentSeat.name} empilhou +${drawStep}! Acúmulo em +${nextPendingDraw} para ${nextPlayer.name}!`
          : `${currentSeat.name} lançou +${drawStep}! ${nextPlayer.name} pode rebater ou comprar +${drawStep}!`;
    } else {
      const totalPenalty = state.pendingDraw + drawStep;
      const victimIdx = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
      const { drawn, nextDrawDeck, nextDiscardPile } = drawFromDeckInternal(
        drawDeck,
        discardPile,
        totalPenalty,
        rng
      );
      drawDeck = nextDrawDeck;
      discardPile = nextDiscardPile;
      const nextVictimHand = [...seatsCopy[victimIdx].hand, ...drawn];
      seatsCopy[victimIdx] = {
        ...seatsCopy[victimIdx],
        saidUno: false,
        maxCardsHeld: Math.max(seatsCopy[victimIdx].maxCardsHeld ?? 0, nextVictimHand.length),
        hand: nextVictimHand,
      };
      nextPendingDraw = 0;
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 2);
      actionSummary = `${currentSeat.name} mandou +${totalPenalty} para ${seatsCopy[victimIdx].name}!`;
    }
  }
  // 9. Wild Draw Four (+4 + Optional Bluff Challenge "DUVIDO!")
  else if (card.value === 'wild4') {
    const hadPreviousSuit = nextHand.some((c) => c.color === state.activeColor);
    const victimIdx = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
    const victimSeat = seatsCopy[victimIdx];

    if (rules.bluffChallengeWild4 && state.pendingDraw === 0) {
      nextPendingDraw = 4;
      nextTurnIndex = victimIdx;
      challengePatch = {
        challengeAttackerId: currentSeat.id,
        challengeAttackerName: currentSeat.name,
        challengeVictimId: victimSeat.id,
        challengePrevColor: state.activeColor,
        challengeWasBluffing: hadPreviousSuit,
      };
      actionSummary = `${currentSeat.name} largou +4 (${colorLabelPt(nextActiveColor)})! ${victimSeat.name} aceita ou grita DUVIDO?!`;
    } else if (rules.stackDrawCards && state.pendingDraw + 4 <= 55) {
      nextPendingDraw = state.pendingDraw + 4;
      nextTurnIndex = victimIdx;
      actionSummary =
        state.pendingDraw > 0
          ? `${currentSeat.name} empilhou +4 (${colorLabelPt(nextActiveColor)})! Acúmulo em +${nextPendingDraw} para ${victimSeat.name}!`
          : `${currentSeat.name} largou +4 (${colorLabelPt(nextActiveColor)})! ${victimSeat.name} rebate com +4 ou compra!`;
    } else {
      const totalPenalty = state.pendingDraw + 4;
      const { drawn, nextDrawDeck, nextDiscardPile } = drawFromDeckInternal(
        drawDeck,
        discardPile,
        totalPenalty,
        rng
      );
      drawDeck = nextDrawDeck;
      discardPile = nextDiscardPile;
      const nextVictimHand = [...victimSeat.hand, ...drawn];
      seatsCopy[victimIdx] = {
        ...victimSeat,
        saidUno: false,
        maxCardsHeld: Math.max(victimSeat.maxCardsHeld ?? 0, nextVictimHand.length),
        hand: nextVictimHand,
      };
      nextPendingDraw = 0;
      nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 2);
      actionSummary = `${currentSeat.name} largou +${totalPenalty} (${colorLabelPt(nextActiveColor)}) em ${victimSeat.name}!`;
    }
  } else {
    nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, nextDirection, 1);
    if (card.value === 'wild') {
      actionSummary = `${currentSeat.name} mudou a cor para ${colorLabelPt(nextActiveColor)}!`;
    }
  }

  const mercy = applyMercyCheck(
    state,
    seatsCopy,
    drawDeck,
    discardPile,
    nextActiveColor,
    nextTurnIndex,
    nextDirection,
    actionSummary,
    rng
  );
  if (mercy.roundOverState) return mercy.roundOverState;

  return {
    ...state,
    activeColor: nextActiveColor,
    direction: nextDirection,
    currentTurnIndex: mercy.turnIdx,
    pendingDraw: nextPendingDraw,
    drawnPlayableCardId: '',
    darkSide: nextDarkSide,
    ...challengePatch,
    lastActionText: mercy.actionText,
    seats: mercy.seats,
    drawDeck: mercy.drawDeck,
    discardPile,
  };
}

/**
 * Executes a "Jump-In" ("Corte na Frente") play out of turn with an identical card.
 */
export function applyJumpInCard(
  state: UnoGameState,
  seatId: string,
  cardId: string,
  rng: () => number = Math.random,
  swapTargetSeatId?: string
): UnoGameState {
  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1) return state;
  const card = state.seats[seatIdx].hand.find((c) => c.id === cardId);
  if (!card || !canJumpInCard(state, seatId, card)) return state;

  const hijacked: UnoGameState = {
    ...state,
    currentTurnIndex: seatIdx,
    drawnPlayableCardId: '',
  };
  const next = applyPlayCard(
    hijacked,
    seatId,
    cardId,
    undefined,
    state.seats[seatIdx].hand.length === 2,
    rng,
    swapTargetSeatId
  );
  return {
    ...next,
    lastActionText: `⚡ CORTE NA FRENTE! ${next.lastActionText}`,
  };
}

/**
 * Finds multi-card same-number combos available on the player's turn.
 */
export function findPlayableNumberCombos(
  state: UnoGameState,
  seatId: string
): Array<{ value: CardValue; cards: UnoCard[] }> {
  if (state.phase !== 'playing') return [];
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  if (!rules.comboSameNumber) return [];
  if (state.pendingDraw > 0 || state.drawnPlayableCardId || state.challengeVictimId) return [];

  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1 || seatIdx !== state.currentTurnIndex) return [];
  const seat = state.seats[seatIdx];
  if (seat.eliminated) return [];

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const combos: Array<{ value: CardValue; cards: UnoCard[] }> = [];

  for (const val of ALL_DIGITS) {
    const group = seat.hand.filter((c) => c.value === val && c.color !== 'wild');
    if (group.length >= 2) {
      const starter = group.find((c) => canPlayCard(c, topDiscard, state.activeColor, 0, ''));
      if (starter) {
        const ordered = [starter, ...group.filter((c) => c.id !== starter.id)];
        combos.push({ value: val, cards: ordered });
      }
    }
  }
  return combos;
}

export function applyPlayNumberCombo(
  state: UnoGameState,
  seatId: string,
  value: CardValue,
  calledUno = false,
  swapTargetSeatId?: string
): UnoGameState {
  const combos = findPlayableNumberCombos(state, seatId);
  const found = combos.find((c) => c.value === value);
  if (!found) return state;

  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  const currentSeat = state.seats[seatIdx];
  const comboIds = new Set(found.cards.map((c) => c.id));
  const nextHand = currentSeat.hand.filter((c) => !comboIds.has(c.id));
  const lastCard = found.cards[found.cards.length - 1];
  const nextActiveColor = lastCard.color as ActiveColor;
  const nextDiscard = [...state.discardPile, ...found.cards];

  let seatsCopy = state.seats.map((s, idx) =>
    idx === seatIdx
      ? {
          ...s,
          hand: nextHand,
          saidUno: nextHand.length === 1 ? calledUno || s.saidUno : false,
        }
      : s
  );

  if (nextHand.length === 0) {
    return buildVictoryState(
      state,
      seatIdx,
      seatsCopy,
      nextDiscard,
      state.drawDeck,
      nextActiveColor,
      `🔥 COMBO ${found.cards.length}x! ${currentSeat.name} bateu descartando ${found.cards.length} cartas '${value}' de uma vez!`
    );
  }

  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  const activeSeatCount = seatsCopy.filter((s) => !s.eliminated).length;
  let actionText = `🔥 COMBO ${found.cards.length}x! ${currentSeat.name} descartou ${found.cards.length} cartas '${value}' (${colorLabelPt(nextActiveColor)})!`;

  if (value === '0' && rules.zeroRotatesHands && activeSeatCount >= 2) {
    seatsCopy = rotateHandsInDirection(seatsCopy, state.direction);
    actionText += ' Mãos giraram!';
  } else if (value === '7' && rules.sevenSwapHands && activeSeatCount >= 2) {
    let targetIdx = swapTargetSeatId
      ? seatsCopy.findIndex((s, i) => i !== seatIdx && !s.eliminated && s.id === swapTargetSeatId)
      : -1;
    if (targetIdx === -1) {
      targetIdx = seatsCopy.findIndex((s, i) => i !== seatIdx && !s.eliminated);
    }
    if (targetIdx !== -1) {
      const myNew = seatsCopy[targetIdx].hand;
      const theirNew = seatsCopy[seatIdx].hand;
      seatsCopy[seatIdx] = { ...seatsCopy[seatIdx], hand: myNew };
      seatsCopy[targetIdx] = { ...seatsCopy[targetIdx], hand: theirNew };
      actionText += ` Trocou de mão com ${seatsCopy[targetIdx].name}!`;
    }
  }

  const nextTurnIndex = getNextActiveSeatIndex(seatsCopy, seatIdx, state.direction, 1);
  return {
    ...state,
    activeColor: nextActiveColor,
    currentTurnIndex: nextTurnIndex,
    drawnPlayableCardId: '',
    ...clearChallengeFields(),
    lastActionText: actionText,
    seats: seatsCopy,
    discardPile: nextDiscard,
  };
}

/**
 * Doubles the match point multiplier ("DOBRAR A MESA!" - Truco / Marvel Snap style).
 */
export function canDoubleStakes(state: UnoGameState, seatId: string): boolean {
  if (state.phase !== 'playing') return false;
  const seat = state.seats.find((s) => s.id === seatId);
  if (!seat || seat.eliminated) return false;
  const currentMult = state.stakesMultiplier || 1;
  if (currentMult >= 8) return false;
  if (state.lastDoublerId === seatId) return false;
  return true;
}

export function applyDoubleStakes(state: UnoGameState, seatId: string): UnoGameState {
  if (!canDoubleStakes(state, seatId)) return state;
  const seat = state.seats.find((s) => s.id === seatId)!;
  const nextMult = Math.min(8, (state.stakesMultiplier || 1) * 2);
  return {
    ...state,
    stakesMultiplier: nextMult,
    lastDoublerId: seatId,
    lastActionText: `🔥 TRUCO NO UNO! ${seat.name} DOBROU A MESA — rodada agora vale ${nextMult}x pontos!`,
  };
}

/**
 * Resolves an active Wild +4 Bluff Challenge ("Aceitar +4" vs "DUVIDO!").
 */
export function applyResolveWild4Challenge(
  state: UnoGameState,
  victimId: string,
  decision: 'accept' | 'challenge',
  rng: () => number = Math.random
): UnoGameState {
  if (state.phase !== 'playing' || state.challengeVictimId !== victimId) return state;

  const victimIdx = state.seats.findIndex((s) => s.id === victimId);
  const attackerIdx = state.seats.findIndex((s) => s.id === state.challengeAttackerId);
  if (victimIdx === -1) return state;

  const victim = state.seats[victimIdx];
  const prevColorName = state.challengePrevColor
    ? colorLabelPt(state.challengePrevColor)
    : 'da mesa';

  let seatsCopy = [...state.seats];
  let drawDeck = [...state.drawDeck];
  let discardPile = [...state.discardPile];
  let nextTurnIdx = victimIdx;
  let actionText = '';

  if (decision === 'accept') {
    const count = Math.max(4, state.pendingDraw);
    const drawnRes = drawFromDeckInternal(drawDeck, discardPile, count, rng);
    drawDeck = drawnRes.nextDrawDeck;
    discardPile = drawnRes.nextDiscardPile;
    const nextHand = [...victim.hand, ...drawnRes.drawn];
    seatsCopy[victimIdx] = {
      ...victim,
      saidUno: false,
      maxCardsHeld: Math.max(victim.maxCardsHeld ?? 0, nextHand.length),
      hand: nextHand,
    };
    nextTurnIdx = getNextActiveSeatIndex(seatsCopy, victimIdx, state.direction, 1);
    actionText = `${victim.name} aceitou o +${count} e passou a vez.`;
  } else if (state.challengeWasBluffing && attackerIdx !== -1) {
    // Caught bluffing! Attacker had the previous color and must draw 4; victim keeps their turn!
    const attacker = seatsCopy[attackerIdx];
    const drawnRes = drawFromDeckInternal(drawDeck, discardPile, 4, rng);
    drawDeck = drawnRes.nextDrawDeck;
    discardPile = drawnRes.nextDiscardPile;
    const nextAttackerHand = [...attacker.hand, ...drawnRes.drawn];
    seatsCopy[attackerIdx] = {
      ...attacker,
      saidUno: false,
      maxCardsHeld: Math.max(attacker.maxCardsHeld ?? 0, nextAttackerHand.length),
      hand: nextAttackerHand,
    };
    nextTurnIdx = victimIdx;
    actionText = `🚨 PEGO NO BLEFE! ${attacker.name} tinha ${prevColorName} escondido e comprou +4! Vez de ${victim.name}!`;
  } else {
    // Attacker was honest! Challenger pays the price and draws 6 cards, losing their turn!
    const penalty = Math.max(4, state.pendingDraw) + 2;
    const drawnRes = drawFromDeckInternal(drawDeck, discardPile, penalty, rng);
    drawDeck = drawnRes.nextDrawDeck;
    discardPile = drawnRes.nextDiscardPile;
    const nextVictimHand = [...victim.hand, ...drawnRes.drawn];
    seatsCopy[victimIdx] = {
      ...victim,
      saidUno: false,
      maxCardsHeld: Math.max(victim.maxCardsHeld ?? 0, nextVictimHand.length),
      hand: nextVictimHand,
    };
    nextTurnIdx = getNextActiveSeatIndex(seatsCopy, victimIdx, state.direction, 1);
    actionText = `💀 NÃO ERA BLEFE! ${victim.name} duvidou errado e comprou +${penalty} cartas!`;
  }

  const mercy = applyMercyCheck(
    state,
    seatsCopy,
    drawDeck,
    discardPile,
    state.activeColor,
    nextTurnIdx,
    state.direction,
    actionText,
    rng
  );
  if (mercy.roundOverState) return mercy.roundOverState;

  return {
    ...state,
    currentTurnIndex: mercy.turnIdx,
    pendingDraw: 0,
    drawnPlayableCardId: '',
    ...clearChallengeFields(),
    lastActionText: mercy.actionText,
    seats: mercy.seats,
    drawDeck: mercy.drawDeck,
    discardPile,
  };
}

export function applyDrawCard(
  state: UnoGameState,
  seatId: string,
  rng: () => number = Math.random
): UnoGameState {
  if (state.phase !== 'playing') return state;
  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1 || seatIdx !== state.currentTurnIndex) return state;

  // If there is a pending Wild +4 challenge on this player, clicking Draw accepts the +4
  if (state.challengeVictimId === seatId) {
    return applyResolveWild4Challenge(state, seatId, 'accept', rng);
  }

  // If the player already drew a playable card this turn, clicking Draw/Pass passes the turn
  if (state.drawnPlayableCardId) {
    return applyPassAfterDraw(state, seatId);
  }

  const countToDraw = state.pendingDraw > 0 ? state.pendingDraw : 1;
  const { drawn, nextDrawDeck, nextDiscardPile } = drawFromDeckInternal(
    state.drawDeck,
    state.discardPile,
    countToDraw,
    rng
  );

  if (drawn.length === 0) {
    const nextTurn = getNextActiveSeatIndex(state.seats, seatIdx, state.direction, 1);
    return {
      ...state,
      pendingDraw: 0,
      drawnPlayableCardId: '',
      currentTurnIndex: nextTurn,
      lastActionText: `${state.seats[seatIdx].name} passou a vez (monte vazio).`,
    };
  }

  const seatsCopy = state.seats.map((s, idx) => {
    if (idx !== seatIdx) return s;
    const nextHand = [...s.hand, ...drawn];
    return {
      ...s,
      saidUno: false,
      maxCardsHeld: Math.max(s.maxCardsHeld ?? 0, nextHand.length),
      hand: nextHand,
    };
  });

  // If absorbing a stacked penalty (+2/+4/+5/+6...), player draws all penalty cards and loses turn
  if (state.pendingDraw > 0) {
    const rawNextTurn = getNextActiveSeatIndex(seatsCopy, seatIdx, state.direction, 1);
    const mercy = applyMercyCheck(
      state,
      seatsCopy,
      nextDrawDeck,
      nextDiscardPile,
      state.activeColor,
      rawNextTurn,
      state.direction,
      `${seatsCopy[seatIdx].name} assumiu a bomba e comprou +${drawn.length} cartas!`,
      rng
    );
    if (mercy.roundOverState) return mercy.roundOverState;

    return {
      ...state,
      pendingDraw: 0,
      drawnPlayableCardId: '',
      ...clearChallengeFields(),
      currentTurnIndex: mercy.turnIdx,
      lastActionText: mercy.actionText,
      seats: mercy.seats,
      drawDeck: mercy.drawDeck,
      discardPile: nextDiscardPile,
    };
  }

  // Check Mercy elimination even on 1-card draw (24 -> 25 cards!)
  const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
  if (rules.mercyElimination && seatsCopy[seatIdx].hand.length >= 25) {
    const rawNext = getNextActiveSeatIndex(seatsCopy, seatIdx, state.direction, 1);
    const mercy = applyMercyCheck(
      state,
      seatsCopy,
      nextDrawDeck,
      nextDiscardPile,
      state.activeColor,
      rawNext,
      state.direction,
      `${seatsCopy[seatIdx].name} comprou 1 carta.`,
      rng
    );
    if (mercy.roundOverState) return mercy.roundOverState;
    return {
      ...state,
      drawnPlayableCardId: '',
      currentTurnIndex: mercy.turnIdx,
      lastActionText: mercy.actionText,
      seats: mercy.seats,
      drawDeck: mercy.drawDeck,
      discardPile: nextDiscardPile,
    };
  }

  // Normal 1-card draw: if allowPlayDrawnCard is enabled and the drawn card fits, let human/bot play it!
  const singleDrawn = drawn[0];
  const topDiscard = nextDiscardPile[nextDiscardPile.length - 1];
  if (
    rules.allowPlayDrawnCard &&
    singleDrawn &&
    canPlayCard(singleDrawn, topDiscard, state.activeColor, 0, '')
  ) {
    return {
      ...state,
      drawnPlayableCardId: singleDrawn.id,
      lastActionText: `${seatsCopy[seatIdx].name} comprou uma carta que serve! Jogue ou passe a vez.`,
      seats: seatsCopy,
      drawDeck: nextDrawDeck,
      discardPile: nextDiscardPile,
    };
  }

  const nextTurn = getNextActiveSeatIndex(seatsCopy, seatIdx, state.direction, 1);
  return {
    ...state,
    drawnPlayableCardId: '',
    currentTurnIndex: nextTurn,
    lastActionText: `${seatsCopy[seatIdx].name} comprou 1 carta.`,
    seats: seatsCopy,
    drawDeck: nextDrawDeck,
    discardPile: nextDiscardPile,
  };
}

export function applyPassAfterDraw(state: UnoGameState, seatId: string): UnoGameState {
  if (state.phase !== 'playing') return state;
  const seatIdx = state.seats.findIndex((s) => s.id === seatId);
  if (seatIdx === -1 || seatIdx !== state.currentTurnIndex || !state.drawnPlayableCardId) {
    return state;
  }
  const nextTurn = getNextActiveSeatIndex(state.seats, seatIdx, state.direction, 1);
  return {
    ...state,
    drawnPlayableCardId: '',
    currentTurnIndex: nextTurn,
    lastActionText: `${state.seats[seatIdx].name} guardou a carta comprada e passou a vez.`,
  };
}

export function applySortPlayerHand(state: UnoGameState, seatId: string): UnoGameState {
  const idx = state.seats.findIndex((s) => s.id === seatId);
  if (idx === -1) return state;
  return {
    ...state,
    seats: state.seats.map((s, i) => (i === idx ? { ...s, hand: sortHandCards(s.hand) } : s)),
  };
}

export function applyCallUno(state: UnoGameState, seatId: string): UnoGameState {
  const idx = state.seats.findIndex((s) => s.id === seatId);
  if (idx === -1) return state;
  const seat = state.seats[idx];
  if (seat.eliminated || seat.hand.length > 2) return state;

  return {
    ...state,
    lastActionText: `${seat.name} gritou UNO!`,
    seats: state.seats.map((s, i) => (i === idx ? { ...s, saidUno: true } : s)),
  };
}

export function applyCatchForgotUno(
  state: UnoGameState,
  catcherName: string,
  targetSeatId: string,
  rng: () => number = Math.random
): UnoGameState {
  if (state.phase !== 'playing') return state;
  const targetIdx = state.seats.findIndex((s) => s.id === targetSeatId);
  if (targetIdx === -1) return state;
  const target = state.seats[targetIdx];
  if (target.eliminated || target.hand.length !== 1 || target.saidUno) return state;

  const { drawn, nextDrawDeck, nextDiscardPile } = drawFromDeckInternal(
    state.drawDeck,
    state.discardPile,
    2,
    rng
  );
  const nextHand = [...target.hand, ...drawn];
  const seatsCopy = state.seats.map((s, idx) =>
    idx === targetIdx
      ? {
          ...s,
          saidUno: false,
          caughtUnoCount: (s.caughtUnoCount || 0) + 1,
          maxCardsHeld: Math.max(s.maxCardsHeld ?? 0, nextHand.length),
          hand: nextHand,
        }
      : s
  );

  return {
    ...state,
    lastActionText: `${catcherName} pegou ${target.name} sem gritar UNO (+2 cartas)!`,
    seats: seatsCopy,
    drawDeck: nextDrawDeck,
    discardPile: nextDiscardPile,
  };
}

export function countHandColors(hand: readonly UnoCard[]): Record<ActiveColor, number> {
  const counts: Record<ActiveColor, number> = { red: 0, blue: 0, yellow: 0, green: 0 };
  for (const c of hand) {
    if (c.color !== 'wild') {
      counts[c.color] += 1;
    }
  }
  return counts;
}

export function pickDominantSuitColor(hand: readonly UnoCard[]): ActiveColor {
  const counts = countHandColors(hand);
  let best: ActiveColor = 'red';
  let bestCount = -1;
  for (const col of SUIT_COLORS) {
    if (counts[col] > bestCount) {
      bestCount = counts[col];
      best = col;
    }
  }
  return best;
}

export function getChampionshipWinner(state: UnoGameState): {
  isChampionshipOver: boolean;
  championId: string;
  championTeamId?: '' | 'A' | 'B';
  championName: string;
  championScore: number;
  targetScore: number;
} {
  const targetScore = Math.max(0, Math.round(state.houseRules?.targetScore || 0));
  if (targetScore <= 0 || state.phase !== 'round_over' || state.seats.length === 0) {
    return {
      isChampionshipOver: false,
      championId: '',
      championName: '',
      championScore: 0,
      targetScore,
    };
  }
  const ranked = [...state.seats].sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  if (!leader || leader.score < targetScore) {
    return {
      isChampionshipOver: false,
      championId: '',
      championName: '',
      championScore: leader?.score ?? 0,
      targetScore,
    };
  }
  if (leader.teamId) {
    const partners = state.seats
      .filter((s) => s.teamId === leader.teamId)
      .map((s) => s.name);
    return {
      isChampionshipOver: true,
      championId: leader.id,
      championTeamId: leader.teamId,
      championName: partners.length >= 2 ? `${partners[0]} & ${partners[1]}` : leader.name,
      championScore: leader.score,
      targetScore,
    };
  }
  return {
    isChampionshipOver: true,
    championId: leader.id,
    championName: leader.name,
    championScore: leader.score,
    targetScore,
  };
}

export function chooseBotMove(
  state: UnoGameState,
  botSeat: PlayerSeat,
  rng: () => number = Math.random
):
  | {
      action: 'play';
      cardId: string;
      chosenColor?: ActiveColor;
      callUno: boolean;
      swapTargetId?: string;
    }
  | { action: 'combo'; value: CardValue; callUno: boolean; swapTargetId?: string }
  | { action: 'challenge_wild4'; decision: 'accept' | 'challenge' }
  | { action: 'draw' } {
  // If this bot is facing an active +4 Bluff Challenge, decide whether to counter-stack, challenge, or accept!
  if (state.challengeVictimId === botSeat.id) {
    const counterCard = botSeat.hand.find((c) => c.value === 'shield' || c.value === 'wild4');
    const rules = state.houseRules ?? DEFAULT_HOUSE_RULES;
    if (counterCard && (counterCard.value === 'shield' || rules.stackDrawCards)) {
      const remaining = botSeat.hand.filter((c) => c.id !== counterCard.id);
      return {
        action: 'play',
        cardId: counterCard.id,
        chosenColor: pickDominantSuitColor(remaining),
        callUno: remaining.length === 1,
      };
    }
    const challengeChance =
      botSeat.botStyle === 'aggressive' ? 0.5 : botSeat.botStyle === 'trickster' ? 0.42 : 0.2;
    return {
      action: 'challenge_wild4',
      decision: rng() < challengeChance ? 'challenge' : 'accept',
    };
  }

  // If bot has a multi-card Same-Number Combo available, unload multiple cards at once!
  const combos = findPlayableNumberCombos(state, botSeat.id);
  if (combos.length > 0 && state.pendingDraw === 0 && rng() < 0.85) {
    const bestCombo = combos[0];
    let swapTargetId: string | undefined;
    if (bestCombo.value === '7') {
      let minCards = Infinity;
      for (const s of state.seats) {
        if (s.id === botSeat.id || s.eliminated) continue;
        if (botSeat.teamId && s.teamId === botSeat.teamId) continue;
        if (s.hand.length < minCards) {
          minCards = s.hand.length;
          swapTargetId = s.id;
        }
      }
    }
    const remLen = botSeat.hand.length - bestCombo.cards.length;
    return {
      action: 'combo',
      value: bestCombo.value,
      callUno: remLen === 1,
      swapTargetId,
    };
  }

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const playable = botSeat.hand.filter((c) =>
    canPlayCard(
      c,
      topDiscard,
      state.activeColor,
      state.pendingDraw,
      state.drawnPlayableCardId
    )
  );

  if (playable.length === 0) {
    return { action: 'draw' };
  }

  const nextIdx = getNextActiveSeatIndex(
    state.seats,
    state.currentTurnIndex,
    state.direction,
    1
  );
  const nextOpponentCards = state.seats[nextIdx]?.hand.length ?? 7;

  const sorted = [...playable].sort((a, b) => {
    if (botSeat.botStyle === 'aggressive') {
      const weight = (c: UnoCard) => {
        if (c.value === 'shield' && state.pendingDraw > 0) return 140;
        if (c.value === 'wild4') return nextOpponentCards <= 3 ? 120 : 85;
        if (c.value === 'draw2') return 98;
        if (c.value === 'flip' && !state.darkSide) return 92;
        if (c.value === 'skip') return 80;
        if (c.value === 'reverse') return 70;
        if (c.value === 'xray') return 55;
        if (c.value === 'wild') return 40;
        return Number(c.value) || 1;
      };
      return weight(b) - weight(a);
    }

    if (botSeat.botStyle === 'trickster') {
      const weight = (c: UnoCard) => {
        if (c.value === 'shield') return 115;
        if (c.value === '7' && botSeat.hand.length >= 5) return 105;
        if (c.value === 'flip') return 100;
        if (c.value === 'reverse') return 95;
        if (c.color !== 'wild' && c.color !== state.activeColor) return 90;
        if (c.value === 'xray' || c.value === 'wild') return 80;
        if (c.value === 'skip') return 70;
        return cardPointValue(c);
      };
      return weight(b) - weight(a);
    }

    const weight = (c: UnoCard) => {
      if (c.value === 'shield' && state.pendingDraw > 0) return 120;
      if (c.color === 'wild') return -10;
      return cardPointValue(c);
    };
    return weight(b) - weight(a);
  });

  const chosen = sorted[0];
  const remainingAfterPlay = botSeat.hand.filter((c) => c.id !== chosen.id);
  const chosenColor =
    chosen.color === 'wild' ? pickDominantSuitColor(remainingAfterPlay) : undefined;
  const callUno = remainingAfterPlay.length === 1 ? rng() < 0.85 : false;

  // Smart target selection for 7 Hand Swap (avoid swapping with 2v2 partner if partner is winning!)
  let swapTargetId: string | undefined;
  if (chosen.value === '7') {
    let minCards = Infinity;
    for (const s of state.seats) {
      if (s.id === botSeat.id || s.eliminated) continue;
      if (botSeat.teamId && s.teamId === botSeat.teamId) continue;
      if (s.hand.length < minCards) {
        minCards = s.hand.length;
        swapTargetId = s.id;
      }
    }
  }

  return {
    action: 'play',
    cardId: chosen.id,
    chosenColor,
    callUno,
    swapTargetId,
  };
}

export function getLanternaSeat(seats: readonly PlayerSeat[]): PlayerSeat | null {
  const active = seats.filter((s) => !s.eliminated);
  if (active.length < 2) return null;
  let worst: PlayerSeat | null = null;
  let minCards = Infinity;

  for (const s of active) {
    if (s.hand.length < minCards) minCards = s.hand.length;
    if (!worst || s.hand.length > worst.hand.length) {
      worst = s;
    }
  }

  if (!worst || worst.hand.length <= minCards) return null;
  return worst;
}

/**
 * Computes funny post-round awards ("Pódio da Zueira") for the Victory/Scorecard screen.
 */
export function computeRoundAwards(seats: readonly PlayerSeat[]): RoundAward[] {
  const awards: RoundAward[] = [];
  if (seats.length === 0) return awards;

  // 1. Rei da Maldade (most attack cards played)
  const topAttacker = [...seats].sort(
    (a, b) => (b.attackCardsPlayed || 0) - (a.attackCardsPlayed || 0)
  )[0];
  if (topAttacker && (topAttacker.attackCardsPlayed || 0) > 0) {
    awards.push({
      id: 'rei_maldade',
      title: 'Rei da Maldade',
      playerName: topAttacker.name,
      detail: `Disparou ${topAttacker.attackCardsPlayed} cartas de ataque na mesa!`,
    });
  }

  // 2. Papelaria Ambulante (highest card count held during the round)
  const hoarder = [...seats].sort(
    (a, b) =>
      Math.max(b.maxCardsHeld ?? 0, b.hand.length) -
      Math.max(a.maxCardsHeld ?? 0, a.hand.length)
  )[0];
  if (hoarder) {
    const peak = Math.max(hoarder.maxCardsHeld ?? 0, hoarder.hand.length);
    awards.push({
      id: 'papelaria',
      title: 'Papelaria Ambulante',
      playerName: hoarder.name,
      detail: hoarder.eliminated
        ? `Acumulou ${peak} cartas e explodiu na Regra da Piedade!`
        : `Chegou a segurar ${peak} cartas na mão!`,
    });
  }

  // 3. Dorminhoco (caught forgetting UNO) or Sangue Frio
  const sleeper = [...seats].sort(
    (a, b) => (b.caughtUnoCount || 0) - (a.caughtUnoCount || 0)
  )[0];
  if (sleeper && (sleeper.caughtUnoCount || 0) > 0) {
    awards.push({
      id: 'dorminhoco',
      title: 'Dorminhoco do UNO',
      playerName: sleeper.name,
      detail: `Pego no pulo ${sleeper.caughtUnoCount}x sem gritar UNO!`,
    });
  } else {
    const runnerUp = [...seats].sort((a, b) => b.hand.length - a.hand.length)[0];
    if (runnerUp) {
      awards.push({
        id: 'fregues',
        title: 'Freguês da Rodada',
        playerName: runnerUp.name,
        detail: `Terminou segurando ${runnerUp.hand.length} cartas pro vencedor somar!`,
      });
    }
  }

  return awards;
}
