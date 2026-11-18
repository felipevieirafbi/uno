import {
  BOT_ROSTER,
  DEFAULT_HOUSE_RULES,
  type AvatarColor,
  type BotStyle,
  type HouseRulesConfig,
} from '../game/unoRules';

const STATS_STORAGE_KEY = 'unozueira_career_stats_v1';
const HOUSE_RULES_STORAGE_KEY = 'unozueira_house_rules_v1';
const CUSTOM_BOTS_STORAGE_KEY = 'unozueira_custom_bots_v1';

export interface PlayerCareerStats {
  roundsPlayed: number;
  roundsWon: number;
  bestRoundScore: number;
  plusFoursDropped: number;
  tauntsSent: number;
  currentWinStreak: number;
  bestWinStreak: number;
  shieldsReflected: number;
  bluffsCaught: number;
  doubledWins: number;
  tournamentsWon: number;
}

export interface PlayerRankInfo {
  title: string;
  subtitle: string;
  accentHex: string;
  nextRankTitle: string | null;
  winsToNextRank: number;
}

export interface CareerAchievement {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export interface CustomBotConfig {
  slotIndex: number;
  name: string;
  style: BotStyle;
  avatarColor: AvatarColor;
}

const DEFAULT_STATS: PlayerCareerStats = {
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
};

export function computePlayerRank(stats: PlayerCareerStats): PlayerRankInfo {
  const wins = stats.roundsWon;
  if (wins >= 20) {
    return {
      title: 'Lenda Suprema da Zueira',
      subtitle: 'Patente máxima da mesa!',
      accentHex: '#F472B6',
      nextRankTitle: null,
      winsToNextRank: 0,
    };
  }
  if (wins >= 10) {
    return {
      title: 'Terror do +4',
      subtitle: 'Todo mundo treme quando você pega no Coringa',
      accentHex: '#FACC15',
      nextRankTitle: 'Lenda Suprema da Zueira',
      winsToNextRank: 20 - wins,
    };
  }
  if (wins >= 6) {
    return {
      title: 'Mestre do Blefe',
      subtitle: 'Dobra a mesa e lê até pensamento',
      accentHex: '#38BDF8',
      nextRankTitle: 'Terror do +4',
      winsToNextRank: 10 - wins,
    };
  }
  if (wins >= 3) {
    return {
      title: 'Rei do Boteco',
      subtitle: 'Respeitado em toda roda de baralho',
      accentHex: '#F59E0B',
      nextRankTitle: 'Mestre do Blefe',
      winsToNextRank: 6 - wins,
    };
  }
  if (wins >= 1) {
    return {
      title: 'Parceiro de Resenha',
      subtitle: 'Já sentiu o gosto da batida',
      accentHex: '#4ADE80',
      nextRankTitle: 'Rei do Boteco',
      winsToNextRank: 3 - wins,
    };
  }
  return {
    title: 'Novato do Baralho',
    subtitle: 'Vença sua 1ª rodada para subir de patente!',
    accentHex: '#A7F3D0',
    nextRankTitle: 'Parceiro de Resenha',
    winsToNextRank: 1,
  };
}

export function computeCareerAchievements(stats: PlayerCareerStats): CareerAchievement[] {
  const items: Array<Omit<CareerAchievement, 'unlocked'>> = [
    {
      id: 'primeira_batida',
      title: 'Primeira Batida',
      description: 'Vença sua primeira rodada na mesa',
      current: stats.roundsWon,
      target: 1,
    },
    {
      id: 'sequencia_quente',
      title: 'Sequência de Fogo',
      description: 'Emende 3 vitórias seguidas sem perder',
      current: stats.bestWinStreak,
      target: 3,
    },
    {
      id: 'truqueiro_nato',
      title: 'Truqueiro Nato',
      description: 'Vença uma rodada com a mesa dobrada (2x, 4x ou 8x)',
      current: stats.doubledWins,
      target: 1,
    },
    {
      id: 'espelho_magico',
      title: 'Espelho Mágico',
      description: 'Rebata uma bomba de compras com o Escudo Espelho',
      current: stats.shieldsReflected,
      target: 1,
    },
    {
      id: 'detetive_mais4',
      title: 'Detetive do +4',
      description: 'Pegue um rival blefando no desafio DUVIDO!',
      current: stats.bluffsCaught,
      target: 1,
    },
    {
      id: 'terror_mais4',
      title: 'Mão Pesada no +4',
      description: 'Jogue 5 cartas Coringa +4 na carreira',
      current: stats.plusFoursDropped,
      target: 5,
    },
    {
      id: 'rei_resenha',
      title: 'Rei da Resenha',
      description: 'Dispare 5 Cartinhas de Zoeira na cara dos amigos',
      current: stats.tauntsSent,
      target: 5,
    },
    {
      id: 'campeao_torneio',
      title: 'Campeão do Torneio',
      description: 'Conquiste um Campeonato atingindo a meta de pontos',
      current: stats.tournamentsWon,
      target: 1,
    },
  ];

  return items.map((item) => ({
    ...item,
    current: Math.min(item.current, item.target),
    unlocked: item.current >= item.target,
  }));
}

export function getDefaultCustomBots(): CustomBotConfig[] {
  return BOT_ROSTER.map((b, idx) => ({
    slotIndex: idx,
    name: b.name,
    style: b.style,
    avatarColor: b.avatarColor,
  }));
}

export function sanitizeBotName(raw: string, fallbackIndex = 0): string {
  const cleaned = (raw || '').trim().slice(0, 28);
  if (cleaned.length >= 1) return cleaned;
  return BOT_ROSTER[fallbackIndex % BOT_ROSTER.length].name;
}

export function loadCustomBots(): CustomBotConfig[] {
  const defaults = getDefaultCustomBots();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(CUSTOM_BOTS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const allowedStyles: BotStyle[] = ['aggressive', 'trickster', 'calm'];
    return defaults.map((def, idx) => {
      const item = parsed[idx] as Partial<CustomBotConfig> | undefined;
      if (!item) return def;
      return {
        slotIndex: idx,
        name: sanitizeBotName(item.name || '', idx),
        style: item.style && allowedStyles.includes(item.style) ? item.style : def.style,
        avatarColor: def.avatarColor,
      };
    });
  } catch {
    return defaults;
  }
}

export function saveCustomBots(bots: CustomBotConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = bots.slice(0, 5).map((b, idx) => ({
      ...b,
      slotIndex: idx,
      name: sanitizeBotName(b.name, idx),
    }));
    window.localStorage.setItem(CUSTOM_BOTS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore
  }
}

export function loadPlayerStats(): PlayerCareerStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<PlayerCareerStats>;
    return {
      roundsPlayed: Math.max(0, Number(parsed.roundsPlayed) || 0),
      roundsWon: Math.max(0, Number(parsed.roundsWon) || 0),
      bestRoundScore: Math.max(0, Number(parsed.bestRoundScore) || 0),
      plusFoursDropped: Math.max(0, Number(parsed.plusFoursDropped) || 0),
      tauntsSent: Math.max(0, Number(parsed.tauntsSent) || 0),
      currentWinStreak: Math.max(0, Number(parsed.currentWinStreak) || 0),
      bestWinStreak: Math.max(0, Number(parsed.bestWinStreak) || 0),
      shieldsReflected: Math.max(0, Number(parsed.shieldsReflected) || 0),
      bluffsCaught: Math.max(0, Number(parsed.bluffsCaught) || 0),
      doubledWins: Math.max(0, Number(parsed.doubledWins) || 0),
      tournamentsWon: Math.max(0, Number(parsed.tournamentsWon) || 0),
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function updatePlayerStats(
  updater: (prev: PlayerCareerStats) => PlayerCareerStats
): PlayerCareerStats {
  const prev = loadPlayerStats();
  const next = updater(prev);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

export function loadSavedHouseRules(): HouseRulesConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_HOUSE_RULES };
  try {
    const raw = window.localStorage.getItem(HOUSE_RULES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HOUSE_RULES };
    const parsed = JSON.parse(raw) as Partial<HouseRulesConfig>;
    return {
      stackDrawCards:
        typeof parsed.stackDrawCards === 'boolean'
          ? parsed.stackDrawCards
          : DEFAULT_HOUSE_RULES.stackDrawCards,
      allowPlayDrawnCard:
        typeof parsed.allowPlayDrawnCard === 'boolean'
          ? parsed.allowPlayDrawnCard
          : DEFAULT_HOUSE_RULES.allowPlayDrawnCard,
      zeroRotatesHands:
        typeof parsed.zeroRotatesHands === 'boolean'
          ? parsed.zeroRotatesHands
          : DEFAULT_HOUSE_RULES.zeroRotatesHands,
      sevenSwapHands:
        typeof parsed.sevenSwapHands === 'boolean'
          ? parsed.sevenSwapHands
          : DEFAULT_HOUSE_RULES.sevenSwapHands,
      jumpInRule:
        typeof parsed.jumpInRule === 'boolean'
          ? parsed.jumpInRule
          : DEFAULT_HOUSE_RULES.jumpInRule,
      chaosDeck:
        typeof parsed.chaosDeck === 'boolean'
          ? parsed.chaosDeck
          : DEFAULT_HOUSE_RULES.chaosDeck,
      mercyElimination:
        typeof parsed.mercyElimination === 'boolean'
          ? parsed.mercyElimination
          : DEFAULT_HOUSE_RULES.mercyElimination,
      bluffChallengeWild4:
        typeof parsed.bluffChallengeWild4 === 'boolean'
          ? parsed.bluffChallengeWild4
          : DEFAULT_HOUSE_RULES.bluffChallengeWild4,
      comboSameNumber:
        typeof parsed.comboSameNumber === 'boolean'
          ? parsed.comboSameNumber
          : DEFAULT_HOUSE_RULES.comboSameNumber,
      teamMode2v2:
        typeof parsed.teamMode2v2 === 'boolean'
          ? parsed.teamMode2v2
          : DEFAULT_HOUSE_RULES.teamMode2v2,
      turnTimerSeconds:
        typeof parsed.turnTimerSeconds === 'number'
          ? Math.max(0, Math.min(60, parsed.turnTimerSeconds))
          : DEFAULT_HOUSE_RULES.turnTimerSeconds,
      targetScore:
        typeof parsed.targetScore === 'number'
          ? Math.max(0, Math.min(2000, Math.round(parsed.targetScore)))
          : DEFAULT_HOUSE_RULES.targetScore,
    };
  } catch {
    return { ...DEFAULT_HOUSE_RULES };
  }
}

export function saveHouseRules(rules: HouseRulesConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HOUSE_RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Ignore
  }
}
