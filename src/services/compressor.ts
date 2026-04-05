import { BlobWriter, configure, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { StoredKey } from '../types';
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

  const content = generateKeyExportText(key);
  await writer.add(`${key.alias}.txt`, new TextReader(content));

  const zipBlob = await writer.close();
  return await zipBlob.arrayBuffer();
}



/**
 * Check if a string is a valid hexadecimal string
 */
function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Generates the text content for the exported key file.
 * This is exported for testing purposes.
 * @param key The stored key to export
 * @returns The text content for the export file
 */
export function generateKeyExportText(key: StoredKey): string {
  if (!key) {
    throw new Error('Stored key cannot be null or undefined');
  }

  if (!isValidHex(key.id) || !isValidHex(key.account.privkey)) {
    throw new Error('Invalid hex string for key.id or privkey');
  }

     const npub = nip19.npubEncode(key.id);
     const nsec = nip19.nsecEncode(hexToBytes(key.account.privkey));

  return formatKeyBackupText(key.alias, key.createdAt, npub, nsec);
}
export function formatKeyBackupText(
  alias: string,
  createdAt: string,
  npub: string,
  nsec: string,
): string {
  const lines = [
    '===================================================================================',
    '                          DIOGEL KEY BACKUP',
    '===================================================================================',
    '',
    `Alias: ${alias}`,
    `Created At: ${createdAt}`,
    '',
    '-----------------------------------------------------------------------------------',
    'NOSTR KEYS',
    '-----------------------------------------------------------------------------------',
    `npub (Public Key):  ${npub}`,
    `nsec (Private Key): ${nsec}`,
    '',
    '-----------------------------------------------------------------------------------',
    'IMPORTANT SECURITY NOTES',
    '-----------------------------------------------------------------------------------',
    '- KEEP THIS FILE SECURE: This file contains your sensitive private key.',
    '- DO NOT SHARE: Anyone with access to this file can control your Nostr identity.',
    '- DO NOT LEAVE IN PLAIN TEXT: Once decrypted, ensure this file is not left on',
    '  an unencrypted drive.',
    '- DO NOT UPLOAD: Never upload this file to any public or cloud storage.',
    '- DO NOT EMAIL: Email is not a secure medium for private keys.',
    '',
    '===================================================================================',
    'DIOGEL - Secure Nostr Key Management',
    '====================================================================================',
  ];

  return lines.join('\n') + '\n';
}
