# Relay Management

Relay Management is where you configure the Nostr relays used by the active identity.

Relays are servers that store and transmit Nostr events. Your relay choices affect how well other clients can find your events and how reliably you can publish.

## What Relay Management is for

Use Relay Management to:

- view relays for the active account;
- add relay URLs;
- choose read/write behavior;
- browse relay catalog entries;
- publish relay metadata;
- keep the relay list small and useful.

## What relays do

Nostr does not use one central server. Instead, clients publish and fetch events from relays.

A relay can be used for:

- **read** — clients fetch your events from it;
- **write** — clients publish your events to it;
- **read and write** — both.

## Relay URLs

Relay URLs usually start with:

```text
wss://
```

Some local or test relays may use:

```text
ws://
```

For normal internet use, prefer `wss://`.

## Read relays

Read relays tell other clients where to find events for your account.

Choose read relays that are stable and commonly reachable.

## Write relays

Write relays are where Diogel and other clients can publish events.

Choose write relays that accept your events reliably.

## NIP-65 relay metadata

NIP-65 defines a relay list metadata event, often kind `10002`.

Publishing relay metadata helps other clients know where to read from and write to for your account.

When you save relay settings in Diogel, it signs and publishes relay metadata for the active identity.

## Recommended relay count

Keep relay lists focused.

A practical starting point is:

- 2-4 read relays;
- 2-4 write relays;
- overlap is fine when a relay is good for both.

Too many relays can slow publishing and create noise. Too few can reduce availability.

## Relay Browser

The Relay Browser helps you discover relays.

It can support:

- searching by name;
- searching by hostname;
- searching by URL;
- filtering for search-capable relays;
- refreshing the relay catalog;
- changing results per page.

Use the browser as a discovery tool, not as an automatic recommendation engine. You still need to choose relays intentionally.

## Adding a relay manually

1. Open **Relay Management**.
2. Enter the relay URL.
3. Choose read/write settings.
4. Add the relay.
5. Save the relay list.

## Saving relay changes

Saving relay changes publishes relay metadata for the active key.

Before saving:

- check active account;
- remove dead or unwanted relays;
- avoid excessive relay counts;
- confirm read/write settings are right.

## How relay settings affect other features

Relay configuration affects:

- profile publishing;
- Quick Publish;
- visibility of signed events;
- how other Nostr clients discover your preferred relays.

NIP-47 wallet connections use their own relays from the NWC URI and are managed in **Wallet Connections**, not Relay Management.

## Common issues

### Invalid relay URL

The URL must start with `ws://` or `wss://`.

### Relay list save failed

Possible causes:

- vault is locked;
- no active key;
- signing failed;
- relays are unreachable;
- network error.

### Events are not visible in other clients

Check that:

- you published to relays other clients read from;
- your relay metadata was saved;
- the target client has refreshed;
- relays did not reject your event.

### Relay browser returns no results

Try changing the search query, disabling filters, or refreshing the catalog.

## Best practices

- Prefer stable `wss://` relays.
- Keep the list small.
- Use known relays for important identities.
- Periodically remove dead relays.
- Save relay metadata after changes.
