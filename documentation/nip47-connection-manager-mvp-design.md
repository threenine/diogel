# NIP-47 Connection Manager MVP design

## Scope

This branch adds the first internal Diogel browser-extension support for NIP-47 / Nostr Wallet Connect.

It deliberately does **not** expose a page-provider API yet. Websites cannot call NIP-47 through Diogel in this MVP.

## Deliverables covered

- NWC URI parser: `src/services/nip47-uri.ts`
- NIP-47 connection type definitions: `src/types/nip47.ts`
- Encrypted connection storage design: `VaultData.nip47Connections`
- Relay request/response service using `nostr-tools`: `src-bex/services/nip47-client.ts`
- UI page for wallet connections: `src/pages/WalletConnectionsPage.vue`
- Manual test plan: this document
- No page-provider exposure: `src-bex/nostr-provider.js` remains unchanged

## Storage design

NWC connection secrets are stored inside existing Diogel vault data:

```ts
interface VaultData {
  accounts: StoredKey[];
  mnemonic?: string;
  passphrase?: string;
  createdAt?: string;
  nip47Connections?: Nip47Connection[];
}
```

That means the connection secret is encrypted at rest by the same vault encryption as Nostr key material.

This is intentional for the MVP. It avoids plain `chrome.storage.local` secrets and avoids inventing a second crypto/encryption stack before the product model is proven.

## Security boundaries

- NWC connection secrets are not exposed to web pages.
- NWC connection keys are separate from Nostr identity keys.
- `window.nostr` provider is unchanged.
- `pay_invoice` is not implemented in the UI yet.
- `get_balance` is implemented only as an explicit user-triggered test action from the Diogel UI.

## Bridge actions

Internal bridge actions added:

- `nip47.connections.list`
- `nip47.connections.import`
- `nip47.connections.remove`
- `nip47.getInfo`
- `nip47.getBalance`

## Relay behavior

`Nip47Client` uses `nostr-tools` `SimplePool`.

Implemented:

- Fetch wallet info event kind `13194`.
- Send encrypted request kind `23194`.
- Wait for encrypted response kind `23195`.
- Use NIP-04 request/response encryption for widest current NWC wallet compatibility.
- Publish request to any configured relay that accepts it.

## Manual test plan

Prerequisites:

- Diogel vault created and unlocked.
- Known NWC-compatible wallet service.
- A valid NWC URI, e.g. from Alby Hub or another NIP-47 provider.

Steps:

1. Build/run extension in browser-extension mode.
2. Open Diogel dashboard.
3. Navigate to **Wallet Connections**.
4. Paste NWC URI.
5. Optionally add label.
6. Click **Import connection**.
7. Confirm connection appears without showing the secret.
8. Click **Info**.
9. Confirm capabilities populate from the wallet service info event.
10. Click **Balance**.
11. Confirm a balance appears, or a clear wallet/relay error is shown.
12. Lock vault and reload the page.
13. Confirm connection list is unavailable until vault unlock.
14. Remove the connection and confirm it no longer appears after refresh.

## Explicit non-goals for this MVP

- No `window.nostr.nip47` API.
- No `window.diogel.wallet` API.
- No WebLN provider.
- No remembered site permissions.
- No payment approval flow.
- No `pay_invoice` UI.
- No transaction history UI.
- No auto-connect from websites.

## Next step after this MVP

Add a dedicated payment approval design for `pay_invoice`, including:

- origin display
- wallet connection display
- amount/memo/invoice details
- explicit approval/rejection
- no auto-pay by default
- later optional budgets only after review
