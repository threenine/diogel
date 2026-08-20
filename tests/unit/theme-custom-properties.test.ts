import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Guards a failure mode that is silent at build time and invisible in review.
 *
 * Sass does not evaluate SassScript inside a custom-property value; the value is emitted as plain
 * CSS text. `--header-bg: $light-header;` therefore ships the literal string `$light-header`, which
 * is an invalid property value, so every `var(--header-bg)` consumer resolves to nothing and the
 * application chrome renders with no background. Interpolation is required: `#{$light-header}`.
 *
 * Nothing else catches this. Sass compiles it without a warning, the stylesheet is valid CSS, and
 * the only symptom is a missing background that a reviewer has to notice by eye.
 */

const THEME_FILE = resolve(__dirname, '../../src/css/quasar.variables.scss');

/** A custom-property declaration, capturing the property name and its value. */
const CUSTOM_PROPERTY = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm;

/** Bare `$var` outside `#{}`, which Sass will not substitute. */
const UNINTERPOLATED_SASS_VARIABLE = /\$[\w-]+/;

const stripInterpolations = (value: string): string => value.replace(/#\{[^}]*\}/g, '');

describe('theme custom properties', () => {
  const source = readFileSync(THEME_FILE, 'utf8');

  it('interpolates every Sass variable used in a custom-property value', () => {
    const offenders: string[] = [];

    for (const [, name, value] of source.matchAll(CUSTOM_PROPERTY)) {
      if (UNINTERPOLATED_SASS_VARIABLE.test(stripInterpolations(value))) {
        offenders.push(`${name}: ${value.trim()}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('declares --header-bg from an interpolated variable in both themes', () => {
    const declarations = [...source.matchAll(CUSTOM_PROPERTY)]
      .filter(([, name]) => name === '--header-bg')
      .map(([, , value]) => value.trim());

    expect(declarations).toHaveLength(2);
    for (const value of declarations) {
      expect(value).toMatch(/^#\{\$[\w-]+\}$/);
    }
  });
});
