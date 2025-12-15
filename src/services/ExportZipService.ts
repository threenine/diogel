/*
// ExportZip.ts (or inside your <script lang="ts" setup>)
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
export type ExportEncryptedZipOptions = {
  password: string;
  alias: string;
  pubkey: string;
  privKey: string;
  filename?: string;
};








export async function exportEncryptedZip(options: ExportEncryptedZipOptions) {
  const { password, alias, pubkey, privKey, filename = 'export.zip' } = options;

  // zip.js typings can vary by version; the cast keeps TS happy if `password`
  // isn't declared in the current type definitions.
  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    password,
  });


  await writer.add(filename, new TextReader('Exported from the app.\n'));/!**!/
  await writer.add(
    'account.json',
    new TextReader(
      JSON.stringify({ alias, pubkey, privKey, exportedAt: new Date().toISOString() }, null, 2),
    ),
  );
  return await writer.close();
}
*/
