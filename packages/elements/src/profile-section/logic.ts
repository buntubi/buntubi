/** The profile card: the photo and the name; apart from the look. */
import type { ReactiveControl, ReactiveForm } from '@fluixi-ui/form';
import type { NameInput } from '@idp/sdk/schemas/account';

export interface ProfileSectionLabels {
  title: string;
  photo: string;
  photoHint: string;
  changePhoto: string;
  removePhoto: string;
  name: string;
  givenName: string;
  familyName: string;
  edit: string;
  save: string;
  cancel: string;
  saved: string;
  error: string;
}

export const profileSectionLabels: ProfileSectionLabels = {
  title: 'Profile',
  photo: 'Photo',
  photoHint: 'Shown on your account and in apps you allow',
  changePhoto: 'Change photo',
  removePhoto: 'Remove',
  name: 'Name',
  givenName: 'First name',
  familyName: 'Last name',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

/** The form engine's root, typed per field. */
export interface NameForm extends ReactiveForm<NameInput> {
  get<K extends keyof NameInput>(key: K): ReactiveControl<NameInput[K]>;
}

export interface ProfileSectionLogic {
  labels: () => ProfileSectionLabels;
  picture: () => string;
  initials: () => string;
  name: () => string;
  editing: () => boolean;
  setEditing: (on: boolean) => void;
  form: NameForm;
  saveName: (values: NameInput) => Promise<void>;
  choosePhoto: () => void;
  removePhoto: () => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
