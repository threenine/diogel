# Event History

Event History is Diogel's audit and troubleshooting area.

Use it to understand what Diogel has recently approved, signed, rejected, published, or failed to do.

## What Event History is for

Event History helps you review:

- approval requests;
- signed events;
- rejected requests;
- extension exceptions;
- successful and failed operations;
- recent activity for the active account.

If something unexpected happens, this is one of the first places to check.

## Approvals and signed events

The approvals area records activity related to website requests and signing behavior.

Examples can include:

- a website requested your public key;
- a website requested an event signature;
- a request was approved;
- a request was rejected;
- an event was signed;
- an operation failed.

## Exceptions

Exceptions are errors or unusual conditions recorded by the extension.

They can help diagnose:

- failed signing;
- background script issues;
- relay publishing failures;
- vault access problems;
- unexpected runtime errors.

## Columns and fields

Event History may show fields such as:

- date/time;
- event kind;
- hostname;
- message;
- status.

Status values can include:

- success;
- error;
- rejected.

## Event kinds

Nostr event kinds are numeric identifiers for event types.

Common examples:

- `0` — profile metadata;
- `1` — text note;
- `3` — contact list;
- `4` — encrypted direct message;
- `7` — reaction;
- `9734` — zap request;
- `10002` — relay list metadata;
- `30023` — long-form content.

If you see a kind you do not recognize, treat it as a signal to investigate before approving similar future requests.

## Using Event History for security

Review Event History if:

- a website behaved unexpectedly;
- you approved something by mistake;
- you see repeated prompts;
- you suspect a site is asking for too much;
- publishing did not work as expected.

Look for:

- unknown hostnames;
- repeated signing attempts;
- unexpected event kinds;
- rejected or failed requests;
- errors around the same time as the issue.

## Event History vs Payment History

Event History focuses on Nostr signing and extension activity.

Payment History lives in **Wallet Connections** and focuses on NIP-47 Lightning payment attempts.

Use both when troubleshooting wallet-related workflows:

- Event History for extension/signing/runtime problems;
- Payment History for invoice payment success/failure details.

## Refreshing history

Use refresh to reload the latest activity.

If recent activity does not appear immediately, refresh the page or reopen the extension.

## Common issues

### No activity found

Possible reasons:

- no recent approvals or exceptions;
- vault was locked;
- active account has no recorded activity;
- storage was cleared or reset.

### Error status appears

Open the entry and inspect the message if available. Then check the relevant feature page.

For example:

- relay errors → Relay Management;
- signing errors → Key Management and approval flow;
- profile errors → Profile Management;
- wallet errors → Wallet Connections.

## Best practices

- Review activity after using new websites.
- Investigate repeated or unexpected signing prompts.
- Use rejected/error entries as clues, not just noise.
- Keep screenshots of errors only if they do not expose private keys, NWC URIs, or sensitive invoice data.
