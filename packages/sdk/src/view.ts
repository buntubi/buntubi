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
import { inject, injectionToken, type Token } from '@fluixi/start/di';

export type View<Logic> = (logic: Logic) => unknown;

/** A view token whose default is `view`, built only if no app provides another. */
export function viewToken<Logic>(name: string, view: View<Logic>): Token<View<Logic>> {
  return injectionToken<View<Logic>>(name, { factory: () => view });
}

/** The view the app provided for `token`, or the element's own. */
export function useView<Logic>(token: Token<View<Logic>>): View<Logic> {
  return inject(token);
}
