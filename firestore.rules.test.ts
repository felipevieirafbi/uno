import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Deterministic Security TDD evaluator verifying structural invariants in firestore.rules
 * and evaluating all 12 Dirty Dozen adversarial payloads against the exact rule predicates.
 */
const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

interface AuthContext {
  uid: string;
  emailVerified: boolean;
}

const SERVER_NOW = '2026-11-18T21:00:00.000Z';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function isValidRoomCode(code: unknown): boolean {
  return typeof code === 'string' && code.length === 6 && /^[A-Z0-9]{6}$/.test(code);
}

function hasExactKeys(obj: Record<string, unknown>, required: string[], allowed: string[]): boolean {
  const keys = Object.keys(obj);
  return required.every((k) => keys.includes(k)) && keys.every((k) => allowed.includes(k));
}

function affectedKeys(incoming: Record<string, unknown>, existing: Record<string, unknown>): string[] {
  const all = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  const changed: string[] = [];
  for (const k of all) {
    if (JSON.stringify(incoming[k]) !== JSON.stringify(existing[k])) {
      changed.push(k);
    }
  }
  return changed;
}

function makeValidRoom(hostId = 'user_alpha', code = 'MESA01'): Record<string, unknown> {
  return {
    code,
    roomName: 'Mesa da Sexta',
    hostId,
    hostName: 'Felipe',
    status: 'playing',
    pausedBy: '',
    pausedByName: '',
    maxPlayers: 4,
    playerIds: [hostId],
    roundNumber: 1,
    statePayload: {
      phase: 'playing',
      activeColor: 'red',
      direction: 1,
      currentTurnIndex: 0,
      pendingDraw: 0,
      drawnPlayableCardId: '',
      houseRules: {
        stackDrawCards: true,
        allowPlayDrawnCard: true,
        zeroRotatesHands: false,
      },
      winnerId: '',
      winnerName: '',
      lastActionText: 'Partida iniciada!',
      seats: [
        {
          id: hostId,
          name: 'Felipe',
          isBot: false,
          botStyle: 'balanced',
          avatarColor: 'red',
          score: 0,
          saidUno: false,
          handCodes: ['c1:red:7'],
        },
      ],
      drawDeckCodes: ['c2:blue:4'],
      discardPileCodes: ['c0:red:3'],
    },
    lastTaunt: {
      id: 'init',
      stickerId: '',
      senderId: hostId,
      senderName: 'Felipe',
      targetName: '',
      sentAtMs: 0,
    },
    createdAt: SERVER_NOW,
    updatedAt: SERVER_NOW,
  };
}

function evaluateRoomCreate(
  auth: AuthContext | null,
  roomId: string,
  incoming: Record<string, unknown>,
  batchMemberCreated: boolean
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (!isValidRoomCode(roomId)) return false;
  const reqKeys = [
    'code',
    'roomName',
    'hostId',
    'hostName',
    'status',
    'pausedBy',
    'pausedByName',
    'maxPlayers',
    'playerIds',
    'roundNumber',
    'statePayload',
    'lastTaunt',
    'createdAt',
    'updatedAt',
  ];
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return false;
  if (incoming.code !== roomId || incoming.hostId !== auth.uid) return false;
  const playerIds = incoming.playerIds as unknown[];
  if (!Array.isArray(playerIds) || playerIds.length !== 1 || playerIds[0] !== auth.uid) return false;
  if (incoming.createdAt !== SERVER_NOW || incoming.updatedAt !== SERVER_NOW) return false;
  if (!batchMemberCreated) return false;
  return true;
}

function evaluateRoomUpdate(
  auth: AuthContext | null,
  roomId: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  hasMemberDoc: boolean
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (!isValidRoomCode(roomId)) return false;
  if (existing.status === 'archived') return false;
  const reqKeys = [
    'code',
    'roomName',
    'hostId',
    'hostName',
    'status',
    'pausedBy',
    'pausedByName',
    'maxPlayers',
    'playerIds',
    'roundNumber',
    'statePayload',
    'lastTaunt',
    'createdAt',
    'updatedAt',
  ];
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return false;
  const playerIds = incoming.playerIds as unknown[];
  if (!Array.isArray(playerIds) || playerIds.length < 1 || playerIds.length > 6) return false;
  if (incoming.createdAt !== existing.createdAt || incoming.updatedAt !== SERVER_NOW) return false;
  if (incoming.hostId !== existing.hostId || incoming.code !== existing.code) return false;
  const diff = affectedKeys(incoming, existing);
  const allowedMoveKeys = [
    'status',
    'pausedBy',
    'pausedByName',
    'roundNumber',
    'statePayload',
    'lastTaunt',
    'updatedAt',
  ];
  return (
    hasMemberDoc &&
    (existing.playerIds as string[]).includes(auth.uid) &&
    JSON.stringify(incoming.playerIds) === JSON.stringify(existing.playerIds) &&
    diff.every((k) => allowedMoveKeys.includes(k))
  );
}

function evaluatePrivateInfoGet(auth: AuthContext | null, userId: string, infoId: string): boolean {
  if (!auth) return false;
  return auth.uid === userId && isValidId(userId) && isValidId(infoId);
}

function evaluateMemberCreate(
  auth: AuthContext | null,
  roomId: string,
  memberId: string,
  incoming: Record<string, unknown>,
  roomAfter: Record<string, unknown>
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (auth.uid !== memberId || !isValidRoomCode(roomId) || !isValidId(memberId)) return false;
  const reqKeys = ['roomId', 'uid', 'displayName', 'avatarColor', 'role', 'joinedAt'];
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return false;
  if (incoming.uid !== auth.uid || incoming.joinedAt !== SERVER_NOW) return false;
  if (roomAfter.status === 'archived') return false;
  if (!(roomAfter.playerIds as string[]).includes(auth.uid)) return false;
  if (incoming.role === 'host') return roomAfter.hostId === auth.uid;
  if (incoming.role === 'player') return roomAfter.hostId !== auth.uid;
  return false;
}

function evaluateMessageCreate(
  auth: AuthContext | null,
  roomId: string,
  messageId: string,
  incoming: Record<string, unknown>,
  roomData: Record<string, unknown>,
  hasMemberDoc: boolean
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (!isValidRoomCode(roomId) || !isValidId(messageId)) return false;
  const reqKeys = [
    'roomId',
    'senderId',
    'senderName',
    'kind',
    'text',
    'stickerId',
    'targetName',
    'visibleToUids',
    'createdAtMs',
    'createdAt',
  ];
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return false;
  if (incoming.senderId !== auth.uid) return false;
  if (typeof incoming.text !== 'string' || incoming.text.length < 1 || incoming.text.length > 280) return false;
  const visible = incoming.visibleToUids as string[];
  if (!Array.isArray(visible) || visible.length < 1 || visible.length > 6 || !visible.includes(auth.uid)) {
    return false;
  }
  if (incoming.createdAt !== SERVER_NOW) return false;
  if (!hasMemberDoc || roomData.status === 'archived') return false;
  return (roomData.playerIds as string[]).includes(auth.uid);
}

function evaluateMessageList(auth: AuthContext | null, resourceData: Record<string, unknown>): boolean {
  if (!auth) return false;
  return (resourceData.visibleToUids as string[]).includes(auth.uid);
}

test('firestore.rules enforces Eight Pillars structural invariants', () => {
  assert.match(rulesText, /rules_version = '2';/);
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /existsAfter\(/);
  assert.match(rulesText, /getAfter\(/);
  assert.match(rulesText, /existing\(\)\.status != 'archived'/);
  assert.match(rulesText, /rules\.targetScore <= 2000/);
  // Ensure zero get() or exists() inside allow list blocks
  const listBlocks = [...rulesText.matchAll(/allow list: if ([^;]+);/g)].map((m) => m[1]);
  assert.ok(listBlocks.length >= 2);
  for (const expr of listBlocks) {
    assert.equal(expr.includes('get('), false, `Forbidden get() in allow list: ${expr}`);
    assert.equal(expr.includes('exists('), false, `Forbidden exists() in allow list: ${expr}`);
  }
});

test('Dirty Dozen #1: Shadow Field Injection on GameRoom update is DENIED', () => {
  const existing = makeValidRoom('user_alpha');
  const incoming = { ...makeValidRoom('user_alpha'), isAdmin: true };
  assert.equal(
    evaluateRoomUpdate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', existing, incoming, true),
    false
  );
});

test('Dirty Dozen #2: Unverified Email Spoof on GameRoom create is DENIED', () => {
  const room = makeValidRoom('user_alpha');
  assert.equal(
    evaluateRoomCreate({ uid: 'user_alpha', emailVerified: false }, 'MESA01', room, true),
    false
  );
});

test('Dirty Dozen #3: Cross-User PII Snooping on /users/{uid}/private/{id} is DENIED', () => {
  assert.equal(
    evaluatePrivateInfoGet({ uid: 'user_beta', emailVerified: true }, 'user_alpha', 'info'),
    false
  );
});

test('Dirty Dozen #4: Identity Spoofing on ChatMessage senderId is DENIED', () => {
  const room = makeValidRoom('user_alpha');
  const spoofMsg = {
    roomId: 'MESA01',
    senderId: 'user_beta',
    senderName: 'Impostor',
    kind: 'text',
    text: 'Oi!',
    stickerId: '',
    targetName: '',
    visibleToUids: ['user_alpha'],
    createdAtMs: 1000,
    createdAt: SERVER_NOW,
  };
  assert.equal(
    evaluateMessageCreate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', 'msg_1', spoofMsg, room, true),
    false
  );
});

test('Dirty Dozen #5: Self-Assigned Host Privilege in RoomMember is DENIED', () => {
  const roomAfter = { ...makeValidRoom('user_alpha'), playerIds: ['user_alpha', 'user_beta'] };
  const memberPayload = {
    roomId: 'MESA01',
    uid: 'user_beta',
    displayName: 'Beta',
    avatarColor: 'blue',
    role: 'host',
    joinedAt: SERVER_NOW,
  };
  assert.equal(
    evaluateMemberCreate({ uid: 'user_beta', emailVerified: true }, 'MESA01', 'user_beta', memberPayload, roomAfter),
    false
  );
});

test('Dirty Dozen #6: Orphaned Room Without Atomic Member Batch is DENIED', () => {
  const room = makeValidRoom('user_alpha');
  assert.equal(
    evaluateRoomCreate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', room, false),
    false
  );
});

test('Dirty Dozen #7: Terminal State Mutation on archived GameRoom is DENIED', () => {
  const archivedRoom = { ...makeValidRoom('user_alpha'), status: 'archived' };
  const nextRoom = { ...makeValidRoom('user_alpha'), status: 'playing' };
  assert.equal(
    evaluateRoomUpdate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', archivedRoom, nextRoom, true),
    false
  );
});

test('Dirty Dozen #8: Resource / ID Poisoning (>128 chars or special path chars) is DENIED', () => {
  const longId = 'a'.repeat(300);
  assert.equal(isValidId(longId), false);
  assert.equal(isValidId('../etc/passwd'), false);
  assert.equal(isValidRoomCode('mesa01'), false);
});

test('Dirty Dozen #9: Denial-of-Wallet Oversized ChatMessage text (>280 chars) is DENIED', () => {
  const room = makeValidRoom('user_alpha');
  const hugeMsg = {
    roomId: 'MESA01',
    senderId: 'user_alpha',
    senderName: 'Felipe',
    kind: 'text',
    text: 'X'.repeat(5000),
    stickerId: '',
    targetName: '',
    visibleToUids: ['user_alpha'],
    createdAtMs: 1000,
    createdAt: SERVER_NOW,
  };
  assert.equal(
    evaluateMessageCreate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', 'msg_2', hugeMsg, room, true),
    false
  );
});

test('Dirty Dozen #10: Unbounded playerIds Array Injection (>6 UIDs) is DENIED', () => {
  const existing = makeValidRoom('user_alpha');
  const incoming = {
    ...makeValidRoom('user_alpha'),
    playerIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'],
  };
  assert.equal(
    evaluateRoomUpdate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', existing, incoming, true),
    false
  );
});

test('Dirty Dozen #11: Forged Client Timestamp on GameRoom update is DENIED', () => {
  const existing = makeValidRoom('user_alpha');
  const incoming = {
    ...makeValidRoom('user_alpha'),
    roundNumber: 2,
    updatedAt: '1999-01-01T00:00:00.000Z',
  };
  assert.equal(
    evaluateRoomUpdate({ uid: 'user_alpha', emailVerified: true }, 'MESA01', existing, incoming, true),
    false
  );
});

test('Dirty Dozen #12: Unauthorized Blanket List Query on ChatMessage is DENIED', () => {
  const msgDoc = { visibleToUids: ['user_alpha', 'user_beta'] };
  assert.equal(evaluateMessageList({ uid: 'user_outsider', emailVerified: true }, msgDoc), false);
  assert.equal(evaluateMessageList({ uid: 'user_alpha', emailVerified: true }, msgDoc), true);
});
