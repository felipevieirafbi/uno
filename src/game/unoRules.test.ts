import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFullDeck,
  canPlayCard,
  dealNewRound,
  applyPlayCard,
  applyDrawCard,
  applyPassAfterDraw,
  applySortPlayerHand,
  applyCallUno,
  applyCatchForgotUno,
  chooseBotMove,
  serializeGameState,
  deserializeGameState,
  getLanternaSeat,
  DEFAULT_HOUSE_RULES,
  type UnoGameState,
} from './unoRules';
import {
  BASE_ZUEIRA_STICKERS,
  getNewlyUnlockedStickers,
  isStickerUnlocked,
  mergeStickersCatalog,
  sanitizeStickerPatch,
} from './stickers';
import { sanitizeBotName } from '../lib/playerStats';

test('createFullDeck generates standard 108 UNO cards', () => {
  const deck = createFullDeck();
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((c) => c.color === 'wild').length, 8);
  assert.equal(deck.filter((c) => c.value === 'draw2').length, 8);
  assert.equal(deck.filter((c) => c.value === '0').length, 4);
});

test('canPlayCard validates matching color, matching rank, wild cards, and pendingDraw stacking', () => {
  const top = { id: 'c1', color: 'red' as const, value: '7' as const };
  assert.equal(canPlayCard({ id: 'c2', color: 'red', value: '2' }, top, 'red'), true);
  assert.equal(canPlayCard({ id: 'c3', color: 'blue', value: '7' }, top, 'red'), true);
  assert.equal(canPlayCard({ id: 'c4', color: 'wild', value: 'wild4' }, top, 'red'), true);
  assert.equal(canPlayCard({ id: 'c5', color: 'green', value: '9' }, top, 'red'), false);

  // Under +2 pendingDraw, only +2 or +4 can counter-stack
  const topDraw2 = { id: 'd2', color: 'red' as const, value: 'draw2' as const };
  assert.equal(canPlayCard({ id: 'r5', color: 'red', value: '5' }, topDraw2, 'red', 2), false);
  assert.equal(canPlayCard({ id: 'b2', color: 'blue', value: 'draw2' }, topDraw2, 'red', 2), true);
  assert.equal(canPlayCard({ id: 'w4', color: 'wild', value: 'wild4' }, topDraw2, 'red', 2), true);

  // Under +4 pendingDraw, only +4 can counter-stack
  const topWild4 = { id: 'w0', color: 'wild' as const, value: 'wild4' as const };
  assert.equal(canPlayCard({ id: 'b2', color: 'blue', value: 'draw2' }, topWild4, 'blue', 4), false);
  assert.equal(canPlayCard({ id: 'w4', color: 'wild', value: 'wild4' }, topWild4, 'blue', 4), true);
});

test('2-player Reverse acts like Skip (player plays again)', () => {
  const state: UnoGameState = {
    phase: 'playing',
    activeColor: 'blue',
    direction: 1,
    currentTurnIndex: 0,
    pendingDraw: 0,
    drawnPlayableCardId: '',
    houseRules: { ...DEFAULT_HOUSE_RULES },
    winnerId: '',
    winnerName: '',
    lastActionText: '',
    seats: [
      {
        id: 'p1',
        name: 'Alice',
        isBot: false,
        botStyle: 'calm',
        avatarColor: 'red',
        score: 0,
        saidUno: false,
        hand: [
          { id: 'r1', color: 'blue', value: 'reverse' },
          { id: 'r2', color: 'blue', value: '5' },
        ],
      },
      {
        id: 'p2',
        name: 'Bob',
        isBot: true,
        botStyle: 'aggressive',
        avatarColor: 'blue',
        score: 0,
        saidUno: false,
        hand: [{ id: 'b1', color: 'yellow', value: '3' }],
      },
    ],
    drawDeck: [{ id: 'd1', color: 'green', value: '1' }],
    discardPile: [{ id: 'top', color: 'blue', value: '9' }],
  };

  const next = applyPlayCard(state, 'p1', 'r1', undefined, true);
  assert.equal(next.currentTurnIndex, 0);
  assert.equal(next.seats[0].hand.length, 1);
  assert.equal(next.seats[0].saidUno, true);
});

test('Stacking +2 into +4 accumulates +6 and forces next player to draw 6 when absorbing', () => {
  const base = dealNewRound(
    [
      { id: 'p1', name: 'P1', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'p2', name: 'P2', isBot: false, botStyle: 'calm', avatarColor: 'blue', score: 0 },
      { id: 'p3', name: 'P3', isBot: false, botStyle: 'calm', avatarColor: 'green', score: 0 },
    ],
    () => 0.42,
    0,
    { stackDrawCards: true, allowPlayDrawnCard: true, zeroRotatesHands: false }
  );

  const topColor = base.activeColor;
  base.seats[0].hand = [
    { id: 'p1_d2', color: topColor, value: 'draw2' },
    { id: 'p1_extra', color: 'red', value: '1' },
  ];
  base.seats[1].hand = [
    { id: 'p2_w4', color: 'wild', value: 'wild4' },
    { id: 'p2_extra', color: 'blue', value: '2' },
  ];
  const p3InitialCount = base.seats[2].hand.length;

  // P1 plays +2 -> pendingDraw = 2, turn passes to P2
  const step1 = applyPlayCard(base, 'p1', 'p1_d2');
  assert.equal(step1.pendingDraw, 2);
  assert.equal(step1.currentTurnIndex, 1);

  // P2 counter-stacks with +4 (choosing yellow) -> pendingDraw = 6, turn passes to P3
  const step2 = applyPlayCard(step1, 'p2', 'p2_w4', 'yellow');
  assert.equal(step2.pendingDraw, 6);
  assert.equal(step2.activeColor, 'yellow');
  assert.equal(step2.currentTurnIndex, 2);

  // P3 absorbs the +6 stack -> draws 6 cards, pendingDraw resets to 0, turn advances to P1
  const step3 = applyDrawCard(step2, 'p3');
  assert.equal(step3.pendingDraw, 0);
  assert.equal(step3.seats[2].hand.length, p3InitialCount + 6);
  assert.equal(step3.currentTurnIndex, 0);
});

test('When stacking is disabled, Wild Draw Four immediately deals 4 to next seat and skips them', () => {
  const base = dealNewRound(
    [
      { id: 'p1', name: 'P1', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'p2', name: 'P2', isBot: true, botStyle: 'aggressive', avatarColor: 'blue', score: 0 },
      { id: 'p3', name: 'P3', isBot: true, botStyle: 'trickster', avatarColor: 'yellow', score: 0 },
      { id: 'p4', name: 'P4', isBot: true, botStyle: 'calm', avatarColor: 'green', score: 0 },
    ],
    () => 0.42,
    0,
    { stackDrawCards: false, allowPlayDrawnCard: true, zeroRotatesHands: false }
  );

  base.seats[0].hand = [
    { id: 'w4', color: 'wild', value: 'wild4' },
    { id: 'g2', color: 'green', value: '2' },
  ];
  const beforeCount = base.seats[1].hand.length;

  const after = applyPlayCard(base, 'p1', 'w4', 'green', false);
  assert.equal(after.activeColor, 'green');
  assert.equal(after.seats[1].hand.length, beforeCount + 4);
  assert.equal(after.currentTurnIndex, 2);
});

test('Drawing a playable card lets player play it immediately or pass turn, and 0-rule rotates hands', () => {
  const state: UnoGameState = {
    phase: 'playing',
    activeColor: 'red',
    direction: 1,
    currentTurnIndex: 0,
    pendingDraw: 0,
    drawnPlayableCardId: '',
    houseRules: { stackDrawCards: true, allowPlayDrawnCard: true, zeroRotatesHands: true },
    winnerId: '',
    winnerName: '',
    lastActionText: '',
    seats: [
      {
        id: 'p1',
        name: 'Ana',
        isBot: false,
        botStyle: 'calm',
        avatarColor: 'red',
        score: 0,
        saidUno: false,
        hand: [
          { id: 'b9', color: 'blue', value: '9' },
          { id: 'y4', color: 'yellow', value: '4' },
        ],
      },
      {
        id: 'p2',
        name: 'Beto',
        isBot: false,
        botStyle: 'calm',
        avatarColor: 'blue',
        score: 0,
        saidUno: false,
        hand: [{ id: 'g1', color: 'green', value: '1' }],
      },
    ],
    drawDeck: [{ id: 'drawn_r0', color: 'red', value: '0' }],
    discardPile: [{ id: 'top_r5', color: 'red', value: '5' }],
  };

  // Ana draws red 0 (playable!) -> stays on Ana's turn with drawnPlayableCardId
  const afterDraw = applyDrawCard(state, 'p1');
  assert.equal(afterDraw.currentTurnIndex, 0);
  assert.equal(afterDraw.drawnPlayableCardId, 'drawn_r0');

  // Option A: Pass turn
  const passed = applyPassAfterDraw(afterDraw, 'p1');
  assert.equal(passed.currentTurnIndex, 1);
  assert.equal(passed.drawnPlayableCardId, '');

  // Option B: Play the drawn red 0 -> triggers zeroRotatesHands!
  const rotated = applyPlayCard(afterDraw, 'p1', 'drawn_r0');
  assert.equal(rotated.seats[0].hand[0].id, 'g1', 'Ana received Beto hand');
  assert.equal(rotated.seats[1].hand.length, 2, 'Beto received Ana 2 remaining cards');

  // Hand sorting orders colors & values deterministically
  const sorted = applySortPlayerHand(afterDraw, 'p1');
  assert.equal(sorted.seats[0].hand[0].color, 'red');
  assert.equal(sorted.seats[0].hand[1].color, 'blue');
  assert.equal(sorted.seats[0].hand[2].color, 'yellow');
});

test('UNO catch penalty and round victory scoring work accurately', () => {
  const base = dealNewRound(
    [
      { id: 'p1', name: 'Ana', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 10 },
      { id: 'p2', name: 'Beto', isBot: true, botStyle: 'calm', avatarColor: 'blue', score: 0 },
    ],
    () => 0.25
  );
  base.seats[1].hand = [{ id: 'only1', color: 'red', value: '4' }];
  base.seats[1].saidUno = false;

  const caught = applyCatchForgotUno(base, 'Ana', 'p2');
  assert.equal(caught.seats[1].hand.length, 3);

  base.seats[0].hand = [{ id: 'win', color: base.activeColor, value: '9' }];
  const protectedState = applyCallUno(base, 'p1');
  assert.equal(protectedState.seats[0].saidUno, true);

  const won = applyPlayCard(protectedState, 'p1', 'win');
  assert.equal(won.phase, 'round_over');
  assert.equal(won.winnerId, 'p1');
  assert.ok(won.seats[0].score > 10);
});

test('serializeGameState and deserializeGameState preserve houseRules, pendingDraw, and bot decisions', () => {
  const state = dealNewRound(
    [
      { id: 'p1', name: 'Você', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'bot1', name: 'Tia Zuleide', isBot: true, botStyle: 'aggressive', avatarColor: 'purple', score: 0 },
      { id: 'bot2', name: 'Zé Coringa', isBot: true, botStyle: 'trickster', avatarColor: 'yellow', score: 0 },
    ],
    () => 0.15,
    1,
    { stackDrawCards: true, allowPlayDrawnCard: false, zeroRotatesHands: true }
  );

  const afterDraw = applyDrawCard({ ...state, currentTurnIndex: 2 }, 'bot2');
  const lanterna = getLanternaSeat(afterDraw.seats);
  assert.equal(lanterna?.id, 'bot2');

  const serialized = serializeGameState(afterDraw);
  const restored = deserializeGameState(serialized);
  assert.equal(restored.houseRules.zeroRotatesHands, true);
  assert.equal(restored.houseRules.allowPlayDrawnCard, false);

  const botTurnState = { ...restored, currentTurnIndex: 1 };
  const decision = chooseBotMove(botTurnState, botTurnState.seats[1], () => 0.5);
  assert.ok(decision.action === 'play' || decision.action === 'draw');
});

test('Special unlockable taunt cards unlock progressively at 1, 3, 5, and 10 career wins', () => {
  const lockedAtZero = BASE_ZUEIRA_STICKERS.filter((s) => !isStickerUnlocked(s, 0));
  assert.equal(lockedAtZero.length, 4);

  const unlockedAtOne = getNewlyUnlockedStickers(0, 1);
  assert.equal(unlockedAtOne.length, 1);
  assert.equal(unlockedAtOne[0].id, 'sp_trofeu_pato');
  assert.equal(unlockedAtOne[0].rarity, 'rare');

  const unlockedAtThree = getNewlyUnlockedStickers(1, 3);
  assert.equal(unlockedAtThree.some((s) => s.id === 'sp_chuva_dourada'), true);

  const unlockedAtTen = BASE_ZUEIRA_STICKERS.filter((s) => isStickerUnlocked(s, 10));
  assert.equal(unlockedAtTen.length, BASE_ZUEIRA_STICKERS.length);
});

test('Custom and edited taunt stickers sanitize inputs and merge into catalog cleanly', () => {
  const cleanPatch = sanitizeStickerPatch({
    title: '  REI DO TRUCO  ',
    tauntLine: 'Aqui não se cria!',
    badgeText: 'zap!',
    accentHex: '#7C3AED',
    artKind: 'clown_joker',
    soundKind: 'thunder',
  });
  assert.equal(cleanPatch.title, 'REI DO TRUCO');
  assert.equal(cleanPatch.badgeText, 'ZAP!');
  assert.equal(cleanPatch.soundKind, 'thunder');

  const merged = mergeStickersCatalog(
    { chora_mais4: cleanPatch },
    [
      {
        id: 'custom_1',
        ...cleanPatch,
        rarity: 'rare',
        unlockWinsRequired: 0,
        isCustom: true,
      },
    ]
  );
  assert.equal(merged[0].id, 'custom_1');
  assert.equal(merged[0].isCustom, true);
  const editedBase = merged.find((s) => s.id === 'chora_mais4');
  assert.equal(editedBase?.title, 'REI DO TRUCO');
  assert.equal(editedBase?.isEdited, true);

  // Custom AI bot names sanitize cleanly with fallback
  assert.equal(sanitizeBotName('  Primo Léo (IA)  ', 0), 'Primo Léo (IA)');
  assert.equal(sanitizeBotName('   ', 0), 'Tia Zuleide (IA)');
});

test('Chaos Deck adds Shield, X-Ray, and Flip cards; Shield reflects pendingDraw bomb and Flip enables Dark Side +5 & Skip Everyone', () => {
  const chaosDeck = createFullDeck(true);
  assert.equal(chaosDeck.length, 116);
  assert.equal(chaosDeck.filter((c) => c.value === 'flip').length, 4);
  assert.equal(chaosDeck.filter((c) => c.value === 'shield').length, 2);
  assert.equal(chaosDeck.filter((c) => c.value === 'xray').length, 2);

  const base = dealNewRound(
    [
      { id: 'p1', name: 'Ana', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'p2', name: 'Beto', isBot: false, botStyle: 'calm', avatarColor: 'blue', score: 0 },
      { id: 'p3', name: 'Caio', isBot: false, botStyle: 'calm', avatarColor: 'green', score: 0 },
    ],
    () => 0.3,
    0,
    { ...DEFAULT_HOUSE_RULES, chaosDeck: true }
  );

  base.activeColor = 'red';
  base.discardPile = [{ id: 'top_r1', color: 'red', value: '1' }];
  base.seats[0].hand = [
    { id: 'flip_r', color: 'red', value: 'flip' },
    { id: 'skip_r', color: 'red', value: 'skip' },
  ];
  base.seats[1].hand = [
    { id: 'd2_r', color: 'red', value: 'draw2' },
    { id: 'extra_b', color: 'blue', value: '4' },
  ];
  base.seats[2].hand = [
    { id: 'sh_1', color: 'wild', value: 'shield' },
    { id: 'extra_g', color: 'green', value: '5' },
  ];

  // P1 plays Flip -> darkSide becomes true, turn passes to P2
  const s1 = applyPlayCard(base, 'p1', 'flip_r');
  assert.equal(s1.darkSide, true);
  assert.equal(s1.currentTurnIndex, 1);

  // P2 plays draw2 during Dark Side -> pendingDraw becomes +5 Sombrio! Turn passes to P3
  const s2 = applyPlayCard(s1, 'p2', 'd2_r');
  assert.equal(s2.pendingDraw, 5);
  assert.equal(s2.currentTurnIndex, 2);

  // P3 plays Shield -> reverses direction (-1) and reflects the +5 bomb right back to P2!
  const s3 = applyPlayCard(s2, 'p3', 'sh_1', 'red');
  assert.equal(s3.direction, -1);
  assert.equal(s3.pendingDraw, 5);
  assert.equal(s3.currentTurnIndex, 1);

  // After P2 absorbs +5, turn moves in -1 direction to P1; P1 plays Dark Side Skip -> Skip Everyone keeps turn on P1!
  const s4 = applyDrawCard(s3, 'p2');
  assert.equal(s4.currentTurnIndex, 0);
  s4.seats[0].hand = [
    { id: 'skip_r', color: 'red', value: 'skip' },
    { id: 'keep_r', color: 'red', value: '2' },
  ];
  const s5 = applyPlayCard(s4, 'p1', 'skip_r');
  assert.equal(s5.currentTurnIndex, 0, 'Dark Side Skip skips everyone and returns to P1');
});

test('Wild +4 Bluff Challenge ("DUVIDO!") punishes bluffers (+4) and wrong challengers (+6)', async () => {
  const { applyResolveWild4Challenge } = await import('./unoRules');
  const base = dealNewRound(
    [
      { id: 'p1', name: 'Blefeiro', isBot: false, botStyle: 'trickster', avatarColor: 'red', score: 0 },
      { id: 'p2', name: 'Detetive', isBot: false, botStyle: 'calm', avatarColor: 'blue', score: 0 },
      { id: 'p3', name: 'Zé', isBot: true, botStyle: 'calm', avatarColor: 'green', score: 0 },
    ],
    () => 0.2,
    0,
    { ...DEFAULT_HOUSE_RULES, bluffChallengeWild4: true }
  );

  base.activeColor = 'red';
  base.discardPile = [{ id: 'top_r', color: 'red', value: '3' }];
  // P1 secretly holds a red card while playing Wild +4 -> BLUFFING!
  base.seats[0].hand = [
    { id: 'w4_1', color: 'wild', value: 'wild4' },
    { id: 'secret_red', color: 'red', value: '8' },
  ];
  const p2Before = base.seats[1].hand.length;

  const afterW4 = applyPlayCard(base, 'p1', 'w4_1', 'blue');
  assert.equal(afterW4.challengeVictimId, 'p2');
  assert.equal(afterW4.challengeWasBluffing, true);

  // Case A: P2 shouts DUVIDO! -> P1 caught bluffing, draws +4, and P2 keeps turn!
  const caught = applyResolveWild4Challenge(afterW4, 'p2', 'challenge');
  assert.equal(caught.seats[0].hand.length, 1 + 4);
  assert.equal(caught.seats[1].hand.length, p2Before);
  assert.equal(caught.currentTurnIndex, 1);
  assert.equal(caught.pendingDraw, 0);

  // Case B: Honest +4 (no red card in P1 hand) -> P2 challenges wrongly and draws +6, losing turn!
  base.seats[0].hand = [
    { id: 'w4_2', color: 'wild', value: 'wild4' },
    { id: 'only_green', color: 'green', value: '8' },
  ];
  const honestW4 = applyPlayCard(base, 'p1', 'w4_2', 'green');
  assert.equal(honestW4.challengeWasBluffing, false);
  const wrongChallenge = applyResolveWild4Challenge(honestW4, 'p2', 'challenge');
  assert.equal(wrongChallenge.seats[1].hand.length, p2Before + 6);
  assert.equal(wrongChallenge.currentTurnIndex, 2);
});

test('Jump-In, Same-Number Combos, 7-Swap, Truco Table Doubling, Mercy 25+ Elimination, 2v2 Duos, and Round Awards work end-to-end', async () => {
  const {
    canJumpInCard,
    applyJumpInCard,
    findPlayableNumberCombos,
    applyPlayNumberCombo,
    applyDoubleStakes,
    computeRoundAwards,
  } = await import('./unoRules');

  // 4-player 2v2 Duos setup (Seats 0 & 2 = Team A, Seats 1 & 3 = Team B)
  const state = dealNewRound(
    [
      { id: 'p0', name: 'Você', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'p1', name: 'Rival 1', isBot: true, botStyle: 'aggressive', avatarColor: 'blue', score: 0 },
      { id: 'p2', name: 'Parceiro', isBot: true, botStyle: 'calm', avatarColor: 'green', score: 0 },
      { id: 'p3', name: 'Rival 2', isBot: true, botStyle: 'trickster', avatarColor: 'yellow', score: 0 },
    ],
    () => 0.35,
    0,
    { ...DEFAULT_HOUSE_RULES, teamMode2v2: true, jumpInRule: true, comboSameNumber: true, sevenSwapHands: true, mercyElimination: true }
  );

  assert.equal(state.seats[0].teamId, 'A');
  assert.equal(state.seats[2].teamId, 'A');
  assert.equal(state.seats[1].teamId, 'B');

  // Double table stakes -> 2x
  const doubled = applyDoubleStakes(state, 'p0');
  assert.equal(doubled.stakesMultiplier, 2);
  assert.equal(applyDoubleStakes(doubled, 'p0').stakesMultiplier, 2, 'Same player cannot double twice in a row');
  const quadrupled = applyDoubleStakes(doubled, 'p1');
  assert.equal(quadrupled.stakesMultiplier, 4);

  // Multi-card Same-Number Combo
  quadrupled.activeColor = 'blue';
  quadrupled.discardPile = [{ id: 'top_b4', color: 'blue', value: '4' }];
  quadrupled.seats[0].hand = [
    { id: 'c_b9', color: 'blue', value: '9' },
    { id: 'c_r9', color: 'red', value: '9' },
    { id: 'c_g9', color: 'green', value: '9' },
    { id: 'c_y2', color: 'yellow', value: '2' },
  ];
  const combos = findPlayableNumberCombos(quadrupled, 'p0');
  assert.equal(combos.length, 1);
  assert.equal(combos[0].cards.length, 3);

  const afterCombo = applyPlayNumberCombo(quadrupled, 'p0', '9', true);
  assert.equal(afterCombo.seats[0].hand.length, 1);
  assert.equal(afterCombo.activeColor, 'green');
  assert.equal(afterCombo.currentTurnIndex, 1);

  // Out-of-turn Jump-In by Seat 2 (exact twin green 9!)
  afterCombo.seats[2].hand = [
    { id: 'twin_g9', color: 'green', value: '9' },
    { id: 'g7', color: 'green', value: '7' },
  ];
  assert.equal(canJumpInCard(afterCombo, 'p2', afterCombo.seats[2].hand[0]), true);
  const jumped = applyJumpInCard(afterCombo, 'p2', 'twin_g9');
  assert.equal(jumped.currentTurnIndex, 3, 'Turn hijacked to P2 and advanced to P3');

  // 7-Swap steals another player's hand
  jumped.currentTurnIndex = 2;
  jumped.seats[2].hand = [
    { id: 'g7', color: 'green', value: '7' },
    { id: 'extra1', color: 'red', value: '1' },
    { id: 'extra2', color: 'blue', value: '2' },
  ];
  jumped.seats[3].hand = [{ id: 'tiny', color: 'yellow', value: '5' }];
  const swapped = applyPlayCard(jumped, 'p2', 'g7', undefined, false, Math.random, 'p3');
  assert.equal(swapped.seats[2].hand[0].id, 'tiny');
  assert.equal(swapped.seats[3].hand.length, 2);

  // 2v2 Partner Victory shares multiplied points with teammate!
  swapped.currentTurnIndex = 2;
  swapped.activeColor = 'yellow';
  const partnerWin = applyPlayCard(swapped, 'p2', 'tiny');
  assert.equal(partnerWin.phase, 'round_over');
  assert.equal(partnerWin.winningTeamId, 'A');
  assert.ok(partnerWin.seats[0].score > 0, 'Player 0 shares Team A multiplied victory score');
  assert.equal(partnerWin.seats[0].score, partnerWin.seats[2].score);

  const awards = computeRoundAwards(partnerWin.seats);
  assert.ok(awards.length >= 2);

  // Mercy 25+ Elimination knocks out a 25-card player and crowns the survivor in 1v1!
  const mercyMatch = dealNewRound(
    [
      { id: 'm1', name: 'Sobrevivente', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 'm2', name: 'Papelaria', isBot: true, botStyle: 'calm', avatarColor: 'blue', score: 0 },
    ],
    () => 0.4,
    0,
    { ...DEFAULT_HOUSE_RULES, mercyElimination: true, stackDrawCards: false }
  );
  mercyMatch.activeColor = 'red';
  mercyMatch.seats[0].hand = [
    { id: 'm_d2', color: 'red', value: 'draw2' },
    { id: 'm_extra', color: 'red', value: '5' },
  ];
  // Give m2 24 cards -> after receiving +2, m2 hits 26 cards (>= 25) and is eliminated!
  mercyMatch.seats[1].hand = Array.from({ length: 24 }, (_, idx) => ({
    id: `hoard_${idx}`,
    color: 'blue' as const,
    value: '1' as const,
  }));
  const afterMercyKo = applyPlayCard(mercyMatch, 'm1', 'm_d2');
  assert.equal(afterMercyKo.seats[1].eliminated, true);
  assert.equal(afterMercyKo.phase, 'round_over');
  assert.equal(afterMercyKo.winnerId, 'm1');
});

test('Tournament targetScore, getChampionshipWinner, countHandColors, AI Combo & Jump-In, Bot Banter, and Career Rank/Medals work accurately', async () => {
  const { countHandColors, getChampionshipWinner } = await import('./unoRules');
  const { pickBotTauntReply, pickBotEventReaction, findBotJumpInCandidate } = await import(
    './botBanter'
  );
  const { computePlayerRank, computeCareerAchievements } = await import('../lib/playerStats');

  // 1. countHandColors counts colored suits and ignores wilds
  const counts = countHandColors([
    { id: 'c1', color: 'red', value: '2' },
    { id: 'c2', color: 'red', value: '9' },
    { id: 'c3', color: 'green', value: '5' },
    { id: 'c4', color: 'wild', value: 'wild4' },
  ]);
  assert.deepEqual(counts, { red: 2, blue: 0, yellow: 0, green: 1 });

  // 2. targetScore serializes & getChampionshipWinner detects tournament winner
  const tourneyState = dealNewRound(
    [
      { id: 'p0', name: 'Você', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 145 },
      { id: 'b1', name: 'Tia Zuleide (IA)', isBot: true, botStyle: 'aggressive', avatarColor: 'purple', score: 90 },
    ],
    () => 0.25,
    0,
    { ...DEFAULT_HOUSE_RULES, targetScore: 150, comboSameNumber: true, jumpInRule: true }
  );
  const restoredTourney = deserializeGameState(serializeGameState(tourneyState));
  assert.equal(restoredTourney.houseRules.targetScore, 150);
  assert.equal(
    getChampionshipWinner({ ...restoredTourney, phase: 'round_over' }).isChampionshipOver,
    false
  );

  restoredTourney.seats[0].score = 162;
  const champ = getChampionshipWinner({ ...restoredTourney, phase: 'round_over' });
  assert.equal(champ.isChampionshipOver, true);
  assert.equal(champ.championId, 'p0');
  assert.equal(
    getChampionshipWinner({
      ...restoredTourney,
      phase: 'round_over',
      houseRules: { ...restoredTourney.houseRules, targetScore: 0 },
    }).isChampionshipOver,
    false,
    'targetScore 0 = Livre'
  );

  // 3. AI Bot plays Same-Number Combo when holding 2+ matching number cards
  restoredTourney.currentTurnIndex = 1;
  restoredTourney.activeColor = 'red';
  restoredTourney.discardPile = [{ id: 'top_r4', color: 'red', value: '4' }];
  restoredTourney.seats[1].hand = [
    { id: 'b1_r8', color: 'red', value: '8' },
    { id: 'b1_b8', color: 'blue', value: '8' },
    { id: 'b1_g2', color: 'green', value: '2' },
  ];
  const botDecision = chooseBotMove(restoredTourney, restoredTourney.seats[1], () => 0.1);
  assert.equal(botDecision.action, 'combo');
  if (botDecision.action === 'combo') {
    assert.equal(botDecision.value, '8');
    assert.equal(botDecision.callUno, true);
  }

  // 4. Bot Banter replies & Jump-In candidate detection
  const reply = pickBotTauntReply('aggressive', 'Felipe', () => 0);
  assert.ok(reply.includes('Felipe'));
  const reaction = pickBotEventReaction('trickster', 'bluff_caught', 'Felipe', () => 0);
  assert.ok(reaction.includes('Felipe'));

  restoredTourney.currentTurnIndex = 0; // Human's turn, bot holds exact twin red 4!
  restoredTourney.seats[1].hand = [
    { id: 'twin_r4', color: 'red', value: '4' },
    { id: 'extra_y1', color: 'yellow', value: '1' },
  ];
  const jumpCandidate = findBotJumpInCandidate(restoredTourney, () => 0.5);
  assert.equal(jumpCandidate?.botSeat.id, 'b1');
  assert.equal(jumpCandidate?.card.id, 'twin_r4');

  // 5. Career Rank & 8 Achievements unlock accurately
  const rookieRank = computePlayerRank({
    roundsPlayed: 0,
    roundsWon: 0,
    bestRoundScore: 0,
    plusFoursDropped: 0,
    tauntsSent: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    shieldsReflected: 0,
    bluffsCaught: 0,
    doubledWins: 0,
    tournamentsWon: 0,
  });
  assert.equal(rookieRank.title, 'Novato do Baralho');

  const vetStats = {
    roundsPlayed: 14,
    roundsWon: 10,
    bestRoundScore: 240,
    plusFoursDropped: 6,
    tauntsSent: 8,
    currentWinStreak: 3,
    bestWinStreak: 4,
    shieldsReflected: 2,
    bluffsCaught: 1,
    doubledWins: 2,
    tournamentsWon: 1,
  };
  const vetRank = computePlayerRank(vetStats);
  assert.equal(vetRank.title, 'Terror do +4');
  const medals = computeCareerAchievements(vetStats);
  assert.equal(medals.length, 8);
  assert.equal(medals.every((m) => m.unlocked), true);
});

test('computePerimeterSeats, computeBotTurnDelayMs, and deriveMoveHistoryEntry map around-the-table seats and card flight events accurately', async () => {
  const {
    computePerimeterSeats,
    computeBotTurnDelayMs,
    deriveMoveHistoryEntry,
    cycleAiSpeed,
  } = await import('./moveHistory');
  const { applyPlayNumberCombo, applyDoubleStakes } = await import('./unoRules');

  const makeSeats = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      name: `P${i}`,
      isBot: i > 0,
      botStyle: 'calm' as const,
      avatarColor: 'red' as const,
      score: 0,
      saidUno: false,
      hand: [],
    }));

  // 2P -> ['top']
  assert.deepEqual(
    computePerimeterSeats(makeSeats(2), 's0').map((s) => s.position),
    ['top']
  );
  // 3P -> ['top-left', 'top-right']
  assert.deepEqual(
    computePerimeterSeats(makeSeats(3), 's0').map((s) => s.position),
    ['top-left', 'top-right']
  );
  // 4P / 2v2 -> ['left', 'top', 'right'] (Seat s2 = partner sits directly across at 'top'!)
  const fourSeats = computePerimeterSeats(makeSeats(4), 's0');
  assert.deepEqual(
    fourSeats.map((s) => s.position),
    ['left', 'top', 'right']
  );
  assert.equal(fourSeats[1].seat.id, 's2');
  // 5P -> ['left', 'top-left', 'top-right', 'right']
  assert.deepEqual(
    computePerimeterSeats(makeSeats(5), 's0').map((s) => s.position),
    ['left', 'top-left', 'top-right', 'right']
  );
  // 6P -> ['left', 'top-left', 'top', 'top-right', 'right']
  assert.deepEqual(
    computePerimeterSeats(makeSeats(6), 's0').map((s) => s.position),
    ['left', 'top-left', 'top', 'top-right', 'right']
  );

  // AI Speed cycle & heavy impact extra cadence
  assert.equal(cycleAiSpeed('normal'), 'slow');
  assert.equal(cycleAiSpeed('slow'), 'fast');
  assert.equal(cycleAiSpeed('fast'), 'normal');
  assert.ok(computeBotTurnDelayMs('slow', 'play') > computeBotTurnDelayMs('normal', 'play'));
  assert.ok(computeBotTurnDelayMs('normal', 'bomb') > computeBotTurnDelayMs('normal', 'play'));

  // deriveMoveHistoryEntry tracks acting seat position, flying cards, combos, bombs, and draws
  const round = dealNewRound(
    [
      { id: 's0', name: 'Você', isBot: false, botStyle: 'calm', avatarColor: 'red', score: 0 },
      { id: 's1', name: 'Bot Esq', isBot: true, botStyle: 'aggressive', avatarColor: 'blue', score: 0 },
      { id: 's2', name: 'Bot Topo', isBot: true, botStyle: 'calm', avatarColor: 'green', score: 0 },
      { id: 's3', name: 'Bot Dir', isBot: true, botStyle: 'trickster', avatarColor: 'yellow', score: 0 },
    ],
    () => 0.3,
    1,
    { ...DEFAULT_HOUSE_RULES, comboSameNumber: true }
  );

  const startEntry = deriveMoveHistoryEntry(null, round, 's0', 1, 1000);
  assert.equal(startEntry?.kind, 'round_start');

  // Seat s1 ('left') plays a Wild +4 bomb!
  round.activeColor = 'red';
  round.discardPile = [{ id: 'top_r2', color: 'red', value: '2' }];
  round.seats[1].hand = [
    { id: 's1_w4', color: 'wild', value: 'wild4' },
    { id: 's1_b3', color: 'blue', value: '3' },
  ];
  const afterBomb = applyPlayCard(round, 's1', 's1_w4', 'blue');
  const bombEntry = deriveMoveHistoryEntry(round, afterBomb, 's0', 2, 2000);
  assert.equal(bombEntry?.actorPosition, 'left');
  assert.equal(bombEntry?.kind, 'bomb');
  assert.equal(bombEntry?.playedCards.length, 1);
  assert.equal(bombEntry?.isHeavyImpact, true);
  assert.ok(bombEntry?.calloutTitle.includes('+4'));

  // Seat s2 ('top') absorbs the +4 penalty -> drawnCount = 4 flying to 'top'!
  const afterAbsorb = applyDrawCard(afterBomb, 's2');
  const absorbEntry = deriveMoveHistoryEntry(afterBomb, afterAbsorb, 's0', 3, 3000);
  assert.equal(absorbEntry?.kind, 'penalty_draw');
  assert.equal(absorbEntry?.drawnCount, 4);
  assert.equal(absorbEntry?.targetPosition, 'top');

  // Table stakes double by s3 ('right')
  const afterDouble = applyDoubleStakes(afterAbsorb, 's3');
  const doubleEntry = deriveMoveHistoryEntry(afterAbsorb, afterDouble, 's0', 4, 4000);
  assert.equal(doubleEntry?.kind, 'double');
  assert.equal(doubleEntry?.actorPosition, 'right');

  // Seat s3 ('right') plays a 2-card combo
  afterDouble.currentTurnIndex = 3;
  afterDouble.activeColor = 'blue';
  afterDouble.seats[3].hand = [
    { id: 'c1', color: 'blue', value: '6' },
    { id: 'c2', color: 'yellow', value: '6' },
    { id: 'c3', color: 'green', value: '1' },
  ];
  const afterCombo = applyPlayNumberCombo(afterDouble, 's3', '6');
  const comboEntry = deriveMoveHistoryEntry(afterDouble, afterCombo, 's0', 5, 5000);
  assert.equal(comboEntry?.kind, 'combo');
  assert.equal(comboEntry?.actorPosition, 'right');
  assert.equal(comboEntry?.playedCards.length, 2);
});

