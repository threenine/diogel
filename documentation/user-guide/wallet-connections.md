# Wallet Connections

Wallet Connections is where Diogel manages Nostr Wallet Connect (NWC) connections and user-initiated Lightning wallet actions.

This feature is based on NIP-47. It lets Diogel talk to an external Lightning wallet service through Nostr relays.

## Important safety summary

- Diogel does not become a full Lightning wallet.
- Diogel does not custody your funds.
- Diogel stores NWC connection secrets inside the encrypted vault.
- Wallet actions are internal to the extension.
- Websites cannot trigger wallet payments through Diogel in the current MVP.
- Payments require explicit user approval.

## What Wallet Connections is for

Use Wallet Connections to:

- import an NWC URI;
- label wallet connections;
- store connection secrets in the encrypted vault;
- fetch wallet capabilities;
- check wallet balance;
- pay BOLT11 invoices after explicit approval;
- review payment history.

## What Nostr Wallet Connect is

Nostr Wallet Connect lets an app send wallet commands over Nostr events.

A wallet service gives you an NWC URI. Diogel stores that URI's secret and uses it to send encrypted wallet requests over the relays listed in the URI.

The wallet service decides which commands are allowed.

## NWC URI format

An NWC URI usually starts with:

```text
nostr+walletconnect://
```

It may contain:

- wallet service public key;
- relay URLs;
- client secret;
- optional Lightning address (`lud16`).

Treat the full URI as sensitive. Do not share it publicly.

## Getting an NWC URI

Exact steps depend on the wallet service.

General workflow:

1. Open your wallet service.
2. Find **Apps**, **Connections**, **Developer**, or **Nostr Wallet Connect**.
3. Create a new app connection.
4. Copy the full `nostr+walletconnect://...` URI.
5. Import it into Diogel.

Compatible wallet services may include tools such as Alby Hub or LNbits with NWC support, depending on your setup.

## Importing a connection

1. Open **Wallet Connections**.
2. Enter an optional label, such as `Alby`, `LNbits`, or `Home Node`.
3. Paste the full NWC URI.
4. Click **Import connection**.

Diogel validates the URI and stores the secret in the encrypted vault.

## Configured connections

After import, Diogel shows configured connections with:

- local label;
- wallet service public key preview;
- client public key preview;
- configured relays;
- advertised capabilities after fetching info;
- last balance check when available.

Connection summaries intentionally do not show the client secret.

## Wallet info

Click **Info** to ask the wallet service for its metadata and capabilities.

Capabilities may include:

- `get_info`;
- `get_balance`;
- `pay_invoice`;
- `make_invoice`;
- `lookup_invoice`;
- `list_transactions`.

The exact list depends on the wallet service and the permissions granted to the NWC connection.

## Balance checks

Click **Balance** to send a NIP-47 `get_balance` request.

If successful, Diogel shows the balance in sats.

If it fails, check:

- wallet service is online;
- relays are reachable;
- NWC connection is still valid;
- wallet permits `get_balance`;
- browser network access is working.

## Paying invoices

Diogel supports explicit user-approved `pay_invoice` requests.

Workflow:

1. Click **Info** for the wallet connection.
2. Confirm `pay_invoice` appears in capabilities.
3. Click **Pay invoice**.
4. Paste a BOLT11 invoice.
5. Review parsed amount and invoice preview.
6. Tick the acknowledgement checkbox.
7. Click **Approve and pay**.

Start with a tiny test invoice, such as 1-10 sats.

## Why Pay invoice may be disabled

The Pay invoice button is disabled unless the wallet advertises `pay_invoice`.

If it is disabled:

1. click **Info**;
2. check whether `pay_invoice` appears;
3. verify the wallet connection grants payment permission.

## Payment approval dialog

The approval dialog is intentionally direct because Lightning payments are real money.

It shows:

- selected wallet connection;
- BOLT11 invoice field;
- parsed amount where possible;
- shortened invoice preview;
- explicit acknowledgement checkbox;
- final **Approve and pay** action.

Diogel only sends the wallet payment command after final approval.

## Payment history

Payment history is stored inside the encrypted vault.

It records the latest 100 payment attempts.

Entries include:

- timestamp;
- wallet connection label;
- status: succeeded or failed;
- parsed amount when available;
- fees when returned;
- short payment hash when returned;
- invoice preview;
- error message for failed attempts.

Diogel does not show the payment preimage in the UI.

## Removing a connection

Use **Remove** to delete a wallet connection from the vault.

You should also revoke unused or exposed NWC connections from the wallet service itself. Removing the local copy from Diogel does not necessarily revoke the credential on the wallet provider side.

## Security guidance

- Treat NWC URIs like API keys.
- Do not post NWC URIs in support tickets, screenshots, chats, or logs.
- Revoke exposed wallet connections immediately.
- Use low limits where your wallet service supports them.
- Start with small test payments.
- Do not approve invoices you do not understand.
- Remove old wallet connections you no longer use.

## Troubleshooting

### Import fails

Check that the URI is complete and starts with `nostr+walletconnect://`.

It must include at least one relay and a valid secret.

### Info times out

Wallet service or relays may be offline. Try again later or check the wallet service.

### Balance times out

Check relay connectivity, wallet service status, and whether the NWC connection is still valid.

### Payment fails

Possible causes:

- invoice expired;
- wallet has insufficient balance;
- wallet refuses payment;
- NWC connection lacks `pay_invoice` permission;
- relays are unreachable;
- wallet service is offline.

Failed attempts should appear in payment history with an error where available.
