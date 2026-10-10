/** The preferences card: language and country, saved on pick; apart from the look. */
import type { Country } from '../countries.js';

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
  countryHint: 'Used for phone numbers and formats.',
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
  countries: () => Country[];
  setLocale: (locale: 'fr' | 'en') => Promise<void>;
  setCountry: (code: string) => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
