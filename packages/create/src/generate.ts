/**
 * A new Buntubi project, as files: every path it starts with and its contents. Nothing here
 * touches the disk, so a project can be checked before it is written.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Choices {
  /** The platform's name, on its sign-in pages. */
  name: string;
  /** Lowercase letters, digits and hyphens: the compose project and the package name. */
  slug: string;
  /** Where people reach it: on this machine, or at public https addresses. */
  address: { local: true } | { local: false; provider: string; console: string; portal: string };
  /** How it sends email: to its log (local only), or through Resend. */
  email: { through: 'log' } | { through: 'resend'; key: string; from: string };
}

/** The addresses on this machine: the console and the portal share the provider's network. */
const LOCAL = { provider: 'http://localhost:5010', console: 'http://localhost:3420', portal: 'http://localhost:3410' };

/** The three addresses the project answers at. */
export const addressesOf = (choices: Choices) => (choices.address.local ? LOCAL : choices.address);

export type Files = Map<string, string>;

/** Where the templates ship, for a product generating an embedded project. */
export const TEMPLATES = fileURLToPath(new URL('../templates', import.meta.url));

export const SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Template files are stored with a leading underscore where npm would drop a dotfile. */
const DOTFILE = /(^|\/)_(gitignore)$/;

/** One setting: its key, its value, and the comment above it. */
export type Entry = [key: string, value: string, comment: string];

/**
 * A product that runs its identity provider beside itself, in one of its folders (Tabaxal in
 * `infra/identity`): the project is generated for it, without a package or readme of its own.
 */
export interface Host {
  /** The compose project's name, `<slug>-identity` for instance. */
  composeName: string;
  /** The commands its people run, as its own scripts name them. */
  commands: { setup: string; up: string; down: string };
  /** More provider settings, after Buntubi's own in identity.env. */
  providerEnv?: Entry[];
  /** More mounts on the provider and the webhooks process, as `./file:/in/container[:ro]`. */
  providerVolumes?: string[];
  /** Its own apps, as `[[apps]]` tables appended to platform.toml. */
  apps?: string;
}

export function generate(choices: Choices, version: string, templates: string, secret: () => string, host?: Host): Files {
  if (!SLUG.test(choices.slug)) throw new Error(`"${choices.slug}" must be lowercase letters, digits and hyphens, starting with a letter`);
  // The provider refuses to start on a public address with email that only goes to its log.
  if (!choices.address.local && choices.email.through === 'log') throw new Error('a public address needs email that leaves the machine: choose resend');
  const at = addressesOf(choices);
  const files: Files = new Map();
  for (const file of walk(templates)) {
    const path = relative(templates, file).replace(DOTFILE, '$1.$2');
    const text = readFileSync(file, 'utf8')
      .replaceAll('{{name}}', choices.name)
      .replaceAll('{{slug}}', choices.slug)
      .replaceAll('{{version}}', version)
      .replaceAll('{{consoleUrl}}', at.console)
      .replaceAll('{{portalUrl}}', at.portal)
      .replaceAll('{{composeName}}', host?.composeName ?? choices.slug)
      .replaceAll('{{setupCommand}}', host?.commands.setup ?? 'pnpm run setup')
      .replaceAll('{{upCommand}}', host?.commands.up ?? 'pnpm up')
      .replaceAll('{{downCommand}}', host?.commands.down ?? 'pnpm down')
      .replaceAll('{{providerVolumes}}', (host?.providerVolumes ?? []).map((volume) => `      - ${volume}\n`).join(''))
      .replaceAll('{{hostApps}}', host?.apps ? `\n${host.apps.trimEnd()}\n` : '');
    // An embedded project belongs to the product: no readme or ignore file of its own.
    if (host && (path === 'README.md' || path === '.gitignore')) continue;
    files.set(path, text);
  }
  if (host) {
    files.set('plugins/.gitkeep', '');
    files.set('ui-plugins/.gitkeep', '');
    for (const [file, entries] of envFiles(choices, secret, host)) {
      files.set(file, env(entries, true));
      files.set(`${file}.example`, env(entries, false));
    }
    return files;
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

function envFiles(choices: Choices, secret: () => string, host?: Host): [string, Entry[]][] {
  const at = addressesOf(choices);
  const email: Entry[] =
    choices.email.through === 'log'
      ? [['IDP_EMAIL_TEST_MODE', 'true', 'Local only: emails, sign-in codes included, go to the log.']]
      : [
          ['IDP_EMAIL_TEST_MODE', 'false', ''],
          ['IDP_RESEND_API_KEY', choices.email.key, 'Email through Resend: the API key from resend.com.'],
          ['IDP_EMAIL_FROM', choices.email.from, 'The sender, on a domain verified at Resend.'],
        ];
  return [
    ['.env', [['POSTGRES_PASSWORD', secret(), 'Read by docker compose: the database password, shared by postgres and the provider.']]],
    [
      'identity.env',
      [
        ['IDP_ISSUER', at.provider, "The provider's address; every IDP_* setting is documented in Buntubi."],
        ['IDP_SECRET_KEY', secret(), 'Never change it: it signs sessions and encrypts authenticator secrets.'],
        ['IDP_SECURE_COOKIES', 'true', ''],
        ...email,
        ['IDP_RATE_LIMIT_STORAGE', 'memory://', 'One provider process; several need a shared store (redis://...).'],
        ['IDP_BRAND_NAME', choices.name, ''],
        ['IDP_PLUGINS', '[]', 'The provider plugins turned on, by id, in order; `buntubi add plugin` adds to it.'],
        ['IDP_GOOGLE_CLIENT_ID', '', 'Sign-in with Google: an OAuth client from Google Cloud, callback <issuer>/signin/google/callback; list google under [social] in platform.toml.'],
        ['IDP_GOOGLE_CLIENT_SECRET', '', ''],
        ['IDP_GITHUB_CLIENT_ID', '', 'Sign-in with GitHub: an OAuth App, or a GitHub App with Email addresses read-only; callback <issuer>/signin/github/callback.'],
        ['IDP_GITHUB_CLIENT_SECRET', '', ''],
        ...(host?.providerEnv ?? []),
      ],
    ],
    [
      'console.env',
      [
        ['IDP_URL', at.provider, ''],
        ['APP_URL', at.console, ''],
        ['PORTAL_URL', at.portal, ''],
        ['CONSOLE_CLIENT_ID', 'owner-console', ''],
        ['CONSOLE_CLIENT_SECRET', '', `Written by \`${host?.commands.setup ?? 'pnpm run setup'}\`.`],
        ['SESSION_SECRET', secret(), 'Encrypts the session cookie: at least 32 characters.'],
      ],
    ],
    [
      'portal.env',
      [
        ['IDP_URL', at.provider, ''],
        ['APP_URL', at.portal, ''],
        ['PORTAL_CLIENT_ID', 'developer-portal', ''],
        ['PORTAL_CLIENT_SECRET', '', `Written by \`${host?.commands.setup ?? 'pnpm run setup'}\`.`],
        ['SESSION_SECRET', secret(), 'Encrypts the session cookie: at least 32 characters.'],
      ],
    ],
  ];
}
