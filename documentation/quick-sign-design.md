# Package 10 — Quick Sign Design Specification

Date: 2026-05-20
Status: Draft for review

## Goal

Define the revised Quick Sign MVP for the dashboard.

Quick Sign is no longer a broad JSON-first event signer. The revised direction is a focused, structured authoring flow that lets a user quickly create, sign, preview, and publish either a short text note or long-form content without leaving Diogel.

The feature still crosses security boundaries: account/key choice, event construction, signing approval, and network publishing. This document defines the safe MVP scope and guardrails.

## Source Of Intent

This specification supersedes the earlier JSON-first Quick Sign design.

Current intent comes from:

- `projects/diogel/ideation/dashboard/quick-sign.md`

## Non-Goals (MVP)

- No generic JSON event editor.
- No arbitrary/custom Nostr event kinds.
- No batch signing.
- No background/autonomous signing.
- No implicit account/key switching.
- No broad relay policy manager.
- No encrypted DM support.
- No deletion/repost/auth/wallet event support.
- No HTML authoring support.

## Implementation Gate

- Quick Sign implementation must match this document or explicitly document deviations in the implementation PR.
- If this document and the ideation file diverge, update this implementation spec before coding.

## MVP Scope

### Supported Event Kinds

Allow only these event kinds in MVP:

- `1` — Text Note
- `30023` — Long Form Content

Rationale:

- Matches the revised dashboard ideation direction.
- Keeps the feature focused on authoring and publishing user-visible content.
- Avoids pretending Quick Sign is a general-purpose Nostr event signer.
- Keeps manual testing small enough to be meaningful.

Explicitly out of scope for MVP:

- `0` metadata events
- `3` contacts events
- `4` encrypted DM events
- `5` deletion events
- `6` repost events
- `7` reaction events
- `22242` / `27235` auth or wallet-related events
- Any unknown/custom kind not explicitly allowed above

## Authoring Model

MVP uses a **structured form**, not a JSON editor.

The form contains:

1. Account selector
2. Kind selector
3. Content editor
4. Tags editor
5. Preview / approval step
6. Publish result state

The implementation may internally construct canonical Nostr event JSON, but raw JSON editing is not exposed in MVP.

## Account Selection

The user must explicitly choose the signing account before signing.

Account selector requirements:

- Display available accounts as `Alias Name (npub1...)`.
- Use a dropdown/listbox control.
- Default selection may prefill the current active account if one exists.
- The selected account must be shown again on the preview screen.
- No silent fallback to another account if the selected account is unavailable.

If the selected account is missing, locked, or invalid:

- signing is blocked
- the user sees a clear error
- no event is published

Key material behavior:

- Private key never leaves the extension/vault trust boundary.
- UI and logs must use safe identity handles only: alias, `npub`, or short fingerprint.
- Never log secret key material.

## Kind Selection

The kind selector contains exactly two default options:

- `Text Note (Kind 1)`
- `Long Form (Kind 30023)`

The selected kind controls content validation and event construction.

## Content Rules

### Kind `1` — Text Note

Content input:

- multi-line text box
- plain text only

Validation:

- Markdown is not allowed.
- HTML is not allowed.
- Content must not be empty after trimming whitespace.

Implementation note:

- The MVP should use conservative validation. If Markdown detection is uncertain, prefer warning/blocking obvious Markdown syntax rather than trying to perfectly parse every edge case.

### Kind `30023` — Long Form Content

Content input:

- multi-line editor
- Markdown allowed

Validation:

- Markdown is allowed.
- HTML is not allowed.
- Content must not be empty after trimming whitespace.

Implementation note:

- HTML rejection should block raw HTML tags in submitted content.
- Sanitisation may still be used for preview rendering, but sanitisation is not a substitute for enforcing the MVP no-HTML rule.

## Tags Editor

MVP includes a dynamically expanding tags form.

Requirements:

- User can add one or more tags.
- Each tag row contains:
  - tag type dropdown
  - tag value text box
  - remove control
- Supported tag types in MVP:
  - `p`
  - `a`
  - `t`
  - `e`

Validation:

- tag type must be one of the supported MVP types
- tag value must not be empty
- generated Nostr tags must be arrays of strings
- malformed tag rows block preview/sign/publish

Future extensions may add additional tag types, but they are out of scope for MVP.

## Preview Before Signing

A mandatory preview is required before signing and publishing.

Preview must show:

- selected account identity: alias and `npub`
- selected event kind
- content preview
- tag summary / tag list
- publish destination summary
- warning that approval will sign and publish the event

User controls:

- `Back to edit`
- `Cancel`
- `Sign and publish`

There is no one-click signing from the edit form in MVP.

## Publish Behaviour

MVP behaviour is **sign and publish**.

Publishing rules:

- The event is signed only after the user approves the preview.
- The signed event is published to relays from the selected account's Relay Meta List.
- Do not publish to all online relay catalog entries.
- Do not silently fall back to a global relay list.
- If the selected account has no usable Relay Meta List relays, publishing is blocked with a clear error.

Relay source:

- Use the selected account's kind `10002` relay-list metadata where available.
- MVP may use relay entries appropriate for write/publish behavior.
- The preview must show the relays that will be used before approval.

Publish result handling:

- Show success when publishing succeeds.
- Show partial failure if some relays fail and some succeed.
- Show failure if no relay accepts the event.
- Preserve a safe retry path.

## Permission / Approval Model

Quick Sign always requires explicit user approval in MVP.

- Approval is per operation.
- No persistent “always allow Quick Sign” grant.
- No background signing.
- No background publishing.
- Auto-reject or expire stale approval prompts.

If the vault/extension is locked:

- require unlock before final signing
- after unlock, return the user to preview state
- do not complete signing automatically immediately after unlock

## Validation Summary

Validation must pass before preview/sign/publish actions are enabled.

Required checks:

- account selected
- selected account is available and usable
- kind is either `1` or `30023`
- content is non-empty
- content satisfies kind-specific Markdown/HTML rules
- tag rows are valid
- relay metadata is available for publish
- payload size is within implementation-defined limits

Generated event fields:

- `pubkey` is derived from the selected account
- `created_at` is generated by the implementation unless explicitly supported later
- `id` is computed by the implementation
- `sig` is computed by the signer

User input must not be trusted for `id`, `sig`, or `pubkey`.

## Logging and Audit Behaviour

Log security-relevant outcomes without leaking sensitive data.

Minimum log fields:

- timestamp
- operation type: `quick-sign`
- account handle: alias, short `npub`, or fingerprint
- event kind
- relay count
- result:
  - `approved`
  - `rejected`
  - `validation_failed`
  - `publish_partial_failure`
  - `publish_failed`
  - `internal_error`

Do not log:

- private key or derived secret material
- full event content by default
- sensitive tag values if later policy marks them private

Retention and display follow the existing log subsystem policy.

## Error States

At minimum, define and surface these states:

- no account selected
- account unavailable
- vault locked / unlock required
- unsupported kind
- empty content
- Markdown not allowed for kind `1`
- HTML not allowed
- invalid tag row
- missing Relay Meta List
- no writable publish relays
- approval rejected by user
- approval timed out
- signing failure
- partial publish failure
- total publish failure
- internal unexpected error

Error UX requirements:

- human-readable message
- stable error code for diagnostics
- safe retry path where applicable

## Manual Testability (MVP)

MVP is intentionally constrained for manual verification:

- two allowed event kinds only: `1` and `30023`
- structured form only
- explicit account selection
- mandatory preview
- per-operation approval
- publish only to selected account Relay Meta List relays

Minimum manual scenarios for acceptance:

- valid kind `1` sign-and-publish flow
- valid kind `30023` sign-and-publish flow
- kind `1` blocks obvious Markdown
- kind `1` blocks HTML
- kind `30023` allows Markdown
- kind `30023` blocks HTML
- invalid/empty content rejection
- invalid tag row rejection
- selected account unavailable
- locked-vault interruption and recovery to preview
- user cancellation from preview
- missing Relay Meta List blocks publish
- relay partial-failure handling
- relay total-failure handling

## Open Questions For Review

- Confirm exact payload size limit for MVP.
- Confirm whether tag value validation should remain generic or become kind-aware.
- Confirm whether kind `30023` requires additional metadata fields, such as title/summary/image, in this MVP or whether content-only long form is acceptable for the first pass.
- Confirm whether users should be able to manually deselect Relay Meta List relays before publishing, or whether MVP publishes to the full writable set.

## Acceptance Mapping

- Revised Quick Sign intent captured: structured form, account selector, kind selector, content editor, tags editor, preview, sign-and-publish.
- Supported kinds match ideation: `1` and `30023` only.
- Publishing behavior is explicit: selected account Relay Meta List only, no global relay fallback.
- Security-sensitive behavior documented: account/key handling, preview approval, validation, logging, and errors.
- MVP is small enough for manual testing.
