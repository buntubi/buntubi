/**
 * What the account area's elements may ask of the provider, for the signed-in person. No default:
 * the account app provides it, mapped to the provider's /api endpoints.
 */
import { injectionToken } from '@fluixi/start/di';

/** An account signed in on this browser. */
export interface BrowserAccount {
  /** The login session's id, which switching and signing out name. */
  id: string;
  email: string;
  name: string;
  current: boolean;
}

/** What the account home shows. */
export interface AccountSummary {
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name: string;
    family_name: string;
    locale: string;
    phone: string | null;
    /** Two-letter ISO 3166 code. */
    country: string | null;
    picture: string | null;
    /** A new address waiting for its link to be opened. */
    pending_email: string | null;
    created_at: string;
    /** False for an account made without one (an invitation not taken up yet). */
    has_password: boolean;
    /** Null: unchanged since the account was made. */
    password_changed_at: string | null;
  };
  /** `since`: when two-step sign-in was turned on. */
  mfa: { enabled: boolean; since: string | null; backup_codes_left: number };
  /** Open sessions on any device. */
  devices: number;
  connected_apps: number;
  /** The platform's own apps this person can open. */
  apps: { name: string; url: string | null; logo: string | null }[];
  accounts: BrowserAccount[];
}

export interface AccountService {
  /** Makes another account signed in here the current one; answers where to go next. */
  switchTo(id: string): Promise<string>;
  /** Signs one account out of this browser; answers where to go next. */
  signOut(id: string): Promise<string>;
  /** Signs every account out of this browser; answers where to go next. */
  signOutAll(): Promise<string>;
  /** Changes what is given; an empty phone or country clears it. */
  updateProfile(patch: ProfilePatch): Promise<void>;
  /** The photo, already made small. */
  setPicture(picture: Blob): Promise<void>;
  removePicture(): Promise<void>;
  /** Sends a link to the new address; the address changes once it is opened. */
  requestEmailChange(input: { email: string; password: string }): Promise<void>;
  cancelEmailChange(): Promise<void>;
  /** The link from the new address was opened: answers the account's address now. */
  confirmEmailChange(token: string): Promise<string>;
  /** With `sign_out_others`, every other session ends; this one stays. */
  changePassword(input: PasswordChange): Promise<void>;
  /** Starts two-step sign-in: the QR code and the key for the authenticator app. */
  beginTwoStep(): Promise<TwoStepEnrolment>;
  /** A first code from the app turns it on: answers the backup codes, shown once. */
  confirmTwoStep(code: string): Promise<string[]>;
  /** A current code (or a backup code) replaces the backup codes: answers the new ones. */
  renewBackupCodes(code: string): Promise<string[]>;
  disableTwoStep(code: string): Promise<void>;
}

export interface TwoStepEnrolment {
  /** A data: URL. */
  qr: string;
  secret: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
  sign_out_others: boolean;
}

/** What a security activity entry is about. */
export type ActivityKind =
  | 'sign_in'
  | 'sign_in_failed'
  | 'password_changed'
  | 'password_reset'
  | 'password_reset_sent'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'backup_code_used'
  | 'backup_codes_renewed'
  | 'email_change_requested'
  | 'email_changed'
  | 'signed_out_everywhere'
  | 'signed_out_others';

export interface ActivityEntry {
  kind: ActivityKind;
  at: string;
  ip: string | null;
  /** Empty when the browser did not say. */
  browser: string;
  system: string;
  /** A sign-in that asked for the second factor. */
  two_step: boolean;
  /** Wrong passwords in a row from one address are one entry. */
  count: number;
}

export interface AccountActivity {
  days: number;
  events: ActivityEntry[];
}

export interface ProfilePatch {
  given_name?: string;
  family_name?: string;
  phone?: string;
  country?: string;
  locale?: 'fr' | 'en';
}

export const Account = injectionToken<AccountService>('Account');
