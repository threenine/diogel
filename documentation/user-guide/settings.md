# Settings

Settings controls extension preferences, vault behavior, media upload configuration, and vault backup/restore.

Use Settings carefully. Some actions, especially vault import, can affect access to your keys and wallet connection data.

## What Settings is for

Use Settings to manage:

- light/dark theme;
- vault auto-lock timeout;
- Blossom server URL;
- vault export;
- vault import.

## Theme

Diogel supports light and dark mode.

Changing the theme affects the extension UI only. It does not affect Nostr events, profile metadata, or website behavior.

## Auto-lock vault

Auto-lock controls how long Diogel keeps the vault unlocked after inactivity.

Available options include:

- Off;
- 1 minute;
- 5 minutes;
- 15 minutes;
- 30 minutes;
- 60 minutes.

### Choosing an auto-lock value

Shorter lock times are safer.

Longer lock times are more convenient.

Suggested defaults:

- shared or risky device: 1-5 minutes;
- normal personal device: 15 minutes;
- trusted desktop environment: 30-60 minutes if acceptable;
- off only when you understand the risk.

When the vault locks, Diogel cannot sign, publish, manage keys, or use wallet connections until unlocked again.

## Blossom server

Blossom is a media storage protocol used by some Nostr tools.

The Blossom server setting controls the server Diogel uses for supported media upload workflows, such as profile image handling where available.

Only use a Blossom server you trust. Uploaded media may become publicly accessible.

## Vault Management

The vault stores sensitive local data, including:

- Nostr private keys;
- Nostr identity metadata held by the extension;
- Nostr Wallet Connect connection secrets;
- NIP-47 payment history;
- vault metadata.

Vault management includes export and import.

## Export vault

Exporting downloads an encrypted backup of the vault.

Use export to:

- back up your keys;
- move Diogel to another browser profile;
- protect against browser data loss;
- keep a recovery copy before major changes.

### Export safety

Even though the exported vault is encrypted, treat it as sensitive.

Store it securely. If someone gets the backup and your vault password, they may be able to access your keys and wallet connection data.

## Import vault

Importing restores a previously exported vault file.

Warning: importing can overwrite the current vault state.

Before importing:

- confirm the backup file is the one you want;
- consider exporting the current vault first;
- make sure you know the backup password;
- understand that current local data may be replaced.

## Vault password

Your vault password is not a cloud account password.

Diogel cannot reset it for you. If you forget it and have no usable backup or private key export, you may lose access to stored identities.

## Relationship to browser sync

Do not rely on browser sync as your only backup strategy.

Browser extension storage behavior can vary by browser, profile, and extension settings. Use Diogel's vault export for intentional backups.

## Common issues

### Vault export failed

Possible causes:

- browser blocked the download;
- vault unavailable;
- storage error.

Try again and check browser download permissions.

### Vault import failed

Possible causes:

- wrong file;
- corrupted backup;
- unsupported file format;
- wrong password after import;
- browser storage error.

### Auto-lock is annoying

Increase the timeout. Do not disable auto-lock unless you understand the device risk.

### Theme does not update immediately

Refresh or reopen the extension window. If the problem persists, check for browser extension caching during development builds.

## Best practices

- Export a vault backup after creating or importing important keys.
- Export again after adding important wallet connections.
- Store backups securely.
- Keep auto-lock enabled on normal devices.
- Use a trusted Blossom server.
- Export before importing another vault.
