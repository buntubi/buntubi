import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from './generate.js';

const templates = fileURLToPath(new URL('../templates', import.meta.url));
let n = 0;
const secret = () => `secret-${++n}`;

describe('create-buntubi', () => {
  it('makes a project on the published images, its provider built with its plugins', () => {
    const files = generate({ name: 'Acme', slug: 'acme' }, '0.7.0', templates, secret);
    expect([...files.keys()].sort()).toEqual([
      '.env', '.env.example', '.gitignore', 'README.md', 'compose.yaml', 'console.env', 'console.env.example',
      'identity.env', 'identity.env.example', 'package.json', 'platform.toml', 'plugins/.gitkeep', 'pnpm-workspace.yaml',
      'portal.env', 'portal.env.example', 'provider.Dockerfile', 'ui-plugins/.gitkeep',
    ]);
    expect(files.get('provider.Dockerfile')).toContain('FROM ghcr.io/buntubi/idp-provider:0.7.0');
    expect(files.get('compose.yaml')).toContain('ghcr.io/buntubi/idp-console:0.7.0');
    expect(files.get('identity.env')).toContain('IDP_BRAND_NAME=Acme');
    expect(JSON.parse(files.get('package.json')!).scripts.setup).toBe('buntubi setup');
    for (const [path, text] of files) expect(text, path).not.toContain('{{');
  });

  it('writes fresh secrets into the env files and leaves them out of the examples', () => {
    const files = generate({ name: 'Acme', slug: 'acme' }, '0.7.0', templates, secret);
    expect(files.get('identity.env')).toMatch(/IDP_SECRET_KEY=secret-\d+/);
    expect(files.get('identity.env.example')).toMatch(/IDP_SECRET_KEY=\n/);
    expect(files.get('.env.example')).toBe('# Read by docker compose: the database password, shared by postgres and the provider.\nPOSTGRES_PASSWORD=\n');
  });
});
