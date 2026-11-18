import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LogIn, Users, Play, Plus, X, ArrowRight } from 'lucide-react';
import type { OnlineRoomDoc } from '../lib/roomService';
import type { HouseRulesConfig } from '../game/unoRules';

interface MultiplayerModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  authBusy: boolean;
  userRooms: OnlineRoomDoc[];
  houseRules?: HouseRulesConfig;
  initialJoinCode?: string;
  onGoogleLogin: () => Promise<void>;
  onCreateRoom: (params: {
    roomName: string;
    maxPlayers: number;
    botCount: number;
    startImmediately: boolean;
  }) => Promise<void>;
  onJoinByCode: (code: string) => Promise<void>;
  onResumeOnlineRoom: (code: string) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  open,
  onClose,
  user,
  authBusy,
  userRooms,
  houseRules,
  initialJoinCode,
  onGoogleLogin,
  onCreateRoom,
  onJoinByCode,
  onResumeOnlineRoom,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'saved'>(() =>
    initialJoinCode ? 'join' : 'create'
  );
  const [roomName, setRoomName] = useState('Mesa dos Amigos');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botCount, setBotCount] = useState(2);
  const [joinCode, setJoinCode] = useState(() => (initialJoinCode || '').toUpperCase());
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
      setTab('join');
    }
  }, [initialJoinCode]);

  if (!open) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!roomName.trim()) {
      setErrorMsg('Escolha um nome para a sala.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateRoom({
        roomName: roomName.trim(),
        maxPlayers,
        botCount: Math.min(botCount, maxPlayers - 1),
        startImmediately: true,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível criar a sala.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleaned = joinCode.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setErrorMsg('Digite o código de 6 letras/números da sala.');
      return;
    }
    setSubmitting(true);
    try {
      await onJoinByCode(cleaned);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível entrar na sala.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Salas online com amigos"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl border border-amber-400/30 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-amber-300">
              Jogar Online com Amigos
            </h2>
            <p className="mt-0.5 text-xs text-emerald-100/80">
              Tempo real · Histórico de chat salvo · Pause e continue quando quiser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela multiplayer"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!user ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#072818] p-5 text-center">
            <Users className="mx-auto h-10 w-10 text-amber-300" />
            <h3 className="mt-3 font-display text-lg font-bold">
              {initialJoinCode
                ? `Entrar na Sala ${initialJoinCode.toUpperCase()}`
                : 'Entre com sua conta Google'}
            </h3>
            <p className="mt-1 text-sm text-emerald-100/80">
              {initialJoinCode
                ? 'Conecte-se rapidinho com sua conta Google para sentar na mesa do seu amigo!'
                : 'Para sincronizar salas em tempo real com seus amigos, salvar o histórico de mensagens e retomar partidas pausadas em qualquer celular.'}
            </p>
            {errorMsg && (
              <p className="mt-3 text-xs font-semibold text-rose-300">{errorMsg}</p>
            )}
            <button
              type="button"
              disabled={authBusy}
              onClick={async () => {
                setErrorMsg('');
                try {
                  await onGoogleLogin();
                } catch (err) {
                  setErrorMsg(
                    err instanceof Error ? err.message : 'Login cancelado ou bloqueado pelo navegador.'
                  );
                }
              }}
              className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{authBusy ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>
          </div>
        ) : (
          <div className="mt-5">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#072818] p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  setErrorMsg('');
                }}
                className={`min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  tab === 'create'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                Criar Sala
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('join');
                  setErrorMsg('');
                }}
                className={`min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  tab === 'join'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                Usar Código
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('saved');
                  setErrorMsg('');
                }}
                className={`min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  tab === 'saved'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                Minhas Salas ({userRooms.length})
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-xl border border-rose-400/40 bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            {tab === 'create' && (
              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="online-room-name" className="block text-xs font-medium text-emerald-100">
                    Nome da Mesa
                  </label>
                  <input
                    id="online-room-name"
                    type="text"
                    maxLength={50}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#072818] px-3.5 py-2 text-sm text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs font-medium text-emerald-100">
                      Lugares na Mesa (2 a 6)
                    </span>
                    <div className="mt-1.5 flex gap-1">
                      {[2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setMaxPlayers(n);
                            if (botCount >= n) setBotCount(n - 1);
                          }}
                          className={`min-h-[40px] flex-1 rounded-lg font-mono-num text-xs font-bold transition ${
                            maxPlayers === n
                              ? 'bg-amber-400 text-zinc-950'
                              : 'bg-[#072818] text-emerald-100 hover:bg-[#0E442A]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-emerald-100">
                      Jogadores IA extras
                    </span>
                    <div className="mt-1.5 flex gap-1">
                      {[0, 1, 2, 3].map((b) => {
                        const disabled = b >= maxPlayers;
                        return (
                          <button
                            key={b}
                            type="button"
                            disabled={disabled}
                            onClick={() => setBotCount(b)}
                            className={`min-h-[40px] flex-1 rounded-lg font-mono-num text-xs font-bold transition disabled:opacity-30 ${
                              botCount === b
                                ? 'bg-emerald-400 text-zinc-950'
                                : 'bg-[#072818] text-emerald-100 hover:bg-[#0E442A]'
                            }`}
                          >
                            +{b}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-200/70">
                      Amigos que entrarem assumem vaga na mesa!
                    </p>
                  </div>
                </div>

                {houseRules && (
                  <div className="rounded-xl border border-white/10 bg-[#072818] px-3.5 py-2 text-xs text-emerald-100/85">
                    <span className="font-semibold text-amber-300">Regras ativas: </span>
                    <span>
                      {[
                        houseRules.chaosDeck && 'Modo Caos',
                        houseRules.jumpInRule && 'Corte Igual',
                        houseRules.bluffChallengeWild4 && 'Duvido +4',
                        houseRules.teamMode2v2 && 'Duplas 2x2',
                        houseRules.targetScore && houseRules.targetScore > 0
                          ? `Torneio ${houseRules.targetScore} pts`
                          : 'Placar Livre',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{submitting ? 'Criando Mesa...' : 'Criar Sala Ao Vivo'}</span>
                </button>
              </form>
            )}

            {tab === 'join' && (
              <form onSubmit={handleJoin} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="join-room-code" className="block text-xs font-medium text-emerald-100">
                    Código de 6 caracteres do seu amigo
                  </label>
                  <input
                    id="join-room-code"
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="EX: MESA42"
                    className="mt-1 min-h-[48px] w-full rounded-xl border border-white/15 bg-[#072818] px-4 py-2.5 text-center font-mono-num text-lg font-bold tracking-widest text-amber-300 uppercase placeholder:text-emerald-200/35 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>{submitting ? 'Entrando...' : 'Entrar na Sala'}</span>
                </button>
              </form>
            )}

            {tab === 'saved' && (
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {userRooms.length === 0 ? (
                  <p className="rounded-2xl bg-[#072818] p-4 text-center text-xs text-emerald-100/75">
                    Você ainda não tem salas online salvas. Crie uma sala e convide seus amigos!
                  </p>
                ) : (
                  userRooms.map((rm) => (
                    <button
                      key={rm.code}
                      type="button"
                      onClick={() => onResumeOnlineRoom(rm.code)}
                      className="flex min-h-[60px] w-full items-center justify-between rounded-2xl border border-white/10 bg-[#072818] px-4 py-3 text-left transition hover:border-amber-300/50 hover:bg-[#0D4128]"
                    >
                      <div>
                        <div className="font-display text-sm font-bold text-white">
                          {rm.roomName}
                        </div>
                        <div className="mt-0.5 text-xs text-emerald-200/75">
                          Código <span className="font-mono-num font-bold text-amber-300">{rm.code}</span>
                          <span> · </span>
                          <span>Rodada {rm.roundNumber}</span>
                          <span> · </span>
                          <span>{rm.status === 'paused' ? 'Pausada' : 'Em andamento'}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 whitespace-nowrap">
                        <Play className="h-3.5 w-3.5" />
                        Continuar
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
