import {
  canJumpInCard,
  type BotStyle,
  type PlayerSeat,
  type UnoCard,
  type UnoGameState,
} from './unoRules';

export type BotTableEventKind =
  | 'swapped_hand'
  | 'shield_hit'
  | 'bluff_caught'
  | 'mercy_ko';

const TAUNT_REPLIES: Record<BotStyle, string[]> = {
  aggressive: [
    'Me respeita {sender}! Na próxima volta vem +4 dobrado no seu colo!',
    'Tá rindo agora né {sender}? Anotei seu nome no meu caderninho do +4!',
    'Pode mandar figurinha {sender}, quero ver rir quando a mesa virar pro Lado Sombrio!',
    'A soberba precede a compra de +8, viu {sender}?!',
  ],
  trickster: [
    'Hahaha boa {sender}! Mas cuidado que meu Escudo Espelho tá engatilhado...',
    'Zomba mesmo {sender}, quanto mais você fala mais carta boa eu puxo!',
    'Jogada psicológica fraca {sender}, sou PhD em blefe de boteco!',
    'Guarda essa figurinha {sender}, já já te passo minhas 12 cartas num 7 maroto!',
  ],
  calm: [
    'Respira fundo... paz interior... mas guardei seu nome viu {sender}.',
    'O universo do baralho gira devagar, {sender}, mas gira com juros!',
    'Sem estresse {sender}, tô só colecionando cores pra bater com estilo.',
    'Meditação em dia {sender}, nem esse +4 abala meu chakra hoje!',
  ],
};

const EVENT_REACTIONS: Record<BotTableEventKind, Record<BotStyle, string[]>> = {
  swapped_hand: {
    aggressive: [
      'QUE ISSO {actor}?! Roubou minha mão limpa na cara dura!!',
      'Covardia esse 7 hein {actor}! Vai ter troco pesado!',
    ],
    trickster: [
      'Golpe baixo {actor}! Eu tava armando o crime perfeito com essas cartas!',
      'Pegou minha mão né {actor}? Tomara que dê azar!',
    ],
    calm: [
      'Desapego material {actor}... leve minhas cartas em paz (mas vou cobrar).',
      'Tudo flui {actor}, até minhas cartas indo parar na sua mão!',
    ],
  },
  shield_hit: {
    aggressive: [
      'NÃO ACREDITO QUE {actor} REBATEU NO ESCUDO ESPELHO!!',
      'Esse Escudo do {actor} devia ser proibido pela ONU do baralho!',
    ],
    trickster: [
      'Caí na própria armadilha! Mandou muito nesse Escudo, {actor}!',
      'Espelho maldito {actor}! Meu feitiço virou contra o feiticeiro!',
    ],
    calm: [
      'Karma instantâneo... mandei bomba e recebi de volta do {actor}.',
      'Aceito essa compra com serenidade, {actor}...',
    ],
  },
  bluff_caught: {
    aggressive: [
      'Como você sabia que eu tinha a cor, {actor}?! Tá olhando meu baralho?!',
      'Duvidou na sorte grande hein {actor}! Na próxima não blefo!',
    ],
    trickster: [
      'Fui pego no pulo pelo detetive {actor}! Blefar faz parte da arte!',
      'Ok {actor}, dessa vez você leu minha cara de pau direitinho!',
    ],
    calm: [
      'A verdade sempre aparece na mesa... bem desafiado, {actor}.',
      'Tentei um blefe zen e tomei +4, faz parte, {actor}.',
    ],
  },
  mercy_ko: {
    aggressive: [
      '25 CARTAS?! Explodi da rodada, mas na próxima volto sedento!',
      'Abri uma papelaria inteira aqui por culpa de vocês!!',
    ],
    trickster: [
      'Saí pela Regra da Piedade! Pelo menos não preciso segurar esse tijolo de cartas!',
      'Explodi nos 25+, mas moralmente continuo invicto!',
    ],
    calm: [
      '25 cartas era peso demais pra alma... vou assistir em paz daqui.',
      'Eliminado na Piedade, hora de tomar um café enquanto vocês brigam.',
    ],
  },
};

export function pickBotTauntReply(
  style: BotStyle,
  senderName: string,
  rng: () => number = Math.random
): string {
  const pool = TAUNT_REPLIES[style] || TAUNT_REPLIES.calm;
  const template = pool[Math.floor(rng() * pool.length) % pool.length];
  return template.replace(/\{sender\}/g, senderName.trim() || 'amigo');
}

export function pickBotEventReaction(
  style: BotStyle,
  event: BotTableEventKind,
  actorName: string,
  rng: () => number = Math.random
): string {
  const byStyle = EVENT_REACTIONS[event];
  const pool = byStyle[style] || byStyle.calm;
  const template = pool[Math.floor(rng() * pool.length) % pool.length];
  return template.replace(/\{actor\}/g, actorName.trim() || 'você');
}

/**
 * Finds an AI bot holding an exact twin card eligible for out-of-turn Jump-In ("Corte na Frente").
 */
export function findBotJumpInCandidate(
  state: UnoGameState,
  rng: () => number = Math.random
): { botSeat: PlayerSeat; card: UnoCard } | null {
  if (state.phase !== 'playing' || !state.houseRules?.jumpInRule) return null;
  const candidates: Array<{ botSeat: PlayerSeat; card: UnoCard }> = [];

  for (const seat of state.seats) {
    if (!seat.isBot || seat.eliminated) continue;
    for (const card of seat.hand) {
      if (canJumpInCard(state, seat.id, card)) {
        candidates.push({ botSeat: seat, card });
        break;
      }
    }
  }

  if (candidates.length === 0) return null;
  // Prefer aggressive & trickster bots when multiple hold twins
  const sorted = [...candidates].sort((a, b) => {
    const score = (s: BotStyle) => (s === 'aggressive' ? 3 : s === 'trickster' ? 2 : 1);
    return score(b.botSeat.botStyle) - score(a.botSeat.botStyle);
  });

  if (sorted.length > 1 && rng() < 0.35) {
    return sorted[1];
  }
  return sorted[0];
}
