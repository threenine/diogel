import { BlobWriter, configure, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { StoredKey } from 'src/types';
import * as nip19 from 'nostr-tools/nip19';
import { hexToBytes } from '@noble/hashes/utils';

export const ZIP_MIME_TYPE = 'application/zip';
// This required here to disable web workers for @zip.js
// couldn't figure out how to instantiate this in the quasar.config
configure({
  useWebWorkers: false,
});

export async function createEncryptedZipBytes(
  password: string,
  filename: string,
  key: StoredKey,
): Promise<ArrayBuffer> {
  const writer = new ZipWriter(new BlobWriter(ZIP_MIME_TYPE), {
    password,
    zipCrypto: true, // enables encryption
  });

  const content = createText(key) + '\n';
  await writer.add(`${key.alias}.txt`, new TextReader(content));

  const zipBlob = await writer.close();
  return await zipBlob.arrayBuffer();
}

function createText(key: StoredKey): string {
  let npub = '';
  let nsec = '';
  try {
    npub = nip19.npubEncode(key.id);
    nsec = nip19.nsecEncode(hexToBytes(key.account.privkey));
  } catch (e) {
    console.error('Failed to derive keys for export', e);
  }

  const lines = [
    `Alias: ${key.alias}`,
    '',
    '== Nostr Keys ==',
    `npub:  ${npub}`,
    `nsec: ${nsec}`,
    '',
    'Notes:',
    '- Keep this file secure. Do not leave this file in plain text on your computer.',
    '- Do not share this file with anyone.',
    '- Do not upload this file to a public website.',
    '- Do not email this file to anyone.',
    '- This file contains your public and private keys. It is your responsibility to keep it safe.',
  ];

  return lines.join('\n') + '\n';
}
