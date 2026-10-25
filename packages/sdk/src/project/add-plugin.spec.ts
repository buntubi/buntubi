import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addPlugin, withPlugin } from './add-plugin.js';

const templates = fileURLToPath(new URL('../../templates/plugin', import.meta.url));
const versions = { sdk: '^0.7.0', fluixi: '^1.0.0-alpha.100' };

describe('buntubi add plugin', () => {
  it('writes both halves under plugins/<id>, the Python package named after the id', () => {
    const { files } = addPlugin({ id: 'acme-billing', label: 'Billing' }, new Map(), versions, templates);
    expect([...files.keys()].sort()).toEqual([
      'plugins/acme-billing/provider/acme_billing_idp/__init__.py',
      'plugins/acme-billing/provider/pyproject.toml',
      'plugins/acme-billing/ui/package.json',
      'plugins/acme-billing/ui/src/index.ts',
      'plugins/acme-billing/ui/src/overview.ts',
      'plugins/acme-billing/ui/tsconfig.json',
    ]);
    expect(files.get('plugins/acme-billing/provider/pyproject.toml')).toContain('acme-billing = "acme_billing_idp:AcmeBillingPlugin"');
    expect(files.get('plugins/acme-billing/provider/acme_billing_idp/__init__.py')).toContain('class AcmeBillingPlugin(Plugin):');
    expect(JSON.parse(files.get('plugins/acme-billing/ui/package.json')!).scripts.build).toBe('buntubi-ui-plugin build src/index.ts');
    for (const [path, text] of files) expect(text, path).not.toContain('{{');
  });

  it('turns the plugin on in IDP_PLUGINS, once', () => {
    expect(withPlugin('IDP_ISSUER=x\nIDP_PLUGINS=[]\n', 'acme')).toBe('IDP_ISSUER=x\nIDP_PLUGINS=["acme"]\n');
    expect(withPlugin('IDP_PLUGINS=["acme"]\n', 'acme')).toBe('IDP_PLUGINS=["acme"]\n');
    expect(withPlugin('IDP_ISSUER=x\n', 'acme')).toBe('IDP_ISSUER=x\nIDP_PLUGINS=["acme"]\n');
    expect(() => withPlugin('IDP_PLUGINS=acme\n', 'other')).toThrow(/not a JSON list/);
  });

  it('refuses an id the provider would not take', () => {
    for (const id of ['Acme', 'acme_billing', '-acme', 'a'.repeat(41)]) {
      expect(() => addPlugin({ id, label: 'x' }, new Map(), versions, templates)).toThrow(/lowercase/);
    }
  });
});
