/**
 * Calls to the provider's JSON endpoints. A refusal throws its code (`invalid_credentials`,
 * `email_taken`...), which the elements look up in their messages.
 */
export interface Redirect {
  redirect: string;
}

export function createApi(csrf: string) {
  return async function call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('network');
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? refusal(response.status));
    return data as T;
  };
}

const refusal = (status: number) =>
  status === 429 ? 'too_many_requests' : status === 403 ? 'session_expired' : 'generic';

export type Api = ReturnType<typeof createApi>;
