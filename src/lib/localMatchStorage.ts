import {
  deserializeGameState,
  serializeGameState,
  type SerializedStatePayload,
  type UnoGameState,
} from '../game/unoRules';
import type { ChatMessageItem } from './roomService';

const LOCAL_MATCH_KEY = 'unozueira_saved_local_match_v1';
const LOCAL_CHAT_KEY = 'unozueira_saved_local_chat_v1';

export interface SavedLocalMatch {
  roomName: string;
  roundNumber: number;
  isPaused: boolean;
  savedAtMs: number;
  statePayload: SerializedStatePayload;
}

export function loadSavedLocalMatch(): {
  roomName: string;
  roundNumber: number;
  isPaused: boolean;
  savedAtMs: number;
  gameState: UnoGameState;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLocalMatch;
    if (!parsed || !parsed.statePayload || !Array.isArray(parsed.statePayload.seats)) {
      return null;
    }
    return {
      roomName: parsed.roomName || 'Mesa Local + IA',
      roundNumber: parsed.roundNumber || 1,
      isPaused: Boolean(parsed.isPaused),
      savedAtMs: parsed.savedAtMs || Date.now(),
      gameState: deserializeGameState(parsed.statePayload),
    };
  } catch {
    return null;
  }
}

export function saveLocalMatchSnapshot(params: {
  roomName: string;
  roundNumber: number;
  isPaused: boolean;
  gameState: UnoGameState;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const record: SavedLocalMatch = {
      roomName: params.roomName,
      roundNumber: params.roundNumber,
      isPaused: params.isPaused,
      savedAtMs: Date.now(),
      statePayload: serializeGameState(params.gameState),
    };
    window.localStorage.setItem(LOCAL_MATCH_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota issues
  }
}

export function clearLocalMatchSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_MATCH_KEY);
  } catch {
    // Ignore
  }
}

export function loadLocalChatHistory(): ChatMessageItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_KEY);
    if (!raw) {
      return [
        {
          id: 'seed_welcome_1',
          roomId: 'LOCAL1',
          senderId: 'bot_1',
          senderName: 'Tia Zuleide (IA)',
          kind: 'text',
          text: 'Já embaralhei o +4! Quero ver quem vai chorar primeiro hoje!',
          stickerId: '',
          targetName: '',
          createdAtMs: Date.now() - 60000,
        },
      ];
    }
    const parsed = JSON.parse(raw) as ChatMessageItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalChatHistory(messages: ChatMessageItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const bounded = messages.slice(-150);
    window.localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(bounded));
  } catch {
    // Ignore
  }
}
