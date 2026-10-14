/** The postal address card: shown by lines, edited by parts; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { AddressInput } from '@buntubi/sdk/schemas/account';
import type { FieldControl } from '../field.js';

export interface AddressSectionLabels {
  title: string;
  address: string;
  none: string;
  add: string;
  edit: string;
  remove: string;
  street: string;
  streetHint: string;
  postalCode: string;
  locality: string;
  region: string;
  country: string;
  save: string;
  cancel: string;
  saved: string;
  error: string;
}

export const addressSectionLabels: AddressSectionLabels = {
  title: 'Address',
  address: 'Postal address',
  none: 'Not set',
  add: 'Add',
  edit: 'Change',
  remove: 'Remove',
  street: 'Street and number',
  streetHint: 'A building, a floor or a PO box goes on a second line.',
  postalCode: 'Postal code',
  locality: 'City',
  region: 'Region or state',
  country: 'Country',
  save: 'Save',
  cancel: 'Cancel',
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface AddressForm extends ReactiveForm<AddressInput> {
  get<K extends keyof AddressInput>(key: K): FieldControl<AddressInput[K]>;
}

export interface AddressSectionLogic {
  labels: () => AddressSectionLabels;
  /** The address as it would be written on an envelope; empty when nothing is set. */
  lines: () => string[];
  locale: () => string;
  editing: () => boolean;
  edit: (on: boolean) => void;
  form: AddressForm;
  save: (values: AddressInput) => Promise<void>;
  remove: () => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
