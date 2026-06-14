# Wallet Management MVP UI/UX concepts

Date: 2026-06-14  
Branch: `feature/wallet-management-mvp`

## Problem

The current Wallet Management page is technically functional but visually weak. It reads like a raw admin form and list:

- Import form dominates the left side even after connections exist.
- Configured connections are rendered as dense text rows.
- Wallet status, risk, and available actions are not visually prioritised.
- Every action has similar visual weight, including destructive/remove and money/pay actions.
- Payment history is useful but competes with connection management instead of feeling secondary.
- The page does not yet feel trustworthy enough for wallet/payment operations.

For this MVP, the goal is not a full wallet dashboard. The goal is a credible, clear Nostr Wallet Connect manager that users can understand quickly and trust enough to test.

## Design principles

1. **Lead with trust and state**
   - Show which wallet is active.
   - Show whether the connection has been checked.
   - Show what capabilities are available.
   - Do not make users infer state from raw pubkeys and relays.

2. **Separate setup from management**
   - Importing a connection is an occasional action.
   - Managing/checking/paying is the regular action.
   - The import form should not dominate once connections exist.

3. **Make money actions visually distinct**
   - `Pay invoice` must never look like a casual utility action.
   - Keep explicit approval and parsed invoice review.
   - Prefer a stronger review panel over a tiny dialog if/when payment UX grows.

4. **Progressive disclosure**
   - Default view should show label, active state, balance/status, capabilities, and primary actions.
   - Technical details such as wallet pubkey, client pubkey, relays, and raw capabilities can be collapsed or tucked into a details section.

5. **Use Diogel brand primitives**
   - Corporate Orange: `#f97316`
   - Corporate Black: `#111827`
   - Corporate White: `#ffffff`
   - Corporate Dark Gray: `#374151`
   - Corporate Medium Gray: `#6b7280`
   - Reuse existing `dashboard-page`, `dashboard-hero`, `dashboard-card`, and `diogel-btn-*` classes where possible.

## Concept A — Wallet cards with a compact import drawer

### Layout

- Hero section at top:
  - Title: `Wallet Management`
  - Caption: `Manage encrypted Nostr Wallet Connect links for Lightning payments.`
  - Right-side action: `Import wallet connection`
- Summary strip below hero:
  - Active wallet
  - Total connections
  - Last payment status / history count
  - Security note: `Secrets stay inside the encrypted vault`
- Main content:
  - Responsive grid of wallet connection cards.
  - Import form hidden behind a slide-down panel or dialog.
- Payment history:
  - Separate card below wallet grid.

### Wallet card anatomy

Each connection becomes a card:

- Header:
  - Wallet icon/avatar circle using orange accent.
  - Label.
  - `Active wallet` badge if active.
  - Optional `NWC` badge.
- Status row:
  - `Capabilities checked` / `Not checked yet`.
  - `pay_invoice available` / `Payments unavailable`.
  - Last balance if loaded.
- Primary actions:
  - Active connection: `Pay invoice` as the main CTA if supported.
  - Inactive connection: `Make active` as primary CTA.
- Secondary actions:
  - `Check info`
  - `Check balance`
  - `Details`
  - `Remove`
- Details expansion:
  - wallet service pubkey
  - client pubkey
  - relays
  - capabilities
  - created/updated timestamps

### Pros

- Best visual improvement for the least conceptual risk.
- Makes multiple connections easy to scan.
- Keeps MVP scope intact.
- Easy to build inside current Vue page.

### Cons

- Payment history still needs a separate visual pass.
- Cards can get busy if every action is shown at once; needs good grouping.

## Concept B — Active wallet dashboard + secondary connection list

### Layout

- Hero section.
- Large active wallet panel first:
  - Active wallet label.
  - Balance check result.
  - Payment capability.
  - Primary `Pay invoice` action.
  - Secondary `Check balance`, `Check info`, `Details`.
- Secondary list below:
  - Other configured wallet connections as compact rows.
  - Each row has `Make active`, `Details`, `Remove`.
- Import connection is a top-right action or side panel.
- Payment history remains below.

### Pros

- Very clear mental model: one active wallet matters most.
- Reduces clutter when users have multiple connections.
- Good match for future site-permission/payment flows.

### Cons

- Slightly more product opinion: pushes users toward one primary wallet.
- Empty state needs care if no active wallet exists.
- Less useful if users expect to compare many wallets side-by-side.

## Concept C — Tabbed manager: Connections / Payments / Import

### Layout

- Hero section.
- Tabs inside one dashboard card:
  - `Connections`
  - `Payments`
  - `Import`
- Connections tab:
  - Card/list hybrid of configured connections.
- Payments tab:
  - Payment history and future filters.
- Import tab:
  - Import form, security explanation, NWC URI help.

### Pros

- Clean separation of concerns.
- Keeps initial viewport tidy.
- Payment history no longer competes with connection management.

### Cons

- Adds navigation friction.
- Hides import too much for a first-time MVP if not paired with a strong empty state.
- Slightly heavier implementation than needed right now.

## Recommendation

Use **Concept B — Active wallet dashboard**.

Woody selected Concept B on 2026-06-14 because it is a stronger fit for the direction Diogel wants to provide. The product should present one active wallet as the primary wallet users actually operate, with other NWC connections treated as secondary switchable connections.

The immediate MVP should become:

1. `dashboard-page` shell, matching the rest of Diogel.
2. Hero with import action.
3. Large active-wallet dashboard panel first.
4. Active panel shows wallet label, balance/status, capability state, security note, and primary actions.
5. Money action (`Pay invoice`) belongs in the active-wallet panel and remains visually distinct.
6. Other wallet connections render as compact secondary rows/cards with `Make active`, `Details`, and `Remove`.
7. Import panel is collapsed by default when connections exist, but visible in the empty state.
8. Technical connection details move into an expansion panel.
9. Payment history remains a separate card below, with improved row styling later.

This is more opinionated than Concept A, but in a useful product way: one active wallet is the thing Diogel uses, while other connections are managed as alternatives.

## Proposed MVP visual structure

```text
┌─────────────────────────────────────────────────────────────┐
│ Wallet Management                                [Import +] │
│ Manage encrypted Nostr Wallet Connect links for payments.   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬────────────────┐
│ Active wallet│ Connections  │ Payments     │ Vault security │
│ Alby Hub     │ 2 configured │ 4 attempts   │ Encrypted      │
└──────────────┴──────────────┴──────────────┴────────────────┘

[Import panel, collapsed unless empty or user clicks Import]

┌──────────────────────────────────────────┐ ┌────────────────┐
│ ACTIVE WALLET                            │ │ OTHER WALLETS  │
│ 🟠 Alby Hub            Ready to pay      │ │ Home Node      │
│ Balance: 2,100 sats                      │ │ [Make active] │
│ Capabilities: pay_invoice · get_balance  │ │                │
│ Security: Vault stored, no website API   │ │ Test Wallet    │
│ [Pay invoice] [Balance] [Info] [Details] │ │ [Make active] │
└──────────────────────────────────────────┘ └────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Payment history                                      refresh │
│ succeeded · Alby Hub · 10 sats · 2026-06-14                 │
└─────────────────────────────────────────────────────────────┘
```

## Component/API implications

Likely implementation split:

- Keep `WalletConnectionsPage.vue` as the orchestrating page.
- Add small presentational components if the page starts getting too large:
  - `ActiveWalletPanel.vue`
  - `SecondaryWalletConnectionList.vue`
  - `WalletImportPanel.vue`
  - `WalletPaymentHistory.vue`
- No backend/service changes required for the first visual pass.
- No additional NIP-47 methods required.

## Copy improvements

Suggested copy:

- Page caption:
  - `Manage encrypted Nostr Wallet Connect links for Lightning payments.`
- Security microcopy:
  - `NWC secrets are stored inside your encrypted Diogel vault and are never exposed to websites in this MVP.`
- Empty state:
  - `No wallet connections yet.`
  - `Import a Nostr Wallet Connect URI from a wallet such as Alby Hub to test balance checks and manual invoice payments.`
- Capability not checked:
  - `Capabilities not checked yet.`
- Payment disabled:
  - `Payment unavailable until this wallet advertises pay_invoice.`

## Implementation slice suggestion

Implement in this order:

1. Restructure the page to use `dashboard-page` + `dashboard-hero`.
2. Derive active connection and secondary connections from the sorted connection list.
3. Add the large active-wallet panel.
4. Move inactive wallet connections into a compact secondary list/card.
5. Add collapsed import panel with empty-state auto-open behavior.
6. Add connection details expansion.
7. Restyle payment history rows enough to match the new page direction.
8. Add/update component tests only where behavior changes.

## Non-goals for this UI pass

- No website wallet provider API.
- No automatic payments.
- No recurring budgets.
- No transaction search/filtering.
- No real-time balance polling.
- No wallet logo fetching.
- No redesign of the payment approval flow beyond preserving the current explicit review dialog.
