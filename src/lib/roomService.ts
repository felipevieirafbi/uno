import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BOT_ROSTER,
  DEFAULT_HOUSE_RULES,
  dealNewRound,
  deserializeGameState,
  serializeGameState,
  type AvatarColor,
  type HouseRulesConfig,
  type PlayerSeat,
  type SerializedStatePayload,
  type UnoGameState,
} from '../game/unoRules';

import type { CustomBotConfig } from './playerStats';
import type { StickerArtKind, StickerRarity, ZueiraSticker } from '../game/stickers';
import type { TauntSoundKind } from '../game/soundEffects';

export interface LiveTauntEvent {
  id: string;
  stickerId: string;
  senderId: string;
  senderName: string;
  targetName: string;
  sentAtMs: number;
  customTitle?: string;
  customLine?: string;
  customBadge?: string;
  customColor?: string;
  customArt?: StickerArtKind;
  rarity?: StickerRarity;
  soundKind?: TauntSoundKind;
}

export interface OnlineRoomDoc {
  code: string;
  roomName: string;
  hostId: string;
  hostName: string;
  status: 'waiting' | 'playing' | 'paused' | 'archived';
  pausedBy: string;
  pausedByName: string;
  maxPlayers: number;
  playerIds: string[];
  roundNumber: number;
  statePayload: SerializedStatePayload;
  lastTaunt: LiveTauntEvent;
  updatedAtMs: number;
}

export interface ChatMessageItem {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  kind: 'text' | 'sticker' | 'system';
  text: string;
  stickerId: string;
  targetName: string;
  createdAtMs: number;
  customTitle?: string;
  customBadge?: string;
  customColor?: string;
  customArt?: StickerArtKind;
  rarity?: StickerRarity;
  soundKind?: TauntSoundKind;
}

// Validation constants synchronized verbatim with firebase-blueprint.json
export const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MAX_DISPLAY_NAME = 40;
export const MAX_ROOM_NAME = 50;
export const MAX_CHAT_TEXT = 280;

const AVATAR_COLORS: AvatarColor[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export function sanitizeDisplayName(raw: string | null | undefined, fallback = 'Jogador'): string {
  const cleaned = (raw || '').trim().slice(0, MAX_DISPLAY_NAME);
  return cleaned.length >= 1 ? cleaned : fallback;
}

export function sanitizeRoomName(raw: string | null | undefined): string {
  const cleaned = (raw || '').trim().slice(0, MAX_ROOM_NAME);
  return cleaned.length >= 1 ? cleaned : 'Mesa da Galera';
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function buildRoomInviteUrl(code: string): string {
  if (typeof window === 'undefined') return `/?room=${code}`;
  const url = new URL(window.location.origin);
  url.searchParams.set('room', code.trim().toUpperCase());
  return url.toString();
}

export async function ensureUserPublicProfile(
  user: User,
  preferredColor: AvatarColor = 'red'
): Promise<void> {
  if (!VALID_ID_REGEX.test(user.uid)) return;
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = sanitizeDisplayName(user.displayName || user.email?.split('@')[0]);
  const color = AVATAR_COLORS.includes(preferredColor) ? preferredColor : 'red';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        avatarColor: color,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        avatarColor: color,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function createOnlineRoom(params: {
  user: User;
  roomName: string;
  maxPlayers: number;
  botCount: number;
  startImmediately: boolean;
  houseRules?: HouseRulesConfig;
  customBots?: CustomBotConfig[];
}): Promise<string> {
  const code = generateRoomCode();
  const hostName = sanitizeDisplayName(params.user.displayName || params.user.email?.split('@')[0]);
  const roomName = sanitizeRoomName(params.roomName);
  const maxPlayers = Math.max(2, Math.min(6, Math.round(params.maxPlayers)));
  const clampedBots = Math.max(0, Math.min(maxPlayers - 1, Math.round(params.botCount)));

  const seatsSeed: Array<Omit<PlayerSeat, 'hand' | 'saidUno'>> = [
    {
      id: params.user.uid,
      name: hostName,
      isBot: false,
      botStyle: 'calm',
      avatarColor: 'red',
      score: 0,
    },
  ];

  for (let i = 0; i < clampedBots; i++) {
    const fallbackBot = BOT_ROSTER[i % BOT_ROSTER.length];
    const customBot = params.customBots?.[i];
    seatsSeed.push({
      id: `bot_${i + 1}`,
      name: sanitizeDisplayName(customBot?.name, fallbackBot.name),
      isBot: true,
      botStyle: customBot?.style || fallbackBot.style,
      avatarColor: customBot?.avatarColor || fallbackBot.avatarColor,
      score: 0,
    });
  }

  const shouldPlayNow = params.startImmediately && seatsSeed.length >= 2;
  const dealt = dealNewRound(seatsSeed, Math.random, 0, params.houseRules ?? DEFAULT_HOUSE_RULES);
  const initialGameState: UnoGameState = shouldPlayNow
    ? dealt
    : { ...dealt, phase: 'lobby', lastActionText: `Sala ${code} aguardando amigos...` };

  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);
  const memberRef = doc(db, 'rooms', code, 'members', params.user.uid);

  try {
    const batch = writeBatch(db);
    batch.set(roomRef, {
      code,
      roomName,
      hostId: params.user.uid,
      hostName,
      status: shouldPlayNow ? 'playing' : 'waiting',
      pausedBy: '',
      pausedByName: '',
      maxPlayers,
      playerIds: [params.user.uid],
      roundNumber: 1,
      statePayload: serializeGameState(initialGameState),
      lastTaunt: {
        id: 'init',
        stickerId: '',
        senderId: params.user.uid,
        senderName: hostName,
        targetName: '',
        sentAtMs: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(memberRef, {
      roomId: code,
      uid: params.user.uid,
      displayName: hostName,
      avatarColor: 'red',
      role: 'host',
      joinedAt: serverTimestamp(),
    });

    await batch.commit();
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }
}

export async function joinOnlineRoomByCode(user: User, rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(code)) {
    throw new Error('Digite um código válido de 6 letras/números (ex: MESA42).');
  }

  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);
  let snap;
  try {
    snap = await getDoc(roomRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
  }

  if (!snap.exists()) {
    throw new Error(`Sala ${code} não encontrada. Confira o código com seu amigo!`);
  }

  const data = snap.data() as Omit<OnlineRoomDoc, 'updatedAtMs'>;
  if (data.status === 'archived') {
    throw new Error('Esta sala já foi encerrada.');
  }

  // Already a member -> simply enter/resume!
  if (data.playerIds.includes(user.uid)) {
    return code;
  }

  if (data.playerIds.length >= data.maxPlayers || data.playerIds.length >= 6) {
    throw new Error('Esta mesa já atingiu o limite máximo de jogadores humanos.');
  }

  const joinerName = sanitizeDisplayName(user.displayName || user.email?.split('@')[0]);
  const colorChoice = AVATAR_COLORS[data.playerIds.length % AVATAR_COLORS.length];
  const currentState = deserializeGameState(data.statePayload);

  const nextSeats = [...currentState.seats];
  // If seats are full because of AI bots, replace the last AI bot seat with the real friend!
  if (nextSeats.length >= data.maxPlayers) {
    const botIdx = [...nextSeats].reverse().findIndex((s) => s.isBot);
    if (botIdx !== -1) {
      const actualIdx = nextSeats.length - 1 - botIdx;
      const inheritedHand = nextSeats[actualIdx].hand;
      nextSeats[actualIdx] = {
        id: user.uid,
        name: joinerName,
        isBot: false,
        botStyle: 'calm',
        avatarColor: colorChoice,
        score: 0,
        saidUno: false,
        hand: inheritedHand,
      };
    } else {
      throw new Error('Todos os lugares da mesa já estão ocupados.');
    }
  } else {
    // Deal 7 cards from drawDeck if game already started, or empty/dealt hand
    const dealtHand = currentState.drawDeck.slice(0, 7);
    const remainingDeck = currentState.drawDeck.slice(7);
    currentState.drawDeck = remainingDeck;
    nextSeats.push({
      id: user.uid,
      name: joinerName,
      isBot: false,
      botStyle: 'calm',
      avatarColor: colorChoice,
      score: 0,
      saidUno: false,
      hand: dealtHand,
    });
  }

  const updatedState: UnoGameState = {
    ...currentState,
    seats: nextSeats,
    lastActionText: `${joinerName} entrou na mesa!`,
  };

  const memberRef = doc(db, 'rooms', code, 'members', user.uid);
  try {
    const batch = writeBatch(db);
    batch.update(roomRef, {
      playerIds: [...data.playerIds, user.uid],
      statePayload: serializeGameState(updatedState),
      updatedAt: serverTimestamp(),
    });
    batch.set(memberRef, {
      roomId: code,
      uid: user.uid,
      displayName: joinerName,
      avatarColor: colorChoice,
      role: 'player',
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

export async function pushRoomGameState(params: {
  roomCode: string;
  nextState: UnoGameState;
  status: 'waiting' | 'playing';
  roundNumber: number;
}): Promise<void> {
  const path = `rooms/${params.roomCode}`;
  try {
    await updateDoc(doc(db, 'rooms', params.roomCode), {
      status: params.status,
      pausedBy: '',
      pausedByName: '',
      roundNumber: Math.max(1, Math.min(9999, params.roundNumber)),
      statePayload: serializeGameState(params.nextState),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleOnlineRoomPause(params: {
  roomCode: string;
  paused: boolean;
  actorUid: string;
  actorName: string;
  currentState: UnoGameState;
}): Promise<void> {
  const path = `rooms/${params.roomCode}`;
  const cleanName = sanitizeDisplayName(params.actorName);
  const nextGameState: UnoGameState = {
    ...params.currentState,
    phase: params.paused ? 'paused' : 'playing',
    lastActionText: params.paused
      ? `Partida pausada por ${cleanName}. Vocês podem continuar quando quiserem!`
      : `${cleanName} retomou a partida!`,
  };
  try {
    await updateDoc(doc(db, 'rooms', params.roomCode), {
      status: params.paused ? 'paused' : 'playing',
      pausedBy: params.paused ? params.actorUid.slice(0, 128) : '',
      pausedByName: params.paused ? cleanName : '',
      statePayload: serializeGameState(nextGameState),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function sendOnlineChatOrSticker(params: {
  roomCode: string;
  senderId: string;
  senderName: string;
  visibleToUids: string[];
  kind: 'text' | 'sticker';
  text: string;
  stickerId?: string;
  targetName?: string;
  stickerObj?: ZueiraSticker;
}): Promise<void> {
  const trimmedText = params.text.trim().slice(0, MAX_CHAT_TEXT);
  if (!trimmedText) return;

  const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const msgPath = `rooms/${params.roomCode}/messages/${msgId}`;
  const cleanSender = sanitizeDisplayName(params.senderName);
  const cleanTarget = (params.targetName || '').trim().slice(0, MAX_DISPLAY_NAME);
  const cleanSticker = (params.stickerId || '').trim().slice(0, 40);
  const visible = Array.from(new Set([params.senderId, ...params.visibleToUids])).slice(0, 6);
  const nowMs = Date.now();
  const st = params.stickerObj;

  try {
    const msgPayload: Record<string, unknown> = {
      roomId: params.roomCode,
      senderId: params.senderId,
      senderName: cleanSender,
      kind: params.kind,
      text: trimmedText,
      stickerId: cleanSticker,
      targetName: cleanTarget,
      visibleToUids: visible,
      createdAtMs: nowMs,
      createdAt: serverTimestamp(),
    };

    if (params.kind === 'sticker' && st) {
      msgPayload.customTitle = st.title.slice(0, 32);
      msgPayload.customBadge = st.badgeText.slice(0, 8);
      msgPayload.customColor = st.accentHex.slice(0, 12);
      msgPayload.customArt = st.artKind.slice(0, 24);
      msgPayload.rarity = st.rarity;
      msgPayload.soundKind = st.soundKind.slice(0, 16);
    }

    await setDoc(doc(db, 'rooms', params.roomCode, 'messages', msgId), msgPayload);

    if (params.kind === 'sticker' && cleanSticker) {
      const tauntPayload: Record<string, unknown> = {
        id: msgId,
        stickerId: cleanSticker,
        senderId: params.senderId,
        senderName: cleanSender,
        targetName: cleanTarget,
        sentAtMs: nowMs,
      };
      if (st) {
        tauntPayload.customTitle = st.title.slice(0, 32);
        tauntPayload.customLine = st.tauntLine.slice(0, 96);
        tauntPayload.customBadge = st.badgeText.slice(0, 8);
        tauntPayload.customColor = st.accentHex.slice(0, 12);
        tauntPayload.customArt = st.artKind.slice(0, 24);
        tauntPayload.rarity = st.rarity;
        tauntPayload.soundKind = st.soundKind.slice(0, 16);
      }
      await updateDoc(doc(db, 'rooms', params.roomCode), {
        lastTaunt: tauntPayload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

export function subscribeToUserRooms(
  uid: string,
  onUpdate: (rooms: OnlineRoomDoc[]) => void
): Unsubscribe {
  const path = 'rooms';
  const q = query(collection(db, 'rooms'), where('playerIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: OnlineRoomDoc[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (raw.status === 'archived') return;
        const tsMillis =
          raw.updatedAt && typeof raw.updatedAt.toMillis === 'function'
            ? raw.updatedAt.toMillis()
            : Date.now();
        list.push({
          code: raw.code,
          roomName: raw.roomName,
          hostId: raw.hostId,
          hostName: raw.hostName,
          status: raw.status,
          pausedBy: raw.pausedBy || '',
          pausedByName: raw.pausedByName || '',
          maxPlayers: raw.maxPlayers,
          playerIds: raw.playerIds || [],
          roundNumber: raw.roundNumber || 1,
          statePayload: raw.statePayload,
          lastTaunt: raw.lastTaunt,
          updatedAtMs: tsMillis,
        });
      });
      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToRoomDoc(
  roomCode: string,
  onUpdate: (room: OnlineRoomDoc | null) => void
): Unsubscribe {
  const path = `rooms/${roomCode}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const raw = snap.data();
      const tsMillis =
        raw.updatedAt && typeof raw.updatedAt.toMillis === 'function'
          ? raw.updatedAt.toMillis()
          : Date.now();
      onUpdate({
        code: raw.code,
        roomName: raw.roomName,
        hostId: raw.hostId,
        hostName: raw.hostName,
        status: raw.status,
        pausedBy: raw.pausedBy || '',
        pausedByName: raw.pausedByName || '',
        maxPlayers: raw.maxPlayers,
        playerIds: raw.playerIds || [],
        roundNumber: raw.roundNumber || 1,
        statePayload: raw.statePayload,
        lastTaunt: raw.lastTaunt,
        updatedAtMs: tsMillis,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToRoomMessages(
  roomCode: string,
  currentUid: string,
  onUpdate: (messages: ChatMessageItem[]) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/messages`;
  const q = query(
    collection(db, 'rooms', roomCode, 'messages'),
    where('visibleToUids', 'array-contains', currentUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: ChatMessageItem[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        items.push({
          id: d.id,
          roomId: raw.roomId,
          senderId: raw.senderId,
          senderName: raw.senderName,
          kind: raw.kind,
          text: raw.text,
          stickerId: raw.stickerId || '',
          targetName: raw.targetName || '',
          createdAtMs: typeof raw.createdAtMs === 'number' ? raw.createdAtMs : 0,
          customTitle: raw.customTitle,
          customBadge: raw.customBadge,
          customColor: raw.customColor,
          customArt: raw.customArt,
          rarity: raw.rarity,
          soundKind: raw.soundKind,
        });
      });
      items.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
