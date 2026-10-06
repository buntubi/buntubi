/**
 * Runs an action from a button or a form without leaving its refusal unhandled: the
 * submission already holds the error and the page shows it.
 */
export function settle(run: Promise<unknown>): void {
  run.catch(() => undefined);
}
