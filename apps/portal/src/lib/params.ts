import type { RouteDataArgs } from '@fluixi/start/router';

/** A route parameter from `routeData`'s arguments, which hand params over as a value or an accessor. */
export function paramOf(args: RouteDataArgs, name: string): string {
  const params = typeof args.params === 'function' ? args.params() : args.params;
  return params[name] ?? '';
}
