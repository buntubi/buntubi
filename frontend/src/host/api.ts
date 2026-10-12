/**
 * Calls to the provider's JSON endpoints. A refusal throws its code (`invalid_credentials`,
 * `email_taken`...), which the elements look up in their messages.
 */
export interface Redirect {
  redirect: string;
}

export function createApi(csrf: string, session?: string | null) {
  return async function call<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
    // A Blob (a photo) goes as is, with its own type; anything else as JSON.
    const raw = body instanceof Blob;
    let response: Response;
    try {
      response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': raw ? body.type : 'application/json',
          'X-CSRF-Token': csrf,
          // The account this page acts for: refused (409) once another account became current.
          ...(session ? { 'X-IDP-Session': session } : {}),
        },
        body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('network');
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    // Another account became current in another tab: show this page for that one instead.
    if (data.error === 'account_changed') window.location.reload();
    if (!response.ok) throw new Error(data.error ?? refusal(response.status));
    return data as T;
  };
}

const refusal = (status: number) =>
  status === 429 ? 'too_many_requests' : status === 403 ? 'session_expired' : 'generic';

export type Api = ReturnType<typeof createApi>;
