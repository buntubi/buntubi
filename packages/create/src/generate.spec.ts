import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from './generate.js';

const templates = fileURLToPath(new URL('../templates', import.meta.url));
let n = 0;
const local = { name: 'Acme', slug: 'acme', address: { local: true }, email: { through: 'log' } } as const;
const live = {
  name: 'Acme',
  slug: 'acme',
  address: { local: false, provider: 'https://id.acme.com', console: 'https://console.id.acme.com', portal: 'https://portal.id.acme.com' },
  email: { through: 'resend', key: 're_live_key', from: 'Acme <no-reply@acme.com>' },
} as const;
const secret = () => `secret-${++n}`;

describe('create-buntubi', () => {
  it('makes a project on the published images, its provider built with its plugins', () => {
    const files = generate(local, '0.7.0', templates, secret);
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
    const files = generate(local, '0.7.0', templates, secret);
    expect(files.get('identity.env')).toMatch(/IDP_SECRET_KEY=secret-\d+/);
    expect(files.get('identity.env.example')).toMatch(/IDP_SECRET_KEY=\n/);
    expect(files.get('.env.example')).toBe('# Read by docker compose: the database password, shared by postgres and the provider.\nPOSTGRES_PASSWORD=\n');
  });

  it('answers at public addresses with real email, the secrets kept out of the examples', () => {
    const files = generate(live, '0.7.0', templates, secret);
    expect(files.get('identity.env')).toContain('IDP_ISSUER=https://id.acme.com');
    expect(files.get('identity.env')).toContain('IDP_EMAIL_TEST_MODE=false');
    expect(files.get('identity.env')).toContain('IDP_RESEND_API_KEY=re_live_key');
    expect(files.get('identity.env.example')).toMatch(/IDP_RESEND_API_KEY=\n/);
    expect(files.get('console.env')).toContain('APP_URL=https://console.id.acme.com');
    expect(files.get('platform.toml')).toContain('redirect_uris = ["https://portal.id.acme.com/auth/callback"]');
    expect(files.get('platform.toml')).not.toContain('localhost');
  });

  it('refuses a public address with email that only reaches the log', () => {
    expect(() => generate({ ...live, email: { through: 'log' } }, '0.7.0', templates, secret)).toThrow(/choose resend/);
  });
});
