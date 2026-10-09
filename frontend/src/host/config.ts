/** What the provider writes into each page: which screen, in which language, for which client. */
export type Locale = 'fr' | 'en';

export interface Brand {
  name?: string;
  logo?: string;
  accent?: string;
  skin?: string;
  /** The hero's headline, in place of the provider's own. */
  tagline?: string;
  /** A look a UI plugin defines (`looks`), given by a provider plugin for this client. */
  look?: string;
}

export interface PageConfig {
  element: string;
  locale: Locale;
  csrf: string;
  brand: Brand;
  props: Record<string, unknown>;
}

export function readConfig(): PageConfig {
  const node = document.getElementById('idp-config');
  return JSON.parse(node?.textContent ?? '{}') as PageConfig;
}
