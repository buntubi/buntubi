import { describe, expect, it, vi } from 'vitest';
import { loadBrowserUiPlugins } from './runtime.js';

const module = (code: string) => `data:text/javascript,${encodeURIComponent(code)}`;

describe('loadBrowserUiPlugins', () => {
  it('leaves out a plugin that fails to load and keeps the others in order', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugins = await loadBrowserUiPlugins({
      plugins: [
        { id: 'first', version: '1', browser: module('export const plugin = { id: "first" };') },
        { id: 'broken', version: '1', browser: module('import "@buntubi/sdk/does-not-resolve";') },
        { id: 'wrong', version: '1', browser: module('export const plugin = { id: "other" };') },
        { id: 'last', version: '1', browser: module('export const plugin = { id: "last" };') },
      ],
    });
    expect(plugins.map((p) => p.id)).toEqual(['first', 'last']);
    expect(errors).toHaveBeenCalledTimes(2);
    errors.mockRestore();
  });
});
