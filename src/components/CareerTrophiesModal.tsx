import React from 'react';
import { Award, Check, Lock, Trophy, X } from 'lucide-react';
import {
  computeCareerAchievements,
  computePlayerRank,
  type PlayerCareerStats,
} from '../lib/playerStats';

interface CareerTrophiesModalProps {
  open: boolean;
  onClose: () => void;
  careerStats: PlayerCareerStats;
  unlockedSpecialCount: number;
}

export const CareerTrophiesModal: React.FC<CareerTrophiesModalProps> = ({
  open,
  onClose,
  careerStats,
  unlockedSpecialCount,
}) => {
  if (!open) return null;

  const rank = computePlayerRank(careerStats);
  const achievements = computeCareerAchievements(careerStats);
  const unlockedMedalsCount = achievements.filter((a) => a.unlocked).length;
  const winRate =
    careerStats.roundsPlayed > 0
      ? Math.round((careerStats.roundsWon / careerStats.roundsPlayed) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sala de troféus, patente e conquistas"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-400/40 bg-[#0B3B24] p-5 text-[#FFFDF9] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-amber-300 truncate">
                Sala de Troféus &amp; Patente
              </h2>
              <p className="text-xs text-emerald-100/80">
                Sua carreira na mesa · {unlockedMedalsCount}/{achievements.length} medalhas conquistadas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sala de troféus"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3.5 flex-1 overflow-y-auto pr-1">
          {/* Current Rank Banner */}
          <div className="rounded-2xl border border-amber-300/35 bg-[#072818] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-emerald-200/75">
                  Patente Atual
                </div>
                <div
                  className="mt-0.5 font-display text-xl font-bold"
                  style={{ color: rank.accentHex }}
                >
                  {rank.title}
                </div>
                <p className="mt-0.5 text-xs text-emerald-100/80">{rank.subtitle}</p>
              </div>

              <div className="text-right">
                <div className="font-mono-num text-2xl font-bold text-amber-300">
                  {careerStats.roundsWon}V
                </div>
                <div className="text-[11px] text-emerald-200/75">
                  {rank.nextRankTitle
                    ? `Faltam ${rank.winsToNextRank}V p/ ${rank.nextRankTitle}`
                    : 'Patente Máxima!'}
                </div>
              </div>
            </div>
          </div>

          {/* 6 Tabular Career Stat Tiles */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Partidas</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-white">
                {careerStats.roundsPlayed}
              </div>
            </div>
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Taxa Vitória</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-amber-300">
                {winRate}%
              </div>
            </div>
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Recorde Seq.</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-emerald-300">
                {careerStats.bestWinStreak}
              </div>
            </div>
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Maior Batida</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-amber-300">
                {careerStats.bestRoundScore} pts
              </div>
            </div>
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Torneios</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-amber-300">
                {careerStats.tournamentsWon}
              </div>
            </div>
            <div className="rounded-2xl bg-[#072818] p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-200/75">Cartas Raras</div>
              <div className="mt-0.5 font-mono-num text-lg font-bold text-fuchsia-300">
                {unlockedSpecialCount}/4
              </div>
            </div>
          </div>

          {/* 8 Career Medals / Achievements */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-amber-300">
              <span>Conquistas da Mesa</span>
              <span className="font-mono-num text-emerald-200">
                {unlockedMedalsCount}/{achievements.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {achievements.map((ach) => {
                const pct = Math.max(
                  0,
                  Math.min(100, Math.round((ach.current / ach.target) * 100))
                );
                return (
                  <div
                    key={ach.id}
                    className={`rounded-2xl border p-3 transition ${
                      ach.unlocked
                        ? 'border-amber-300/55 bg-[#124B2F]'
                        : 'border-white/10 bg-[#072818]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Award
                          className={`h-4 w-4 shrink-0 ${
                            ach.unlocked ? 'text-amber-300' : 'text-emerald-200/45'
                          }`}
                        />
                        <span className="truncate text-xs font-bold text-white">
                          {ach.title}
                        </span>
                      </div>
                      {ach.unlocked ? (
                        <Check className="h-4 w-4 shrink-0 text-amber-300" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-200/40" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-emerald-100/80">
                      {ach.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ach.unlocked ? 'bg-amber-400' : 'bg-emerald-400/60'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono-num text-[10px] font-bold text-amber-200">
                        {ach.current}/{ach.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-[46px] w-full shrink-0 rounded-2xl bg-amber-400 px-5 py-2.5 font-display text-sm font-bold text-zinc-950 shadow-lg hover:bg-amber-300"
        >
          Voltar para a Mesa
        </button>
      </div>
    </div>
  );
};
