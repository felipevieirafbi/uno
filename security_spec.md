# Security Specification (`security_spec.md`) — UnoZueira

## 1. Data Invariants & Master Source of Truth

1. **Verified Identity Gate**: Every write operation requires a signed-in user with `request.auth.token.email_verified == true`.
2. **PII Split Isolation**: `/users/{userId}` stores strictly non-PII public display fields (`uid`, `displayName`, `avatarColor`, `createdAt`, `updatedAt`). Any PII (`email`) is isolated in `/users/{userId}/private/{infoId}` and readable/writable exclusively by `request.auth.uid == userId`.
3. **Master Gate & Relational Sync**: `/rooms/{roomId}` is the parent resource. Access to subcollections `/rooms/{roomId}/members/{memberId}` and `/rooms/{roomId}/messages/{messageId}` requires verified parent existence (`exists`/`get` on `/rooms/{roomId}` and `/rooms/{roomId}/members/{uid}`).
4. **Atomicity Guarantee (`existsAfter` / `getAfter`)**:
   - Creating `/rooms/{roomId}` requires atomically creating `/rooms/{roomId}/members/$(request.auth.uid)` in the same batch (`existsAfter`).
   - Joining via `/rooms/{roomId}/members/{memberId}` requires atomically updating `/rooms/{roomId}` so `memberId in getAfter(/databases/$(database)/documents/rooms/$(roomId)).data.playerIds`.
5. **Terminal State Locking**: Once `/rooms/{roomId}` transitions to `status == 'archived'`, all subsequent updates to the room and writes to its subcollections are permanently rejected.
6. **Temporal Integrity**: `createdAt`, `joinedAt`, and `updatedAt` must strictly equal `request.time` on write, and `createdAt` / `joinedAt` / `hostId` / `hostName` / `code` are immutable across updates.
7. **Secure List Queries (Zero Blanket Reads & Zero O(n) `get()`)**:
   - Listing `/rooms` enforces `request.auth.uid in resource.data.playerIds`.
   - Listing `/rooms/{roomId}/messages` enforces `request.auth.uid in resource.data.visibleToUids`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Shadow Field Injection (`GameRoom` update)**: Valid room payload plus unauthorized `"isAdmin": true` ghost key -> **DENIED** (`hasOnly` check).
2. **Payload 2 — Unverified Email Spoof (`GameRoom` create)**: Authenticated token with `email_verified: false` attempting to create room `MESA01` -> **DENIED** (`isVerified()` gate).
3. **Payload 3 — PII Cross-User Snooping (`UserPrivateInfo` get)**: User `uid_B` attempting `get` on `/users/uid_A/private/info` -> **DENIED** (`isOwner(userId)` gate).
4. **Payload 4 — Identity Spoofing (`ChatMessage` create)**: Member `uid_A` submitting a message with `senderId: "uid_B"` -> **DENIED** (`data.senderId == request.auth.uid`).
5. **Payload 5 — Self-Assigned Host Privilege (`RoomMember` create)**: Non-host `uid_B` creating `/rooms/MESA01/members/uid_B` with `role: "host"` -> **DENIED** (role check against `get(room).data.hostId`).
6. **Payload 6 — Orphaned Room Without Member Batch (`GameRoom` create)**: Creating `/rooms/MESA01` without atomically creating `/rooms/MESA01/members/uid_A` -> **DENIED** (`existsAfter` check).
7. **Payload 7 — Terminal State Mutation (`GameRoom` update)**: Updating `status` or `statePayload` on a room whose existing `status == "archived"` -> **DENIED** (`existing().status != 'archived'`).
8. **Payload 8 — Resource / ID Poisoning (`UserPublicProfile` create)**: Path ID of 300 characters or containing `$ / ..` -> **DENIED** (`isValidId()` regex & size <= 128).
9. **Payload 9 — Denial-of-Wallet Oversized Text (`ChatMessage` create)**: Message with `text` length 5,000 chars (`> 280`) -> **DENIED** (`data.text.size() <= 280`).
10. **Payload 10 — Unbounded `playerIds` Array Injection (`GameRoom` update)**: Updating `playerIds` with 10 UIDs (`> 6`) -> **DENIED** (`data.playerIds.size() <= 6`).
11. **Payload 11 — Forged Client Timestamp (`GameRoom` update)**: Supplying past/future `updatedAt` != `request.time` or mutating `createdAt` -> **DENIED** (`incoming().updatedAt == request.time && incoming().createdAt == existing().createdAt`).
12. **Payload 12 — Unauthorized Blanket List Query (`ChatMessage` list)**: User `uid_outsider` listing `/rooms/MESA01/messages` where `uid_outsider` is not in `resource.data.visibleToUids` -> **DENIED** (`request.auth.uid in resource.data.visibleToUids`).
