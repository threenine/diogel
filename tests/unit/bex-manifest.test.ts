import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Guards the source manifest against keys the build silently discards.
 *
 * `createManifest` in `@quasar/app-vite` merges only `all`, `chrome` and `firefox`. Anything else at
 * the top level is dropped, and the emitted `name`, `description` and `version` come from
 * `package.json` instead. A key here that looks authoritative and is not is worse than no key at
 * all: the file declared `"version": "0.0.1.0"` while every build shipped the package version
 * (#144).
 */

const ROOT = resolve(__dirname, '../..');

const read = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as Record<string, unknown>;

describe('the BEX source manifest', () => {
  const manifest = read('src-bex/manifest.json');

  it('declares only the sections the build merges', () => {
    expect(Object.keys(manifest).sort()).toEqual(['all', 'chrome', 'firefox']);
  });

  it('claims no extension version, because the build takes it from package.json', () => {
    expect(manifest).not.toHaveProperty('version');
    expect(read('package.json')).toHaveProperty('version');
  });

  it('keeps the target-specific keys where the build expects them', () => {
    // A regression here would emit a manifest missing the panel entirely, which no unit test of
    // the panel itself would notice.
    expect(manifest.chrome).toHaveProperty('side_panel');
    expect(manifest.firefox).toHaveProperty('sidebar_action');
  });
});
