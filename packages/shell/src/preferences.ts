/**
 * A visitor's choices, kept in a cookie so the server renders with them: the language (without
 * one, what the server picked from Accept-Language stays) and whether the sidebar is folded.
 */
import { persisted, useStorage } from '@fluixi/core/storage';

type Language = 'fr' | 'en';
type Preferences = { lang: Language | ''; sidebar: boolean };

export interface LocaleControl {
  locale: () => Language;
  setLocale: (next: Language) => void;
}

/** `namespace` keeps each app's cookie apart; `i18n` is the app's own catalogue. */
export function usePreferences(namespace: string, i18n: LocaleControl) {
  const prefs = useStorage<Preferences>({ scope: 'cookie', namespace });
  const language = persisted(prefs, 'lang', { fallback: '' });
  const sidebarFolded = persisted(prefs, 'sidebar', { fallback: false });
  const chosen = language();
  if (chosen) i18n.setLocale(chosen);
  return {
    sidebarFolded,
    switchLanguage: () => {
      const next = i18n.locale() === 'fr' ? 'en' : 'fr';
      language.set(next);
      i18n.setLocale(next);
    },
  };
}
