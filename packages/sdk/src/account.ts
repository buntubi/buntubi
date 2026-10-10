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
  };
  mfa: { enabled: boolean; backup_codes_left: number };
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
}

export interface ProfilePatch {
  given_name?: string;
  family_name?: string;
  phone?: string;
  country?: string;
  locale?: 'fr' | 'en';
}

export const Account = injectionToken<AccountService>('Account');
