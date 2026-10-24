/** What npm publishes: every export, from the built files. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, { types: string; default: string }> };
};

describe('the published exports', () => {
  it('list every export of the workspace', () => {
    expect(Object.keys(pkg.publishConfig.exports)).toEqual(Object.keys(pkg.exports));
  });

  it('point at the built files', () => {
    for (const [path, target] of Object.entries(pkg.publishConfig.exports)) {
      expect([path, target.types, target.default]).toEqual([path, expect.stringMatching(/^\.\/dist\/.+\.d\.ts$/), expect.stringMatching(/^\.\/dist\/.+\.js$/)]);
    }
  });
});
