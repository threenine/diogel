# Diogel Security Review

Date: 2026-04-09
Reviewer: Dave

## Executive Summary

Diogel has a sound overall security direction for a Nostr signer browser extension. The architecture is built around an encrypted local vault, explicit approval flows, and a browser-extension mediated `window.nostr` provider that prevents websites from receiving raw private keys directly.

The codebase does not look careless or toy-like. However, several trust-boundary and correctness issues deserve attention before the security story can be considered polished.

The most important concern is that the derived vault encryption key is exportable and persisted in browser session storage so it can survive extension lifecycle interruptions. This appears to be a practical Manifest V3 tradeoff, but it materially weakens the claim that vault secrets exist only in memory while unlocked.

## Security Model

The intended model appears to be:

- private keys are stored inside an encrypted vault
- the vault is persisted locally in IndexedDB
- websites interact with an injected `window.nostr` provider
- the content script forwards requests to the background context
- the background checks vault state and permissions
- the user approves or rejects sensitive actions
- signing and decryption happen inside the extension context

This is the correct high-level pattern for a NIP-07 signer extension.

## Positive Findings

### 1. Real local encryption is in use
File: `src/services/crypto.ts`

The vault uses:

- PBKDF2-SHA256
- 600,000 iterations
- AES-GCM
- versioned encrypted payloads with `v2:` prefix

This is a credible local encryption design, not cosmetic security.

### 2. Websites do not receive private keys directly
Files:
- `src-bex/nostr-provider.js`
- `src-bex/content-script.ts`
- `src-bex/background.ts`

The extension exposes NIP-07 style methods and routes requests through the extension boundary. Sites receive signatures or approved responses, not raw secret material.

### 3. Sensitive actions are approval gated
File: `src-bex/background.ts`

Signing and related operations pass through approval logic before execution, which is the right place to enforce consent and origin checks.

### 4. Permission model is origin scoped
File: `src-bex/handlers/permission-handler.ts`

Permissions are stored by origin and event kind rather than using one broad trust toggle.

### 5. Accounts live inside the encrypted vault
Files:
- `src/services/dexie-storage.ts`
- `src-bex/vault.ts`

The current design stores accounts inside vault data rather than in a separate unencrypted account database.

## Findings and Risks

## High Priority

### 1. Exportable vault key persisted in session storage
Files:
- `src/services/crypto.ts`
- `src-bex/vault.ts`

The AES vault key is derived as extractable and exported into raw bytes so it can be saved in browser session storage. The same is true for the vault salt.

This improves user experience and allows the extension to survive Manifest V3 worker lifecycle interruptions, but it weakens the strictest possible local secret handling model.

#### Why this matters

- the vault key is not limited to in-memory runtime state
- session storage compromise becomes more meaningful
- the security model is weaker than a pure memory-only unlock model

#### Assessment

This may be a deliberate and necessary engineering compromise, but it should be treated as a significant design tradeoff, documented explicitly, and reviewed carefully.

#### Recommendation

- document the tradeoff in a dedicated security note
- assess whether the unlock restore path can be redesigned with less exposed key persistence
- if not, keep it but describe it honestly in technical documentation

### 2. Permission duration semantics are inconsistent
Files:
- `src/pages/SignerApproval.vue`
- `src-bex/handlers/permission-handler.ts`

The approval UI offers:

- once
- 8h
- always

The backend permission grant handler currently accepts:

- session
- always

and maps `session` to a 24-hour expiry.

#### Why this matters

This is a correctness and trust issue. The code and UI do not appear to speak the same language. A user can reasonably believe one permission duration is being granted while a different one is actually enforced.

#### Recommendation

- make UI and backend duration values match exactly
- use explicit duration labels and explicit duration storage
- avoid calling a 24-hour permission a session permission

### 3. Auto-lock persistence and restore behavior may be unreliable
File: `src-bex/services/auto-lock.ts`

The service restores `VAULT_LAST_ACTIVITY`, but based on the reviewed files, there is no obvious symmetrical persistence of that value across the relevant action paths.

#### Why this matters

If background lifecycle restarts occur, the effective idle timer may drift or reset unexpectedly. This is a security reliability issue because users depend on auto-lock semantics.

#### Recommendation

- verify whether activity timestamps are actually being persisted whenever activity occurs
- if not, persist them consistently
- add tests for auto-lock behavior across service worker restarts

## Medium Priority

### 4. Production logging is overly verbose
Files:
- `src-bex/background.ts`
- `src-bex/content-script.ts`
- `src-bex/vault.ts`
- multiple UI pages
- `src/services/log-service.ts`

There is substantial console logging across the extension runtime.

#### Why this matters

Logs can reveal:

- hostnames and origins
- account aliases
- approval flow behavior
- failure modes
- vault lifecycle details

#### Recommendation

- gate debug logging behind a build flag or environment setting
- minimize production console noise
- keep structured local diagnostics where they add value

### 5. Approval flow uses a single global pending promise
File: `src-bex/background.ts`

The approval system uses one `approvalPromise` shared across all pending requests.

#### Why this matters

This can lead to awkward behavior or conflicts if multiple tabs or requests need approval concurrently.

#### Recommendation

- move to a request-scoped approval model keyed by request id
- explicitly support concurrent approvals or reject them in a controlled way

### 6. Blossom upload path should be reviewed as a separate risk surface
File: `src-bex/handlers/blossom-handler.ts`

The Blossom integration signs upload auth events and performs network requests against configured servers.

#### Why this matters

This combines signing, file upload, and external HTTP communication. Even if the implementation is mostly sound, it deserves separate review because it expands the extension’s trust surface.

#### Recommendation

Review:

- URL validation and trust assumptions
- allowed schemes and server handling
- auth event construction
- content-type and payload handling
- retry and error behavior

## Lower Priority / Correctness Gaps

### 7. `nostr.getRelays` appears incomplete
File: `src-bex/dispatcher.ts`

The current handler path returns an empty object.

#### Why this matters

This may cause functional mismatch between marketed capabilities and actual runtime behavior.

#### Recommendation

- either finish the implementation
- or narrow the supported claims until behavior is complete

### 8. Bridge typing and implementation cleanup would reduce future risk
Files:
- `src-bex/content-script.ts`
- `src/services/vault-service.ts`
- related bridge types

There are signs of practical technical debt including `any` usage, partial type simplifications, and comments about deferring type safety cleanup.

#### Recommendation

- tighten bridge types
- reduce `any` usage in security-critical messaging paths
- make request/response contracts more explicit

## Security Priorities

### Highest priority
1. Session-stored exported vault key
2. Approval duration mismatch
3. Auto-lock persistence reliability

### Next priority
4. Logging cleanup for production
5. Request-scoped approval tracking
6. Blossom integration review

### Then
7. `getRelays` completion or scope correction
8. Bridge typing cleanup

## Final Assessment

Diogel has a credible security foundation and a sound architectural direction. The main issues are not signs of incompetence, but rather trust-boundary tradeoffs, correctness mismatches, and unfinished hardening work.

The most important next step is to make the security-sensitive compromises explicit and tighten the areas where user expectations, runtime behavior, and implementation details are currently out of alignment.
