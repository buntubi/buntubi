/** The addresses an app may send people back to, as a list to edit; apart from the look. */

export interface RedirectUrisLabels {
  title: string;
  intro: string;
  placeholder: string;
  add: string;
  remove: string;
  save: string;
  saved: string;
  empty: string;
  invalidUri: string;
  error: string;
}

export const redirectUrisLabels: RedirectUrisLabels = {
  title: 'Redirect URIs',
  intro: 'Where the provider may send people back after sign-in. Exact match, https except localhost.',
  placeholder: 'https://example.com/auth/callback',
  add: 'Add',
  remove: 'Remove',
  save: 'Save',
  saved: 'Saved',
  empty: 'None yet: people cannot sign in until one is added.',
  invalidUri: 'Enter a full address starting with https:// (or http://localhost).',
  error: 'Something went wrong. Try again.',
};

export interface RedirectUrisLogic {
  labels: () => RedirectUrisLabels;
  uris: () => string[];
  draft: () => string;
  edit: (value: string) => void;
  add: () => void;
  remove: (uri: string) => void;
  changed: () => boolean;
  canManage: () => boolean;
  save: () => Promise<void>;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}

/** An address the provider accepts as a redirect: https, http on this machine, or an app scheme. */
export function isRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return !url.hash && (url.protocol === 'https:' || (url.protocol === 'http:' && local) || /^[a-z][a-z0-9+.-]*\.[a-z]/.test(url.protocol));
  } catch {
    return false;
  }
}
