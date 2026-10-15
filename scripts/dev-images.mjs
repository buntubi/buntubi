#!/usr/bin/env node
/**
 * Build the provider, console and portal images locally, tagged `:dev`, against the fluixi-core
 * checkout beside this repository (FLUIXI_CORE, default ../../fluixi-core), so a deployment can
 * run what is being developed without a release. Nothing is pushed.
 *
 * The framework goes in as packed tarballs (.dev/fluixi, inside the build context): installed
 * like published packages, with their dependencies for the image's platform. The manifest and
 * the lockfile are pointed at them for the build and restored after it. Build fluixi-core first:
 * the tarballs hold its dist folders.
 *
 *   pnpm images:dev                 all three
 *   pnpm images:dev provider        some of them
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = resolve(process.env.FLUIXI_CORE ?? join(root, '../../fluixi-core'));
const packs = join(root, '.dev', 'fluixi');
const images = {
  provider: ['docker/provider.Dockerfile'],
  console: ['docker/app.Dockerfile', '--build-arg', 'APP=console'],
  portal: ['docker/app.Dockerfile', '--build-arg', 'APP=portal'],
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(images);
const unknown = wanted.filter((name) => !(name in images));
if (unknown.length) {
  console.error(`unknown image ${unknown.join(', ')}: ${Object.keys(images).join(', ')}`);
  process.exit(1);
}
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

// Every public framework package, packed.
rmSync(packs, { recursive: true, force: true });
mkdirSync(packs, { recursive: true });
const overrides = {};
for (const dir of readdirSync(join(core, 'packages'))) {
  const manifest = join(core, 'packages', dir, 'package.json');
  if (!existsSync(manifest)) continue;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  if (pkg.private || !pkg.name?.startsWith('@fluixi/')) continue;
  const out = run('pnpm', ['pack', '--pack-destination', packs], join(core, 'packages', dir)).trim().split('\n').pop();
  overrides[pkg.name] = `file:${relative(root, resolve(packs, out.split('/').pop()))}`;
}
console.log(`packed ${Object.keys(overrides).length} fluixi packages from ${core}`);

const manifestFile = join(root, 'package.json');
const lockFile = join(root, 'pnpm-lock.yaml');
const savedManifest = readFileSync(manifestFile, 'utf8');
const savedLock = readFileSync(lockFile, 'utf8');
try {
  const manifest = JSON.parse(savedManifest);
  manifest.pnpm = { ...manifest.pnpm, overrides: { ...manifest.pnpm?.overrides, ...overrides } };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  run('pnpm', ['install', '--lockfile-only']);
  for (const name of wanted) {
    const [file, ...args] = images[name];
    const tag = `ghcr.io/buntubi/idp-${name}:dev`;
    console.log(`building ${tag}`);
    execFileSync('docker', ['build', '-f', file, ...args, '-t', tag, '.'], { cwd: root, stdio: 'inherit' });
  }
} finally {
  writeFileSync(manifestFile, savedManifest);
  writeFileSync(lockFile, savedLock);
}
console.log(`built ${wanted.map((n) => `ghcr.io/buntubi/idp-${n}:dev`).join(', ')}`);
