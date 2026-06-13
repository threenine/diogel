# NIP-02 Contact List Feedback Workbook

Date: 2026-06-13
Branch: `feature/contact-list`
Feature state: MVP release candidate; next work should respond to user feedback rather than expand scope blindly.

## Purpose

Capture the next iteration plan for the NIP-02 Contact List feature after the MVP is published. Focus on three areas only:

1. Search quality
2. UX friction
3. Relay edge cases

Avoid adding broader social/contact-management scope until there is user evidence that it is needed.

## Working Principle

Do not guess too much. Ship the MVP, collect real usage feedback, then improve the parts users actually hit.

When investigating reports, classify each issue as:

- **Search quality**: users cannot find profiles they expect to find.
- **UX friction**: users can complete the task, but the flow is confusing, slow, or unclear.
- **Relay edge case**: relays behave inconsistently, fail, timeout, reject filters, or return stale/missing events.
- **Out of scope for now**: useful idea, but not necessary for the next tightening pass.

## 1. Search Quality Plan

### Questions to answer from feedback

- Which searches fail?
  - display name
  - username/name
  - npub
  - hex pubkey
  - NIP-05 identifier
- Are failures tied to specific relays?
- Are results missing entirely, or are poor matches returned above the expected profile?
- Are duplicates appearing for the same pubkey?
- Are profiles missing avatar/display name/about even when the pubkey is found?

### Investigation checklist

- Reproduce with the exact query string the user entered.
- Test the same query against each configured profile search relay separately.
- Check whether direct pubkey/npub lookup succeeds independently of name search.
- Check whether NIP-05 resolution succeeds independently of relay profile metadata fetch.
- Confirm whether kind `0` metadata exists for the expected pubkey on at least one reachable relay.
- Record whether the problem is:
  - no relay returned events
  - relay returned irrelevant events
  - relay returned relevant events but UI filtered/sorted poorly
  - relay returned profile metadata that failed to parse
  - NIP-05 resolution failed

### Candidate improvements

Prioritize only after observing failures:

1. **Per-relay diagnostics in development/debug mode**
   - Show which profile search relays returned results, failed, or timed out.
   - Keep this out of the main happy-path UI unless users need it.

2. **Better result ranking**
   - Prefer exact matches on `name`, `display_name`, and `nip05`.
   - Then prefix matches.
   - Then substring/fuzzy relay results.
   - Prefer profiles with NIP-05, avatar, display name, or recent metadata if available.

3. **Direct lookup reliability**
   - Ensure npub/hex direct lookup fetches kind `0` by author from profile search relays and fallback relays.
   - Show a selectable result even if profile metadata is missing, using npub fallback.

4. **NIP-05 reliability**
   - Surface whether NIP-05 resolution failed versus relay metadata lookup failed.
   - Consider adding a small retry or clearer error for bad DNS/HTTPS/well-known responses.

5. **Relay list recommendations**
   - If one default relay proves noisy or unreliable, replace it.
   - If users need regional/custom indexers, document that profile search relays are editable in Extension Settings.

### Acceptance criteria

- Known npub/hex profile can be added even if name search fails.
- Known NIP-05 profile can be added when the NIP-05 endpoint resolves.
- Name search returns useful results from at least one default profile search relay.
- Users can understand whether no results means “not found” or “relays did not answer”.

## 2. UX Friction Plan

### Questions to answer from feedback

- Do users discover the Contacts page easily?
- Do users understand that publishing replaces the full NIP-02 list?
- Does Add Contact feel obvious after clicking the button?
- Are search states clear enough?
  - idle
  - searching
  - no results
  - relay failure/timeout
  - selected contact ready to add
- Is the difference between local unsaved changes and published changes clear?
- Do users expect Edit Contact to exist, even though it was intentionally removed from MVP?
- Are profile hover bios useful or annoying?

### Investigation checklist

- Watch for confusion around Add Contact search panel visibility.
- Watch for users clicking Publish Changes before they understand replacement semantics.
- Check whether users notice unsaved/dirty state.
- Check whether contact count and refresh placement feel natural.
- Check whether no-results copy sends users to Extension Settings profile search relays when appropriate.

### Candidate improvements

Prioritize only after feedback:

1. **Clearer search empty state**
   - Explain that profile name search depends on configured profile search relays.
   - Offer a shortcut/link to Extension Settings.

2. **Publish confirmation / preview**
   - Before publishing, show added and removed contacts.
   - Keep it lightweight; avoid a heavy workflow unless users are nervous about publishing.

3. **Dirty-state clarity**
   - Make unsaved changes harder to miss.
   - Consider sticky publish bar only if users miss the existing button.

4. **Search panel polish**
   - Auto-focus search input when Add Contact opens.
   - Keep last query/results until the panel is closed.
   - Make selected result state obvious.

5. **Validation copy**
   - Make duplicate-contact, invalid relay URL, invalid npub, and NIP-05 failure messages specific.

### Acceptance criteria

- A new user can add one contact and publish without guessing what to do next.
- No-results and failure states point to the most likely next action.
- Publishing communicates “full replacement kind `3` event” plainly but not alarmingly.

## 3. Relay Edge Case Plan

### Questions to answer from feedback

- Which relays time out or reject the `search` filter?
- Do any relays return malformed kind `0` metadata?
- Do users see stale contact lists after publishing?
- Are publish failures partial or total?
- Do some relays accept publish but later fail to return the latest kind `3`?
- Are configured profile search relays invalid, offline, or non-search relays?

### Investigation checklist

- Log/search per-relay outcomes during development reproduction.
- Check whether `SimplePool.querySync` returns partial results before timeout.
- Verify latest kind `3` selection by highest `created_at`.
- Confirm publish status per relay, not just aggregate success/failure.
- Test custom profile search relay settings with:
  - valid search relay
  - valid normal relay that ignores `search`
  - invalid URL
  - offline relay
  - duplicate relay URL

### Candidate improvements

Prioritize only after observing failures:

1. **Per-relay search health**
   - Track last success/failure for profile search relays in memory or IndexedDB.
   - Avoid making this a large relay-management feature unless feedback demands it.

2. **Timeout tuning**
   - Adjust profile search timeout if users see frequent false negatives.
   - Consider returning partial results sooner if some relays answer quickly.

3. **Graceful unsupported-search handling**
   - Do not treat “relay rejected search filter” as a user-facing crash.
   - If all relays reject/timeout, show a targeted message.

4. **Publish/read-after-write confirmation**
   - After publishing, optionally fetch latest kind `3` again to confirm the new event is visible.
   - Only add if users report uncertainty or stale lists.

5. **Settings validation**
   - Keep URL validation strict.
   - Consider warning when a relay is valid websocket URL but does not appear to support profile search.

### Acceptance criteria

- Relay failures do not block successful results from other relays.
- Unsupported `search` filters degrade to “no useful result from this relay,” not a broken UI.
- Publish failures are clear enough to know whether retry is needed.
- Custom relay settings cannot corrupt the search experience beyond returning fewer results.

## Suggested Next-Week Work Order

1. **Collect feedback first**
   - Keep a short log of failed queries, confusing moments, and relay-specific failures.

2. **Reproduce the top 2-3 issues**
   - Use exact queries and relay settings from feedback where possible.

3. **Add diagnostics only where needed**
   - Avoid building a full observability panel unless the problem is clearly relay-driven.

4. **Fix direct lookup reliability before fuzzy search polish**
   - npub/hex and NIP-05 are deterministic; they should be solid before tuning name search.

5. **Polish the highest-friction UI moment**
   - Likely candidates: no-results copy, publish preview, or Add Contact panel focus/state.

6. **Re-run gates before every release candidate**
   - `npm run typecheck`
   - `npm run lint`
   - targeted unit tests for changed services/components
   - full `npm run test:run` before push/release

## Explicit Non-Goals For Next Pass

Do not start these unless user feedback strongly justifies them:

- contact groups/lists
- bulk import/export
- social graph recommendations
- private contact metadata
- petname chain resolution
- full profile cache/indexer
- relay marketplace/discovery UI for profile search

## Parking Lot

Potential future ideas after feedback stabilizes:

- profile search relay health indicators
- curated profile-search relay presets
- search result scoring explanations
- contact import from another account
- contact list backup/export before publish
