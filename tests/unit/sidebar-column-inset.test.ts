import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Guards the panel column's single inset.
 *
 * `SidebarHome` insets the column, and the components it renders used to add 12px of their own on
 * top, so request content sat 24px from each edge and cost 48px of a 320px floor while the idle
 * view sat at 12px. Nothing about scoped styles makes that visible in review, and no unit test
 * sees it either: `@vue/test-utils` does not apply a component's `<style>` block, so this reads
 * the source rather than the rendered result.
 */

const SOURCE_ROOT = resolve(__dirname, '../../src');

/** Root class of each component rendered inside the page's already-inset column. */
const COLUMN_COMPONENTS = [
  { file: 'components/sidebar/CurrentRequest.vue', root: 'current-request' },
  { file: 'components/sidebar/SidebarUnlock.vue', root: 'sidebar-unlock' },
  { file: 'components/sidebar/PendingRequestList.vue', root: 'pending-list' },
] as const;

const PAGE = { file: 'pages/SidebarHome.vue', root: 'sidebar-home' } as const;

const read = (file: string): string => readFileSync(resolve(SOURCE_ROOT, file), 'utf8');

/** The declaration block for an exact class selector, ignoring its `__element` descendants. */
const findRuleBody = (css: string, root: string): string | undefined => {
  const rule = new RegExp(`^\\.${root}\\s*\\{([^}]*)\\}`, 'm').exec(css);
  return rule?.[1];
};

const declaresPadding = (body: string): boolean => /(^|[\s;])padding(-\w+)?\s*:/.test(body);

describe('sidebar column inset', () => {
  it('insets the column once, at the page', () => {
    const body = findRuleBody(read(PAGE.file), PAGE.root);

    expect(body).toBeDefined();
    expect(declaresPadding(body ?? '')).toBe(true);
  });

  for (const { file, root } of COLUMN_COMPONENTS) {
    it(`does not re-inset the column in ${root}`, () => {
      const body = findRuleBody(read(file), root);

      // The rule must still exist, or this assertion would pass for the wrong reason.
      expect(body).toBeDefined();
      expect(declaresPadding(body ?? '')).toBe(false);
    });
  }
});
