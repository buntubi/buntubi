/**
 * The modules a UI plugin loaded at run time shares with the app it runs in. The console, the
 * portal and the sign-in pages expose exactly these (an import map in the browser, their
 * `node_modules` on the server), and a plugin build leaves exactly these out of the plugin.
 *
 * They are the modules that hold state a plugin must see as the app sees it: the reactive
 * runtime, the injector and its tokens, the element registry, the SDK's services and views.
 * Anything else a plugin imports (fluixi-ui components, zod, its own code) goes into the
 * plugin's own files.
 *
 * @module
 */

/** Module ids, each exactly as plugin code imports it. */
export const SHARED_MODULES = [
  '@fluixi/core',
  '@fluixi/core/router',
  '@fluixi/dom',
  '@fluixi/reactive',
  '@fluixi/reactive/signal',
  '@fluixi/di',
  '@fluixi/web-components',
  '@buntubi/sdk/account',
  '@buntubi/sdk/admin',
  '@buntubi/sdk/developer',
  '@buntubi/sdk/navigation',
  '@buntubi/sdk/plugins',
  '@buntubi/sdk/roles',
  '@buntubi/sdk/types',
  '@buntubi/sdk/view',
  '@buntubi/sdk/webauthn',
] as const;

/** The packages those modules belong to. */
export const SHARED_PACKAGES = [...new Set(SHARED_MODULES.map((id) => id.split('/').slice(0, 2).join('/')))];

/**
 * How a plugin build treats an import: `shared` stays an import of the app's copy, `unshared`
 * is a module of a shared package the apps do not expose (an error: bundling it would give the
 * plugin a second copy of that package's state), `bundled` goes into the plugin.
 */
export function shareKind(id: string): 'shared' | 'unshared' | 'bundled' {
  if ((SHARED_MODULES as readonly string[]).includes(id)) return 'shared';
  const pkg = id.startsWith('@') ? id.split('/').slice(0, 2).join('/') : id.split('/')[0]!;
  // Every framework package carries framework state, so none is ever bundled into a plugin.
  return pkg.startsWith('@fluixi/') || SHARED_PACKAGES.includes(pkg) ? 'unshared' : 'bundled';
}
