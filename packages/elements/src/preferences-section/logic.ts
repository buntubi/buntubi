/** The preferences card: language and country, saved on pick; apart from the look. */
export interface PreferencesSectionLabels {
  title: string;
  language: string;
  languageHint: string;
  languages: { fr: string; en: string };
  country: string;
  countryHint: string;
  noCountry: string;
  saved: string;
  error: string;
}

export const preferencesSectionLabels: PreferencesSectionLabels = {
  title: 'Preferences',
  language: 'Language',
  languageHint: 'Pages and emails from your account use it.',
  languages: { fr: 'Français', en: 'English' },
  country: 'Country',
  countryHint: 'Where you live. New phone numbers start from it.',
  noCountry: 'Not set',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface PreferencesSectionEvents {
  /** The language changed and is saved: the host shows its pages in it. */
  language: { locale: 'fr' | 'en' };
}

export interface PreferencesSectionLogic {
  labels: () => PreferencesSectionLabels;
  locale: () => 'fr' | 'en';
  country: () => string;
  setLocale: (locale: 'fr' | 'en') => Promise<void>;
  setCountry: (code: string) => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
