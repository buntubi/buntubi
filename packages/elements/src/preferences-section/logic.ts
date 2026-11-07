/** The preferences card: language and country, saved on pick; apart from the look. */
export interface PreferencesSectionLabels {
  title: string;
  language: string;
  languageHint: string;
  languages: { fr: string; en: string };
  country: string;
  countryHint: string;
  noCountry: string;
  /** The appearance row: its name, what it is for and the button that opens the dialog. */
  appearance: string;
  appearanceHint: string;
  appearanceChange: string;
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
  appearance: 'Appearance',
  appearanceHint: 'Style, mode, colour and the glass options. Kept on your account.',
  appearanceChange: 'Change',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface PreferencesSectionEvents {
  /** The language changed and is saved: the host shows its pages in it. */
  language: { locale: 'fr' | 'en' };
  /** The person asked to change the appearance: the host opens its dialog. */
  appearance: Record<string, never>;
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
  /** What the appearance is now, in words; empty hides the row. */
  appearanceSummary: () => string;
  openAppearance: () => void;
}
