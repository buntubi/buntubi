/**
 * What the portal checks before it changes an app: the provider's rules (idp web/developer.py
 * AppIn and AppPatch). Messages are i18n keys.
 */
import { z } from 'zod';

/**
 * Where sign-in may send people back: https, http on this machine for testing, or an app's own
 * scheme (com.example.app:/callback). Never with a #fragment, which OAuth forbids.
 */
export function isRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return (
      !url.hash &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && local) || /^[a-z][a-z0-9+.-]*\.[a-z]/.test(url.protocol))
    );
  } catch {
    return false;
  }
}

export const redirectUriSchema = z.object({
  uri: z.string().trim().min(1, 'form.required').max(2048, 'form.tooLong').refine(isRedirectUri, 'form.redirectUri'),
});

export type RedirectUriInput = z.infer<typeof redirectUriSchema>;

/** Scope names as the catalogue writes them, separated by spaces; empty means every scope. */
const SCOPE_NAME = /^[a-z][a-z0-9_.:-]{1,63}$/;

export const apiKeySchema = z.object({
  name: z.string().trim().min(1, 'form.required').max(80, 'form.tooLong'),
  scopes: z
    .string()
    .refine((value) => value.split(/\s+/).filter(Boolean).every((scope) => SCOPE_NAME.test(scope)), 'form.scopeList'),
});

export type ApiKeyInput = z.infer<typeof apiKeySchema>;
