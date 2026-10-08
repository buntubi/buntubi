/**
 * The visitor's choices, kept in a cookie so the server renders with them: the language
 * (without one, what the server picked from Accept-Language stays) and whether the sidebar is
 * folded.
 */
import { locale, setLocale } from './i18n.js';

type Preferences = {
  lang: 'fr' | 'en' | '';
  sidebar: boolean;
};

export function usePreferences() {
  const prefs = $storage<Preferences>({ scope: 'cookie', namespace: 'portal' });
  const language = $persisted(prefs, 'lang', { fallback: '' });
  const sidebarFolded = $persisted(prefs, 'sidebar', { fallback: false });
  const chosen = language();
  if (chosen) setLocale(chosen);
  return {
    sidebarFolded,
    switchLanguage: () => {
      const next = locale() === 'fr' ? 'en' : 'fr';
      language.set(next);
      setLocale(next);
    },
  };
}
