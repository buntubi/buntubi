/**
 * A secret handed from the page that created it to the page that shows it, once.
 *
 * In memory and in the browser only: taken by the next page, it is gone, so a refresh shows
 * nothing and the secret never lands in history state or any storage. Only browser event
 * handlers put a value here, so the server's copy of this module stays empty.
 */
let pending: { clientId: string; secret: string } | null = null;

export function handOverSecret(clientId: string, secret: string | null): void {
  pending = secret ? { clientId, secret } : null;
}

/** The secret created for this app, if it was just created; null every time after. */
export function takeSecret(clientId: string): string | null {
  if (pending?.clientId !== clientId) return null;
  const { secret } = pending;
  pending = null;
  return secret;
}
