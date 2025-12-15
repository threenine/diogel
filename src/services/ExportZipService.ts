// ExportZip.ts (or inside your <script lang="ts" setup>)
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportEncryptedZip(options: {
  password: string;
  alias: string;
  pubkey: string;
  privKey: string;
}) {
  const { password, alias, pubkey, privKey } = options;

  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    password, // enables encryption
  });

  // Add files (examples)
  await writer.add('README.txt', new TextReader('Exported from the app.\n'));
  await writer.add(
    'account.json',
    new TextReader(
      JSON.stringify({ alias, pubkey, privKey, exportedAt: new Date().toISOString() }, null, 2),
    ),
  );

  const zipBlob = await writer.close();
  downloadBlob(zipBlob, 'export.zip');
}
