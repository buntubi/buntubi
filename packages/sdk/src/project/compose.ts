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

/** How `setup`, `up` and `down` run, for the `buntubi` command or a product embedding a project. */
export interface RunOptions {
  /**
   * The folder mounted for `platform setup` and the platform file's path inside it. The project's
   * own by default; a product holding the project in one of its folders mounts its root.
   */
  mount?: { root: string; platformFile: string };
  /** compose.dev.yaml over compose.yaml: the images built from Buntubi's checkout (`pnpm images:dev`). */
  dev?: boolean;
  /** What the lines it says start with. */
  name?: string;
  log?: (line: string) => void;
}

const files = (dir: string, dev: boolean) => {
  if (!dev) return [];
  if (!existsSync(join(dir, 'compose.dev.yaml'))) throw new Error(`no compose.dev.yaml in ${dir} for --dev`);
  return ['-f', 'compose.yaml', '-f', 'compose.dev.yaml'];
};

const compose = (dir: string, args: string[], dev = false, quiet = false) =>
  spawnSync('docker', ['compose', ...files(dir, dev), ...args], { cwd: dir, stdio: quiet ? 'ignore' : 'inherit' }).status ?? 1;

/** The project folder `dir`, or why it is not one. */
export function projectDir(dir: string): string {
  if (!existsSync(join(dir, 'compose.yaml'))) throw new Error(`no compose.yaml in ${dir}: run this in a Buntubi project's folder`);
  return dir;
}

export function runSetup(dir: string, interactive: boolean, options: RunOptions = {}): number {
  const { dev = false, name = 'buntubi', log = console.log } = options;
  projectDir(dir);
  for (const step of setupSteps(options.mount?.root ?? dir, options.mount?.platformFile)) {
    if (step.when === 'no-keys' && existsSync(join(dir, 'keys')) && readdirSync(join(dir, 'keys')).length > 0) continue;
    if (step.when === 'no-admin') {
      if (compose(dir, ['run', '--rm', 'provider', 'flask', 'admin', 'check'], dev, true) === 0) continue;
      if (!interactive) {
        log(`${name}: no admin yet; from ${dir}, run: docker compose ${[...files(dir, dev), ...step.args].join(' ')}`);
        continue;
      }
    }
    log(`${name}: ${step.says}`);
    const code = compose(dir, step.args, dev);
    if (code !== 0) return code;
  }
  log(`${name}: set up`);
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

export const runUp = (dir: string, options: RunOptions = {}) => compose(projectDir(dir), ['up', '-d', '--build'], options.dev);
export const runDown = (dir: string, options: RunOptions = {}) => compose(projectDir(dir), ['down'], options.dev);
