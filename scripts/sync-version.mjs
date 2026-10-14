// One version for the product: after `changeset version` bumps @buntu/sdk, the provider's
// Python package takes the same version.
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('packages/sdk/package.json', 'utf8'));
const file = 'idp/pyproject.toml';
const before = readFileSync(file, 'utf8');
const after = before.replace(/^version = "[^"]*"$/m, `version = "${version}"`);
if (after === before && !before.includes(`version = "${version}"`)) {
  throw new Error(`no version line in ${file}`);
}
writeFileSync(file, after);
console.log(`${file}: ${version}`);
