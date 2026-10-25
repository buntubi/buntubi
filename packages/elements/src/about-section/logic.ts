/** The about-you card: the profile fields the platform shows, read and edited together; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldMode, Gender, ProfileField } from '@buntubi/sdk/account';
import type { AboutInput } from '@buntubi/sdk/schemas/account';
import type { FieldControl } from '../field.js';

export interface AboutSectionLabels {
  title: string;
  fields: Record<ProfileField, string>;
  hints: Partial<Record<ProfileField, string>>;
  genders: Record<Gender, string>;
  none: string;
  required: string;
  edit: string;
  save: string;
  cancel: string;
  saved: string;
  error: string;
}

export const aboutSectionLabels: AboutSectionLabels = {
  title: 'About you',
  fields: {
    birthdate: 'Date of birth',
    gender: 'Gender',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    website: 'Website',
    zoneinfo: 'Time zone',
  },
  hints: { website: 'Starts with https://' },
  genders: { female: 'Female', male: 'Male', other: 'Other' },
  none: 'Not set',
  required: 'Required',
  edit: 'Change',
  save: 'Save',
  cancel: 'Cancel',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface AboutForm extends ReactiveForm<AboutInput> {
  get<K extends keyof AboutInput>(key: K): FieldControl<AboutInput[K]>;
}

export interface AboutSectionLogic {
  labels: () => AboutSectionLabels;
  /** The fields shown, in a fixed order. */
  shown: () => ProfileField[];
  mode: (field: ProfileField) => Exclude<FieldMode, 'hidden'>;
  /** A field's value as people read it: a date in the locale, a gender in words. */
  display: (field: ProfileField) => string;
  editing: () => boolean;
  edit: (on: boolean) => void;
  form: AboutForm;
  save: (values: AboutInput) => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
