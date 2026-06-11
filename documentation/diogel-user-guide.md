# Diogel User Guide

Diogel is a browser extension for managing Nostr identities, signing Nostr events, approving website requests, managing relays, and connecting to Lightning wallets through Nostr Wallet Connect.

This guide explains what Diogel does, how to set it up, and how to use its main features safely.

## Contents

1. [What Diogel is](#what-diogel-is)
2. [Core concepts](#core-concepts)
3. [Installing Diogel](#installing-diogel)
4. [First-time setup](#first-time-setup)
5. [Using the dashboard](#using-the-dashboard)
6. [Managing Nostr keys](#managing-nostr-keys)
7. [Using Diogel with Nostr websites](#using-diogel-with-nostr-websites)
8. [Understanding approval requests](#understanding-approval-requests)
9. [Managing your profile](#managing-your-profile)
10. [Managing relays](#managing-relays)
11. [Quick Publish](#quick-publish)
12. [Wallet Connections and Lightning payments](#wallet-connections-and-lightning-payments)
13. [Event history and logs](#event-history-and-logs)
14. [Settings and vault management](#settings-and-vault-management)
15. [Security guidance](#security-guidance)
16. [Troubleshooting](#troubleshooting)
17. [Glossary](#glossary)

## What Diogel is

Diogel is a local-first Nostr identity and signing extension.

It lets you:

- Create or import Nostr identity keys.
- Store keys in a password-protected encrypted local vault.
- Use Nostr websites that support browser signers through `window.nostr`.
- Approve or reject signing and encryption requests from websites.
- Manage Nostr profile metadata.
- Manage relay settings.
- Publish simple Nostr notes directly from the extension.
- Connect to Lightning wallets through Nostr Wallet Connect (NWC).
- Check wallet info and balance.
- Pay BOLT11 Lightning invoices after explicit approval.
- Review signing activity, exceptions, and wallet payment history.

Diogel does **not** act as a custodial service. It does not hold your funds on a server, and it does not manage an online account for you. Your keys and wallet connection details are stored locally in your browser extension vault.

## Core concepts

### Nostr identity

A Nostr identity is controlled by a private key. Anyone with that private key can act as that identity.

Diogel helps you store and use that key without pasting it into websites.

### Public key

Your public key identifies you on Nostr. It is safe to share.

It is often shown as an `npub...` value.

### Private key

Your private key controls your identity. It is often shown as an `nsec...` value.

Treat it like a password and a recovery seed combined. If someone gets your private key, they can impersonate you. If you lose it, Diogel cannot recover it for you.

### Encrypted vault

Diogel stores sensitive data inside a password-protected local vault.

The vault can contain:

- Nostr identity keys.
- Vault metadata.
- Nostr Wallet Connect connection secrets.
- NIP-47 payment history.

The vault lives locally in your browser extension storage. Export a backup if you need to move browsers or recover later.

### Website signer requests

Nostr websites can ask Diogel to:

- Get your public key.
- Sign an event.
- Get relay information.
- Encrypt or decrypt NIP-04 messages.
- Encrypt or decrypt NIP-44 messages.

Diogel shows approval prompts before allowing sensitive actions.

### Nostr Wallet Connect (NWC)

NWC lets Diogel connect to an external Lightning wallet service using Nostr relays.

Diogel does **not** become a full Lightning wallet. Instead, it stores an NWC connection string in the encrypted vault and sends wallet requests to the connected wallet service.

Current wallet functionality is internal to the extension. Diogel does **not** expose a wallet API to websites yet.

## Installing Diogel

### Chrome

Install from the Chrome Web Store:

<https://chromewebstore.google.com/detail/diogel/inhkmeiabnknligdjngmoocohdonoboa>

### Firefox

Install from Firefox Add-ons:

<https://addons.mozilla.org/en-US/firefox/addon/diogel/>

### Manual installation from GitHub

Manual installation is mostly for testing development builds.

1. Download the latest release ZIP from GitHub.
2. Extract the ZIP file.
3. Open `chrome://extensions` in Chrome or a Chromium-based browser.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted extension folder.

For normal users, the browser store version is recommended.

## First-time setup

When you first open Diogel, you need to create or unlock your vault.

### Create a vault

1. Open the Diogel extension.
2. Choose a strong vault password.
3. Create or import a Nostr identity key.
4. Save your recovery information securely.

Your vault password protects the local vault on this browser. It is not a cloud login. Diogel cannot reset it for you.

### Create a new Nostr key

Use this if you are new to Nostr or want a fresh identity.

1. Open **Key Management**.
2. Click **Add New Key**.
3. Give the key a recognizable alias.
4. Generate the key.
5. Export and securely store the private key backup.

### Import an existing Nostr key

Use this if you already have a Nostr identity.

1. Open **Key Management**.
2. Click **Import Key**.
3. Paste your `nsec...` private key.
4. Give it an alias.
5. Save it into the vault.

Only import keys on a device you trust.

## Using the dashboard

The dashboard gives you a quick overview of your Diogel setup.

It can show:

- Whether the vault is locked or unlocked.
- Active keys available in the vault.
- Approved client/site activity.
- Relay status for the active account.
- Recent signing and exception activity.
- Quick Publish tools for signing and publishing simple Nostr events.

If the dashboard says the vault is locked, unlock the vault before using signing, profile, relay, or wallet features.

## Managing Nostr keys

Open **Key Management** to manage your Nostr identities.

### What you can do

- View keys stored in the vault.
- Create new keys.
- Import existing `nsec` keys.
- Rename key aliases.
- View key details.
- Export a secure backup.
- Select which key is active.

### Active key

The active key is the identity Diogel uses for signing website requests and publishing events.

If a website asks Diogel to sign something, Diogel signs with the active key after approval.

### Key aliases

Aliases are local labels to help you recognize keys. They do not change your Nostr public key and are not the same as a Nostr profile name.

Example aliases:

- `Main Account`
- `Work`
- `Testing`
- `Anonymous`

### Key backup warning

Back up your private key. If you lose your key and have no backup, you lose control of that Nostr identity.

Do not store your backup in plain text on a shared device.

## Using Diogel with Nostr websites

Diogel injects a NIP-07 compatible `window.nostr` provider into web pages.

This allows compatible Nostr websites to ask Diogel to perform signing-related actions without the website seeing your private key.

Supported provider methods currently include:

- `getPublicKey`
- `signEvent`
- `getRelays`
- `nip04.encrypt`
- `nip04.decrypt`
- `nip44.encrypt`
- `nip44.decrypt`

### Typical website login flow

1. Open a Nostr website that supports browser extensions/signers.
2. Choose a login option such as **Browser extension**, **NIP-07**, or **Extension signer**.
3. The website asks Diogel for your public key.
4. Diogel opens an approval prompt.
5. Review the origin and request type.
6. Approve or reject.

If approved, the website receives your public key and can identify your Nostr account.

### Signing posts from websites

When a website wants to publish a post, reaction, profile update, or other event, it asks Diogel to sign a Nostr event.

Diogel shows an approval prompt before signing.

Review:

- Which website is asking.
- The request type.
- The Nostr event kind.
- The content preview when available.

If something looks wrong, reject the request.

## Understanding approval requests

Approval prompts are one of Diogel's most important safety features.

A prompt may appear when a website asks to:

- Read your public key.
- Sign a Nostr event.
- Encrypt or decrypt data.
- Access relay information.

### Approval options

Diogel supports different approval durations:

- **Just this once** — approve only the current request.
- **For the next 8 hours** — remember the approval temporarily.
- **Always for this site** — remember the approval for that site.

Use **Always** carefully. It reduces prompts but gives the website more ongoing trust.

### When to reject

Reject a request if:

- You do not recognize the website.
- The website asks to sign something unexpected.
- The content preview looks wrong.
- The event kind is not what you expected.
- The request appears while you are not actively using the site.

### Event kinds in plain English

Nostr events have numeric kinds. Common examples:

- `0` — profile metadata.
- `1` — text note.
- `3` — contact list.
- `4` — encrypted direct message.
- `7` — reaction.
- `9734` — zap request.
- `10002` — relay list metadata.
- `30023` — long-form content.

If you are not sure what a request means, reject it and investigate.

## Managing your profile

Open **Profile Management** to manage Nostr profile metadata for your active identity.

Profile fields may include:

- Name.
- Display name.
- Bio/about text.
- Picture URL.
- Banner URL.
- Website.
- NIP-05 identifier.
- Lightning address (LUD-16).
- Birthday fields.
- Bot/automated account flag.

### NIP-05 verification

NIP-05 is a way to associate a Nostr public key with a human-readable identifier such as `name@example.com`.

Diogel can verify whether the identifier resolves to the active account's public key.

Possible verification outcomes include:

- Verified.
- Malformed identifier.
- Network error.
- Invalid response.
- Identifier not found.
- Public key mismatch.

A mismatch means the NIP-05 identifier points to a different public key.

### Profile images

Profile image and banner fields are URLs. Diogel can also use a configured Blossom server for uploads where supported by the app UI.

## Managing relays

Relays are servers that store and transmit Nostr events.

Open **Relay Management** to configure relays for the active account.

### Read and write relays

A relay can be used for reading, writing, or both.

- **Read** means clients may fetch events from that relay.
- **Write** means clients may publish events to that relay.

### Recommended relay list size

NIP-65 generally recommends keeping relay lists small and intentional. Diogel's UI guidance recommends roughly 2-4 relays per category.

Too many relays can make publishing slower and noisier. Too few can make your events harder to find.

### Relay Browser

The Relay Browser helps discover relays from a catalog.

You can:

- Search by name, hostname, or URL.
- Filter for search-capable relays.
- Refresh the relay list.
- Choose how many results to show per page.

### Saving relay metadata

When you save relay settings, Diogel signs and publishes relay metadata for the active account.

Review relay changes before saving.

## Quick Publish

Quick Publish lets you create and publish simple Nostr events from inside Diogel.

It is available from the dashboard.

You can:

- Choose the signing account.
- Select the note type.
- Write content.
- Add tags.
- Preview the event before signing.
- Publish to eligible account relays.

Current note type options include:

- Text Note — kind `1`.
- Long Form — kind `30023`.

Before publishing, Diogel shows a preview containing:

- Account alias.
- Account public key.
- Event kind.
- Content preview.
- Tag count.
- Publish destinations.
- Technical JSON details.

Only approve the final publish action if the preview is correct.

## Wallet Connections and Lightning payments

Open **Wallet Connections** to manage Nostr Wallet Connect links.

This feature lets Diogel connect to an external NWC-compatible Lightning wallet service.

Important: Diogel does not currently expose wallet features to websites. Wallet actions are internal to the extension and user-initiated.

### What you need

You need an NWC connection URI from a compatible wallet service.

The URI usually starts with:

```text
nostr+walletconnect://...
```

It may include:

- Wallet service public key.
- One or more relay URLs.
- A connection secret.
- Optional Lightning address information.

Treat this URI like an API key. Anyone with the URI may be able to use the wallet permissions granted by that NWC connection.

### Getting an NWC URI

The exact steps depend on your wallet provider.

Common pattern:

1. Open your wallet service.
2. Go to **Apps**, **Connections**, **Developer**, or **Nostr Wallet Connect**.
3. Create a new app connection.
4. Copy the generated `nostr+walletconnect://...` URI.
5. Paste it into Diogel.

Examples of NWC-compatible services may include Alby Hub or LNbits with an NWC extension, depending on your setup.

### Import a wallet connection

1. Open **Wallet Connections**.
2. Enter an optional label such as `Alby`, `LNbits`, or `Home Node`.
3. Paste the full NWC URI.
4. Click **Import connection**.

Diogel stores the NWC connection secret inside the encrypted vault.

### Check wallet info

After importing, click **Info**.

Diogel asks the wallet service for its capabilities.

Capabilities may include commands such as:

- `get_info`
- `get_balance`
- `pay_invoice`
- `make_invoice`
- `lookup_invoice`
- `list_transactions`

The exact capabilities depend on your wallet service.

### Check wallet balance

Click **Balance** to request the current wallet balance.

Diogel sends a NIP-47 `get_balance` request to the wallet service over the configured relays.

If successful, Diogel shows the last balance check in sats.

If it fails, common causes include:

- Wallet service is offline.
- Relays are unreachable.
- NWC URI was revoked or expired.
- Wallet does not support `get_balance`.
- Network or browser extension connectivity issues.

### Pay a Lightning invoice

Payment is deliberately explicit.

1. Import a wallet connection.
2. Click **Info** and confirm the wallet advertises `pay_invoice`.
3. Click **Pay invoice**.
4. Paste a BOLT11 invoice beginning with `lnbc...`, `lntb...`, or similar.
5. Review the parsed amount and invoice preview.
6. Tick the acknowledgement checkbox.
7. Click **Approve and pay**.

Diogel then sends a NIP-47 `pay_invoice` request to the connected wallet.

Start with a tiny test invoice, such as 1-10 sats.

### Payment history

Diogel records recent payment attempts inside the encrypted vault.

Payment history shows:

- Timestamp.
- Wallet connection label.
- Status: succeeded or failed.
- Parsed amount when available.
- Fees when returned by the wallet.
- Short payment hash when returned by the wallet.
- Invoice preview.
- Error message for failed attempts.

Payment history is capped to the latest 100 attempts.

Diogel does not show the payment preimage in the UI.

### Wallet safety notes

- Do not paste NWC URIs into chat, issues, screenshots, or public logs.
- Revoke unused NWC connections from your wallet service.
- Use small test payments when setting up a wallet connection.
- Only connect wallet services you trust.
- Do not approve payment if the invoice amount or source looks wrong.

## Event history and logs

Open **Event History** to review activity for the active account.

The history area can show:

- Approval and signing activity.
- Signed event details.
- Extension exceptions.
- Status information such as success, error, or rejected.

Use this page to audit what Diogel has recently done.

If a website behaves unexpectedly, check Event History for recent requests.

## Settings and vault management

Open **Settings** to configure Diogel.

### Theme

Switch between light and dark mode.

### Auto-lock vault

Auto-lock controls how long Diogel waits before locking the vault after inactivity.

Options include:

- Off.
- 1 minute.
- 5 minutes.
- 15 minutes.
- 30 minutes.
- 60 minutes.

Shorter lock times are safer. Longer lock times are more convenient.

### Blossom server

The Blossom server setting controls where Diogel uploads media when using supported image-upload features.

Only use a Blossom server you trust.

### Export vault

Exporting the vault downloads an encrypted backup.

Use this to:

- Back up your keys.
- Move Diogel data to another browser.
- Keep a disaster recovery copy.

Store vault backups securely. Even though the backup is encrypted, it contains sensitive data.

### Import vault

Importing a vault restores data from a previous backup.

Warning: importing a vault can overwrite current vault data. Make sure you know which backup you are restoring.

## Security guidance

### Protect your private keys

Never share your `nsec` private key.

Diogel is designed so websites can request signatures without seeing the private key.

### Protect your vault password

Your vault password protects local encrypted data.

Choose a strong password and do not reuse important passwords from other accounts.

### Back up your keys

If you lose your private key and vault backup, Diogel cannot recover the identity.

Keep backups offline or in a secure password manager.

### Review every approval

A signature is authorization. Always check what a site is asking you to sign.

Be especially careful with:

- Unknown websites.
- Repeated signing prompts.
- Requests that appear without a user action.
- Events containing content you did not write.

### Keep website permissions narrow

Use **Just this once** until you trust a site.

Use **Always for this site** only for sites you use regularly and understand.

### Protect NWC connection strings

An NWC URI can authorize wallet actions depending on how the wallet service configured it.

Do not share it. Revoke it if exposed.

### Payments are real money

Lightning payments cannot usually be reversed.

Before approving payment:

- Check the amount.
- Check the receiving wallet or invoice source.
- Start with small tests.
- Reject anything unexpected.

### Local-first does not mean risk-free

Diogel stores data locally, but browser extension storage still depends on your device security.

Use a secure operating system login, keep your browser updated, and avoid installing untrusted extensions.

## Troubleshooting

### Diogel says the vault is locked

Unlock the vault from the extension popup or login screen.

If auto-lock is enabled, the vault may lock after inactivity.

### A website cannot find Diogel

Try:

- Refreshing the website.
- Checking that Diogel is enabled in the browser extension manager.
- Confirming the site supports NIP-07/browser extension signers.
- Opening the extension once after browser startup.

### A signing request timed out

Possible causes:

- Approval popup was not answered in time.
- Vault was locked.
- Browser blocked or hid the popup.
- Background extension process restarted.

Try again after unlocking the vault.

### Profile save failed

Possible causes:

- No active account selected.
- Relay list is empty or unreachable.
- Network issue.
- Relay refused the event.

Check Relay Management and Event History.

### Relay list does not load

Try:

- Refreshing the relay browser.
- Checking your network connection.
- Adding a known relay manually.
- Using fewer relays.

Relay URLs should start with `wss://` or `ws://`.

### NWC import failed

Check that the URI:

- Starts with `nostr+walletconnect://`.
- Includes a valid wallet service public key.
- Includes at least one relay.
- Includes a valid secret.
- Has not been shortened or damaged when copied.

Do not paste a redacted URI. Diogel needs the full secret to connect.

### Wallet info or balance times out

Possible causes:

- Wallet service is offline.
- Wallet relay is down or blocked.
- NWC connection was revoked.
- The wallet does not support the requested command.
- Browser network connectivity issue.

Try clicking **Info** first to refresh wallet capabilities.

### Pay invoice button is disabled

The wallet connection must advertise `pay_invoice` before Diogel enables payment.

Click **Info** for the connection. If `pay_invoice` does not appear in capabilities, that wallet connection does not currently advertise payment support.

### Payment failed

Check:

- Invoice has not expired.
- Invoice amount is acceptable.
- Wallet has enough balance.
- Wallet allows payment for this NWC connection.
- Wallet service and relays are online.

Failed attempts appear in Payment history with the wallet error when available.

## Glossary

### BOLT11 invoice

A Lightning Network payment request. It usually starts with `lnbc`, `lntb`, or similar.

### Blossom

A media storage protocol used by some Nostr clients and tools for uploading files such as images.

### Event

A signed Nostr data object. Notes, reactions, profiles, relay lists, and many other actions are represented as events.

### Event kind

A number that describes what type of Nostr event is being signed or published.

### Lightning

A Bitcoin payment network designed for fast, low-cost payments.

### NIP

Nostr Implementation Possibility. NIPs describe protocols and conventions used by Nostr apps.

### NIP-04

A Nostr encryption method commonly used for legacy encrypted direct messages and some request/response protocols.

### NIP-07

The browser extension standard for exposing `window.nostr` to websites.

### NIP-44

A newer Nostr encryption method for encrypted payloads.

### NIP-47

Nostr Wallet Connect. A protocol for controlling a Lightning wallet through Nostr events.

### NIP-65

Relay list metadata. A convention for publishing preferred read/write relays.

### Nostr Wallet Connect (NWC)

A wallet connection protocol based on NIP-47.

### npub

A human-readable encoded Nostr public key.

### nsec

A human-readable encoded Nostr private key. Keep it secret.

### Relay

A server that stores and forwards Nostr events.

### Vault

Diogel's encrypted local storage for keys and sensitive extension data.
