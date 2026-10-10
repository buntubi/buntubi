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
}

export const Account = injectionToken<AccountService>('Account');
