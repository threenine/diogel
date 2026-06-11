# Key Management

Key Management is where you create, import, select, view, and back up Nostr identity keys.

This is one of the most sensitive areas of Diogel. A Nostr private key controls an identity. Anyone with that private key can act as that identity.

## What Key Management is for

Use Key Management to:

- create a new Nostr identity;
- import an existing Nostr private key;
- view stored keys;
- rename local key aliases;
- select which identity is active;
- export backups;
- inspect public/private key details when needed.

## Nostr keys in plain English

A Nostr identity has two important parts:

- **Public key** — identifies you publicly. Safe to share.
- **Private key** — controls the identity. Never share it.

Public keys are often encoded as `npub...`.

Private keys are often encoded as `nsec...`.

Diogel stores private keys in an encrypted local vault so websites can request signatures without receiving your private key.

## Active key

The active key is the identity Diogel uses by default.

It is used for:

- NIP-07 website signing;
- profile updates;
- relay metadata publishing;
- Quick Publish.

If you manage multiple identities, check the active key before signing or publishing.

## Creating a new key

Use **Add New Key** when you want a fresh Nostr identity.

Typical workflow:

1. Open **Key Management**.
2. Choose **Add New Key**.
3. Enter a local alias.
4. Generate the key.
5. Save it to the vault.
6. Export and securely store a backup.

The alias is local to Diogel. It does not change your Nostr public key or public profile name.

## Importing an existing key

Use **Import Key** when you already have a Nostr private key.

Typical workflow:

1. Open **Key Management**.
2. Choose **Import Key**.
3. Paste the `nsec...` private key.
4. Add a recognizable alias.
5. Save it into the vault.

Only import keys on devices you control and trust.

## Viewing a key

The key view lets you inspect a stored key and manage its local alias or backup.

Be careful when viewing private key material. Do not screen-share, screenshot, or paste private keys into chat.

## Local aliases

Aliases help you recognize keys inside Diogel.

Examples:

- `Main Account`
- `Work`
- `Personal`
- `Testing`
- `Anonymous`

Aliases are not public Nostr names. To change your public name, use **Profile Management**.

## Exporting key backups

Backups are essential.

If you lose your private key and vault backup, nobody can recover your Nostr identity for you.

Store backups in a secure place, such as:

- a reputable password manager;
- an encrypted offline drive;
- a printed/offline recovery record stored safely.

Avoid storing raw private keys in plain text files or cloud notes.

## Multiple identities

Diogel can store multiple identities in the vault.

This is useful for separating contexts:

- personal identity;
- work identity;
- testing identity;
- anonymous or pseudonymous identity.

Before signing from a website or publishing, confirm the active identity is the one you intend to use.

## Security warnings

### Never share your private key

Your private key controls your identity. If someone gets it, they can impersonate you.

### Do not paste private keys into websites

A website that asks for an `nsec` key should be treated with suspicion. Use Diogel as a signer instead.

### Back up before relying on an identity

If the browser profile is lost, corrupted, or deleted, you may lose local vault data unless you have backups.

### Keep your vault password safe

The vault password protects local encrypted vault data. Diogel cannot reset it if forgotten.

## Common issues

### Invalid nsec

The imported private key must be a valid Nostr private key. Check that it starts with `nsec` and was copied completely.

### Duplicate key

Diogel may reject importing a key that already exists in the vault.

### No active account selected

Open Key Management and select the key you want to use.

### Website signs with the wrong identity

Check the active key before approving website requests.

## Best practices

- Use clear aliases.
- Keep a secure backup of every important key.
- Do not expose private keys during screenshots or support requests.
- Use separate identities for separate contexts.
- Check active identity before approving signatures.
