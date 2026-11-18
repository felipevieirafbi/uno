import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  applyCallUno,
  applyCatchForgotUno,
  applyDoubleStakes,
  applyDrawCard,
  applyJumpInCard,
  applyPassAfterDraw,
  applyPlayCard,
  applyPlayNumberCombo,
  applyResolveWild4Challenge,
  applySortPlayerHand,
  BOT_ROSTER,
  calculateWinnerPoints,
  canDoubleStakes,
  canJumpInCard,
  canPlayCard,
  chooseBotMove,
  colorLabelPt,
  dealNewRound,
  deserializeGameState,
  findPlayableNumberCombos,
  getChampionshipWinner,
  type ActiveColor,
  type CardValue,
  type HouseRulesConfig,
  type PlayerSeat,
  type UnoCard,
  type UnoGameState,
} from './game/unoRules';
import {
  findBotJumpInCandidate,
  pickBotEventReaction,
  pickBotTauntReply,
  type BotTableEventKind,
} from './game/botBanter';
import {
  BASE_ZUEIRA_STICKERS,
  PARTNER_SIGNALS,
  getNewlyUnlockedStickers,
  getStickerById,
  isStickerUnlocked,
  loadCustomStickersFromStorage,
  loadStickerEditsFromStorage,
  mergeStickersCatalog,
  sanitizeStickerPatch,
  saveCustomStickersToStorage,
  saveStickerEditsToStorage,
  type CustomStickerEditPatch,
  type ZueiraSticker,
} from './game/stickers';
import {
  getActiveCardBack,
  getActiveTableTheme,
  loadAppearancePrefs,
  saveAppearancePrefs,
  type AppearancePrefs,
} from './game/themes';
import { soundFx } from './game/soundEffects';
import { haptics } from './game/haptics';
import {
  auth,
  signInWithGooglePopup,
  signOutFirebase,
  testFirestoreConnection,
} from './lib/firebase';
import {
  createOnlineRoom,
  ensureUserPublicProfile,
  joinOnlineRoomByCode,
  pushRoomGameState,
  sendOnlineChatOrSticker,
  subscribeToRoomDoc,
  subscribeToRoomMessages,
  subscribeToUserRooms,
  toggleOnlineRoomPause,
  ROOM_CODE_REGEX,
  type ChatMessageItem,
  type LiveTauntEvent,
  type OnlineRoomDoc,
} from './lib/roomService';
import {
  loadLocalChatHistory,
  loadSavedLocalMatch,
  saveLocalChatHistory,
  saveLocalMatchSnapshot,
} from './lib/localMatchStorage';
import {
  loadCustomBots,
  loadPlayerStats,
  loadSavedHouseRules,
  saveCustomBots,
  saveHouseRules,
  updatePlayerStats,
  type CustomBotConfig,
  type PlayerCareerStats,
} from './lib/playerStats';
import { useOnlineStatus } from './hooks/usePWAInstall';
import {
  computeBotTurnDelayMs,
  cycleAiSpeed,
  deriveMoveHistoryEntry,
  loadAiSpeed,
  saveAiSpeed,
  type AiSpeedPreset,
  type MoveHistoryEntry,
} from './game/moveHistory';
import { TitleScreen } from './components/TitleScreen';
import { GameTableView, type XRayPeekInfo } from './components/GameTableView';
import { ChatAndStickersDrawer } from './components/ChatAndStickersDrawer';
import { MoveHistoryDrawer } from './components/MoveHistoryDrawer';
import { MultiplayerModal } from './components/MultiplayerModal';
import { TableJuiceOverlay, type JuiceBurstSignal } from './components/TableJuiceOverlay';
import { resolveStickerFromEvent } from './components/ZueiraCardArt';
import {
  PauseModal,
  RoundOverModal,
  SwapHandModal,
  Wild4ChallengeModal,
  WildColorModal,
} from './components/StatusModals';

type ShellScreen = 'title' | 'playing';

const LOCAL_PLAYER_ID = 'local_human';

interface PendingSwapPlay {
  mode: 'single' | 'jump_in' | 'combo';
  card?: UnoCard;
  comboValue?: CardValue;
}

function buildLocalSeats(
  playerName: string,
  totalSeats: number,
  customBots: CustomBotConfig[],
  prevScores?: Map<string, number>
) {
  const cleanName = playerName.trim() || 'Você';
  const clamped = Math.max(2, Math.min(6, totalSeats));
  const seats: Array<Omit<PlayerSeat, 'hand' | 'saidUno'>> = [
    {
      id: LOCAL_PLAYER_ID,
      name: cleanName,
      isBot: false,
      botStyle: 'calm',
      avatarColor: 'red',
      score: prevScores?.get(LOCAL_PLAYER_ID) ?? 0,
    },
  ];
  for (let i = 0; i < clamped - 1; i++) {
    const fallback = BOT_ROSTER[i % BOT_ROSTER.length];
    const custom = customBots[i % Math.max(1, customBots.length)];
    const botId = `bot_${i + 1}`;
    seats.push({
      id: botId,
      name: custom?.name || fallback.name,
      isBot: true,
      botStyle: custom?.style || fallback.style,
      avatarColor: custom?.avatarColor || fallback.avatarColor,
      score: prevScores?.get(botId) ?? 0,
    });
  }
  return seats;
}

export default function App() {
  const isOnlineNetwork = useOnlineStatus();
  const initialSavedLocal = useMemo(() => loadSavedLocalMatch(), []);
  const autostartRequested = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const inviteRoomParam = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = (new URLSearchParams(window.location.search).get('room') || '')
      .trim()
      .toUpperCase();
    return ROOM_CODE_REGEX.test(raw) ? raw : '';
  }, []);

  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('unozueira_nickname') || 'Você';
    }
    return 'Você';
  });
  const [totalSeats, setTotalSeats] = useState<number>(4);
  const [customBots, setCustomBots] = useState<CustomBotConfig[]>(() => loadCustomBots());
  const [houseRules, setHouseRules] = useState<HouseRulesConfig>(() => loadSavedHouseRules());
  const [appearance, setAppearance] = useState<AppearancePrefs>(() => loadAppearancePrefs());
  const [careerStats, setCareerStats] = useState<PlayerCareerStats>(() => loadPlayerStats());

  // Custom & Edited Taunt Cards Catalog
  const [customStickers, setCustomStickers] = useState<ZueiraSticker[]>(() =>
    loadCustomStickersFromStorage()
  );
  const [stickerEdits, setStickerEdits] = useState<Record<string, CustomStickerEditPatch>>(() =>
    loadStickerEditsFromStorage()
  );
  const stickersCatalog = useMemo(
    () => mergeStickersCatalog(stickerEdits, customStickers),
    [stickerEdits, customStickers]
  );
  const allStickersWithSignals = useMemo(
    () => [...stickersCatalog, ...PARTNER_SIGNALS],
    [stickersCatalog]
  );
  const stickersCatalogRef = useRef<ZueiraSticker[]>(allStickersWithSignals);
  stickersCatalogRef.current = allStickersWithSignals;
  const partnerSignalIdxRef = useRef<number>(0);

  const unlockedSpecialCount = useMemo(
    () =>
      BASE_ZUEIRA_STICKERS.filter(
        (s) => s.unlockWinsRequired > 0 && isStickerUnlocked(s, careerStats.roundsWon)
      ).length,
    [careerStats.roundsWon]
  );
  const [newlyUnlockedStickers, setNewlyUnlockedStickers] = useState<ZueiraSticker[]>([]);

  const activeTableTheme = useMemo(
    () => getActiveTableTheme(appearance.tableTheme, careerStats.roundsWon),
    [appearance.tableTheme, careerStats.roundsWon]
  );
  const activeCardBack = useMemo(
    () => getActiveCardBack(appearance.cardBack, careerStats.roundsWon),
    [appearance.cardBack, careerStats.roundsWon]
  );

  const [screen, setScreen] = useState<ShellScreen>(() =>
    autostartRequested ? 'playing' : 'title'
  );
  const [mode, setMode] = useState<'local' | 'online'>('local');

  // Local Game State
  const [localGameState, setLocalGameState] = useState<UnoGameState>(() =>
    initialSavedLocal
      ? {
          ...initialSavedLocal.gameState,
          phase: autostartRequested ? 'playing' : initialSavedLocal.gameState.phase,
        }
      : dealNewRound(
          buildLocalSeats('Você', 4, loadCustomBots()),
          Math.random,
          0,
          loadSavedHouseRules()
        )
  );
  const [localRoundNumber, setLocalRoundNumber] = useState<number>(
    initialSavedLocal?.roundNumber ?? 1
  );
  const [hasSavedLocal, setHasSavedLocal] = useState<boolean>(Boolean(initialSavedLocal));
  const [localPausedOpen, setLocalPausedOpen] = useState<boolean>(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>(() =>
    loadLocalChatHistory()
  );

  // Firebase Auth & Online Room State
  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [multiplayerModalOpen, setMultiplayerModalOpen] = useState<boolean>(() =>
    Boolean(inviteRoomParam) && !autostartRequested
  );
  const [userRooms, setUserRooms] = useState<OnlineRoomDoc[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [onlineRoomDoc, setOnlineRoomDoc] = useState<OnlineRoomDoc | null>(null);
  const [onlineMessages, setOnlineMessages] = useState<ChatMessageItem[]>([]);

  // Shared UI Controls, Tactical Modals & Juice Signals
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [pendingSwapPlay, setPendingSwapPlay] = useState<PendingSwapPlay | null>(null);
  const [dismissedChallengeKey, setDismissedChallengeKey] = useState<string>('');
  const [xrayPeek, setXrayPeek] = useState<XRayPeekInfo | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [aiSpeed, setAiSpeed] = useState<AiSpeedPreset>(() => loadAiSpeed());
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [activeMoveFx, setActiveMoveFx] = useState<MoveHistoryEntry | null>(null);
  const [seenMsgCount, setSeenMsgCount] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(() => soundFx.isMuted());
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => haptics.isEnabled());
  const [activeTaunt, setActiveTaunt] = useState<LiveTauntEvent | null>(null);
  const [juiceBurst, setJuiceBurst] = useState<JuiceBurstSignal | null>(null);
  const [tableShaking, setTableShaking] = useState<boolean>(false);
  const lastPlayedTauntIdRef = useRef<string>('init');
  const recordedRoundKeyRef = useRef<string>('');
  const prevTurnSeatIdRef = useRef<string>('');
  const prevObservedStateRef = useRef<UnoGameState | null>(null);
  const prevObservedMatchKeyRef = useRef<string>('');
  const moveSeqRef = useRef<number>(0);

  const triggerJuice = useCallback(
    (
      kind: JuiceBurstSignal['kind'],
      shake = false,
      accentColor?: string,
      shockwave = false
    ) => {
      setJuiceBurst((prev) => ({
        seq: (prev?.seq ?? 0) + 1,
        kind,
        accentColor,
        shockwave,
      }));
      if (shake) {
        setTableShaking(true);
        window.setTimeout(() => setTableShaking(false), 320);
      }
    },
    []
  );

  const scheduleLocalBotReaction = useCallback(
    (botSeat: PlayerSeat | undefined, event: BotTableEventKind, actorName: string) => {
      if (!botSeat || !botSeat.isBot) return;
      const line = pickBotEventReaction(botSeat.botStyle, event, actorName);
      window.setTimeout(() => {
        setLocalMessages((prev) => {
          const msg: ChatMessageItem = {
            id: `bot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            roomId: 'LOCAL1',
            senderId: botSeat.id,
            senderName: botSeat.name,
            kind: 'text',
            text: line,
            stickerId: '',
            targetName: actorName,
            createdAtMs: Date.now(),
          };
          const updated = [...prev, msg];
          saveLocalChatHistory(updated);
          return updated;
        });
      }, 950);
    },
    []
  );

  const fireTauntFeedback = useCallback(
    (sticker: ZueiraSticker) => {
      soundFx.playTauntSound(sticker.soundKind);
      haptics.tauntSlam(sticker.rarity);
      const burstKind: JuiceBurstSignal['kind'] =
        sticker.rarity === 'legendary' || sticker.rarity === 'epic'
          ? 'legendary_taunt'
          : 'taunt';
      triggerJuice(burstKind, sticker.rarity !== 'common');
    },
    [triggerJuice]
  );

  // Startup Firestore Connection Check + Auth Listener
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        if (firebaseUser.displayName) {
          setPlayerName((prev) => (prev === 'Você' ? firebaseUser.displayName! : prev));
        }
        ensureUserPublicProfile(firebaseUser).catch(() => {});
      } else {
        setUserRooms([]);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to user's saved/active online rooms when authenticated
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserRooms(user.uid, (rooms) => {
      setUserRooms(rooms);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to active online room + its persistent messages
  useEffect(() => {
    if (mode !== 'online' || !activeRoomCode || !user) return;

    const unsubRoom = subscribeToRoomDoc(activeRoomCode, (docSnap) => {
      setOnlineRoomDoc(docSnap);
      if (docSnap?.lastTaunt && docSnap.lastTaunt.id !== 'init') {
        if (lastPlayedTauntIdRef.current !== docSnap.lastTaunt.id) {
          lastPlayedTauntIdRef.current = docSnap.lastTaunt.id;
          setActiveTaunt(docSnap.lastTaunt);
          const st =
            resolveStickerFromEvent(docSnap.lastTaunt, stickersCatalogRef.current) ||
            getStickerById(docSnap.lastTaunt.stickerId, stickersCatalogRef.current);
          if (st) {
            fireTauntFeedback(st);
          }
        }
      }
    });

    const unsubMsgs = subscribeToRoomMessages(activeRoomCode, user.uid, (msgs) => {
      setOnlineMessages(msgs);
    });

    return () => {
      unsubRoom();
      unsubMsgs();
    };
  }, [mode, activeRoomCode, user, fireTauntFeedback]);

  // Compute unified active game state & metadata
  const activeGameState: UnoGameState = useMemo(() => {
    if (mode === 'online' && onlineRoomDoc) {
      return deserializeGameState(onlineRoomDoc.statePayload);
    }
    return localGameState;
  }, [mode, onlineRoomDoc, localGameState]);

  const currentPlayerId = mode === 'online' && user ? user.uid : LOCAL_PLAYER_ID;
  const currentMessages = mode === 'online' ? onlineMessages : localMessages;
  const currentRoundNumber =
    mode === 'online' ? onlineRoomDoc?.roundNumber ?? 1 : localRoundNumber;
  const currentRoomName =
    mode === 'online'
      ? onlineRoomDoc?.roomName ?? 'Sala Online'
      : activeGameState.houseRules?.teamMode2v2
        ? 'Duplas 2x2'
        : `Mesa Rápida (${activeGameState.seats.length}P)`;

  const isPausedModalOpen =
    screen === 'playing' &&
    (mode === 'online'
      ? onlineRoomDoc?.status === 'paused' || activeGameState.phase === 'paused'
      : localPausedOpen);

  const isRoundOverModalOpen =
    screen === 'playing' && activeGameState.phase === 'round_over';

  const currentChallengeKey = activeGameState.challengeVictimId
    ? `${activeGameState.challengeAttackerId}:${activeGameState.challengeVictimId}:${activeGameState.discardPile.length}`
    : '';

  const isWild4ChallengeModalOpen =
    screen === 'playing' &&
    !isPausedModalOpen &&
    !isRoundOverModalOpen &&
    activeGameState.phase === 'playing' &&
    activeGameState.challengeVictimId === currentPlayerId &&
    dismissedChallengeKey !== currentChallengeKey;

  // Mirror state machine to document.body.dataset.state per Game Shell contract
  useEffect(() => {
    if (screen === 'title') {
      document.body.dataset.state = 'title';
    } else if (isRoundOverModalOpen) {
      document.body.dataset.state = 'gameover';
    } else if (isPausedModalOpen) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, isPausedModalOpen, isRoundOverModalOpen]);

  // Clear taunt toast after animation finishes
  useEffect(() => {
    if (!activeTaunt) return;
    const timer = window.setTimeout(() => {
      setActiveTaunt((cur) => (cur?.id === activeTaunt.id ? null : cur));
    }, 3900);
    return () => window.clearTimeout(timer);
  }, [activeTaunt]);

  // Clear X-Ray peek after 5.2s
  useEffect(() => {
    if (!xrayPeek) return;
    const timer = window.setTimeout(() => {
      setXrayPeek(null);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [xrayPeek]);

  // Clear flying card & impact callout VFX after animation completes
  useEffect(() => {
    if (!activeMoveFx) return;
    const timer = window.setTimeout(() => {
      setActiveMoveFx((cur) => (cur?.id === activeMoveFx.id ? null : cur));
    }, 1350);
    return () => window.clearTimeout(timer);
  }, [activeMoveFx]);

  // Observe every table state transition to record Move History & fire directional card flight VFX
  useEffect(() => {
    if (screen !== 'playing') {
      prevObservedStateRef.current = null;
      prevObservedMatchKeyRef.current = '';
      setActiveMoveFx(null);
      return;
    }

    const matchKey = `${mode}:${activeRoomCode || 'local'}:${currentRoundNumber}`;
    if (prevObservedMatchKeyRef.current !== matchKey || !prevObservedStateRef.current) {
      prevObservedMatchKeyRef.current = matchKey;
      prevObservedStateRef.current = activeGameState;
      moveSeqRef.current = 1;
      const startEntry = deriveMoveHistoryEntry(null, activeGameState, currentPlayerId, 1);
      setMoveHistory(startEntry ? [startEntry] : []);
      setActiveMoveFx(null);
      return;
    }

    if (prevObservedStateRef.current === activeGameState) return;

    const prevSnap = prevObservedStateRef.current;
    prevObservedStateRef.current = activeGameState;
    const nextSeq = moveSeqRef.current + 1;
    const derived = deriveMoveHistoryEntry(prevSnap, activeGameState, currentPlayerId, nextSeq);
    if (!derived) return;

    moveSeqRef.current = nextSeq;
    setMoveHistory((prev) => [...prev.slice(-59), derived]);
    setActiveMoveFx(derived);

    if (derived.playedCards.length > 0 && derived.kind !== 'victory') {
      triggerJuice(
        derived.isHeavyImpact ? 'stack' : 'card_play',
        derived.isHeavyImpact,
        derived.accentHex,
        derived.isHeavyImpact
      );
    }
  }, [
    screen,
    mode,
    activeRoomCode,
    currentRoundNumber,
    activeGameState,
    currentPlayerId,
    triggerJuice,
  ]);

  // Gentle Turn Arrival Chime + Tactile Vibration when turn lands on local player
  useEffect(() => {
    if (screen !== 'playing' || activeGameState.phase !== 'playing') {
      prevTurnSeatIdRef.current = '';
      return;
    }
    const activeSeatId = activeGameState.seats[activeGameState.currentTurnIndex]?.id || '';
    const prevSeatId = prevTurnSeatIdRef.current;
    prevTurnSeatIdRef.current = activeSeatId;
    if (prevSeatId && prevSeatId !== activeSeatId && activeSeatId === currentPlayerId) {
      soundFx.playTurnChime();
      haptics.yourTurnNudge();
    }
  }, [
    screen,
    activeGameState.phase,
    activeGameState.seats,
    activeGameState.currentTurnIndex,
    currentPlayerId,
  ]);

  // Keep unread message badge accurate
  useEffect(() => {
    if (chatOpen) {
      setSeenMsgCount(currentMessages.length);
    }
  }, [chatOpen, currentMessages.length]);

  const unreadCount = Math.max(0, currentMessages.length - seenMsgCount);

  // Persist local game state on every move so resuming never loses progress
  useEffect(() => {
    if (mode === 'local' && screen === 'playing') {
      saveLocalMatchSnapshot({
        roomName: `Mesa Rápida (${localGameState.seats.length}P)`,
        roundNumber: localRoundNumber,
        isPaused: localPausedOpen,
        gameState: localGameState,
      });
      setHasSavedLocal(true);
    }
  }, [mode, screen, localGameState, localRoundNumber, localPausedOpen]);

  // Save preferences
  const handleChangePlayerName = (name: string) => {
    setPlayerName(name);
    try {
      window.localStorage.setItem('unozueira_nickname', name);
    } catch {
      // Ignore
    }
  };

  const handleChangeCustomBots = (nextBots: CustomBotConfig[]) => {
    setCustomBots(nextBots);
    saveCustomBots(nextBots);
  };

  const handleChangeHouseRules = (nextRules: HouseRulesConfig) => {
    setHouseRules(nextRules);
    saveHouseRules(nextRules);
  };

  const handleChangeAppearance = (nextAppearance: AppearancePrefs) => {
    setAppearance(nextAppearance);
    saveAppearancePrefs(nextAppearance);
  };

  const handleToggleMute = useCallback(() => {
    setMuted(soundFx.toggleMute());
  }, []);

  const handleToggleVibration = useCallback(() => {
    setVibrationEnabled(haptics.toggle());
  }, []);

  const handleChangeAiSpeed = useCallback((nextSpeed: AiSpeedPreset) => {
    setAiSpeed(nextSpeed);
    saveAiSpeed(nextSpeed);
  }, []);

  const handleCycleAiSpeed = useCallback(() => {
    setAiSpeed((prev) => {
      const next = cycleAiSpeed(prev);
      saveAiSpeed(next);
      return next;
    });
  }, []);

  // Sticker Studio Customization Handlers (Create, Edit, Reset, Delete)
  const handleSaveStickerCustomization = useCallback(
    (patch: CustomStickerEditPatch, existingSticker: ZueiraSticker | null) => {
      const clean = sanitizeStickerPatch(patch);
      if (existingSticker && existingSticker.isCustom) {
        setCustomStickers((prev) => {
          const next = prev.map((s) =>
            s.id === existingSticker.id ? { ...s, ...clean } : s
          );
          saveCustomStickersToStorage(next);
          return next;
        });
      } else if (existingSticker) {
        setStickerEdits((prev) => {
          const next = { ...prev, [existingSticker.id]: clean };
          saveStickerEditsToStorage(next);
          return next;
        });
      } else {
        const created: ZueiraSticker = {
          id: `custom_${Date.now().toString(36)}`,
          ...clean,
          rarity: 'rare',
          unlockWinsRequired: 0,
          isCustom: true,
        };
        setCustomStickers((prev) => {
          const next = [created, ...prev].slice(0, 16);
          saveCustomStickersToStorage(next);
          return next;
        });
      }
    },
    []
  );

  const handleResetBaseSticker = useCallback((stickerId: string) => {
    setStickerEdits((prev) => {
      const next = { ...prev };
      delete next[stickerId];
      saveStickerEditsToStorage(next);
      return next;
    });
  }, []);

  const handleDeleteCustomSticker = useCallback((stickerId: string) => {
    setCustomStickers((prev) => {
      const next = prev.filter((s) => s.id !== stickerId);
      saveCustomStickersToStorage(next);
      return next;
    });
  }, []);

  // Start a fresh Quick Match with chosen seat count, custom AI bot names & Regras da Casa
  const handleStartQuickMatch = useCallback(() => {
    const seatsCount = houseRules.teamMode2v2 ? 4 : totalSeats;
    const dealt = dealNewRound(
      buildLocalSeats(playerName, seatsCount, customBots),
      Math.random,
      0,
      houseRules
    );
    setMode('local');
    setActiveRoomCode(null);
    setLocalRoundNumber(1);
    setLocalPausedOpen(false);
    setPendingWildCard(null);
    setPendingSwapPlay(null);
    setXrayPeek(null);
    setNewlyUnlockedStickers([]);
    setLocalGameState(dealt);
    setScreen('playing');
    soundFx.playCardSnap(false);
    haptics.cardTap(false);
  }, [playerName, totalSeats, customBots, houseRules]);

  // Resume saved/paused local match
  const handleResumeSavedLocal = useCallback(() => {
    const saved = loadSavedLocalMatch();
    if (saved) {
      setMode('local');
      setActiveRoomCode(null);
      setLocalRoundNumber(saved.roundNumber);
      setLocalGameState({ ...saved.gameState, phase: 'playing' });
      setLocalPausedOpen(false);
      setScreen('playing');
    } else {
      handleStartQuickMatch();
    }
  }, [handleStartQuickMatch]);

  // Commit state mutation (Local or Online Firestore) + trigger synchronized audio/haptics/particle juice
  const commitGameState = useCallback(
    (nextState: UnoGameState, nextRound = currentRoundNumber) => {
      if (Boolean(nextState.darkSide) !== Boolean(activeGameState.darkSide)) {
        soundFx.playFlipDarkSide(Boolean(nextState.darkSide));
        haptics.flipWave();
        triggerJuice('stack', true);
      }

      if (mode === 'local') {
        nextState.seats.forEach((nextSeat) => {
          if (nextSeat.isBot && nextSeat.eliminated) {
            const wasElim = activeGameState.seats.find((s) => s.id === nextSeat.id)?.eliminated;
            if (!wasElim) {
              scheduleLocalBotReaction(nextSeat, 'mercy_ko', playerName);
            }
          }
        });
      }

      if (nextState.phase === 'round_over') {
        const champInfo = getChampionshipWinner(nextState);
        soundFx.playVictoryFanfare();
        haptics.victoryFanfare();
        triggerJuice(
          champInfo.isChampionshipOver ? 'championship' : 'victory',
          champInfo.isChampionshipOver
        );

        const roundKey = `${mode}:${activeRoomCode || 'local'}:${nextRound}:${nextState.winnerId}`;
        if (recordedRoundKeyRef.current !== roundKey) {
          recordedRoundKeyRef.current = roundKey;
          const myNextSeat = nextState.seats.find((s) => s.id === currentPlayerId);
          const won =
            nextState.winnerId === currentPlayerId ||
            Boolean(
              nextState.winningTeamId &&
                myNextSeat?.teamId &&
                myNextSeat.teamId === nextState.winningTeamId
            );
          const didWinChamp = Boolean(
            champInfo.isChampionshipOver &&
              (champInfo.championId === currentPlayerId ||
                (champInfo.championTeamId &&
                  myNextSeat?.teamId &&
                  champInfo.championTeamId === myNextSeat.teamId))
          );
          const mult = nextState.stakesMultiplier || 1;
          const roundBonus = won
            ? Math.max(10, calculateWinnerPoints(nextState.seats, nextState.winnerId) * mult)
            : 0;
          const prevSnapshot = loadPlayerStats();
          const nextWins = prevSnapshot.roundsWon + (won ? 1 : 0);
          const unlockedNow = won
            ? getNewlyUnlockedStickers(prevSnapshot.roundsWon, nextWins)
            : [];
          setNewlyUnlockedStickers(unlockedNow);

          setCareerStats(
            updatePlayerStats((prev) => {
              const nextStreak = won ? prev.currentWinStreak + 1 : 0;
              return {
                ...prev,
                roundsPlayed: prev.roundsPlayed + 1,
                roundsWon: prev.roundsWon + (won ? 1 : 0),
                bestRoundScore: Math.max(prev.bestRoundScore, roundBonus),
                currentWinStreak: nextStreak,
                bestWinStreak: Math.max(prev.bestWinStreak, nextStreak),
                doubledWins: prev.doubledWins + (won && mult > 1 ? 1 : 0),
                tournamentsWon: prev.tournamentsWon + (didWinChamp ? 1 : 0),
              };
            })
          );
        }
      } else if (nextState.pendingDraw > activeGameState.pendingDraw) {
        soundFx.playStackEscalation(nextState.pendingDraw);
        haptics.bombEscalation(nextState.pendingDraw);
        triggerJuice('stack', nextState.pendingDraw >= 4);
      } else if (activeGameState.pendingDraw > 0 && nextState.pendingDraw === 0) {
        soundFx.playPenaltyBoom();
        haptics.penaltyAbsorbed();
        triggerJuice('stack', true);
      }

      if (mode === 'online' && activeRoomCode) {
        pushRoomGameState({
          roomCode: activeRoomCode,
          nextState,
          status: 'playing',
          roundNumber: nextRound,
        }).catch(() => {});
      } else {
        setLocalGameState(nextState);
        setLocalRoundNumber(nextRound);
      }
    },
    [
      mode,
      activeRoomCode,
      currentRoundNumber,
      activeGameState.darkSide,
      activeGameState.pendingDraw,
      activeGameState.seats,
      currentPlayerId,
      playerName,
      scheduleLocalBotReaction,
      triggerJuice,
    ]
  );

  // Turn Countdown Timer ("Pavio Curto")
  useEffect(() => {
    const limitSec = activeGameState.houseRules?.turnTimerSeconds || 0;
    if (
      limitSec <= 0 ||
      screen !== 'playing' ||
      isPausedModalOpen ||
      isRoundOverModalOpen ||
      activeGameState.phase !== 'playing'
    ) {
      setTurnSecondsLeft(null);
      return;
    }

    setTurnSecondsLeft(limitSec);
    const interval = window.setInterval(() => {
      setTurnSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          const activeSeat = activeGameState.seats[activeGameState.currentTurnIndex];
          const canDriveTimeout =
            activeSeat?.id === currentPlayerId ||
            (activeSeat?.isBot &&
              (mode === 'local' || (onlineRoomDoc && user && onlineRoomDoc.hostId === user.uid)));
          if (activeSeat && canDriveTimeout) {
            setPendingWildCard(null);
            setPendingSwapPlay(null);
            const autoNext = activeGameState.drawnPlayableCardId
              ? applyPassAfterDraw(activeGameState, activeSeat.id)
              : applyDrawCard(activeGameState, activeSeat.id);
            commitGameState(autoNext);
          }
          return limitSec;
        }
        if (
          prev <= 4 &&
          activeGameState.seats[activeGameState.currentTurnIndex]?.id === currentPlayerId
        ) {
          haptics.cardTap(false);
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    screen,
    isPausedModalOpen,
    isRoundOverModalOpen,
    activeGameState,
    currentPlayerId,
    mode,
    onlineRoomDoc,
    user,
    commitGameState,
  ]);

  // AI Bot Automatic Turn Loop (with adjustable speed & automatic hold while reading Move History in local mode)
  const lastMoveKind = moveHistory[moveHistory.length - 1]?.kind;
  const botTurnDelayMs = computeBotTurnDelayMs(aiSpeed, lastMoveKind);

  useEffect(() => {
    if (screen !== 'playing') return;
    if (isPausedModalOpen || isRoundOverModalOpen || pendingWildCard || pendingSwapPlay) return;
    if (mode === 'local' && historyOpen) return;
    if (activeGameState.phase !== 'playing') return;

    const currentSeat = activeGameState.seats[activeGameState.currentTurnIndex];
    if (!currentSeat || !currentSeat.isBot || currentSeat.eliminated) return;

    if (mode === 'online' && onlineRoomDoc && user && onlineRoomDoc.hostId !== user.uid) {
      return;
    }

    const timer = window.setTimeout(() => {
      // Aggressive/Trickster bots occasionally double the table when holding <= 2 cards!
      if (
        (currentSeat.botStyle === 'aggressive' || currentSeat.botStyle === 'trickster') &&
        currentSeat.hand.length <= 2 &&
        (activeGameState.stakesMultiplier || 1) === 1 &&
        canDoubleStakes(activeGameState, currentSeat.id) &&
        Math.random() < 0.25
      ) {
        soundFx.playTableSlamDouble();
        haptics.doubleStakesSlam();
        triggerJuice('stack', true);
        commitGameState(applyDoubleStakes(activeGameState, currentSeat.id));
        return;
      }

      const decision = chooseBotMove(activeGameState, currentSeat);
      if (decision.action === 'challenge_wild4') {
        soundFx.playCardSnap(true);
        const next = applyResolveWild4Challenge(
          activeGameState,
          currentSeat.id,
          decision.decision
        );
        commitGameState(next);
        return;
      }

      if (decision.action === 'combo') {
        soundFx.playComboChord(2);
        if (decision.callUno) soundFx.playUnoShout();
        triggerJuice('uno', false);
        const next = applyPlayNumberCombo(
          activeGameState,
          currentSeat.id,
          decision.value,
          decision.callUno,
          decision.swapTargetId
        );
        commitGameState(next);
        return;
      }

      if (decision.action === 'play') {
        const playedCard = currentSeat.hand.find((c) => c.id === decision.cardId);
        const isHeavy =
          playedCard?.value === 'wild4' ||
          playedCard?.value === 'draw2' ||
          playedCard?.value === 'shield' ||
          playedCard?.value === 'flip' ||
          playedCard?.value === 'skip';
        if (playedCard?.value === 'shield' && activeGameState.pendingDraw > 0) {
          soundFx.playShieldReflect();
        } else {
          soundFx.playCardSnap(isHeavy);
        }
        if (decision.callUno) soundFx.playUnoShout();

        const next = applyPlayCard(
          activeGameState,
          currentSeat.id,
          decision.cardId,
          decision.chosenColor,
          decision.callUno,
          Math.random,
          decision.swapTargetId
        );
        commitGameState(next);

        if (mode === 'local' && playedCard?.value === 'wild4' && Math.random() < 0.5) {
          const sticker =
            getStickerById('chora_mais4', stickersCatalogRef.current) || BASE_ZUEIRA_STICKERS[0];
          const botTaunt: LiveTauntEvent = {
            id: `bot_taunt_${Date.now()}`,
            stickerId: sticker.id,
            senderId: currentSeat.id,
            senderName: currentSeat.name,
            targetName: playerName,
            sentAtMs: Date.now(),
            customTitle: sticker.title,
            customLine: sticker.tauntLine,
            customBadge: sticker.badgeText,
            customColor: sticker.accentHex,
            customArt: sticker.artKind,
            rarity: sticker.rarity,
            soundKind: sticker.soundKind,
          };
          setActiveTaunt(botTaunt);
          fireTauntFeedback(sticker);
          setLocalMessages((prev) => {
            const updated: ChatMessageItem[] = [
              ...prev,
              {
                id: botTaunt.id,
                roomId: 'LOCAL1',
                senderId: currentSeat.id,
                senderName: currentSeat.name,
                kind: 'sticker',
                text: sticker.tauntLine,
                stickerId: sticker.id,
                targetName: playerName,
                createdAtMs: botTaunt.sentAtMs,
                customTitle: sticker.title,
                customBadge: sticker.badgeText,
                customColor: sticker.accentHex,
                customArt: sticker.artKind,
                rarity: sticker.rarity,
                soundKind: sticker.soundKind,
              },
            ];
            saveLocalChatHistory(updated);
            return updated;
          });
        }
      } else {
        soundFx.playDrawPop();
        const next = applyDrawCard(activeGameState, currentSeat.id);
        commitGameState(next);
      }
    }, botTurnDelayMs);

    return () => window.clearTimeout(timer);
  }, [
    screen,
    isPausedModalOpen,
    isRoundOverModalOpen,
    pendingWildCard,
    pendingSwapPlay,
    historyOpen,
    botTurnDelayMs,
    activeGameState,
    mode,
    onlineRoomDoc,
    user,
    commitGameState,
    playerName,
    fireTauntFeedback,
    triggerJuice,
  ]);

  // Occasional AI Bot Out-of-Turn Jump-In ("Corte na Frente") after a fair 2.4s window
  useEffect(() => {
    if (screen !== 'playing') return;
    if (isPausedModalOpen || isRoundOverModalOpen || pendingWildCard || pendingSwapPlay) return;
    if (mode === 'local' && historyOpen) return;
    if (activeGameState.phase !== 'playing' || !activeGameState.houseRules?.jumpInRule) return;
    if (mode === 'online' && onlineRoomDoc && user && onlineRoomDoc.hostId !== user.uid) return;

    const candidate = findBotJumpInCandidate(activeGameState);
    if (!candidate) return;

    const jumpTimer = window.setTimeout(() => {
      if (Math.random() < 0.35) {
        soundFx.playUnoShout();
        triggerJuice('uno', false);
        const next = applyJumpInCard(activeGameState, candidate.botSeat.id, candidate.card.id);
        commitGameState(next);
      }
    }, 2400);

    return () => window.clearTimeout(jumpTimer);
  }, [
    screen,
    isPausedModalOpen,
    isRoundOverModalOpen,
    pendingWildCard,
    pendingSwapPlay,
    historyOpen,
    activeGameState,
    mode,
    onlineRoomDoc,
    user,
    commitGameState,
    triggerJuice,
  ]);

  // Smart AI Bot UNO-Catch Reaction if human forgets to shout UNO for > 2.9s
  useEffect(() => {
    if (screen !== 'playing' || isPausedModalOpen || isRoundOverModalOpen) return;
    if (mode === 'local' && historyOpen) return;
    if (activeGameState.phase !== 'playing') return;
    if (mode === 'online' && onlineRoomDoc && user && onlineRoomDoc.hostId !== user.uid) return;

    const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
    const anyBot = activeGameState.seats.find((s) => s.isBot && !s.eliminated);
    if (!mySeat || mySeat.eliminated || !anyBot || mySeat.hand.length !== 1 || mySeat.saidUno) {
      return;
    }

    const catchTimer = window.setTimeout(() => {
      soundFx.playTauntSound('siren');
      haptics.penaltyAbsorbed();
      const next = applyCatchForgotUno(activeGameState, anyBot.name, mySeat.id);
      commitGameState(next);

      const sirenSticker =
        getStickerById('esqueceu_uno', stickersCatalogRef.current) || BASE_ZUEIRA_STICKERS[0];
      const botTaunt: LiveTauntEvent = {
        id: `bot_catch_${Date.now()}`,
        stickerId: sirenSticker.id,
        senderId: anyBot.id,
        senderName: anyBot.name,
        targetName: mySeat.name,
        sentAtMs: Date.now(),
        customTitle: sirenSticker.title,
        customLine: sirenSticker.tauntLine,
        customBadge: sirenSticker.badgeText,
        customColor: sirenSticker.accentHex,
        customArt: sirenSticker.artKind,
        rarity: sirenSticker.rarity,
        soundKind: sirenSticker.soundKind,
      };
      setActiveTaunt(botTaunt);
    }, 2900);

    return () => window.clearTimeout(catchTimer);
  }, [
    screen,
    isPausedModalOpen,
    isRoundOverModalOpen,
    historyOpen,
    activeGameState,
    mode,
    onlineRoomDoc,
    user,
    currentPlayerId,
    commitGameState,
  ]);

  // Player Card Play Handler
  const handlePlayCardRequest = useCallback(
    (card: UnoCard) => {
      if (isPausedModalOpen || activeGameState.phase !== 'playing') return;
      const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
      if (!mySeat || mySeat.eliminated) return;

      const topDiscard = activeGameState.discardPile[activeGameState.discardPile.length - 1];
      if (
        !canPlayCard(
          card,
          topDiscard,
          activeGameState.activeColor,
          activeGameState.pendingDraw,
          activeGameState.drawnPlayableCardId
        )
      ) {
        return;
      }

      if (card.color === 'wild') {
        haptics.cardTap(true);
        setPendingWildCard(card);
        return;
      }

      // If playing a 7 with >1 active opponent and remaining cards, ask whom to swap with!
      const activeRivals = activeGameState.seats.filter(
        (s) => s.id !== currentPlayerId && !s.eliminated
      );
      if (
        card.value === '7' &&
        activeGameState.houseRules?.sevenSwapHands &&
        mySeat.hand.length > 1 &&
        activeRivals.length >= 2
      ) {
        haptics.cardTap(true);
        setPendingSwapPlay({ mode: 'single', card });
        return;
      }

      const isHeavy =
        card.value === 'draw2' ||
        card.value === 'skip' ||
        card.value === 'reverse' ||
        card.value === 'flip';
      soundFx.playCardSnap(isHeavy);
      haptics.cardTap(isHeavy);
      triggerJuice('card_play', false);

      if (
        mode === 'local' &&
        card.value === '7' &&
        activeGameState.houseRules?.sevenSwapHands &&
        mySeat.hand.length > 1 &&
        activeRivals.length === 1 &&
        activeRivals[0].isBot
      ) {
        scheduleLocalBotReaction(activeRivals[0], 'swapped_hand', mySeat.name);
      }

      const next = applyPlayCard(
        activeGameState,
        currentPlayerId,
        card.id,
        undefined,
        mySeat.saidUno
      );
      commitGameState(next);
    },
    [
      activeGameState,
      currentPlayerId,
      isPausedModalOpen,
      mode,
      commitGameState,
      scheduleLocalBotReaction,
      triggerJuice,
    ]
  );

  // Out-of-Turn Jump-In ("Corte na Frente") Handler
  const handleJumpInCardRequest = useCallback(
    (card: UnoCard) => {
      if (isPausedModalOpen || activeGameState.phase !== 'playing') return;
      if (!canJumpInCard(activeGameState, currentPlayerId, card)) return;
      const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
      if (!mySeat) return;

      const activeRivals = activeGameState.seats.filter(
        (s) => s.id !== currentPlayerId && !s.eliminated
      );
      if (
        card.value === '7' &&
        activeGameState.houseRules?.sevenSwapHands &&
        mySeat.hand.length > 1 &&
        activeRivals.length >= 2
      ) {
        haptics.unoShout();
        setPendingSwapPlay({ mode: 'jump_in', card });
        return;
      }

      soundFx.playUnoShout();
      haptics.unoShout();
      triggerJuice('uno', false);
      const next = applyJumpInCard(activeGameState, currentPlayerId, card.id);
      commitGameState(next);
    },
    [activeGameState, currentPlayerId, isPausedModalOpen, commitGameState, triggerJuice]
  );

  // Multi-card Same-Number Combo Handler
  const handlePlayNumberCombo = useCallback(
    (value: CardValue) => {
      if (isPausedModalOpen || activeGameState.phase !== 'playing') return;
      const combos = findPlayableNumberCombos(activeGameState, currentPlayerId);
      const found = combos.find((c) => c.value === value);
      if (!found) return;
      const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
      if (!mySeat) return;

      const activeRivals = activeGameState.seats.filter(
        (s) => s.id !== currentPlayerId && !s.eliminated
      );
      if (
        value === '7' &&
        activeGameState.houseRules?.sevenSwapHands &&
        mySeat.hand.length > found.cards.length &&
        activeRivals.length >= 2
      ) {
        haptics.comboBurst();
        setPendingSwapPlay({ mode: 'combo', comboValue: value });
        return;
      }

      soundFx.playComboChord(found.cards.length);
      haptics.comboBurst();
      triggerJuice('uno', false);
      const next = applyPlayNumberCombo(
        activeGameState,
        currentPlayerId,
        value,
        mySeat.saidUno || mySeat.hand.length - found.cards.length === 1
      );
      commitGameState(next);
    },
    [activeGameState, currentPlayerId, isPausedModalOpen, commitGameState, triggerJuice]
  );

  // Confirm 7-Card Hand Swap Target
  const handleConfirmSwapTarget = (targetSeatId: string) => {
    if (!pendingSwapPlay) return;
    const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
    const swappedTarget = activeGameState.seats.find((s) => s.id === targetSeatId);
    soundFx.playSortShuffle();
    haptics.unoShout();
    if (mode === 'local' && swappedTarget?.isBot) {
      scheduleLocalBotReaction(swappedTarget, 'swapped_hand', mySeat?.name || playerName);
    }

    if (pendingSwapPlay.mode === 'combo' && pendingSwapPlay.comboValue) {
      const next = applyPlayNumberCombo(
        activeGameState,
        currentPlayerId,
        pendingSwapPlay.comboValue,
        mySeat?.saidUno ?? false,
        targetSeatId
      );
      setPendingSwapPlay(null);
      commitGameState(next);
      return;
    }

    if (pendingSwapPlay.mode === 'jump_in' && pendingSwapPlay.card) {
      const next = applyJumpInCard(
        activeGameState,
        currentPlayerId,
        pendingSwapPlay.card.id,
        Math.random,
        targetSeatId
      );
      setPendingSwapPlay(null);
      commitGameState(next);
      return;
    }

    if (pendingSwapPlay.card) {
      const next = applyPlayCard(
        activeGameState,
        currentPlayerId,
        pendingSwapPlay.card.id,
        undefined,
        mySeat?.saidUno ?? false,
        Math.random,
        targetSeatId
      );
      setPendingSwapPlay(null);
      commitGameState(next);
    }
  };

  // Confirm Wild / Shield / X-Ray Color
  const handleConfirmWildColor = (chosenColor: ActiveColor) => {
    if (!pendingWildCard) return;
    const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
    if (pendingWildCard.value === 'shield' && activeGameState.pendingDraw > 0) {
      soundFx.playShieldReflect();
      haptics.unoShout();
      triggerJuice('stack', true);
      setCareerStats(
        updatePlayerStats((prev) => ({
          ...prev,
          shieldsReflected: prev.shieldsReflected + 1,
        }))
      );
      if (mode === 'local') {
        const myIdx = activeGameState.seats.findIndex((s) => s.id === currentPlayerId);
        const len = activeGameState.seats.length;
        const reflectedDir = (activeGameState.direction * -1) as 1 | -1;
        const reflectedSeat =
          activeGameState.seats[((myIdx + reflectedDir) % len + len) % len];
        if (reflectedSeat?.isBot) {
          scheduleLocalBotReaction(reflectedSeat, 'shield_hit', mySeat?.name || playerName);
        }
      }
    } else {
      soundFx.playCardSnap(true);
      haptics.cardTap(true);
      triggerJuice('card_play', false);
    }

    if (pendingWildCard.value === 'wild4') {
      setCareerStats(
        updatePlayerStats((prev) => ({
          ...prev,
          plusFoursDropped: prev.plusFoursDropped + 1,
        }))
      );
    }

    // If playing X-Ray, reveal the next active player's hand for 5.2 seconds!
    if (pendingWildCard.value === 'xray') {
      const myIdx = activeGameState.seats.findIndex((s) => s.id === currentPlayerId);
      const len = activeGameState.seats.length;
      for (let step = 1; step < len; step++) {
        const idx = ((myIdx + step * activeGameState.direction) % len + len) % len;
        const rival = activeGameState.seats[idx];
        if (rival && !rival.eliminated && rival.id !== currentPlayerId) {
          setXrayPeek({ targetName: rival.name, cards: rival.hand });
          break;
        }
      }
    }

    const next = applyPlayCard(
      activeGameState,
      currentPlayerId,
      pendingWildCard.id,
      chosenColor,
      mySeat?.saidUno ?? false
    );
    setPendingWildCard(null);
    commitGameState(next);
  };

  // Truco / Marvel Snap Table Doubling Handler
  const handleDoubleStakes = useCallback(() => {
    if (!canDoubleStakes(activeGameState, currentPlayerId)) return;
    soundFx.playTableSlamDouble();
    haptics.doubleStakesSlam();
    triggerJuice('stack', true);
    const next = applyDoubleStakes(activeGameState, currentPlayerId);
    commitGameState(next);
  }, [activeGameState, currentPlayerId, commitGameState, triggerJuice]);

  // Resolve Wild +4 Bluff Challenge ("Aceitar" vs "DUVIDO!")
  const handleResolveWild4Challenge = useCallback(
    (decision: 'accept' | 'challenge') => {
      if (decision === 'challenge') {
        soundFx.playTauntSound('siren');
        haptics.doubleStakesSlam();
        triggerJuice('stack', true);
        if (activeGameState.challengeWasBluffing) {
          setCareerStats(
            updatePlayerStats((prev) => ({
              ...prev,
              bluffsCaught: prev.bluffsCaught + 1,
            }))
          );
          if (mode === 'local') {
            const attacker = activeGameState.seats.find(
              (s) => s.id === activeGameState.challengeAttackerId
            );
            if (attacker?.isBot) {
              scheduleLocalBotReaction(attacker, 'bluff_caught', playerName);
            }
          }
        }
      } else {
        soundFx.playDrawPop();
        haptics.drawTap();
      }
      const next = applyResolveWild4Challenge(activeGameState, currentPlayerId, decision);
      commitGameState(next);
    },
    [
      activeGameState,
      currentPlayerId,
      mode,
      playerName,
      commitGameState,
      scheduleLocalBotReaction,
      triggerJuice,
    ]
  );

  const handleDrawCard = useCallback(() => {
    if (isPausedModalOpen || activeGameState.phase !== 'playing') return;
    soundFx.playDrawPop();
    haptics.drawTap();
    const next = applyDrawCard(activeGameState, currentPlayerId);
    commitGameState(next);
  }, [activeGameState, currentPlayerId, isPausedModalOpen, commitGameState]);

  const handlePassAfterDraw = useCallback(() => {
    if (isPausedModalOpen || activeGameState.phase !== 'playing') return;
    if (!activeGameState.drawnPlayableCardId) return;
    soundFx.playCardSnap(false);
    haptics.cardTap(false);
    const next = applyPassAfterDraw(activeGameState, currentPlayerId);
    commitGameState(next);
  }, [activeGameState, currentPlayerId, isPausedModalOpen, commitGameState]);

  const handleSortHand = useCallback(() => {
    soundFx.playSortShuffle();
    haptics.sortRiffle();
    const next = applySortPlayerHand(activeGameState, currentPlayerId);
    commitGameState(next);
  }, [activeGameState, currentPlayerId, commitGameState]);

  const handleShoutUno = useCallback(() => {
    soundFx.playUnoShout();
    haptics.unoShout();
    triggerJuice('uno', false);
    const next = applyCallUno(activeGameState, currentPlayerId);
    commitGameState(next);
  }, [activeGameState, currentPlayerId, commitGameState, triggerJuice]);

  const handleCatchOpponentUno = useCallback(
    (targetSeatId: string) => {
      soundFx.playTauntSound('siren');
      haptics.penaltyAbsorbed();
      triggerJuice('stack', true);
      const next = applyCatchForgotUno(activeGameState, playerName, targetSeatId);
      commitGameState(next);
    },
    [activeGameState, playerName, commitGameState, triggerJuice]
  );

  // Send Persistent Chat Message
  const handleSendText = useCallback(
    (text: string) => {
      const cleanSender = playerName.trim() || 'Você';
      if (mode === 'online' && activeRoomCode && user && onlineRoomDoc) {
        sendOnlineChatOrSticker({
          roomCode: activeRoomCode,
          senderId: user.uid,
          senderName: cleanSender,
          visibleToUids: onlineRoomDoc.playerIds,
          kind: 'text',
          text,
        }).catch(() => {});
      } else {
        const msg: ChatMessageItem = {
          id: `local_m_${Date.now()}`,
          roomId: 'LOCAL1',
          senderId: LOCAL_PLAYER_ID,
          senderName: cleanSender,
          kind: 'text',
          text,
          stickerId: '',
          targetName: '',
          createdAtMs: Date.now(),
        };
        setLocalMessages((prev) => {
          const next = [...prev, msg];
          saveLocalChatHistory(next);
          return next;
        });
      }
    },
    [mode, activeRoomCode, user, onlineRoomDoc, playerName]
  );

  // Send Persistent Zueira Sticker + High-Visibility Center-Stage Table Slam
  const handleSendSticker = useCallback(
    (sticker: ZueiraSticker, targetName: string) => {
      if (!isStickerUnlocked(sticker, careerStats.roundsWon)) return;
      const cleanSender = playerName.trim() || 'Você';
      setCareerStats(
        updatePlayerStats((prev) => ({
          ...prev,
          tauntsSent: prev.tauntsSent + 1,
        }))
      );
      if (mode === 'online' && activeRoomCode && user && onlineRoomDoc) {
        sendOnlineChatOrSticker({
          roomCode: activeRoomCode,
          senderId: user.uid,
          senderName: cleanSender,
          visibleToUids: onlineRoomDoc.playerIds,
          kind: 'sticker',
          text: sticker.tauntLine,
          stickerId: sticker.id,
          targetName,
          stickerObj: sticker,
        }).catch(() => {});
      } else {
        const now = Date.now();
        const taunt: LiveTauntEvent = {
          id: `local_st_${now}`,
          stickerId: sticker.id,
          senderId: LOCAL_PLAYER_ID,
          senderName: cleanSender,
          targetName,
          sentAtMs: now,
          customTitle: sticker.title,
          customLine: sticker.tauntLine,
          customBadge: sticker.badgeText,
          customColor: sticker.accentHex,
          customArt: sticker.artKind,
          rarity: sticker.rarity,
          soundKind: sticker.soundKind,
        };
        setActiveTaunt(taunt);
        fireTauntFeedback(sticker);

        const msg: ChatMessageItem = {
          id: taunt.id,
          roomId: 'LOCAL1',
          senderId: LOCAL_PLAYER_ID,
          senderName: cleanSender,
          kind: 'sticker',
          text: sticker.tauntLine,
          stickerId: sticker.id,
          targetName,
          createdAtMs: now,
          customTitle: sticker.title,
          customBadge: sticker.badgeText,
          customColor: sticker.accentHex,
          customArt: sticker.artKind,
          rarity: sticker.rarity,
          soundKind: sticker.soundKind,
        };
        setLocalMessages((prev) => {
          const next = [...prev, msg];
          saveLocalChatHistory(next);
          return next;
        });

        // Personality-matched AI Bot comeback in chat!
        if (!sticker.id.startsWith('sig_')) {
          const targetedBot =
            activeGameState.seats.find((s) => s.isBot && s.name === targetName) ||
            activeGameState.seats.find((s) => s.isBot);
          if (targetedBot) {
            const replyText = pickBotTauntReply(targetedBot.botStyle, cleanSender);
            window.setTimeout(() => {
              setLocalMessages((prev) => {
                const replyMsg: ChatMessageItem = {
                  id: `bot_rep_${Date.now()}`,
                  roomId: 'LOCAL1',
                  senderId: targetedBot.id,
                  senderName: targetedBot.name,
                  kind: 'text',
                  text: replyText,
                  stickerId: '',
                  targetName: cleanSender,
                  createdAtMs: Date.now(),
                };
                const updated = [...prev, replyMsg];
                saveLocalChatHistory(updated);
                return updated;
              });
            }, 1100);
          }
        }
      }
    },
    [
      mode,
      activeRoomCode,
      user,
      onlineRoomDoc,
      playerName,
      careerStats.roundsWon,
      activeGameState.seats,
      fireTauntFeedback,
    ]
  );

  // Quick 1-tap taunt on losing player ("Zoar Lanterna")
  const handleQuickTauntLoser = useCallback(
    (targetName: string) => {
      const unlockedPool = stickersCatalog.filter((s) =>
        isStickerUnlocked(s, careerStats.roundsWon)
      );
      const randomSticker =
        unlockedPool[Math.floor(Math.random() * Math.max(1, unlockedPool.length))] ||
        BASE_ZUEIRA_STICKERS[0];
      handleSendSticker(randomSticker, targetName);
    },
    [stickersCatalog, careerStats.roundsWon, handleSendSticker]
  );

  // 2v2 Partner Secret Signal ("Sinal de Parceiro")
  const handleSendPartnerSignal = useCallback(
    (partnerName: string) => {
      const sig = PARTNER_SIGNALS[partnerSignalIdxRef.current % PARTNER_SIGNALS.length];
      partnerSignalIdxRef.current += 1;
      handleSendSticker(sig, partnerName);
    },
    [handleSendSticker]
  );

  // Pause & Resume Controls
  const handleTogglePause = useCallback(
    (nextPaused: boolean) => {
      if (mode === 'online' && activeRoomCode && user) {
        toggleOnlineRoomPause({
          roomCode: activeRoomCode,
          paused: nextPaused,
          actorUid: user.uid,
          actorName: playerName,
          currentState: activeGameState,
        }).catch(() => {});
      } else {
        setLocalPausedOpen(nextPaused);
        saveLocalMatchSnapshot({
          roomName: `Mesa Rápida (${localGameState.seats.length}P)`,
          roundNumber: localRoundNumber,
          isPaused: nextPaused,
          gameState: localGameState,
        });
        setHasSavedLocal(true);
      }
    },
    [
      mode,
      activeRoomCode,
      user,
      playerName,
      activeGameState,
      localGameState,
      localRoundNumber,
    ]
  );

  const handleSaveAndExitToTitle = () => {
    if (mode === 'local') {
      saveLocalMatchSnapshot({
        roomName: `Mesa Rápida (${localGameState.seats.length}P)`,
        roundNumber: localRoundNumber,
        isPaused: true,
        gameState: { ...localGameState, phase: 'paused' },
      });
      setHasSavedLocal(true);
      setLocalPausedOpen(false);
    }
    setChatOpen(false);
    setScreen('title');
  };

  const handleNextRound = () => {
    const scoreMap = new Map<string, number>();
    activeGameState.seats.forEach((s) => scoreMap.set(s.id, s.score));

    const seeds = activeGameState.seats.map((s) => ({
      id: s.id,
      name: s.name,
      isBot: s.isBot,
      botStyle: s.botStyle,
      avatarColor: s.avatarColor,
      score: scoreMap.get(s.id) ?? 0,
    }));
    const nextRoundNum = currentRoundNumber + 1;
    const fresh = dealNewRound(
      seeds,
      Math.random,
      nextRoundNum % seeds.length,
      activeGameState.houseRules ?? houseRules
    );
    setNewlyUnlockedStickers([]);
    setPendingWildCard(null);
    setPendingSwapPlay(null);
    setXrayPeek(null);
    setLocalPausedOpen(false);
    commitGameState(fresh, nextRoundNum);
  };

  const handleRestartTournament = () => {
    const zeroSeeds = activeGameState.seats.map((s) => ({
      id: s.id,
      name: s.name,
      isBot: s.isBot,
      botStyle: s.botStyle,
      avatarColor: s.avatarColor,
      score: 0,
    }));
    const fresh = dealNewRound(
      zeroSeeds,
      Math.random,
      0,
      activeGameState.houseRules ?? houseRules
    );
    setNewlyUnlockedStickers([]);
    setPendingWildCard(null);
    setPendingSwapPlay(null);
    setXrayPeek(null);
    setLocalPausedOpen(false);
    commitGameState(fresh, 1);
  };

  // Add an extra AI Bot seat dynamically during a match (up to 6 seats)
  const handleAddBotSeat = () => {
    if (activeGameState.seats.length >= 6 || activeGameState.houseRules?.teamMode2v2) return;
    const idx = activeGameState.seats.filter((s) => s.isBot).length;
    const fallback = BOT_ROSTER[idx % BOT_ROSTER.length];
    const custom = customBots[idx % Math.max(1, customBots.length)];
    const chosenName = custom?.name || fallback.name;
    const botId = `bot_${Date.now().toString(36).slice(-4)}`;
    const dealtHand = activeGameState.drawDeck.slice(0, 7);
    const remainingDeck = activeGameState.drawDeck.slice(7);

    const nextState: UnoGameState = {
      ...activeGameState,
      drawDeck: remainingDeck,
      lastActionText: `${chosenName} entrou na mesa!`,
      seats: [
        ...activeGameState.seats,
        {
          id: botId,
          name: chosenName,
          isBot: true,
          botStyle: custom?.style || fallback.style,
          avatarColor: custom?.avatarColor || fallback.avatarColor,
          score: 0,
          saidUno: false,
          hand: dealtHand,
        },
      ],
    };
    commitGameState(nextState);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      if (screen === 'title') {
        if (!multiplayerModalOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleStartQuickMatch();
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (pendingWildCard) {
          setPendingWildCard(null);
        } else if (pendingSwapPlay) {
          setPendingSwapPlay(null);
        } else if (e.key === 'Escape' && historyOpen) {
          setHistoryOpen(false);
        } else if (e.key === 'Escape' && chatOpen) {
          setChatOpen(false);
        } else if (!isRoundOverModalOpen) {
          handleTogglePause(!isPausedModalOpen);
        }
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setHistoryOpen((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleToggleVibration();
        return;
      }

      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setChatOpen((prev) => !prev);
        return;
      }

      if (isPausedModalOpen || isRoundOverModalOpen || pendingWildCard || pendingSwapPlay) return;

      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleShoutUno();
        return;
      }

      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSortHand();
        return;
      }

      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDoubleStakes();
        return;
      }

      const myTurn =
        activeGameState.phase === 'playing' &&
        activeGameState.seats[activeGameState.currentTurnIndex]?.id === currentPlayerId;

      if (!myTurn) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (activeGameState.drawnPlayableCardId) {
          handlePassAfterDraw();
        } else {
          handleDrawCard();
        }
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
        const card = mySeat?.hand[idx];
        const topDiscard = activeGameState.discardPile[activeGameState.discardPile.length - 1];
        if (
          card &&
          canPlayCard(
            card,
            topDiscard,
            activeGameState.activeColor,
            activeGameState.pendingDraw,
            activeGameState.drawnPlayableCardId
          )
        ) {
          e.preventDefault();
          handlePlayCardRequest(card);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    multiplayerModalOpen,
    pendingWildCard,
    pendingSwapPlay,
    historyOpen,
    chatOpen,
    isRoundOverModalOpen,
    isPausedModalOpen,
    activeGameState,
    currentPlayerId,
    handleStartQuickMatch,
    handleTogglePause,
    handleToggleMute,
    handleToggleVibration,
    handleShoutUno,
    handleSortHand,
    handleDoubleStakes,
    handlePassAfterDraw,
    handleDrawCard,
    handlePlayCardRequest,
  ]);

  // Google Auth & Multiplayer Room Actions
  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    try {
      await signInWithGooglePopup();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleLogout = async () => {
    setAuthBusy(true);
    try {
      await signOutFirebase();
      setMode('local');
      setActiveRoomCode(null);
      setOnlineRoomDoc(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCreateOnlineRoom = async (params: {
    roomName: string;
    maxPlayers: number;
    botCount: number;
    startImmediately: boolean;
  }) => {
    if (!user) return;
    const code = await createOnlineRoom({
      user,
      ...params,
      houseRules,
      customBots,
    });
    setMode('online');
    setActiveRoomCode(code);
    setMultiplayerModalOpen(false);
    setScreen('playing');
  };

  const handleJoinOnlineByCode = async (code: string) => {
    if (!user) return;
    const joinedCode = await joinOnlineRoomByCode(user, code);
    setMode('online');
    setActiveRoomCode(joinedCode);
    setMultiplayerModalOpen(false);
    setScreen('playing');
  };

  const handleResumeOnlineRoom = (code: string) => {
    setMode('online');
    setActiveRoomCode(code);
    setMultiplayerModalOpen(false);
    setScreen('playing');
  };

  const mySeat = activeGameState.seats.find((s) => s.id === currentPlayerId);
  const canCounterActiveChallenge = Boolean(
    mySeat?.hand.some(
      (c) =>
        c.value === 'shield' ||
        (c.value === 'wild4' && activeGameState.houseRules?.stackDrawCards)
    )
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#072818]">
      {/* Non-Intrusive Offline PWA Indicator */}
      {!isOnlineNetwork && (
        <div className="fixed bottom-3 left-3 z-50 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-lg">
          Modo Offline — Partida local + IA disponível
        </div>
      )}

      {screen === 'title' ? (
        <TitleScreen
          playerName={playerName}
          onChangePlayerName={handleChangePlayerName}
          totalSeats={totalSeats}
          onChangeTotalSeats={setTotalSeats}
          customBots={customBots}
          onChangeCustomBots={handleChangeCustomBots}
          houseRules={houseRules}
          onChangeHouseRules={handleChangeHouseRules}
          appearance={appearance}
          onChangeAppearance={handleChangeAppearance}
          careerStats={careerStats}
          unlockedSpecialCount={unlockedSpecialCount}
          user={user}
          authBusy={authBusy}
          isOnlineNetwork={isOnlineNetwork}
          muted={muted}
          vibrationEnabled={vibrationEnabled}
          hasSavedMatch={hasSavedLocal}
          savedMatchLabel={`Rodada ${localRoundNumber} · ${localGameState.seats.length} jogadores`}
          onlineRoomsCount={userRooms.length}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onStartQuickMatch={handleStartQuickMatch}
          onResumeSavedMatch={handleResumeSavedLocal}
          onOpenMultiplayer={() => setMultiplayerModalOpen(true)}
        />
      ) : (
        <GameTableView
          mode={mode}
          roomCode={activeRoomCode}
          roomName={currentRoomName}
          roundNumber={currentRoundNumber}
          gameState={activeGameState}
          currentPlayerId={currentPlayerId}
          tableTheme={activeTableTheme}
          cardBack={activeCardBack}
          turnSecondsLeft={turnSecondsLeft}
          xrayPeek={xrayPeek}
          muted={muted}
          vibrationEnabled={vibrationEnabled}
          unreadCount={unreadCount}
          roundsWon={careerStats.roundsWon}
          activeTaunt={activeTaunt}
          stickersCatalog={allStickersWithSignals}
          tableShaking={tableShaking}
          moveHistory={moveHistory}
          activeMoveFx={activeMoveFx}
          aiSpeed={aiSpeed}
          onCycleAiSpeed={handleCycleAiSpeed}
          onOpenHistory={() => setHistoryOpen(true)}
          onPlayCardRequest={handlePlayCardRequest}
          onJumpInCardRequest={handleJumpInCardRequest}
          onPlayNumberCombo={handlePlayNumberCombo}
          onDoubleStakes={handleDoubleStakes}
          onSendPartnerSignal={handleSendPartnerSignal}
          onDrawCard={handleDrawCard}
          onPassAfterDraw={handlePassAfterDraw}
          onSortHand={handleSortHand}
          onShoutUno={handleShoutUno}
          onCatchOpponentUno={handleCatchOpponentUno}
          onToggleChat={() => setChatOpen((prev) => !prev)}
          onQuickTauntLoser={handleQuickTauntLoser}
          onSendQuickSticker={handleSendSticker}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onOpenPause={() => handleTogglePause(true)}
          onAddBotSeat={handleAddBotSeat}
        />
      )}

      {/* Zero-GC Pooled Particle Sparks & Shockwave Rings Overlay */}
      <TableJuiceOverlay burst={juiceBurst} />

      {/* Chronological Move History Drawer + AI Speed Control */}
      <MoveHistoryDrawer
        open={historyOpen && screen === 'playing'}
        mode={mode}
        roundNumber={currentRoundNumber}
        entries={moveHistory}
        aiSpeed={aiSpeed}
        cardBack={activeCardBack}
        onChangeAiSpeed={handleChangeAiSpeed}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Persistent Chat & Zueira Stickers Drawer + Custom Card Studio */}
      <ChatAndStickersDrawer
        open={chatOpen && screen === 'playing'}
        onClose={() => setChatOpen(false)}
        messages={currentMessages}
        seats={activeGameState.seats}
        currentPlayerId={currentPlayerId}
        roundsWon={careerStats.roundsWon}
        stickersCatalog={stickersCatalog}
        onSendText={handleSendText}
        onSendSticker={handleSendSticker}
        onSaveStickerCustomization={handleSaveStickerCustomization}
        onResetBaseSticker={handleResetBaseSticker}
        onDeleteCustomSticker={handleDeleteCustomSticker}
      />

      {/* Online Multiplayer Rooms Modal */}
      <MultiplayerModal
        open={multiplayerModalOpen}
        onClose={() => setMultiplayerModalOpen(false)}
        user={user}
        authBusy={authBusy}
        userRooms={userRooms}
        houseRules={houseRules}
        initialJoinCode={inviteRoomParam}
        onGoogleLogin={handleGoogleLogin}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinByCode={handleJoinOnlineByCode}
        onResumeOnlineRoom={handleResumeOnlineRoom}
      />

      {/* Wild / Shield / X-Ray Card Color Chooser */}
      <WildColorModal
        pendingCard={pendingWildCard}
        myHand={mySeat?.hand}
        activeColor={activeGameState.activeColor}
        bluffChallengeEnabled={Boolean(activeGameState.houseRules?.bluffChallengeWild4)}
        onChooseColor={handleConfirmWildColor}
        onCancel={() => setPendingWildCard(null)}
      />

      {/* 7-Card Hand Swap Target Picker */}
      <SwapHandModal
        open={Boolean(pendingSwapPlay)}
        opponents={activeGameState.seats.filter((s) => s.id !== currentPlayerId)}
        myTeamId={mySeat?.teamId}
        onSelectTarget={handleConfirmSwapTarget}
        onCancel={() => setPendingSwapPlay(null)}
      />

      {/* Official Wild +4 Bluff Challenge ("DUVIDO!") Modal */}
      <Wild4ChallengeModal
        open={isWild4ChallengeModalOpen}
        attackerName={activeGameState.challengeAttackerName || 'Adversário'}
        prevColorLabel={
          activeGameState.challengePrevColor
            ? colorLabelPt(activeGameState.challengePrevColor)
            : 'a cor da mesa'
        }
        pendingDraw={activeGameState.pendingDraw}
        canCounterWithCard={canCounterActiveChallenge}
        onChallengeBluff={() => handleResolveWild4Challenge('challenge')}
        onAcceptDraw={() => handleResolveWild4Challenge('accept')}
        onDismissToCounter={() => setDismissedChallengeKey(currentChallengeKey)}
      />

      {/* Pause & Save-For-Later Modal */}
      <PauseModal
        open={isPausedModalOpen}
        roomLabel={currentRoomName}
        pausedByName={mode === 'online' ? onlineRoomDoc?.pausedByName : undefined}
        roundNumber={currentRoundNumber}
        playerCardsCount={mySeat?.hand.length ?? 0}
        savedMessagesCount={currentMessages.length}
        roundsWon={careerStats.roundsWon}
        appearance={appearance}
        muted={muted}
        vibrationEnabled={vibrationEnabled}
        canAddBot={activeGameState.seats.length < 6 && !activeGameState.houseRules?.teamMode2v2}
        onChangeAppearance={handleChangeAppearance}
        onToggleMute={handleToggleMute}
        onToggleVibration={handleToggleVibration}
        onAddBot={() => {
          handleAddBotSeat();
          handleTogglePause(false);
        }}
        onResume={() => handleTogglePause(false)}
        onSaveAndExitToTitle={handleSaveAndExitToTitle}
        onRestartRound={() => {
          handleTogglePause(false);
          handleNextRound();
        }}
      />

      {/* Round Over / Victory Modal + Pódio da Zueira + Shareable PNG Scorecard */}
      <RoundOverModal
        open={isRoundOverModalOpen}
        winnerId={activeGameState.winnerId}
        winnerName={activeGameState.winnerName}
        winningTeamId={activeGameState.winningTeamId}
        stakesMultiplier={activeGameState.stakesMultiplier}
        targetScore={activeGameState.houseRules?.targetScore || 0}
        currentPlayerId={currentPlayerId}
        roundNumber={currentRoundNumber}
        seats={activeGameState.seats}
        newlyUnlockedStickers={newlyUnlockedStickers}
        onNextRound={handleNextRound}
        onRestartTournament={handleRestartTournament}
        onExitToTitle={() => {
          setChatOpen(false);
          setScreen('title');
        }}
      />
    </div>
  );
}
