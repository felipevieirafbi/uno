import React, { useEffect, useRef, useState } from 'react';
import { Lock, MessageCircle, Pencil, Plus, Send, Smile, Trophy, X } from 'lucide-react';
import {
  isStickerUnlocked,
  type CustomStickerEditPatch,
  type ZueiraSticker,
} from '../game/stickers';
import { getLanternaSeat, type PlayerSeat } from '../game/unoRules';
import type { ChatMessageItem } from '../lib/roomService';
import {
  StickerStudioModal,
  ZueiraCardArt,
  resolveStickerFromEvent,
} from './ZueiraCardArt';

export const StickerThumb: React.FC<{ sticker: ZueiraSticker; sizeClass?: string }> = ({
  sticker,
}) => <ZueiraCardArt sticker={sticker} size="sm" />;

interface ChatAndStickersDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessageItem[];
  seats: PlayerSeat[];
  currentPlayerId: string;
  roundsWon: number;
  stickersCatalog: ZueiraSticker[];
  onSendText: (text: string) => void;
  onSendSticker: (sticker: ZueiraSticker, targetName: string) => void;
  onSaveStickerCustomization: (
    patch: CustomStickerEditPatch,
    existingSticker: ZueiraSticker | null
  ) => void;
  onResetBaseSticker: (stickerId: string) => void;
  onDeleteCustomSticker: (stickerId: string) => void;
}

export const ChatAndStickersDrawer: React.FC<ChatAndStickersDrawerProps> = ({
  open,
  onClose,
  messages,
  seats,
  currentPlayerId,
  roundsWon,
  stickersCatalog,
  onSendText,
  onSendSticker,
  onSaveStickerCustomization,
  onResetBaseSticker,
  onDeleteCustomSticker,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'chat'>('stickers');
  const [draft, setDraft] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);
  const [editingSticker, setEditingSticker] = useState<ZueiraSticker | null>(null);

  const lanterna = getLanternaSeat(seats);
  const opponents = seats.filter((s) => s.id !== currentPlayerId);
  const defaultTarget =
    (lanterna && lanterna.id !== currentPlayerId ? lanterna.name : opponents[0]?.name) || '';
  const [selectedTarget, setSelectedTarget] = useState<string>(defaultTarget);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stillSeated = opponents.some((o) => o.name === selectedTarget);
    if (!stillSeated) {
      setSelectedTarget(defaultTarget);
    } else if (!open && lanterna && lanterna.id !== currentPlayerId) {
      setSelectedTarget(lanterna.name);
    }
  }, [lanterna, currentPlayerId, opponents, selectedTarget, defaultTarget, open]);

  useEffect(() => {
    if (open && activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length, activeTab]);

  if (!open) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setDraft('');
  };

  const regularAndCustom = stickersCatalog.filter((s) => s.unlockWinsRequired === 0);
  const specialUnlockables = stickersCatalog.filter((s) => s.unlockWinsRequired > 0);

  return (
    <>
      <aside
        aria-label="Bate-papo e cartinhas de zoeira"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-amber-400/25 bg-[#082E1C] text-[#FFFDF9] shadow-2xl pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-bold text-amber-300">
              Resenha &amp; Cartinhas
            </h2>
            <p className="text-xs text-emerald-100/75">
              Vitórias: <span className="font-mono-num font-bold text-amber-300">{roundsWon}</span>
              {' · '}Histórico: <span className="font-mono-num">{messages.length}</span> msgs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar bate-papo"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1 bg-[#062114] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'stickers'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-emerald-100/80 hover:text-white'
            }`}
          >
            <Smile className="h-4 w-4" />
            <span>Cartinhas ({stickersCatalog.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-emerald-100/80 hover:text-white'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Histórico ({messages.length})</span>
          </button>
        </div>

        {/* Collectible Stickers & Customizer View */}
        {activeTab === 'stickers' ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-3.5">
            {/* Target Opponent Selector + Create Custom Card Button */}
            <div className="rounded-2xl border border-white/10 bg-[#0A3520] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-100/90">
                  Alvo da zoeira:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSticker(null);
                    setStudioOpen(true);
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-amber-300 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Criar Cartinha</span>
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {opponents.map((opp) => {
                  const isLosing = lanterna?.id === opp.id;
                  const active = selectedTarget === opp.name;
                  return (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => setSelectedTarget(opp.name)}
                      className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                        active
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-[#072818] text-emerald-100/85 hover:bg-[#0D442A]'
                      }`}
                    >
                      {opp.name} ({opp.hand.length}){isLosing ? ' · Perdendo' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 1: Unlocked & Custom Cartinhas de Zoeira */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-emerald-100/80">
                <span className="font-semibold">Suas Cartinhas de Zoeira</span>
                <span>Toque no lápis para editar</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {regularAndCustom.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="relative flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[#072818] p-2.5 transition hover:border-amber-300/50 hover:bg-[#0C3B24]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSendSticker(sticker, selectedTarget);
                        onClose();
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:scale-[0.98]"
                    >
                      <ZueiraCardArt sticker={sticker} size="md" />
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="font-display text-xs font-bold text-amber-300 truncate">
                          {sticker.title}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-emerald-100/85">
                          {sticker.tauntLine}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Editar cartinha ${sticker.title}`}
                      onClick={() => {
                        setEditingSticker(sticker);
                        setStudioOpen(true);
                      }}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/35 text-emerald-200 transition hover:bg-black/60 hover:text-amber-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Special Foil / Holographic Cards Unlocked by Winning Rounds */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Trophy className="h-3.5 w-3.5" />
                <span>Cartinhas Especiais Brilhantes (Desbloqueie Vencendo!)</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {specialUnlockables.map((sticker) => {
                  const unlocked = isStickerUnlocked(sticker, roundsWon);
                  const remaining = Math.max(0, sticker.unlockWinsRequired - roundsWon);
                  return (
                    <div
                      key={sticker.id}
                      className={`relative flex items-center gap-2.5 rounded-2xl border p-2.5 transition ${
                        unlocked
                          ? 'border-amber-300/45 bg-[#103E27] hover:border-amber-300'
                          : 'border-white/10 bg-[#062114]/85 opacity-85'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          if (!unlocked) return;
                          onSendSticker(sticker, selectedTarget);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed"
                      >
                        <ZueiraCardArt sticker={sticker} size="md" locked={!unlocked} />
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="font-display text-xs font-bold text-amber-300 truncate">
                            {sticker.title}
                          </div>
                          {unlocked ? (
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-emerald-50">
                              {sticker.tauntLine}
                            </p>
                          ) : (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200/85">
                              <Lock className="h-3 w-3 shrink-0" />
                              <span>
                                Vença {sticker.unlockWinsRequired}{' '}
                                {sticker.unlockWinsRequired === 1 ? 'rodada' : 'rodadas'} (falta{' '}
                                {remaining})
                              </span>
                            </p>
                          )}
                        </div>
                      </button>

                      {unlocked && (
                        <button
                          type="button"
                          aria-label={`Editar cartinha especial ${sticker.title}`}
                          onClick={() => {
                            setEditingSticker(sticker);
                            setStudioOpen(true);
                          }}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/35 text-amber-200 transition hover:bg-black/60"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Persistent Message History Feed */
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#072818] p-4 text-center text-xs text-emerald-100/75">
                Nenhuma mensagem ainda. Mande a primeira cartinha de zoeira pra provocar a mesa!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentPlayerId;
                const sticker =
                  msg.kind === 'sticker'
                    ? resolveStickerFromEvent(msg, stickersCatalog)
                    : undefined;
                const timeStr = new Date(msg.createdAtMs || Date.now()).toLocaleTimeString(
                  'pt-BR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="mb-0.5 text-[11px] text-emerald-200/70">
                      <span>{msg.senderName}</span>
                      {msg.targetName ? <span> · para {msg.targetName}</span> : null}
                      <span> · {timeStr}</span>
                    </div>

                    {sticker ? (
                      <div
                        className={`flex max-w-[90%] items-center gap-3 rounded-2xl border border-amber-300/40 p-2.5 shadow-md ${
                          isMe ? 'bg-[#134E32]' : 'bg-[#072818]'
                        }`}
                      >
                        <ZueiraCardArt sticker={sticker} size="md" />
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold text-amber-300">
                            {sticker.title}
                          </div>
                          <p className="text-xs text-emerald-50">{msg.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                          isMe
                            ? 'bg-amber-400 font-medium text-zinc-950'
                            : 'border border-white/10 bg-[#072818] text-emerald-50'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Persistent Chat Composer */}
        <form
          onSubmit={handleFormSubmit}
          className="flex items-center gap-2 border-t border-white/10 bg-[#062114] p-3"
        >
          <label htmlFor="chat-message-input" className="sr-only">
            Escrever mensagem para a mesa
          </label>
          <input
            id="chat-message-input"
            type="text"
            maxLength={280}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Mande uma mensagem pra galera..."
            className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-[#0B3B24] px-3.5 py-2 text-sm text-white placeholder:text-emerald-200/50 focus:border-amber-300 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-amber-400 text-zinc-950 transition hover:bg-amber-300 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </aside>

      <StickerStudioModal
        open={studioOpen}
        editingSticker={editingSticker}
        onClose={() => setStudioOpen(false)}
        onSaveSticker={onSaveStickerCustomization}
        onResetBaseSticker={onResetBaseSticker}
        onDeleteCustomSticker={onDeleteCustomSticker}
      />
    </>
  );
};
