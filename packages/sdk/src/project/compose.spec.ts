import { describe, expect, it } from 'vitest';
import { setupSteps } from './compose.js';

describe('a Buntubi project', () => {
  it('sets up in order: provider image, database, tables, key, first admin, the apps', () => {
    const steps = setupSteps('/srv/identity');
    expect(steps.map((step) => step.says)).toEqual([
      'building the provider with its plugins',
      'starting its database',
      'bringing its tables up to date',
      'making a signing key',
      'creating the first admin',
      'registering the apps in platform.toml',
    ]);
    expect(steps.at(-1)!.args).toContain('/srv/identity:/project');
    expect(steps.at(-1)!.args.at(-1)).toBe('/project/platform.toml');
  });
});
