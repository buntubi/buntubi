/**
 * The mounted plugin folder: what is read, in which order, what is refused, and that only the
 * browser half of a mounted plugin is ever served.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUiPluginHost, readUiPlugins, serveUiPluginFile, uiPluginIndex } from './runtime-server.js';
import { shareKind } from './shared.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ui-plugins-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A built plugin in `folder`, with a browser entry, a chunk, a stylesheet and a server entry. */
function mount(folder: string, manifest: Record<string, unknown> = {}) {
  const root = join(dir, folder);
  mkdirSync(join(root, 'browser', 'chunks'), { recursive: true });
  mkdirSync(join(root, 'server'), { recursive: true });
  writeFileSync(join(root, 'browser', 'index.js'), 'export const plugin = {};');
  writeFileSync(join(root, 'browser', 'chunks', 'page-abc123.js'), 'export {};');
  writeFileSync(join(root, 'browser', 'look.css'), ':root{}');
  writeFileSync(join(root, 'browser', 'notes.txt'), 'secret');
  writeFileSync(join(root, 'browser', '.env'), 'TOKEN=x');
  writeFileSync(join(root, 'server', 'index.js'), 'export const plugin = {};');
  const id = folder.replace(/^\d+-/, '');
  writeFileSync(
    join(root, 'manifest.json'),
    JSON.stringify({ id, version: '1.0.0', browser: 'browser/index.js', server: 'server/index.js', shared: ['@fluixi/core'], ...manifest }),
  );
}

describe('shareKind', () => {
  it('keeps shared modules as imports, refuses other framework modules, bundles the rest', () => {
    expect(shareKind('@fluixi/core')).toBe('shared');
    expect(shareKind('@buntubi/sdk/view')).toBe('shared');
    expect(shareKind('@fluixi/core/i18n')).toBe('unshared');
    expect(shareKind('@fluixi/start/router')).toBe('unshared');
    expect(shareKind('@buntubi/sdk/vite')).toBe('unshared');
    expect(shareKind('@fluixi-ui/button')).toBe('bundled');
    expect(shareKind('zod')).toBe('bundled');
  });
});

describe('readUiPlugins', () => {
  it('reads every mounted plugin, ordered by folder name', async () => {
    mount('20-zeta');
    mount('10-acme');
    const found = await readUiPlugins(dir);
    expect(found.map((p) => [p.folder, p.manifest.id])).toEqual([
      ['10-acme', 'acme'],
      ['20-zeta', 'zeta'],
    ]);
  });

  it('finds none in a folder that is not there', async () => {
    expect(await readUiPlugins(join(dir, 'absent'))).toEqual([]);
  });

  it('refuses a folder without a manifest, or with an invalid one', async () => {
    mkdirSync(join(dir, 'broken'));
    await expect(readUiPlugins(dir)).rejects.toThrow(/missing or not JSON/);
    rmSync(join(dir, 'broken'), { recursive: true });
    mount('acme', { id: 'Acme!' });
    await expect(readUiPlugins(dir)).rejects.toThrow(/lacks an id/);
  });

  it('refuses two plugins with one id', async () => {
    mount('10-acme');
    mount('20-acme');
    await expect(readUiPlugins(dir)).rejects.toThrow(/two mounted plugins have the id "acme"/);
  });

  it('refuses a plugin built against modules this app does not share', async () => {
    mount('acme', { shared: ['@fluixi/core', '@fluixi/core/i18n'] });
    await expect(readUiPlugins(dir)).rejects.toThrow(/needs @fluixi\/core\/i18n/);
  });
});

describe('manifest entries', () => {
  it('refuses entries outside the plugin\'s browser and server folders', async () => {
    for (const manifest of [
      { server: '../../outside.js' },
      { server: 'browser/index.js' },
      { browser: 'server/index.js' },
      { browser: 'browser/../../x.js' },
      { server: '/etc/passwd' },
      { browser: 'browser/index.css' },
    ]) {
      rmSync(join(dir, 'acme'), { recursive: true, force: true });
      mount('acme', manifest);
      await expect(readUiPlugins(dir), JSON.stringify(manifest)).rejects.toThrow(/entry/);
    }
  });
});

describe('uiPluginIndex', () => {
  it('addresses each browser entry under the base the app serves the folder at', async () => {
    mount('10-acme');
    expect(uiPluginIndex(await readUiPlugins(dir), '/ui-plugins')).toEqual({
      plugins: [{ id: 'acme', version: '1.0.0', browser: '/ui-plugins/10-acme/browser/index.js' }],
    });
  });
});

describe('serveUiPluginFile', () => {
  const serve = async (path: string) => serveUiPluginFile(dir, await readUiPlugins(dir), path);

  it('serves the browser half, entries revalidated and hashed files cached for good', async () => {
    mount('acme');
    const entry = await serve('acme/browser/index.js');
    expect(entry?.headers.get('content-type')).toMatch(/^text\/javascript/);
    expect(entry?.headers.get('cache-control')).toBe('no-cache');
    expect(await entry?.text()).toBe('export const plugin = {};');
    expect((await serve('acme/browser/chunks/page-abc123.js'))?.headers.get('cache-control')).toMatch(/immutable/);
    expect((await serve('acme/browser/look.css'))?.headers.get('content-type')).toMatch(/^text\/css/);
  });

  it('does not follow a link out of the plugin\'s browser folder', async () => {
    mount('acme');
    writeFileSync(join(dir, 'secret.js'), 'TOKEN=x');
    symlinkSync(join(dir, 'secret.js'), join(dir, 'acme', 'browser', 'leak.js'));
    symlinkSync(join(dir, 'acme', 'server'), join(dir, 'acme', 'browser', 'srv'));
    expect(await serve('acme/browser/leak.js')).toBeNull();
    expect(await serve('acme/browser/srv/index.js')).toBeNull();
  });

  it('serves nothing outside a mounted plugin\'s browser folder', async () => {
    mount('acme');
    writeFileSync(join(dir, 'outside.js'), 'export {};');
    for (const path of [
      'acme/server/index.js',
      'acme/manifest.json',
      'acme/browser/../server/index.js',
      'acme/browser/%2e%2e/server/index.js',
      'acme/browser/..%2fserver%2findex.js',
      'acme/browser/.env',
      'acme/browser/notes.txt',
      'other/browser/index.js',
      '../outside.js',
      'acme/browser',
      'acme/browser/missing.js',
      'acme/browser/%E0%A4%A.js',
    ]) {
      expect(await serve(path), path).toBeNull();
    }
  });
});

describe('createUiPluginHost', () => {
  it('serves files below its base and nothing else', async () => {
    mount('acme');
    const host = createUiPluginHost({ dir, base: '/api/ui-plugins' });
    expect((await host.serve(new Request('https://app.test/api/ui-plugins/acme/browser/index.js')))?.status).toBe(200);
    expect(await host.serve(new Request('https://app.test/api/ui-plugins/acme/server/index.js'))).toBeNull();
    expect(await host.serve(new Request('https://app.test/other/acme/browser/index.js'))).toBeNull();
    expect(await host.serve(new Request('https://app.test/api/ui-pluginsx/acme/browser/index.js'))).toBeNull();
  });

  it('publishes the index under its base', async () => {
    mount('10-acme');
    // Loading imports the server entries: this fixture's is a plain module exporting {}, so
    // load() refuses it, which is the check that an entry exports its plugin.
    const host = createUiPluginHost({ dir, base: '/api/ui-plugins/' });
    await expect(host.load()).rejects.toThrow(/does not export the plugin "acme"/);
  });
});
