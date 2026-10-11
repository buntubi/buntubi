/** The offer after signing up: a passkey, or two-step sign-in, or not now; apart from the look. */
import type { TwoStepSectionLabels } from '../two-step-section/logic.js';

export interface SecureAccountLabels {
  intro: string;
  passkey: { title: string; text: string; badge: string; action: string };
  app: { title: string; text: string; action: string };
  later: string;
  laterNote: string;
  passkeyDone: string;
  appDone: string;
  continue: string;
  error: string;
}

export const secureAccountLabels: SecureAccountLabels = {
  intro: 'A password alone can be guessed or stolen. Add one of these now, or later from Security in your account.',
  passkey: {
    title: 'A passkey',
    text: 'Sign in with your fingerprint, face or screen lock. Nothing to type, nothing to steal.',
    badge: 'Recommended',
    action: 'Add a passkey',
  },
  app: {
    title: 'Two-step sign-in',
    text: 'After your password, a code from an authenticator app on your phone.',
    action: 'Set up',
  },
  later: 'Not now',
  laterNote: 'You can add either one later from Security in your account.',
  passkeyDone: 'Your passkey is ready. Next time, sign in with it.',
  appDone: 'Two-step sign-in is on.',
  continue: 'Continue',
  error: 'Something went wrong. Try again.',
};

/** Choosing, setting up the app, or done. */
export type SecureAccountStep = 'choose' | 'app' | 'done';

export interface SecureAccountLogic {
  labels: () => SecureAccountLabels;
  twoStepLabels: () => Partial<TwoStepSectionLabels>;
  step: () => SecureAccountStep;
  /** Whether this browser can make a passkey. */
  passkeys: () => boolean;
  done: () => string;
  addPasskey: () => Promise<void>;
  setUpApp: () => void;
  appEnabled: () => void;
  back: () => void;
  answer: () => void;
  busy: () => boolean;
  error: () => string | null;
  describe: () => ((error: unknown) => string) | undefined;
}

export interface SecureAccountEvents {
  /** Skipped, or set up and continuing: the host goes on. */
  answer: { done: boolean };
}
