# NIP-44 `window.nostr` Implementation Plan

Date: 2026-06-08
Repo: `threenine/diogel`
Target app: Diogel browser extension / BEX runtime

## Goal

Expose NIP-44 encryption/decryption through Diogel's injected NIP-07 provider:

```ts
window.nostr.nip44.encrypt(pubkey, plaintext): Promise<string>
window.nostr.nip44.decrypt(pubkey, ciphertext): Promise<string>
```

This should use the active unlocked Diogel account, route requests through the existing background bridge, and require user approval in the same style as the current NIP-04 methods.

## Current State

Evidence from the current codebase:

- `src-bex/nostr-provider.js` injects `window.nostr` and currently exposes:
  - `getPublicKey`
  - `signEvent`
  - `getRelays`
  - `nip04.encrypt`
  - `nip04.decrypt`
- `src/types/bridge-types.d.ts` already includes bridge actions and payload/response mappings for:
  - `nostr.nip44.encrypt`
  - `nostr.nip44.decrypt`
- `src-bex/dispatcher.ts` currently dispatches NIP-04 handlers, but does not yet dispatch NIP-44 handlers.
- `src-bex/background.ts` currently registers bridge listeners for NIP-04 encrypt/decrypt with approval prompts, but does not yet register NIP-44 listeners.
- `src-bex/handlers/nip04.ts` already contains a reusable pattern for:
  - checking vault unlock state
  - finding the active account
  - loading the active private key
  - returning typed handler results
- `nostr-tools` dependency already exposes `nip44` with:
  - `nip44.getConversationKey(secretKey, pubkey)`
  - `nip44.encrypt(plaintext, conversationKey)`
  - `nip44.decrypt(ciphertext, conversationKey)`
- NIP-07 explicitly lists `window.nostr.nip44.encrypt/decrypt` as optional methods.
- NIP-07 marks NIP-04 as deprecated.

## Recommendation

Implement NIP-44 now.

NIP-44 should be treated as a sensitive signer capability, not as a passive utility function. Both encrypt and decrypt should require origin-aware approval. Decrypt is especially sensitive because it can expose private message contents to a website.

## Design Decisions

### 1. Provider API

Add a `nip44` object beside the existing `nip04` object in `src-bex/nostr-provider.js`:

```js
nip44: {
  encrypt: async (pubkey, plaintext) => {
    return nostr.call('nip44.encrypt', { pubkey, plaintext });
  },
  decrypt: async (pubkey, ciphertext) => {
    return nostr.call('nip44.decrypt', { pubkey, ciphertext });
  },
}
```

Also add these methods to the `nostr:registration` event:

```js
'nip44.encrypt'
'nip44.decrypt'
```

### 2. Bridge Action Names

Keep using the existing typed bridge action names:

- Page/provider method: `nip44.encrypt`
- Background/dispatcher action: `nostr.nip44.encrypt`
- Page/provider method: `nip44.decrypt`
- Background/dispatcher action: `nostr.nip44.decrypt`

This matches the current NIP-04 naming pattern.

### 3. Crypto Implementation

Create `src-bex/handlers/nip44.ts`.

Implementation shape:

```ts
import { nip44 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

const conversationKey = nip44.getConversationKey(secretKey, payload.pubkey);
const ciphertext = nip44.encrypt(payload.plaintext, conversationKey);
const plaintext = nip44.decrypt(payload.ciphertext, conversationKey);
```

Do not implement NIP-44 crypto manually. Use `nostr-tools`.

### 4. Active Key Lookup

Prefer refactoring the duplicated active-secret-key lookup out of `src-bex/handlers/nip04.ts` into a small shared helper, for example:

```txt
src-bex/handlers/active-key.ts
```

Suggested functions:

```ts
export async function getActiveSecretKey(): Promise<Uint8Array>
export async function getActiveStoredKey(): Promise<StoredKey>
```

Then update NIP-04 and NIP-44 handlers to use the helper.

This avoids copying sensitive key lookup logic into another file.

### 5. Approval and Permissions

Use the existing approval flow in `src-bex/background.ts`, mirroring NIP-04.

Add bridge listeners:

```ts
bridge.on('nostr.nip44.encrypt', ...)
bridge.on('nostr.nip44.decrypt', ...)
```

Approval request types:

- `nip44_encrypt`
- `nip44_decrypt`

Add labels in `src/pages/SignerApproval.vue`:

```ts
nip44_encrypt: 'NIP-44 encryption request'
nip44_decrypt: 'NIP-44 decryption request'
```

Log approvals with the same request type strings.

Important: do not silently allow decrypt without approval. If we later add trusted-client permissions, decrypt should have its own capability bucket, not be bundled blindly with signing.

### 6. Dispatcher

Update `src-bex/dispatcher.ts`:

- import `handleNip44Encrypt`, `handleNip44Decrypt`
- add cases for:
  - `nostr.nip44.encrypt`
  - `nostr.nip44.decrypt`

Return behaviour should match NIP-04:

- success: return string
- failure: throw/return error consistently with existing dispatcher convention

### 7. Type Definitions

`src/types/bridge-types.d.ts` already has NIP-44 action/request/response entries. Still verify:

- `BridgeAction` includes both NIP-44 actions
- `BridgeRequestMap` includes `pubkey` and payload string fields
- `BridgeResponsePayload` maps both actions to `string`
- background bridge event typing in `src-bex/background.ts` includes both actions

If any generated/parallel bridge type exists elsewhere, update it too.

### 8. Error Handling

Expected failures:

- vault locked
- no active account
- secret key not found
- invalid recipient pubkey
- invalid ciphertext
- user rejected request
- approval window timeout

Return user-facing errors that match existing extension style.

Recommended internal error mapping:

- vault locked -> `VAULT_LOCKED` / `ErrorCode.VLT_LOCKED` where available
- no active key -> `ErrorCode.SIG_NO_ACTIVE_KEY`
- crypto failure -> generic encryption/decryption failure message
- rejected approval -> `PERMISSION_DENIED`

Do not leak private key details or raw sensitive values in logs.

## Implementation Tasks

### Phase 1 — Provider Surface

- [ ] Update `src-bex/nostr-provider.js` to add `window.nostr.nip44.encrypt`.
- [ ] Update `src-bex/nostr-provider.js` to add `window.nostr.nip44.decrypt`.
- [ ] Add `nip44.encrypt` and `nip44.decrypt` to the `nostr:registration` methods list.
- [ ] Add/adjust provider injection tests if currently present for `window.nostr` method registration.

### Phase 2 — Shared Active-Key Helper

- [ ] Create `src-bex/handlers/active-key.ts`.
- [ ] Move active account/private-key lookup logic out of `src-bex/handlers/nip04.ts`.
- [ ] Update `src-bex/handlers/nip04.ts` to consume the shared helper.
- [ ] Ensure no new `any` usage is introduced.

### Phase 3 — NIP-44 Handler

- [ ] Create `src-bex/handlers/nip44.ts`.
- [ ] Implement `handleNip44Encrypt(payload, origin)`.
- [ ] Implement `handleNip44Decrypt(payload, origin)`.
- [ ] Use `nostr-tools` NIP-44 helpers, not custom crypto.
- [ ] Reset auto-lock timer after successful encrypt/decrypt if consistent with NIP-07 handling.
- [ ] Return typed `HandlerResult<string>` responses.

### Phase 4 — Dispatcher Wiring

- [ ] Import NIP-44 handlers in `src-bex/dispatcher.ts`.
- [ ] Add `nostr.nip44.encrypt` dispatch case.
- [ ] Add `nostr.nip44.decrypt` dispatch case.
- [ ] Verify bridge action typing compiles without casts beyond existing project conventions.

### Phase 5 — Background Approval Wiring

- [ ] Extend background bridge event typing in `src-bex/background.ts` for NIP-44 encrypt/decrypt if missing.
- [ ] Add `bridge.on('nostr.nip44.encrypt', ...)`.
- [ ] Add `bridge.on('nostr.nip44.decrypt', ...)`.
- [ ] Mirror NIP-04 approval logic.
- [ ] Log approval events as `nip44_encrypt` and `nip44_decrypt`.
- [ ] Preserve locked-vault behaviour and rejection behaviour.

### Phase 6 — Approval UI Labels

- [ ] Add `nip44_encrypt` label in `src/pages/SignerApproval.vue`.
- [ ] Add `nip44_decrypt` label in `src/pages/SignerApproval.vue`.
- [ ] Consider adding request detail text that makes decrypt risk obvious, e.g. “This site wants to decrypt a NIP-44 payload using your active account.”

### Phase 7 — Tests

Add focused unit tests. Suggested files:

- `tests/unit/handlers/nip44.test.ts`
- `tests/unit/dispatcher.test.ts` additions
- `tests/unit/window-message-security.test.ts` additions if provider/content-script bridge coverage exists

Test cases:

- [ ] encrypt returns NIP-44 ciphertext for a valid active account and recipient pubkey.
- [ ] decrypt returns original plaintext for ciphertext encrypted to the active account.
- [ ] locked vault rejects encrypt.
- [ ] locked vault rejects decrypt.
- [ ] missing active account rejects encrypt/decrypt.
- [ ] invalid recipient pubkey rejects encrypt.
- [ ] invalid ciphertext rejects decrypt.
- [ ] dispatcher routes `nostr.nip44.encrypt` to handler.
- [ ] dispatcher routes `nostr.nip44.decrypt` to handler.
- [ ] provider exposes `window.nostr.nip44.encrypt/decrypt` if provider tests exist.
- [ ] `nostr:registration` advertises `nip44.encrypt/decrypt`.

### Phase 8 — Manual Browser Verification

Manual smoke test in a browser extension build:

```js
await window.nostr.getPublicKey()
const pk = await window.nostr.getPublicKey()
const ciphertext = await window.nostr.nip44.encrypt(pk, 'hello nip44')
await window.nostr.nip44.decrypt(pk, ciphertext)
```

Expected result:

```txt
hello nip44
```

Also verify:

- approval popup opens for encrypt
- approval popup opens for decrypt
- reject path rejects the Promise
- locked vault path gives a clear vault-locked error
- `window.nostr.nip44` is visible on page load

## Acceptance Criteria

The implementation is complete when:

- [ ] `window.nostr.nip44.encrypt` exists and returns valid NIP-44 ciphertext.
- [ ] `window.nostr.nip44.decrypt` exists and returns valid plaintext.
- [ ] Both methods use the active Diogel account private key.
- [ ] Both methods require user approval through the existing approval popup.
- [ ] Both methods are advertised in `nostr:registration`.
- [ ] NIP-04 behaviour remains unchanged.
- [ ] No new `any` usage is introduced.
- [ ] Unit tests cover handlers and dispatcher routes.
- [ ] `npm run test:run` passes, or at minimum focused tests pass if full suite is too slow.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Manual browser smoke test passes in BEX mode.

## Suggested Implementation Order

1. Add shared active-key helper.
2. Refactor NIP-04 to use helper and run NIP-04 tests.
3. Add NIP-44 handler and handler tests.
4. Wire dispatcher and test dispatcher routes.
5. Add background approval listeners.
6. Add provider methods and registration.
7. Add approval UI labels.
8. Run focused tests, typecheck, lint.
9. Build/run browser smoke test.

## Risks / Watchpoints

- NIP-44 decrypt exposes private message contents; do not bypass approval.
- Avoid copy-pasting active key lookup into multiple handlers.
- Do not manually implement NIP-44 crypto.
- Check `nostr-tools` API usage carefully: `encrypt/decrypt` expect a conversation key, not the recipient pubkey directly.
- Avoid logging plaintext, ciphertext, private keys, or full decrypted payloads.
- Existing NIP-04 handlers may have synchronous-looking `nostr-tools` calls; confirm whether current version returns strings or Promises and await if needed.
- The background bridge currently uses approval event kind `-1` for non-event requests. Reusing that is acceptable for NIP-44, but the request type label must be explicit.
