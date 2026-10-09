/** Why an app is closed to the visitor, and the ways out, apart from how it looks. */

export type GateReason = 'signed_out' | 'not_admin' | 'mfa_required';

export interface AccessGateLabels {
  titles: Record<GateReason, string>;
  texts: Record<GateReason, string>;
  signIn: string;
  account: string;
  signOut: string;
  otherAccount: string;
}

export const accessGateLabels: AccessGateLabels = {
  titles: { signed_out: 'Sign in', not_admin: 'Not available', mfa_required: 'Two-step sign-in required' },
  texts: {
    signed_out: 'This console is for the platform team.',
    not_admin: 'This account cannot use the console.',
    mfa_required: 'The console needs a sign-in with a second factor. Turn on two-step sign-in, then sign in again.',
  },
  signIn: 'Sign in',
  account: 'Open my account',
  signOut: 'Sign out to sign in again',
  otherAccount: 'Sign in with another account',
};

export interface AccessGateLogic {
  labels: () => AccessGateLabels;
  reason: () => GateReason;
  accountHref: () => string;
  signOutHref: () => string;
  signIn: () => void;
}

export interface AccessGateEvents {
  /** The visitor asked to sign in; the host starts it. */
  signin: Record<string, never>;
}
