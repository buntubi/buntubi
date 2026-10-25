#!/usr/bin/env node
/**
 * `npm create buntubi@latest [folder] [--name "Acme"] [--slug acme] [--yes]`: a Buntubi project
 * run with Docker, with fresh secrets, ready for `pnpm run setup`.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generate, SLUG } from './generate.js';

const here = dirname(fileURLToPath(import.meta.url));
const own = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string };
const { values, positionals } = parseArgs({ allowPositionals: true, options: { name: { type: 'string' }, slug: { type: 'string' }, yes: { type: 'boolean', short: 'y' } } });
const prompt = !values.yes && process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(question: string, fallback: string): Promise<string> {
  if (!prompt) return fallback;
  return (await prompt.question(`${question} (${fallback}) `)).trim() || fallback;
}

const toSlug = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, 'p$1');

async function main(): Promise<number> {
  const folder = resolve(positionals[0] ?? (await ask('Folder for the project?', 'my-identity')));
  const name = values.name ?? (await ask('Name on the sign-in pages?', basename(folder)));
  const slug = values.slug ?? (await ask('Short id?', toSlug(name) || 'identity'));
  prompt?.close();
  if (!SLUG.test(slug)) throw new Error(`"${slug}" must be lowercase letters, digits and hyphens, starting with a letter`);
  if (existsSync(folder) && readdirSync(folder).length > 0) throw new Error(`${folder} is not empty`);
  const files = generate({ name, slug }, own.version, join(here, '..', 'templates'), () => randomBytes(32).toString('base64url'));
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
