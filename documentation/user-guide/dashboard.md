# Dashboard

The Dashboard is the main overview screen in Diogel. It is designed to answer one question quickly: **is this extension ready to sign, publish, and manage my Nostr identity safely?**

Use the Dashboard as your starting point after unlocking the vault.

## What the Dashboard is for

The Dashboard gives you a high-level view of:

- whether the vault is unlocked;
- whether an active Nostr identity is available;
- which websites have been approved recently;
- whether account relay metadata is available;
- recent approval, signing, and exception activity;
- quick publishing tools for simple Nostr events.

It is not intended to replace the specialist pages. For deeper work, use the relevant menu section:

- **Key Management** for identities and backups;
- **Profile Management** for profile metadata;
- **Relay Management** for relay configuration;
- **Wallet Connections** for Nostr Wallet Connect and Lightning payments;
- **Event History** for detailed activity review;
- **Settings** for vault and extension configuration.

## Vault status

Most Diogel features depend on the encrypted vault being unlocked.

If the Dashboard says the vault is locked, Diogel cannot access your stored Nostr keys or NWC wallet connection secrets. Unlock the vault before expecting signing, publishing, profile editing, relay management, or wallet actions to work.

The vault may lock automatically after inactivity depending on your **Settings → Auto-lock Vault** configuration.

## Active key status

The Dashboard shows whether Diogel has an active account/key available.

The active key is the Nostr identity Diogel uses when:

- signing website requests;
- publishing from Quick Publish;
- updating profile metadata;
- publishing relay metadata.

If no active key is selected, open **Key Management**, create or import a key, and select the identity you want to use.

## Approved clients widget

The Approved Clients area summarizes websites that have been approved to interact with Diogel.

A client is typically a website origin, such as `https://example.com`, that asked Diogel for public-key access, signing, encryption, decryption, or relay access.

Approvals matter because they control how much friction Diogel places between a website and your identity.

Approval durations can include:

- one-time approval;
- temporary approval, such as 8 hours;
- always allowed for that site.

Use permanent approvals sparingly. If you stop trusting a site, review and revoke related permissions where supported by the extension workflow.

## Active keys widget

The Active Keys widget indicates that the vault contains usable identity keys.

A Nostr key controls an identity. The key itself is sensitive, but websites do not need to see it. Diogel signs on your behalf after approval.

If this widget indicates no account is available, use **Key Management** to add or import an identity.

## Connected relays widget

The Connected Relays widget reflects relay metadata for the active account.

Relays are the servers Nostr clients use to publish and fetch events. Without usable relays, publishing and profile updates may fail or may not propagate well.

If the widget says relay metadata is unavailable, open **Relay Management** and configure read/write relays for the active account.

## Recent activity widget

Recent activity helps you spot what Diogel has been doing.

It can show activity such as:

- approval requests;
- signed events;
- rejected requests;
- extension exceptions;
- publishing outcomes.

Use it as a quick audit trail. For a more detailed view, open **Event History**.

## Quick Publish

Quick Publish lets you sign and publish simple Nostr events directly from Diogel.

It is useful when you want to publish without opening a full Nostr client.

### Supported note types

Quick Publish supports at least:

- **Text Note** — Nostr kind `1`;
- **Long Form** — Nostr kind `30023`.

### Quick Publish workflow

1. Choose the signing account.
2. Select the note type.
3. Write the content.
4. Add tags if needed.
5. Review the preview.
6. Confirm signing and publishing.

### Preview before publish

The preview stage is important. It shows details such as:

- account alias;
- account public key;
- event kind;
- content preview;
- tag count;
- selected publishing relays;
- technical JSON details.

Only confirm if the preview matches what you intend to publish.

## Common Dashboard problems

### Vault is locked

Unlock the vault. If it keeps locking too quickly, adjust auto-lock in Settings.

### No active account

Open Key Management and select or create a key.

### No relay metadata

Open Relay Management and publish relay metadata for the active account.

### Quick Publish cannot publish

Check:

- vault is unlocked;
- active account exists;
- account has eligible relays;
- selected relays are reachable;
- content is valid for the selected note type.

## Best practices

- Check Dashboard after unlocking Diogel.
- Keep relay configuration healthy before publishing.
- Treat recent activity as an audit signal.
- Use Quick Publish for simple events, not complex application workflows.
- Review every preview before signing or publishing.
