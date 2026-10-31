/**
 * The platform's default skin, from the provider's /.well-known/brand.json, for an app's server
 * render: fetched on the first request, then refreshed in the background once the endpoint's
 * five-minute cache age has passed.
 */
const MAX_AGE_MS = 5 * 60 * 1000;

export interface PlatformSkin {
  /** The skin, fetched first if it never was. Undefined when the provider gives none. */
  get(): Promise<string | undefined>;
  /** The last skin fetched, without waiting; starts a refresh when it is stale. */
  current(): string | undefined;
}

export function platformSkin(issuer: () => string): PlatformSkin {
  let value: string | undefined;
  let fetchedAt = 0;
  let pending: Promise<void> | null = null;
  const refresh = (): Promise<void> =>
    (pending ??= Promise.resolve()
      .then(() => fetch(`${issuer()}/.well-known/brand.json`))
      .then((response) => (response.ok ? (response.json() as Promise<{ skin?: unknown }>) : null))
      .then((brand) => {
        if (typeof brand?.skin === 'string') value = brand.skin;
        fetchedAt = Date.now();
      })
      .catch(() => undefined)
      .finally(() => {
        pending = null;
      }));
  const stale = () => Date.now() - fetchedAt > MAX_AGE_MS;
  return {
    async get() {
      if (!fetchedAt) await refresh();
      else if (stale()) void refresh();
      return value;
    },
    current() {
      if (stale()) void refresh();
      return value;
    },
  };
}
