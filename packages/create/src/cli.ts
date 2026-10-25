#!/usr/bin/env node
/**
 * `npm create buntubi@latest [folder]`: a Buntubi project run with Docker, with fresh secrets,
 * ready for `pnpm run setup`. Every question has a flag, so it also runs unattended:
 *
 *   --name "Acme"  --slug acme  --url local | https://id.acme.com  --console-url  --portal-url
 *   --email log | resend  --resend-key re_...  --email-from "Acme <no-reply@acme.com>"  --yes
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generate, SLUG, type Choices } from './generate.js';

const here = dirname(fileURLToPath(import.meta.url));
const own = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string };
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    slug: { type: 'string' },
    url: { type: 'string' },
    'console-url': { type: 'string' },
    'portal-url': { type: 'string' },
    email: { type: 'string' },
    'resend-key': { type: 'string' },
    'email-from': { type: 'string' },
    yes: { type: 'boolean', short: 'y' },
  },
});
const prompt = !values.yes && process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(question: string, fallback: string): Promise<string> {
  if (!prompt) return fallback;
  return (await prompt.question(`${question} (${fallback}) `)).trim() || fallback;
}

const toSlug = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, 'p$1');

/** An https origin, the only kind a public provider accepts. */
function origin(text: string, what: string): string {
  const url = new URL(text);
  if (url.protocol !== 'https:') throw new Error(`${what} must be https: ${text}`);
  return url.origin;
}

/** On this machine, or at public addresses: the provider's, then the console's and the portal's beside it. */
async function chooseAddress(): Promise<Choices['address']> {
  const answer = values.url ?? (await ask('Public address of the provider, or local?', 'local'));
  if (answer === 'local') return { local: true };
  const provider = origin(answer, 'the provider address');
  const host = new URL(provider).host;
  const consoleUrl = origin(values['console-url'] ?? (await ask('Address of the console?', `https://console.${host}`)), 'the console address');
  const portalUrl = origin(values['portal-url'] ?? (await ask('Address of the developer portal?', `https://portal.${host}`)), 'the portal address');
  return { local: false, provider, console: consoleUrl, portal: portalUrl };
}

/** To the log while it runs only here; through Resend once people outside can sign up. */
async function chooseEmail(isPublic: boolean): Promise<Choices['email']> {
  const answer = values.email ?? (await ask(isPublic ? 'Email through resend?' : 'Email: log (codes in the log) or resend?', isPublic ? 'resend' : 'log'));
  if (answer === 'log') return { through: 'log' };
  if (answer !== 'resend') throw new Error(`--email is log or resend, not ${answer}`);
  const key = values['resend-key'] ?? (await ask('Resend API key?', ''));
  const from = values['email-from'] ?? (await ask('Sender, on a domain verified at Resend?', ''));
  if (!key || !from) throw new Error('Resend needs its API key and a sender');
  return { through: 'resend', key, from };
}

async function main(): Promise<number> {
  const folder = resolve(positionals[0] ?? (await ask('Folder for the project?', 'my-identity')));
  const name = values.name ?? (await ask('Name on the sign-in pages?', basename(folder)));
  const slug = values.slug ?? (await ask('Short id?', toSlug(name) || 'identity'));
  if (!SLUG.test(slug)) throw new Error(`"${slug}" must be lowercase letters, digits and hyphens, starting with a letter`);
  const address = await chooseAddress();
  const email = await chooseEmail(!address.local);
  prompt?.close();
  if (existsSync(folder) && readdirSync(folder).length > 0) throw new Error(`${folder} is not empty`);
  const files = generate({ name, slug, address, email }, own.version, join(here, '..', 'templates'), () => randomBytes(32).toString('base64url'));
  for (const [path, content] of files) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), content);
  }
  console.log(`\n${name} is ready in ${folder}. Next:\n\n  cd ${folder}\n  pnpm install\n  pnpm run setup\n  pnpm up\n`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    prompt?.close();
    console.error(`create-buntubi: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
