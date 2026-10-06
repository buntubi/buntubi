/**
 * How these elements get work done without knowing who does it. The host sets `element.action`
 * to an async function; the element validates, calls it, shows its pending state and, on
 * failure, the message it threw, looked up in `messages` (so a host may throw a key). With no
 * action the element only emits its event.
 */
import { action as createAction, useSubmission } from '@fluixi/core/router';

export type ElementAction<I, O = unknown> = (input: I) => O | Promise<O>;

let instances = 0;

/** A submission bound to one element instance, running whatever action the host set. */
export function useElementAction<I, O>(
  name: string,
  current: () => ElementAction<I, O> | undefined,
  text: (key: string) => string,
) {
  const run = createAction(async (input: I) => {
    const fn = current();
    if (!fn) return undefined as O;
    return fn(input);
  }, `${name}:${++instances}`);
  const submission = useSubmission(run);
  return {
    run,
    pending: () => submission()?.pending ?? false,
    /** The failure, ready to show. */
    error: () => {
      const error = submission()?.error;
      if (error == null) return undefined;
      return text(error instanceof Error ? error.message : String(error));
    },
  };
}
