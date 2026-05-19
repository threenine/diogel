# Package 10 — Quick Sign Design Specification

Date: 2026-05-19
Status: Draft for review (implementation blocked until accepted)

## Goal

Define secure, reviewable MVP behavior for quick-sign before any implementation work starts.

Quick-sign crosses security boundaries (event construction, account/key choice, signing approval, optional publish). This document defines the minimum safe scope and explicit guardrails.

## Non-Goals (MVP)

- No broad event composer replacement.
- No batch signing.
- No background/autonomous signing.
- No implicit key switching.
- No advanced relay policy management.

## Implementation Gate

- No quick-sign code implementation starts before this spec is reviewed and accepted.
- Any implementation PR must reference this document and explicitly list deviations.

## MVP Scope

### Supported Event Kinds

Allow only these kinds in MVP:

- `0` (`set_metadata`)
- `1` (`text_note`)
- `3` (`contacts`)
- `7` (`reaction`)
- `30023` (`long-form`)

Rationale:

- Common, manually understandable event types.
- Low protocol complexity compared to payment/encryption/auth flows.
- Supports meaningful manual testing without broad surface area.

Explicitly out of scope for MVP:

- `4` encrypted DM events
- `5` deletion events
- `6` reposts
- `22242`/`27235` auth or wallet-related flows
- Any unknown/custom kind not explicitly allowed above

### Authoring Model: JSON Editor vs Structured Form

MVP uses a **JSON-first editor** with a minimal helper mode:

- Primary input is canonical event JSON fields (`kind`, `content`, `tags`, optional `created_at`).
- Optional helper controls may prefill templates for supported kinds, but final source of truth remains JSON.

Rationale:

- Reduces hidden field transformations.
- Keeps signer behavior transparent and auditable.
- Avoids a large structured-form implementation before security review maturity.

## Account and Key Selection Behavior

- User must explicitly choose the signing account for each quick-sign action.
- Default selection may prefill current active account, but explicit confirmation is still required in the review step.
- No silent fallback to another account if selected account is unavailable.
- If selected account is missing, locked, or invalid, signing is blocked with a clear error.

Key material behavior:

- Private key never leaves extension trust boundary.
- UI and logs must use only safe identity handles (`npub`, alias, fingerprint), never secret material.

## Validation Rules

Validation must pass before preview/sign actions are enabled.

Required checks:

- Event must be valid JSON object.
- `kind` is present, integer, and in MVP allowlist.
- `content` is a string.
- `tags` is an array of arrays of strings.
- If `created_at` provided, it must be integer UNIX seconds.
- `id`, `sig`, and `pubkey` from user input are ignored/recomputed at signing (not trusted from input).

Additional checks:

- Enforce reasonable payload limits (size cap configured by implementation, documented in release notes).
- Reject malformed UTF-8 or non-serializable structures.

## Preview Before Signing

A mandatory preview screen is required before final approval.

Preview must show:

- selected account identity (`npub` + alias if available)
- final computed event payload to be signed (normalized JSON)
- event summary (kind, content excerpt, tag count, timestamp)
- destination mode (`sign only` or `sign + publish`)

User controls:

- `Back to edit`
- `Cancel`
- `Approve sign`

No one-click sign from raw editor in MVP.

## Signing vs Publishing

MVP includes **both** modes, defaulting to **sign only**:

- `Sign only` (default): return signed event to caller/UI without relay broadcast.
- `Sign + publish` (explicit opt-in): publish signed event to selected relays after approval.

Security rationale:

- Separates cryptographic approval from network side effects.
- Keeps accidental broadcast risk lower by default.

## Relay Selection Defaults

For `sign only`:

- No relay selection required.

For `sign + publish`:

- Relay candidates come from selected account kind `10002` relay-list metadata.
- UI preselects those account relays and must show a publish destination summary before approval.
- User can deselect/select relays before final approve.
- At least one relay must be selected to publish.
- No silent fallback to global online relay catalog for publish in MVP.

## Permission / Approval Model

Quick-sign always requires explicit user approval in MVP.

- No persistent “always allow quick-sign” grant in MVP.
- Origin context (if request is website-initiated) must be displayed in approval UI.
- Approval is per operation (single event).
- Auto-reject on approval timeout.

If wallet/extension is locked:

- Require unlock before preview approval can complete.
- After unlock, user returns to preview state (not direct sign completion).

## Logging and Audit Behavior

Log security-relevant outcomes without sensitive payload leakage.

Log fields (minimum):

- timestamp
- operation type (`quick-sign`)
- account handle (`npub` short/fingerprint)
- event kind
- origin (if applicable)
- mode (`sign only` / `sign + publish`)
- result (`approved`, `rejected`, `validation_failed`, `publish_failed`, `internal_error`)

Do not log:

- private key or derived secret material
- full sensitive event content where policy marks it private

Retention and display follow existing log subsystem policy.

## Error States

At minimum, define and surface these states:

- invalid JSON
- unsupported kind
- schema/type validation failure
- account unavailable
- vault locked / unlock required
- approval rejected by user
- approval timed out
- signing failure (crypto/runtime)
- relay selection invalid (publish mode)
- partial/total publish failure
- internal unexpected error

Error UX requirements:

- human-readable message
- stable error code for diagnostics
- safe retry path where applicable

## Manual Testability (MVP)

MVP is intentionally constrained for manual verification:

- 4 allowlisted kinds only
- mandatory preview for every sign
- per-operation approval only
- sign-only default with explicit publish opt-in

Minimum manual scenarios for acceptance:

- valid sign-only flow for each supported kind
- invalid JSON rejection
- unsupported kind rejection
- locked-vault interruption and recovery
- user rejection path
- publish with relay selection and publish-failure handling

## Open Questions for Review

- Confirm exact payload size limit for MVP (proposed implementation-time constant).
- Confirm whether full content logging should be fully disabled or redacted-by-policy for all kinds.

## Acceptance Mapping

- No implementation before spec acceptance: enforced by `Implementation Gate`.
- Security-sensitive behavior documented: covered in account/key handling, validation, preview, approval, logging, and error sections.
- MVP small enough for manual testing: constrained kinds, explicit non-goals, and defined manual scenarios.
