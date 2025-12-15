// ExportZip.ts (or inside your <script lang="ts" setup>)
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

export type ExportEncryptedZipOptions = {
  password: string;
  alias: string;
  pubkey: string;
  privKey: string;
  filename?: string;
};

/**
 * Minimal File System Access API typings (avoids TS “red squigglies” when lib.dom
 * in your project doesn’t include these experimental types).
 */
type FilePickerAcceptType = Record<string, string[]>;

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: FilePickerAcceptType;
  }>;
};

type FileSystemWritableFileStream = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

type FileSystemFileHandle = {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

type FileSystemDirectoryHandle = {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
};

type FileSystemAccessWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Revoke on next tick to avoid edge cases where revocation is “too fast”.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeFilename(name: string): string {
  // Remove any path separators and control characters; keep it simple for safety
  const cleaned = name.replace(/[\\/:*?"<>|\n\r\t]+/g, ' ').trim();
  // Ensure it ends with .zip
  const finalName = cleaned.toLowerCase().endsWith('.zip') ? cleaned : `${cleaned || 'export'}.zip`;
  // Limit length to something reasonable (e.g., 120 chars)
  return finalName.length > 120 ? `${finalName.slice(0, 116)}.zip` : finalName;
}

/**
 * Try to add the file to the browser's Downloads list/history using the
 * browser extension downloads API (Chrome/Firefox). Returns true if a download
 * was initiated. Requires the "downloads" permission (added via quasar.config.ts).
 */
type DownloadConflictAction = 'uniquify' | 'overwrite' | 'prompt';
type DownloadOptions = {
  url: string;
  filename?: string;
  saveAs?: boolean;
  conflictAction?: DownloadConflictAction;
};
type BrowserDownloadsApi = {
  download: (options: DownloadOptions, callback?: (downloadId: number) => void) => number | Promise<number>;
};
type BrowserRuntimeApi = { lastError?: { message?: string } | null };
type RuntimeSendMessageCb = (message: unknown, responseCallback: (response: unknown) => void) => void;
type RuntimeSendMessagePromise = (message: unknown) => Promise<unknown>;
type RuntimeLike = BrowserRuntimeApi & { sendMessage?: RuntimeSendMessageCb | RuntimeSendMessagePromise };
type BrowserEnv = {
  chrome?: { downloads?: BrowserDownloadsApi; runtime?: RuntimeLike };
  browser?: { downloads?: BrowserDownloadsApi; runtime?: RuntimeLike };
};

function isPromise<T = unknown>(val: unknown): val is Promise<T> {
  return typeof val === 'object' && val !== null && 'then' in (val as Record<string, unknown>);
}

async function tryDownloadViaBrowserDownloads(blob: Blob, filename: string): Promise<boolean> {
  const g = globalThis as unknown as BrowserEnv;
  const downloadsApi: BrowserDownloadsApi | undefined =
    g?.chrome?.downloads || g?.browser?.downloads;
  if (!downloadsApi?.download) {
    return false;
  }

  // Convert Blob to data: URL for cross-browser reliability (Chrome/Firefox)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(reader.error?.message ?? 'FileReader error'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  // Wrap downloads.download to work with both callback- and promise-style APIs
  const callDownload = (opts: DownloadOptions) =>
    new Promise<number>((resolve, reject) => {
      try {
        const maybePromise = downloadsApi.download(opts, (id: number) => {
          const lastErr = (g?.chrome?.runtime as BrowserRuntimeApi | undefined)?.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message || 'chrome.downloads.download failed'));
          } else {
            resolve(id);
          }
        });
        if (isPromise<number>(maybePromise)) {
          // Firefox returns a Promise
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          (maybePromise as Promise<number>).then(resolve, reject);
        }
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

  await callDownload({ url: dataUrl, filename, saveAs: true, conflictAction: 'uniquify' });
  return true;
}

/**
 * Prefer background messaging to initiate downloads so it always runs
 * in a context that has access to the downloads API (MV3 service worker).
 */
async function tryDownloadViaBackground(blob: Blob, filename: string): Promise<boolean> {
  const g = globalThis as unknown as BrowserEnv;
  const rt: RuntimeLike | undefined = g?.chrome?.runtime ?? g?.browser?.runtime;
  if (!rt?.sendMessage) return false;

  // Convert Blob to data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(reader.error?.message ?? 'FileReader error'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  // Wrap sendMessage for both callback and promise styles
  const send = (message: { type: string; url: string; filename: string }) =>
    new Promise<{ ok: boolean; id?: number; error?: string }>((resolve, reject) => {
      try {
        const sendMessage = rt.sendMessage as (
          m: unknown,
          cb?: (response: unknown) => void,
        ) => unknown;
        const maybePromise = sendMessage(message, (response: unknown) => {
          const lastErr = (g?.chrome?.runtime as BrowserRuntimeApi | undefined)?.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message || 'runtime.sendMessage failed'));
          } else {
            resolve(response as { ok: boolean; id?: number; error?: string });
          }
        });
        if (isPromise(maybePromise)) {
          (maybePromise as Promise<{ ok: boolean; id?: number; error?: string }>).then(
            resolve,
            reject,
          );
        }
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

  try {
    const res = await send({ type: 'download-zip', url: dataUrl, filename });
    return !!res?.ok;
  } catch {
    return false;
  }
}

export async function exportEncryptedZip(options: ExportEncryptedZipOptions) {
  const { password, alias, pubkey, privKey, filename = 'export.zip' } = options;
  const safeFilename = sanitizeFilename(filename);

  // zip.js typings can vary by version; the cast keeps TS happy if `password`
  // isn't declared in the current type definitions.
  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    password,
  } as unknown as object);

  await writer.add('README.txt', new TextReader('Exported from the app.\n'));
  await writer.add(
    'account.json',
    new TextReader(
      JSON.stringify({ alias, pubkey, privKey, exportedAt: new Date().toISOString() }, null, 2),
    ),
  );

  const zipBlob = await writer.close();

  // Priority: send to background to initiate download via downloads API.
  try {
    const bg = await tryDownloadViaBackground(zipBlob, safeFilename);
    if (bg) return;
  } catch (err) {
    console.warn('Background download failed, trying direct downloads API', err);
  }

  // Secondary: attempt direct downloads API from this context.
  try {
    const initiated = await tryDownloadViaBrowserDownloads(zipBlob, safeFilename);
    if (initiated) return;
  } catch (err) {
    console.warn('Direct downloads API failed, attempting FS Access / anchor', err);
  }

  // Fallbacks: attempt File System Access API (won't appear in Downloads UI),
  // and finally the classic anchor-based download which does appear in Downloads.
  try {
    const w = window as FileSystemAccessWindow;
    if (typeof w.showDirectoryPicker === 'function') {
      const dirHandle = await w.showDirectoryPicker();
      const fileHandle = await dirHandle.getFileHandle(safeFilename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(zipBlob);
      await writable.close();
      return;
    }
  } catch {
    // ignore and fallback to browser download
  }

  // Anchor-based download shows up in Downloads in both Chrome and Firefox.
  downloadBlob(zipBlob, safeFilename);
}
