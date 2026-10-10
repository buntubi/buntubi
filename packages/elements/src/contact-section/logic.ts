/** The contact card: the address, its change by link, and the phone; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { EmailChangeInput, PhoneInput } from '@idp/sdk/schemas/account';

export interface ContactSectionLabels {
  title: string;
  email: string;
  verified: string;
  unverified: string;
  change: string;
  newEmail: string;
  password: string;
  passwordHint: string;
  sendLink: string;
  /** Before the waiting address. */
  pending: string;
  pendingHint: string;
  cancelChange: string;
  linkSent: string;
  phone: string;
  phoneHint: string;
  noPhone: string;
  add: string;
  edit: string;
  remove: string;
  save: string;
  cancel: string;
  saved: string;
  error: string;
}

export const contactSectionLabels: ContactSectionLabels = {
  title: 'Contact',
  email: 'Email',
  verified: 'Verified',
  unverified: 'Not verified',
  change: 'Change',
  newEmail: 'New email',
  password: 'Your password',
  passwordHint: 'We send a link to the new address; the change happens once it is opened.',
  sendLink: 'Send the link',
  pending: 'Waiting for confirmation:',
  pendingHint: 'Open the link sent to this address.',
  cancelChange: 'Cancel the change',
  linkSent: 'Link sent. Open it from the new address.',
  phone: 'Phone',
  phoneHint: 'International format, for example +221 77 000 00 00',
  noPhone: 'None',
  add: 'Add',
  edit: 'Edit',
  remove: 'Remove',
  save: 'Save',
  cancel: 'Cancel',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface EmailForm extends ReactiveForm<EmailChangeInput> {
  get<K extends keyof EmailChangeInput>(key: K): FieldControl<EmailChangeInput[K]>;
}

export interface PhoneForm extends ReactiveForm<PhoneInput> {
  get<K extends keyof PhoneInput>(key: K): FieldControl<PhoneInput[K]>;
}

export type ContactEditing = 'email' | 'phone' | null;

export interface ContactSectionLogic {
  labels: () => ContactSectionLabels;
  email: () => string;
  verified: () => boolean;
  pendingEmail: () => string;
  phone: () => string;
  editing: () => ContactEditing;
  edit: (what: ContactEditing) => void;
  emailForm: EmailForm;
  phoneForm: PhoneForm;
  requestChange: (values: EmailChangeInput) => Promise<void>;
  cancelChange: () => Promise<void>;
  savePhone: (values: PhoneInput) => Promise<void>;
  removePhone: () => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
