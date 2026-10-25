/**
 * A Buntubi project run with docker compose from its folder: `setup` brings a fresh one to
 * working order and is safe to run again, each step that would repeat something already done
 * being skipped; `up` and `down` start and stop it.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** One `docker compose` call; `when` says whether it runs, decided as the steps go. */
export interface ComposeStep {
  args: string[];
  /** What the step does, said before it runs. */
  says: string;
  when?: 'no-keys' | 'no-admin';
}

/** `setup`'s steps, in order. The project folder is mounted so the provider can write its env files. */
export function setupSteps(root: string, platformFile = 'platform.toml'): ComposeStep[] {
  const provider = (...rest: string[]) => ['run', '--rm', 'provider', ...rest];
  return [
    { args: ['build', 'provider'], says: 'building the provider with its plugins' },
    { args: ['up', '-d', '--wait', 'postgres'], says: 'starting its database' },
    { args: provider('alembic', 'upgrade', 'head'), says: 'bringing its tables up to date' },
    { args: provider('flask', 'keys', 'generate'), says: 'making a signing key', when: 'no-keys' },
    { args: ['run', '--rm', '-it', 'provider', 'flask', 'admin', 'create'], says: 'creating the first admin', when: 'no-admin' },
    {
      args: ['run', '--rm', '-v', `${root}:/project`, 'provider', 'flask', 'platform', 'setup', '--file', `/project/${platformFile}`],
      says: 'registering the apps in platform.toml',
    },
  ];
}

const compose = (dir: string, args: string[], quiet = false) =>
  spawnSync('docker', ['compose', ...args], { cwd: dir, stdio: quiet ? 'ignore' : 'inherit' }).status ?? 1;

/** The project folder `dir`, or why it is not one. */
export function projectDir(dir: string): string {
  if (!existsSync(join(dir, 'compose.yaml'))) throw new Error(`no compose.yaml in ${dir}: run this in a Buntubi project's folder`);
  return dir;
}

export function runSetup(dir: string, interactive: boolean, log: (line: string) => void = console.log): number {
  projectDir(dir);
  for (const step of setupSteps(dir)) {
    if (step.when === 'no-keys' && existsSync(join(dir, 'keys')) && readdirSync(join(dir, 'keys')).length > 0) continue;
    if (step.when === 'no-admin') {
      if (compose(dir, ['run', '--rm', 'provider', 'flask', 'admin', 'check'], true) === 0) continue;
      if (!interactive) {
        log(`buntubi: no admin yet; from ${dir}, run: docker compose ${step.args.join(' ')}`);
        continue;
      }
    }
    log(`buntubi: ${step.says}`);
    const code = compose(dir, step.args);
    if (code !== 0) return code;
  }
  log('buntubi: set up; start it with `buntubi up`');
  return 0;
}

/**
 * Each plugin's UI half built in its folder, then copied into `ui-plugins/<id>`, the folder compose
 * mounts: the build writes only inside the plugin's own package.
 */
export function runBuild(dir: string, log: (line: string) => void = console.log): number {
  const plugins = join(projectDir(dir), 'plugins');
  for (const id of existsSync(plugins) ? readdirSync(plugins) : []) {
    const ui = join(plugins, id, 'ui');
    if (!existsSync(join(ui, 'package.json'))) continue;
    log(`buntubi: building ${id}'s pages`);
    const code = spawnSync('pnpm', ['run', 'build'], { cwd: ui, stdio: 'inherit' }).status ?? 1;
    if (code !== 0) return code;
    const into = join(dir, 'ui-plugins', id);
    rmSync(into, { recursive: true, force: true });
    cpSync(join(ui, 'dist', 'ui-plugin'), into, { recursive: true });
  }
  return 0;
}

export const runUp = (dir: string) => compose(projectDir(dir), ['up', '-d', '--build']);
export const runDown = (dir: string) => compose(projectDir(dir), ['down']);
