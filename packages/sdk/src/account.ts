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
  /**
   * Makes a passkey on this device and keeps it. A sign-in older than a few minutes refuses with
   * `reauth_required`: call again with the password.
   */
  addPasskey(password?: string): Promise<void>;
  renamePasskey(id: string, name: string): Promise<void>;
  removePasskey(id: string): Promise<void>;
  /** Ends a session on another device, with the tokens apps hold through it. */
  signOutDevice(id: string): Promise<void>;
  /** Ends every session but this one. */
  signOutOtherDevices(): Promise<void>;
  /** Takes back an app's access: it asks again next time. */
  removeApp(id: string): Promise<void>;
}

/** A browser or phone signed in to the account. */
export interface Device {
  id: string;
  /** Empty when the browser did not say. */
  browser: string;
  system: string;
  ip: string | null;
  signed_in_at: string;
  last_seen_at: string;
  /** Seen in the last few minutes. */
  active_now: boolean;
  /** Not seen for more than 30 days. */
  inactive: boolean;
  /** How it signed in, as amr values: pwd, otp, backup, hwk, mfa. */
  methods: string[];
  /** Signed in on this browser. */
  here: boolean;
}

/** An app that uses the account. */
export interface ConnectedApp {
  /** The OAuth client_id. */
  id: string;
  name: string;
  logo: string | null;
  /** Who makes it: the organization, or the platform's brand for its own apps. */
  by: string;
  /** One of the platform's own apps: never asks, cannot be removed here. */
  platform: boolean;
  since: string | null;
  last_used_at: string | null;
  /** What it may see or do; `description` is the platform's own words, when it has some. */
  scopes: { name: string; description: string }[];
}

export interface Passkey {
  id: string;
  name: string;
  /** The password manager that keeps it, when it says (iCloud Keychain, Google Password Manager). */
  provider: string;
  /** Synced to the person's other devices. */
  synced: boolean;
  created_at: string;
  last_used_at: string | null;
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
  | 'signed_out_others'
  | 'passkey_added'
  | 'passkey_removed'
  | 'device_signed_out'
  | 'app_access_removed';

export interface ActivityEntry {
  kind: ActivityKind;
  at: string;
  ip: string | null;
  /** Empty when the browser did not say. */
  browser: string;
  system: string;
  /** A sign-in that asked for the second factor. */
  two_step: boolean;
  /** A sign-in with a passkey. */
  passkey: boolean;
  /** The passkey's name, for passkey_added and passkey_removed. */
  name: string | null;
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
