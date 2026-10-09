/**
 * A visitor's choices, kept in a cookie so the server renders with them: the language (without
 * one, what the server picked from Accept-Language stays), whether the sidebar is folded, and the
 * organization they chose to work in.
 */
import { persisted, useStorage } from '@fluixi/core/storage';

type Language = 'fr' | 'en';
type Preferences = { lang: Language | ''; sidebar: boolean; organization: string };

export interface LocaleControl {
  locale: () => Language;
  setLocale: (next: Language) => void;
}

/** `namespace` keeps each app's cookie apart; `i18n` is the app's own catalogue. */
export function usePreferences(namespace: string, i18n: LocaleControl) {
  const prefs = useStorage<Preferences>({ scope: 'cookie', namespace });
  const language = persisted(prefs, 'lang', { fallback: '' });
  const sidebarFolded = persisted(prefs, 'sidebar', { fallback: false });
  // Set only by a choice the person makes (picking, switching, creating) and cleared on sign
  // out, so a new session starts at the organization picker.
  const organization = persisted(prefs, 'organization', { fallback: '' });
  const chosen = language();
  if (chosen) i18n.setLocale(chosen);
  return {
    sidebarFolded,
    organization,
    chooseOrganization: (id: string) => organization.set(id),
    forgetOrganization: () => organization.set(''),
    switchLanguage: () => {
      const next = i18n.locale() === 'fr' ? 'en' : 'fr';
      language.set(next);
      i18n.setLocale(next);
    },
  };
}
