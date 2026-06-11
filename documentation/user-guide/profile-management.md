# Profile Management

Profile Management is where you edit public Nostr profile metadata for the active identity.

A Nostr profile is not stored on Diogel servers. It is signed by your active key and published to relays as Nostr metadata.

## What Profile Management is for

Use Profile Management to update fields such as:

- name;
- display name;
- bio/about text;
- profile picture URL;
- banner URL;
- website;
- NIP-05 identifier;
- Lightning address / LUD-16;
- birthday fields;
- bot/automated account flag.

## Active identity matters

Profile edits apply to the active Nostr key.

Before editing, confirm you are using the correct account in Diogel. If you update the wrong identity, you may publish metadata under the wrong public key.

## Profile fields explained

### Name

A short public name. Many Nostr clients display this prominently.

### Display name

A longer or more human-friendly name. Some clients prefer display name over name.

### About / Bio

A short public description of the account.

Use this for context, links, or profile notes. It is public.

### Picture URL

A URL to your avatar/profile image.

### Banner URL

A URL to your profile banner image.

### Website

A public website associated with the identity.

### NIP-05 identifier

A human-readable identifier such as `name@example.com` that can prove a domain associates that name with your Nostr public key.

### Lightning address / LUD-16

A Lightning address that other apps may use for zaps or payments.

This is not the same thing as a Nostr Wallet Connect URI. LUD-16 is public payment address metadata. NWC is a private wallet connection credential.

### Birthday fields

Optional public metadata fields for birthday information.

### Bot flag

Indicates whether the account is automated or partly automated.

## NIP-05 verification

Diogel can verify a NIP-05 identifier by checking whether the identifier resolves to the active account's public key.

Possible outcomes include:

- verified;
- malformed identifier;
- network error;
- invalid response;
- identifier not found;
- public key mismatch.

A public key mismatch means the NIP-05 record points to a different Nostr key.

## Profile images

Profile images and banners are URLs.

Depending on configuration, Diogel may use a Blossom server for image uploads. The Blossom server can be configured in **Settings**.

Only use a Blossom server you trust. Uploaded media may be public.

## Saving profile changes

When you save profile changes, Diogel signs and publishes metadata for the active key.

Before saving:

- check the active identity;
- review public fields;
- confirm image URLs are correct;
- verify NIP-05 if used;
- make sure configured relays are available.

## Privacy notes

Profile metadata is public Nostr data.

Do not put private information in your profile unless you intentionally want it public.

Fields such as birthday, website, Lightning address, and bio can reveal personal information.

## Common issues

### No active account selected

Open Key Management and select an account.

### Profile fetch failed

Possible causes:

- relays are unavailable;
- relay list is missing;
- network issue;
- profile metadata has not been published yet.

### NIP-05 mismatch

The domain's NIP-05 record points to another public key. Update the server-side NIP-05 record or use the correct account.

### Image upload failed

Check Blossom server configuration, file format, and network connectivity.

## Best practices

- Keep public profile data intentional.
- Verify NIP-05 after editing it.
- Use reliable image hosting or Blossom servers.
- Check active account before saving.
- Avoid publishing sensitive personal data accidentally.
