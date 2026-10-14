/** The two-step card: on or off, the authenticator, the backup codes, and each change's steps. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { TwoStepEnrolment } from '@buntubi/sdk/account';
import type { TwoStepCodeInput } from '@buntubi/sdk/schemas/account';

export interface TwoStepSectionLabels {
  title: string;
  on: string;
  off: string;
  aboutOn: string;
  aboutOff: string;
  turnOn: string;
  turnOff: string;
  app: string;
  /** {date} is when it was turned on. */
  addedOn: string;
  backupCodes: string;
  /** {n} left of {total}. */
  codesLeft: string;
  codesLow: string;
  renew: string;
  scan: string;
  manual: string;
  code: string;
  confirmOn: string;
  confirmWithCode: string;
  saveCodes: string;
  copy: string;
  copied: string;
  done: string;
  cancel: string;
  error: string;
}

export const twoStepSectionLabels: TwoStepSectionLabels = {
  title: 'Two-step sign-in',
  on: 'On',
  off: 'Off',
  aboutOn: 'After your password, a code from your phone. Required to open admin tools.',
  aboutOff: 'Add a code from your phone after your password: a stolen password is no longer enough.',
  turnOn: 'Turn on',
  turnOff: 'Turn off',
  app: 'Authenticator app',
  addedOn: 'Added {date}',
  backupCodes: 'Backup codes',
  codesLeft: '{n} of {total} left.',
  codesLow: 'Make a fresh set and keep it somewhere safe.',
  renew: 'New backup codes',
  scan: 'Scan this code with your authenticator app, then enter the 6-digit code it shows.',
  manual: 'Or type this key into the app:',
  code: 'Code from the app',
  confirmOn: 'Turn on',
  confirmWithCode: 'Enter a code from the app, or a backup code, to confirm.',
  saveCodes: 'Save these backup codes somewhere safe. Each one signs you in once if you lose your phone. They will not be shown again.',
  copy: 'Copy the codes',
  copied: 'Copied',
  done: 'I saved them',
  cancel: 'Cancel',
  error: 'Something went wrong. Try again.',
};

/** What the card is doing: nothing, setting up the app, showing new codes, or asking a code for a change. */
export type TwoStepStep = 'idle' | 'enrolling' | 'codes' | 'renew' | 'disable';

export interface CodeForm extends ReactiveForm<TwoStepCodeInput> {
  get<K extends keyof TwoStepCodeInput>(key: K): FieldControl<TwoStepCodeInput[K]>;
}

export interface TwoStepSectionLogic {
  labels: () => TwoStepSectionLabels;
  enabled: () => boolean;
  added: () => string;
  left: () => number;
  total: () => number;
  low: () => boolean;
  step: () => TwoStepStep;
  go: (step: TwoStepStep) => void;
  enrolment: () => TwoStepEnrolment | null;
  codes: () => string[];
  copied: () => boolean;
  form: CodeForm;
  begin: () => Promise<void>;
  submit: (values: TwoStepCodeInput) => Promise<void>;
  copy: () => void;
  busy: () => boolean;
  error: () => string | null;
}

export interface TwoStepSectionEvents {
  /** Turned on, and its backup codes saved. */
  enabled: Record<string, never>;
  /** Started with `start`, and left before turning it on. */
  cancel: Record<string, never>;
}
