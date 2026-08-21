import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Guards the project's declared Node range against the toolchain's.
 *
 * These drifted apart silently: `package.json` accepted Node 20 and 25 while `@quasar/app-vite`
 * rejected both, so an install could succeed on a version where every build failed. Nothing surfaced
 * that until someone tried it (#142).
 */

const ROOT = resolve(__dirname, '../..');

const read = (path: string): { engines?: { node?: string } } =>
  JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as { engines?: { node?: string } };

/** `^22 || ^24` -> [22, 24]. Only the major matters for this comparison. */
const majors = (range: string | undefined): number[] =>
  [...(range ?? '').matchAll(/\^?(\d+)/g)].map(([, major]) => Number(major));

describe('the declared Node range', () => {
  const project = majors(read('package.json').engines?.node);
  const toolchain = majors(read('node_modules/@quasar/app-vite/package.json').engines?.node);

  it('is not empty in either place', () => {
    expect(project.length).toBeGreaterThan(0);
    expect(toolchain.length).toBeGreaterThan(0);
  });

  it('offers no major the build toolchain rejects', () => {
    const unsupported = project.filter((major) => !toolchain.includes(major));

    expect(unsupported).toEqual([]);
  });

  it('includes the version pinned in .nvmrc', () => {
    const pinned = Number(/v?(\d+)/.exec(readFileSync(resolve(ROOT, '.nvmrc'), 'utf8'))?.[1]);

    expect(project).toContain(pinned);
    expect(toolchain).toContain(pinned);
  });
});
