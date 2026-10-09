/** What people see of an app, as a form; apart from the look. */

export type InfoField = 'logo' | 'name' | 'description' | 'homepage_url' | 'category' | 'privacy_url' | 'terms_url';

export interface AppInfoFormLabels {
  title: string;
  fields: Record<InfoField, string>;
  placeholders: Partial<Record<InfoField, string>>;
  logoHint: string;
  platforms: string;
}

export const appInfoFormLabels: AppInfoFormLabels = {
  title: 'App information',
  fields: {
    logo: 'Icon URL',
    name: 'App name',
    description: 'Description',
    homepage_url: 'Website',
    category: 'Category',
    privacy_url: 'Privacy policy URL',
    terms_url: 'Terms of service URL',
  },
  placeholders: { homepage_url: 'https://', category: 'Productivity', privacy_url: 'https://', terms_url: 'https://', logo: 'https://' },
  logoHint: 'Square, at least 512 px. Shown on the consent screen.',
  platforms: 'Platforms',
};

export interface PlatformEntry {
  platform: string;
  label: string;
  selected: boolean;
}

export interface AppInfoFormLogic {
  labels: () => AppInfoFormLabels;
  value: (field: InfoField) => string;
  edit: (field: InfoField, value: string) => void;
  platforms: () => PlatformEntry[];
  toggle: (platform: string) => void;
}

export interface AppInfoFormEvents {
  edit: { field: InfoField; value: string };
  platform: { platform: string };
}
