/**
 * How an element moves to another page without knowing the app it is in. The app provides its
 * router's navigation in its root layout:
 *
 *   const navigate = useNavigate();
 *   provide([{ provide: Navigation, useValue: { go: (href, options) => navigate(href, options) } }]);
 *
 * Without one, `go` loads the page in full: it works anywhere, with or without a router.
 */
import { inject, injectionToken } from '@fluixi/start/di';

export interface NavigationOptions {
  replace?: boolean;
}

export interface Navigator {
  go: (href: string, options?: NavigationOptions) => void;
}

const fullPageLoad: Navigator = {
  go: (href, options) => (options?.replace ? window.location.replace(href) : window.location.assign(href)),
};

export const Navigation = injectionToken<Navigator>('buntu.navigation', { factory: () => fullPageLoad });

/** The app's navigation, or a full page load when it provides none. */
export function useNavigation(): Navigator {
  return inject(Navigation);
}

/**
 * The click handler of an `<a href>`: a plain click on a link within this site goes through
 * `navigator`; a new tab, a download, another site or a click already handled is the browser's.
 */
export function followLink(event: MouseEvent, navigator: Navigator): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.currentTarget;
  if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  navigator.go(url.pathname + url.search + url.hash);
}
