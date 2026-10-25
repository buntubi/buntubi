/**
 * A new Buntubi project, as files: every path it starts with and its contents. Nothing here
 * touches the disk, so a project can be checked before it is written.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface Choices {
  /** The platform's name, on its sign-in pages. */
  name: string;
  /** Lowercase letters, digits and hyphens: the compose project and the package name. */
  slug: string;
}

export type Files = Map<string, string>;

export const SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Template files are stored with a leading underscore where npm would drop a dotfile. */
const DOTFILE = /(^|\/)_(gitignore)$/;

/** One setting: its key, its value, and the comment above it. */
type Entry = [key: string, value: string, comment: string];

export function generate(choices: Choices, version: string, templates: string, secret: () => string): Files {
  if (!SLUG.test(choices.slug)) throw new Error(`"${choices.slug}" must be lowercase letters, digits and hyphens, starting with a letter`);
  const files: Files = new Map();
  for (const file of walk(templates)) {
    const path = relative(templates, file).replace(DOTFILE, '$1.$2');
    files.set(path, readFileSync(file, 'utf8').replaceAll('{{name}}', choices.name).replaceAll('{{slug}}', choices.slug).replaceAll('{{version}}', version));
  }
  files.set(
    'package.json',
    `${JSON.stringify(
      {
        name: choices.slug,
        private: true,
        type: 'module',
        scripts: { setup: 'buntubi setup', build: 'buntubi build', up: 'buntubi up', down: 'buntubi down' },
        devDependencies: { '@buntubi/sdk': `^${version}` },
      },
      null,
      2,
    )}\n`,
  );
  files.set('pnpm-workspace.yaml', 'packages:\n  - plugins/*/ui\n');
  // Docker copies plugins/ into the provider's image and mounts ui-plugins/: both must exist.
  files.set('plugins/.gitkeep', '');
  files.set('ui-plugins/.gitkeep', '');
  for (const [file, entries] of envFiles(choices, secret)) {
    files.set(file, env(entries, true));
    files.set(`${file}.example`, env(entries, false));
  }
  return files;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function env(entries: Entry[], withValues: boolean): string {
  const secret = /SECRET|PASSWORD|KEY$/;
  return `${entries.map(([key, value, comment]) => `${comment ? `# ${comment}\n` : ''}${key}=${withValues || !secret.test(key) ? value : ''}`).join('\n')}\n`;
}

function envFiles(choices: Choices, secret: () => string): [string, Entry[]][] {
  return [
    ['.env', [['POSTGRES_PASSWORD', secret(), 'Read by docker compose: the database password, shared by postgres and the provider.']]],
    [
      'identity.env',
      [
        ['IDP_ISSUER', 'http://localhost:5010', "The provider's address; every IDP_* setting is documented in Buntubi."],
        ['IDP_SECRET_KEY', secret(), 'Never change it: it signs sessions and encrypts authenticator secrets.'],
        ['IDP_SECURE_COOKIES', 'true', ''],
        ['IDP_EMAIL_TEST_MODE', 'true', 'Local only: emails, sign-in codes included, go to the log.'],
        ['IDP_RATE_LIMIT_STORAGE', 'memory://', ''],
        ['IDP_BRAND_NAME', choices.name, ''],
        ['IDP_PLUGINS', '[]', 'The provider plugins turned on, by id, in order; `buntubi add plugin` adds to it.'],
      ],
    ],
    [
      'console.env',
      [
        ['IDP_URL', 'http://localhost:5010', ''],
        ['APP_URL', 'http://localhost:3420', ''],
        ['PORTAL_URL', 'http://localhost:3410', ''],
        ['CONSOLE_CLIENT_ID', 'owner-console', ''],
        ['CONSOLE_CLIENT_SECRET', '', 'Written by `pnpm run setup`.'],
        ['SESSION_SECRET', secret(), 'Encrypts the session cookie: at least 32 characters.'],
      ],
    ],
    [
      'portal.env',
      [
        ['IDP_URL', 'http://localhost:5010', ''],
        ['APP_URL', 'http://localhost:3410', ''],
        ['PORTAL_CLIENT_ID', 'developer-portal', ''],
        ['PORTAL_CLIENT_SECRET', '', 'Written by `pnpm run setup`.'],
        ['SESSION_SECRET', secret(), 'Encrypts the session cookie: at least 32 characters.'],
      ],
    ],
  ];
}
