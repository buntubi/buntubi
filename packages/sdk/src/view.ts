/**
 * How an element gets its look. Each element splits in two: its logic (state, actions, events)
 * and a view, a function from that logic to markup. The view is found through a DI token whose
 * factory is the element's own, so an app restyles or rebuilds an element by providing another
 * view in its module, and keeps the logic:
 *
 *   defineModule({ name: 'look', providers: [{ provide: SidebarView, useValue: mySidebar }] })
 *
 * Lighter changes need no view at all: every element reads the --idp-* tokens, and marks its
 * parts with `part` attributes a stylesheet can select (`idp-sidebar [part~='item']`).
 */
import { inject, injectionToken, type Token } from '@fluixi/di';

export type View<Logic> = (logic: Logic) => unknown;

// Views a deployment put in place of the elements' own, by element tag (`overrideViews`).
const overrides = new Map<string, View<never>>();

/**
 * A view token whose default is `view`, built only if no app provides another. `name` is the
 * element's tag: a view given for that tag through `overrideViews` (a UI plugin's `views`) takes
 * the place of `view`.
 */
export function viewToken<Logic>(name: string, view: View<Logic>): Token<View<Logic>> {
  return injectionToken<View<Logic>>(name, { factory: () => (overrides.get(name) as View<Logic> | undefined) ?? view });
}

/**
 * Views to use in place of the elements' own, by element tag: `{ 'idp-sidebar': mySidebar }`.
 * Each receives the element's logic. Called by the console, the portal and the sign-in pages at
 * start with every UI plugin's `views`, before any element renders.
 */
export function overrideViews(views: Readonly<Record<string, View<never>>>): void {
  for (const [tag, view] of Object.entries(views)) overrides.set(tag, view);
}

/** The view the app provided for `token`, or the element's own. */
export function useView<Logic>(token: Token<View<Logic>>): View<Logic> {
  return inject(token);
}
