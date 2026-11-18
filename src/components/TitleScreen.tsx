import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bot,
  Check,
  Lock,
  LogIn,
  LogOut,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import type { BotStyle, HouseRulesConfig } from '../game/unoRules';
import {
  CARD_BACKS,
  TABLE_THEMES,
  type AppearancePrefs,
  type CardBackId,
  type TableThemeId,
} from '../game/themes';
import {
  computeCareerAchievements,
  computePlayerRank,
  getDefaultCustomBots,
  type CustomBotConfig,
  type PlayerCareerStats,
} from '../lib/playerStats';
import { CareerTrophiesModal } from './CareerTrophiesModal';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  playerName: string;
  onChangePlayerName: (name: string) => void;
  totalSeats: number;
  onChangeTotalSeats: (count: number) => void;
  customBots: CustomBotConfig[];
  onChangeCustomBots: (bots: CustomBotConfig[]) => void;
  houseRules: HouseRulesConfig;
  onChangeHouseRules: (next: HouseRulesConfig) => void;
  appearance: AppearancePrefs;
  onChangeAppearance: (next: AppearancePrefs) => void;
  careerStats: PlayerCareerStats;
  unlockedSpecialCount: number;
  user: User | null;
  authBusy: boolean;
  isOnlineNetwork: boolean;
  muted: boolean;
  vibrationEnabled: boolean;
  hasSavedMatch: boolean;
  savedMatchLabel: string;
  onlineRoomsCount: number;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onToggleMute: () => void;
  onToggleVibration: () => void;
  onStartQuickMatch: () => void;
  onResumeSavedMatch: () => void;
  onOpenMultiplayer: () => void;
}

const BOT_STYLE_LABELS: Array<{ style: BotStyle; label: string }> = [
  { style: 'aggressive', label: 'Agressivo' },
  { style: 'trickster', label: 'Malandro' },
  { style: 'calm', label: 'Zen' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  onChangePlayerName,
  totalSeats,
  onChangeTotalSeats,
  customBots,
  onChangeCustomBots,
  houseRules,
  onChangeHouseRules,
  appearance,
  onChangeAppearance,
  careerStats,
  unlockedSpecialCount,
  user,
  authBusy,
  isOnlineNetwork,
  muted,
  vibrationEnabled,
  hasSavedMatch,
  savedMatchLabel,
  onlineRoomsCount,
  onGoogleLogin,
  onGoogleLogout,
  onToggleMute,
  onToggleVibration,
  onStartQuickMatch,
  onResumeSavedMatch,
  onOpenMultiplayer,
}) => {
  const [bgFailed, setBgFailed] = useState(false);
  const [botEditorOpen, setBotEditorOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [trophiesModalOpen, setTrophiesModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');

  const playerRank = computePlayerRank(careerStats);
  const unlockedMedalsCount = computeCareerAchievements(careerStats).filter(
    (a) => a.unlocked
  ).length;

  const activeBotPreview = customBots
    .slice(0, Math.max(1, totalSeats - 1))
    .map((b) => b.name)
    .join(', ');

  const handleSelectSeatCount = (n: number) => {
    onChangeTotalSeats(n);
    if (n !== 4 && houseRules.teamMode2v2) {
      onChangeHouseRules({ ...houseRules, teamMode2v2: false });
    }
  };

  const handleToggle2v2 = () => {
    const next2v2 = !houseRules.teamMode2v2;
    if (next2v2 && totalSeats !== 4) {
      onChangeTotalSeats(4);
    }
    onChangeHouseRules({ ...houseRules, teamMode2v2: next2v2 });
  };

  return (
    <main className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden bg-[#072818] text-[#FFFDF9]">
      {/* Illustrated Key-Art Backdrop with Resilient Felt Fallback */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!bgFailed && (
          <img
            src="/src/assets/images/title_table_bg_1795035833606.jpg"
            alt="Mesa de feltro verde com baralho colorido"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="h-full w-full object-cover object-right-bottom opacity-85"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(5, 30, 18, 0.96) 0%, rgba(7, 40, 24, 0.88) 48%, rgba(7, 40, 24, 0.35) 100%)',
          }}
        />
      </div>

      {/* Main Content Split: Asymmetric Left Negative Space for Emblem & Controls */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-5 sm:px-10 lg:px-14">
        <div className="max-w-xl">
          {/* Bespoke Inline SVG Title Emblem */}
          <div className="mb-3.5">
            <svg
              viewBox="0 0 430 96"
              className="h-15 w-auto max-w-full sm:h-19 drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)]"
              role="img"
              aria-label="UnoZueira"
            >
              <g transform="translate(56, 50)">
                <g transform="rotate(-22) translate(-18, -4)">
                  <rect x="-22" y="-34" width="44" height="68" rx="9" fill="#FFFDF9" stroke="#18181B" strokeWidth="3" />
                  <rect x="-17" y="-29" width="34" height="58" rx="6" fill="#0284C7" />
                  <text x="0" y="7" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="19">+2</text>
                </g>
                <g transform="rotate(0) translate(0, -10)">
                  <rect x="-24" y="-36" width="48" height="72" rx="10" fill="#FFFDF9" stroke="#18181B" strokeWidth="3" />
                  <rect x="-19" y="-31" width="38" height="62" rx="7" fill="#E11D48" />
                  <ellipse cx="0" cy="0" rx="14" ry="22" transform="rotate(20)" fill="#FACC15" />
                  <text x="0" y="7" textAnchor="middle" fill="#18181B" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="20">U!</text>
                </g>
                <g transform="rotate(22) translate(18, -2)">
                  <rect x="-22" y="-34" width="44" height="68" rx="9" fill="#FFFDF9" stroke="#18181B" strokeWidth="3" />
                  <rect x="-17" y="-29" width="34" height="58" rx="6" fill="#16A34A" />
                  <text x="0" y="7" textAnchor="middle" fill="#FFFDF9" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="19">+4</text>
                </g>
              </g>

              <text
                x="124"
                y="66"
                fontFamily="Fredoka, sans-serif"
                fontWeight="700"
                fontSize="58"
                fill="#FFFDF9"
                stroke="#18181B"
                strokeWidth="7"
                paintOrder="stroke fill"
              >
                Uno
                <tspan fill="#FACC15">Zueira</tspan>
              </text>
            </svg>
            <p className="mt-0.5 text-sm sm:text-base font-semibold tracking-wide text-emerald-200/95">
              Modo Caos · Truco Dobrado · Torneios · Cartinhas de Zoeira
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-emerald-100/80">
              <span>
                Patente <strong className="text-amber-300">{playerRank.title}</strong>
                {' · '}Vitórias <span className="font-mono-num font-bold text-amber-300">{careerStats.roundsWon}</span>
                {' · '}Especiais <span className="font-mono-num font-bold text-amber-300">{unlockedSpecialCount}/4</span>
              </span>
              <button
                type="button"
                onClick={() => setTrophiesModalOpen(true)}
                className="inline-flex items-center gap-1 font-bold text-amber-300 underline-offset-2 hover:underline whitespace-nowrap"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>Troféus &amp; Patente ({unlockedMedalsCount}/8)</span>
              </button>
            </div>
          </div>

          {/* Setup Card */}
          <div className="rounded-3xl border border-white/12 bg-[#09321E]/94 p-4 sm:p-5 shadow-2xl">
            {/* Direct Google Login / Connected Online Bar */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3">
              {user ? (
                <>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-300 truncate">
                      Conectado: {user.displayName || user.email}
                    </div>
                    <div className="text-[11px] text-emerald-100/75">
                      Pronto para criar ou retomar salas online com amigos
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onOpenMultiplayer}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 whitespace-nowrap"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        Salas Online{onlineRoomsCount > 0 ? ` (${onlineRoomsCount})` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoogleLogout()}
                      aria-label="Sair da conta Google"
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/15 bg-[#062114] px-2.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-[#0D4128]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">
                      {isOnlineNetwork
                        ? 'Quer jogar online com amigos?'
                        : 'Sem conexão — Modo Offline ativo'}
                    </div>
                    <div className="text-[11px] text-emerald-100/75">
                      {isOnlineNetwork
                        ? 'Entre com Google para criar salas ao vivo ou jogue offline abaixo'
                        : 'Você pode jogar offline contra as IAs normalmente sem internet!'}
                    </div>
                    {loginError && (
                      <div className="mt-1 text-[11px] font-semibold text-rose-300">
                        {loginError}
                      </div>
                    )}
                  </div>

                  {isOnlineNetwork ? (
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={async () => {
                        setLoginError('');
                        try {
                          await onGoogleLogin();
                          onOpenMultiplayer();
                        } catch (err) {
                          setLoginError(
                            err instanceof Error
                              ? err.message
                              : 'Login cancelado ou bloqueado pelo navegador.'
                          );
                        }
                      }}
                      className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-amber-300/50 bg-[#124B30] px-3.5 py-2 text-xs font-bold text-[#FFFDF9] shadow-sm transition hover:bg-[#175C3B] disabled:opacity-50 whitespace-nowrap"
                    >
                      <LogIn className="h-4 w-4 text-amber-300" />
                      <span>{authBusy ? 'Conectando...' : 'Entrar com Google'}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                      <WifiOff className="h-3.5 w-3.5" />
                      <span>Offline</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Nickname + Seats + Customize AI Names */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="player-nickname-input"
                  className="block text-xs font-semibold text-emerald-100/90"
                >
                  Seu Apelido na Mesa
                </label>
                <input
                  id="player-nickname-input"
                  type="text"
                  maxLength={28}
                  value={playerName}
                  onChange={(e) => onChangePlayerName(e.target.value)}
                  placeholder="Ex: Felipe"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#062114] px-3.5 py-2 text-sm font-semibold text-white placeholder:text-emerald-200/40 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-100/90">
                    Mesa Offline (Você + IA)
                  </span>
                  <button
                    type="button"
                    onClick={() => setBotEditorOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 underline-offset-2 hover:underline whitespace-nowrap"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>Nomes das IAs</span>
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1.5" role="group" aria-label="Quantidade de jogadores">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSelectSeatCount(n)}
                      aria-label={`${n} jogadores`}
                      className={`min-h-[44px] flex-1 rounded-xl font-mono-num text-sm font-bold transition ${
                        totalSeats === n
                          ? 'bg-amber-400 text-zinc-950 shadow-sm'
                          : 'bg-[#062114] text-emerald-100 hover:bg-[#0D4128]'
                      }`}
                    >
                      {n}P
                    </button>
                  ))}
                </div>
                <p className="mt-1 truncate text-[11px] text-emerald-200/75" title={activeBotPreview}>
                  Adversários: {activeBotPreview}
                </p>
              </div>
            </div>

            {/* Modos & Regras da Casa Quick Toggles + Full Modal Trigger */}
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-100/90">
                  Modos &amp; Regras Especiais
                </span>
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 underline-offset-2 hover:underline whitespace-nowrap"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Todas as Regras &amp; Mesas</span>
                </button>
              </div>

              <div
                className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
                role="group"
                aria-label="Modos especiais rápidos"
              >
                <button
                  type="button"
                  aria-pressed={Boolean(houseRules.chaosDeck)}
                  onClick={() =>
                    onChangeHouseRules({
                      ...houseRules,
                      chaosDeck: !houseRules.chaosDeck,
                    })
                  }
                  className={`flex min-h-[40px] items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    houseRules.chaosDeck
                      ? 'border-amber-300/60 bg-[#134E32] text-amber-200'
                      : 'border-white/10 bg-[#062114] text-emerald-100/70 hover:bg-[#0B3621]'
                  }`}
                >
                  <span className="truncate">Modo Caos</span>
                  <span className="ml-1 font-mono-num font-bold">
                    {houseRules.chaosDeck ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={Boolean(houseRules.jumpInRule)}
                  onClick={() =>
                    onChangeHouseRules({
                      ...houseRules,
                      jumpInRule: !houseRules.jumpInRule,
                    })
                  }
                  className={`flex min-h-[40px] items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    houseRules.jumpInRule
                      ? 'border-amber-300/60 bg-[#134E32] text-amber-200'
                      : 'border-white/10 bg-[#062114] text-emerald-100/70 hover:bg-[#0B3621]'
                  }`}
                >
                  <span className="truncate">Corte Igual</span>
                  <span className="ml-1 font-mono-num font-bold">
                    {houseRules.jumpInRule ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={Boolean(houseRules.bluffChallengeWild4)}
                  onClick={() =>
                    onChangeHouseRules({
                      ...houseRules,
                      bluffChallengeWild4: !houseRules.bluffChallengeWild4,
                    })
                  }
                  className={`flex min-h-[40px] items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    houseRules.bluffChallengeWild4
                      ? 'border-amber-300/60 bg-[#134E32] text-amber-200'
                      : 'border-white/10 bg-[#062114] text-emerald-100/70 hover:bg-[#0B3621]'
                  }`}
                >
                  <span className="truncate">Duvido +4</span>
                  <span className="ml-1 font-mono-num font-bold">
                    {houseRules.bluffChallengeWild4 ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={Boolean(houseRules.teamMode2v2)}
                  onClick={handleToggle2v2}
                  className={`flex min-h-[40px] items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    houseRules.teamMode2v2
                      ? 'border-amber-300/60 bg-[#134E32] text-amber-200'
                      : 'border-white/10 bg-[#062114] text-emerald-100/70 hover:bg-[#0B3621]'
                  }`}
                >
                  <span className="truncate">Duplas 2x2</span>
                  <span className="ml-1 font-mono-num font-bold">
                    {houseRules.teamMode2v2 ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Meta do Campeonato (Tournament Target Score) */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-100/90">
                  Meta do Campeonato:
                </span>
                <div
                  className="flex flex-1 sm:flex-initial gap-1.5"
                  role="group"
                  aria-label="Meta de pontos do campeonato"
                >
                  {[
                    { pts: 0, label: 'Livre' },
                    { pts: 150, label: '150 pts' },
                    { pts: 300, label: '300 pts' },
                    { pts: 500, label: '500 pts' },
                  ].map((opt) => {
                    const active = (houseRules.targetScore || 0) === opt.pts;
                    return (
                      <button
                        key={opt.pts}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          onChangeHouseRules({ ...houseRules, targetScore: opt.pts })
                        }
                        className={`min-h-[36px] flex-1 sm:flex-initial rounded-xl px-2.5 py-1 font-mono-num text-xs font-bold transition whitespace-nowrap ${
                          active
                            ? 'bg-amber-400 text-zinc-950 shadow-xs'
                            : 'border border-white/10 bg-[#062114] text-emerald-100/80 hover:bg-[#0D4128]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Actions: Offline vs Online */}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartQuickMatch();
                }}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-2xl bg-amber-400 px-5 py-3 font-display text-lg font-bold text-zinc-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98] whitespace-nowrap"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>
                  {houseRules.teamMode2v2 && totalSeats === 4
                    ? 'Jogar Duplas 2x2 (Offline)'
                    : `Jogar Offline (${totalSeats}P)`}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenMultiplayer}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-amber-300/45 bg-[#124B30] px-5 py-3 text-sm font-bold text-[#FFFDF9] shadow-md transition hover:bg-[#175C3B] whitespace-nowrap"
              >
                <Users className="h-4 w-4 text-amber-300" />
                <span>
                  Jogar Online{onlineRoomsCount > 0 ? ` (${onlineRoomsCount})` : ''}
                </span>
              </button>
            </div>

            {/* Resume Saved / Paused Offline Match CTA */}
            {hasSavedMatch && (
              <button
                type="button"
                onClick={onResumeSavedMatch}
                className="mt-2.5 flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-emerald-300/35 bg-[#062114] px-4 py-2 text-left text-xs font-semibold text-emerald-100 transition hover:border-amber-300/60 hover:bg-[#0B3621]"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <RotateCcw className="h-4 w-4 shrink-0 text-amber-300" />
                  <span className="truncate">Continuar partida salva · {savedMatchLabel}</span>
                </span>
                <span className="ml-2 font-bold text-amber-300 whitespace-nowrap">Retomar</span>
              </button>
            )}

            {/* Audio, Mobile Vibration & PWA Install Controls */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={!muted}
                  onClick={onToggleMute}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    !muted
                      ? 'border-emerald-300/35 bg-[#0D3D25] text-emerald-100'
                      : 'border-white/10 bg-[#062114] text-rose-200'
                  }`}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-amber-300" />}
                  <span>Som: {muted ? 'OFF' : 'ON'}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={vibrationEnabled}
                  onClick={onToggleVibration}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    vibrationEnabled
                      ? 'border-emerald-300/35 bg-[#0D3D25] text-emerald-100'
                      : 'border-white/10 bg-[#062114] text-emerald-100/60'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 text-amber-300" />
                  <span>Vibração: {vibrationEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <PWAInstallButton compact />
            </div>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control-Hint Line in Bottom Safe Margin */}
      <div className="relative z-10 px-6 pb-4 sm:px-10 lg:px-14">
        <p className="text-xs text-emerald-100/75">
          Toque ou 1–9 Jogar · D Dobrar Mesa · Espaço Comprar · S Ordenar · U Gritar UNO · C Chat · P Pausar
        </p>
      </div>

      {/* Full Rules, Turn Timer & Unlockable Table/Card Appearance Modal */}
      {rulesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Regras especiais e visual da mesa"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-5 text-[#FFFDF9] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-amber-300">
                  Regras do Jogo &amp; Mesas Desbloqueáveis
                </h2>
                <p className="text-xs text-emerald-100/80">
                  Combine mecânicas de No Mercy, Flip, Truco e desbloqueie visuais vencendo!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                aria-label="Fechar regras e mesas"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {/* Complete House Rules Grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                {
                  key: 'chaosDeck' as const,
                  title: 'Modo Caos (Escudo, Flip e Raio-X)',
                  desc: 'Adiciona Escudo Espelho, Virada Sombria (+5) e Raio-X',
                },
                {
                  key: 'jumpInRule' as const,
                  title: 'Corte na Frente (Jump-In)',
                  desc: 'Jogue fora de hora se tiver carta idêntica (cor + valor)',
                },
                {
                  key: 'bluffChallengeWild4' as const,
                  title: 'Desafio "DUVIDO!" no +4',
                  desc: 'Desafie blefes no +4 (blefou +4 / honesto +6)',
                },
                {
                  key: 'comboSameNumber' as const,
                  title: 'Combo de Número Igual',
                  desc: 'Descarte 2+ cartas do mesmo número de uma vez só',
                },
                {
                  key: 'sevenSwapHands' as const,
                  title: 'Carta 7 Troca de Mão',
                  desc: 'Ao jogar um 7, escolha um rival para trocar as cartas',
                },
                {
                  key: 'zeroRotatesHands' as const,
                  title: 'Carta 0 Gira Todas as Mãos',
                  desc: 'Todo mundo passa a mão para o lado no sentido do jogo',
                },
                {
                  key: 'mercyElimination' as const,
                  title: 'Regra da Piedade (25+ Elimina)',
                  desc: 'Quem acumular 25 cartas ou mais explode da rodada',
                },
                {
                  key: 'stackDrawCards' as const,
                  title: 'Empilhar Bombas (+2 / +4 / +5)',
                  desc: 'Rebata +2/+4/+5 passando o acúmulo adiante',
                },
                {
                  key: 'allowPlayDrawnCard' as const,
                  title: 'Jogar Carta Comprada',
                  desc: 'Permite baixar na hora a carta comprada se servir',
                },
              ].map((item) => {
                const active = Boolean(houseRules[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChangeHouseRules({ ...houseRules, [item.key]: !active })
                    }
                    className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-amber-300/60 bg-[#134E32]'
                        : 'border-white/10 bg-[#072818] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span
                        className={`font-mono-num text-xs font-bold ${
                          active ? 'text-amber-300' : 'text-emerald-200/60'
                        }`}
                      >
                        {active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] text-emerald-100/75">{item.desc}</span>
                  </button>
                );
              })}

              {/* 2v2 Duos Mode */}
              <button
                type="button"
                aria-pressed={Boolean(houseRules.teamMode2v2)}
                onClick={handleToggle2v2}
                className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                  houseRules.teamMode2v2
                    ? 'border-amber-300/60 bg-[#134E32]'
                    : 'border-white/10 bg-[#072818] opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">Modo Duplas 2x2 (4P)</span>
                  <span
                    className={`font-mono-num text-xs font-bold ${
                      houseRules.teamMode2v2 ? 'text-amber-300' : 'text-emerald-200/60'
                    }`}
                  >
                    {houseRules.teamMode2v2 ? 'ON' : 'OFF'}
                  </span>
                </div>
                <span className="mt-1 text-[11px] text-emerald-100/75">
                  Parceiro sentado de frente, sinais secretos e vitória conjunta
                </span>
              </button>
            </div>

            {/* Turn Timer ("Pavio Curto") & Tournament Target */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#072818] p-3.5">
                <div className="text-xs font-bold text-amber-300">
                  Relógio de Turno (&ldquo;Pavio Curto&rdquo;)
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[
                    { sec: 0, label: 'Livre' },
                    { sec: 20, label: '20s' },
                    { sec: 12, label: '12s' },
                  ].map((opt) => {
                    const selected = (houseRules.turnTimerSeconds || 0) === opt.sec;
                    return (
                      <button
                        key={opt.sec}
                        type="button"
                        onClick={() =>
                          onChangeHouseRules({ ...houseRules, turnTimerSeconds: opt.sec })
                        }
                        className={`min-h-[38px] flex-1 rounded-xl text-xs font-bold transition ${
                          selected
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#072818] p-3.5">
                <div className="text-xs font-bold text-amber-300">
                  Meta do Campeonato (Torneio)
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[
                    { pts: 0, label: 'Livre' },
                    { pts: 150, label: '150' },
                    { pts: 300, label: '300' },
                    { pts: 500, label: '500' },
                  ].map((opt) => {
                    const selected = (houseRules.targetScore || 0) === opt.pts;
                    return (
                      <button
                        key={opt.pts}
                        type="button"
                        onClick={() =>
                          onChangeHouseRules({ ...houseRules, targetScore: opt.pts })
                        }
                        className={`min-h-[38px] flex-1 rounded-xl font-mono-num text-xs font-bold transition ${
                          selected
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Unlockable Table Themes & Card Backs */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#072818] p-3.5">
              <div className="text-xs font-bold text-amber-300">
                Panos de Mesa &amp; Versos ({careerStats.roundsWon} vitórias)
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TABLE_THEMES.map((th) => {
                  const unlocked = careerStats.roundsWon >= th.unlockWinsRequired;
                  const selected = appearance.tableTheme === th.id && unlocked;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() =>
                        onChangeAppearance({
                          ...appearance,
                          tableTheme: th.id as TableThemeId,
                        })
                      }
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        selected
                          ? 'border-amber-300 bg-[#145334] text-amber-200'
                          : unlocked
                            ? 'border-white/10 bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                            : 'border-white/5 bg-black/25 text-emerald-200/40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/40"
                          style={{ backgroundColor: th.swatchHex }}
                        />
                        <span className="truncate">{th.name}</span>
                      </div>
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

              <div className="mt-2.5 flex gap-2">
                {CARD_BACKS.map((cb) => {
                  const unlocked = careerStats.roundsWon >= cb.unlockWinsRequired;
                  const selected = appearance.cardBack === cb.id && unlocked;
                  return (
                    <button
                      key={cb.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() =>
                        onChangeAppearance({ ...appearance, cardBack: cb.id as CardBackId })
                      }
                      className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'border-amber-300 bg-[#145334] text-amber-200'
                          : unlocked
                            ? 'border-white/10 bg-[#051C11] text-emerald-100 hover:bg-[#0D3D25]'
                            : 'border-white/5 bg-black/25 text-emerald-200/40 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/40"
                        style={{ backgroundColor: cb.swatchHex }}
                      />
                      <span className="truncate">{cb.name}</span>
                      {!unlocked && (
                        <span className="font-mono-num text-[10px]">({cb.unlockWinsRequired}V)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>

            <button
              type="button"
              onClick={() => setRulesModalOpen(false)}
              className="mt-3 min-h-[46px] w-full shrink-0 rounded-2xl bg-amber-400 px-5 py-2.5 font-display text-sm font-bold text-zinc-950 shadow-lg hover:bg-amber-300"
            >
              Confirmar Regras &amp; Visual
            </button>
          </div>
        </div>
      )}

      {/* Custom AI Bot Names & Styles Modal */}
      {botEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Personalizar nomes dos jogadores IA"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-5 text-[#FFFDF9] shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-amber-300">
                  Escolher Nomes das IAs
                </h2>
                <p className="text-xs text-emerald-100/80">
                  Coloque o nome dos amigos pra deixar a zoeira ainda melhor!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBotEditorOpen(false)}
                aria-label="Fechar configuração das IAs"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {customBots.map((bot, idx) => (
                <div
                  key={bot.slotIndex}
                  className="rounded-2xl border border-white/10 bg-[#072818] p-3"
                >
                  <label
                    htmlFor={`bot-name-input-${idx}`}
                    className="block text-xs font-semibold text-amber-300"
                  >
                    Jogador IA #{idx + 1}
                  </label>
                  <input
                    id={`bot-name-input-${idx}`}
                    type="text"
                    maxLength={28}
                    value={bot.name}
                    onChange={(e) => {
                      const next = customBots.map((b, i) =>
                        i === idx ? { ...b, name: e.target.value } : b
                      );
                      onChangeCustomBots(next);
                    }}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-white/15 bg-[#051C11] px-3 py-1.5 text-sm font-semibold text-white focus:border-amber-300 focus:outline-none"
                  />
                  <div className="mt-2 flex gap-1.5">
                    {BOT_STYLE_LABELS.map((st) => (
                      <button
                        key={st.style}
                        type="button"
                        onClick={() => {
                          const next = customBots.map((b, i) =>
                            i === idx ? { ...b, style: st.style } : b
                          );
                          onChangeCustomBots(next);
                        }}
                        className={`min-h-[34px] flex-1 rounded-lg text-[11px] font-semibold transition ${
                          bot.style === st.style
                            ? 'bg-amber-400 text-zinc-950 font-bold'
                            : 'bg-[#0A3520] text-emerald-100/80 hover:bg-[#114B2F]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onChangeCustomBots(getDefaultCustomBots())}
                className="min-h-[44px] rounded-xl border border-white/15 bg-[#072818] px-3.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-[#0D4128]"
              >
                Restaurar Padrão
              </button>
              <button
                type="button"
                onClick={() => setBotEditorOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-amber-400 px-4 py-2 font-display text-sm font-bold text-zinc-950 hover:bg-amber-300"
              >
                Salvar Nomes das IAs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Career Trophies, Rank & Achievements Modal */}
      <CareerTrophiesModal
        open={trophiesModalOpen}
        onClose={() => setTrophiesModalOpen(false)}
        careerStats={careerStats}
        unlockedSpecialCount={unlockedSpecialCount}
      />
    </main>
  );
};
