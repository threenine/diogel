# NIP-02 Contact List Feature Design

Date: 2026-06-13
Repo: `/root/.openclaw/workspace/repos/diogel`

## Goal

Add a Contact List feature to Diogel so a user can browse and edit their NIP-02 follow list.

NIP-02 uses a replaceable kind `3` event. The follow list is represented as `p` tags:

```json
["p", "<32-byte hex pubkey>", "<relay-url-or-empty>", "<petname-or-empty>"]
```

The event content is unused and should be published as an empty string.

Important behaviour: publishing a new kind `3` event replaces the previous follow list. Editing one contact therefore requires Diogel to publish the complete updated list, not a partial patch.

## MVP Scope

### User capabilities

- View active account's current NIP-02 follow list.
- Refresh latest follow list from relays.
- Add a contact by pubkey/npub.
- Edit contact relay URL.
- Edit contact petname/local name.
- Remove a contact.
- Publish the complete updated follow list as a new kind `3` event.
- Show clear dirty-state when local edits have not been published.

### Not in MVP

- Bulk import/export.
- Contact grouping.
- Private contact metadata.
- Petname chain resolution.
- Social graph suggestions.
- Full profile caching/indexing beyond best-effort display names and avatars.

## Proposed UX

Add a new dashboard navigation item:

- Label: `Contacts`
- Route: `/contacts`
- Icon: `contacts` or `group`

Create a `ContactListPage.vue` under `src/pages`.

Page layout:

1. Header
   - Title: `Contacts`
   - Subtitle: active account npub/alias
   - Actions: `Refresh`, `Publish Changes`

2. State cards or banner
   - Loading latest follow list
   - Vault locked / no active account
   - Relay fetch failed, with retry
   - Unsaved changes warning

3. Contact table/list
   - Profile picture/display name if metadata resolves
   - Pubkey/npub
   - Relay URL
   - Petname
   - Actions: edit/remove

4. Add/Edit dialog
   - Pubkey/npub input
   - Relay URL input, optional
   - Petname input, optional
   - Validation before save

## Data Model

Create `src/types/contact-list.ts`:

```ts
export interface Nip02Contact {
  pubkey: string;
  relayUrl: string;
  petname: string;
  originalTag: string[];
}

export interface ContactListState {
  accountAlias: string;
  pubkey: string;
  contacts: Nip02Contact[];
  sourceEventId?: string;
  sourceCreatedAt?: number;
  dirty: boolean;
}
```

Keep unknown extra tag fields out of the editable MVP, but preserve the raw `originalTag` where useful. Publishing should emit canonical NIP-02 tags only unless we intentionally decide to preserve extra fields.

## Service Design

Create `src/services/contact-list-service.ts`.

Responsibilities:

- Resolve active account and private key from vault/account store.
- Fetch the latest kind `3` event for the active account from fallback relays.
- Parse `p` tags into editable contacts.
- Validate pubkeys/npubs.
- Normalize relay URLs.
- Build a replacement kind `3` event:
  - `kind: 3`
  - `content: ''`
  - `tags: contacts.map(contact => ['p', contact.pubkey, contact.relayUrl, contact.petname])`
- Sign with `finalizeEvent` from `nostr-tools`.
- Publish to configured write/fallback relays using `SimplePool`.

Suggested API:

```ts
export async function fetchContactList(accountAlias: string): Promise<ContactListState>;
export function parseContactTags(tags: string[][]): Nip02Contact[];
export function buildContactListTags(contacts: Nip02Contact[]): string[][];
export async function publishContactList(accountAlias: string, contacts: Nip02Contact[]): Promise<NostrEvent>;
```

## Relay Strategy

For MVP, use existing fallback relays from `settingsStore.getFallbackRelays()`.

Later improvement: publish to user-configured write relays once Diogel has a stronger relay preference model.

## Validation Rules

- Accept hex pubkey and `npub` input.
- Store canonical hex pubkey internally.
- Reject duplicate pubkeys.
- Relay URL is optional, but if present must normalize as websocket URL.
- Petname is optional and trimmed.
- Preserve NIP-02 chronological ordering:
  - existing contacts keep order
  - newly added contacts append to the end

## Safety / Product Notes

- Publishing replaces the user's whole follow list. The UI must say this plainly.
- Before publishing, Diogel should fetch latest again or warn if the remote source changed since local load.
- Keep a small preview of additions/removals before publish.
- Consider writing the signed event to logs/history after publish.

## Test Plan

Unit tests:

- Parse valid NIP-02 `p` tags.
- Ignore invalid/incomplete `p` tags.
- Preserve contact ordering.
- Convert `npub` to hex pubkey.
- Reject duplicate contacts.
- Build canonical kind `3` tags.
- Publish uses `content: ''` and `kind: 3`.

Page/component tests:

- Empty contact list state.
- Loading/error states.
- Add/edit/remove contact flow.
- Dirty state appears after local edits.
- Publish disabled when no changes or validation fails.

Manual acceptance:

1. Unlock vault.
2. Open Contacts page.
3. Fetch existing NIP-02 list from relays.
4. Add a contact.
5. Publish.
6. Refresh and confirm the new contact remains.
7. Remove the contact.
8. Publish again and confirm removal.

## Likely Files To Change

- `src/router/routes.ts`
- `src/composables/useNavigation.ts`
- `src/i18n/en-US/index.ts`
- `src/pages/ContactListPage.vue`
- `src/services/contact-list-service.ts`
- `src/types/contact-list.ts`
- `tests/unit/services/contact-list-service.test.ts`
- `tests/unit/pages/ContactListPage.test.ts`

## Recommendation

Build this as a dashboard-only feature first. Avoid popup UI until the data model and publish behaviour are stable.
