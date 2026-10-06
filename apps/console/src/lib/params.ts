import type { RouteDataArgs } from '@fluixi/start/router';

/** A route parameter from `routeData`'s arguments, which hand params over as a value or an accessor. */
export function paramOf(args: RouteDataArgs, name: string): string {
  const params = typeof args.params === 'function' ? args.params() : args.params;
  return params[name] ?? '';
}

/** A query-string value from `routeData`'s arguments. */
export function searchOf(args: RouteDataArgs, name: string): string {
  const location = typeof args.location === 'function' ? args.location() : args.location;
  return new URLSearchParams(location?.search ?? '').get(name) ?? '';
}
