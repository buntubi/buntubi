/** Line icons for the activity rows, drawn like the account area's (24 box, stroked). */
import type { ActivityEntry, ActivityKind } from '@buntubi/sdk/account';

const LOCK = 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z';
const KEY = 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4';
const PHONE = 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01';
const ALERT = 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01';
const MAIL = 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6';
const LIST = 'M4 6h16M4 12h16M4 18h10';
const SIGN_OUT = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9';
const SIGN_IN = 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3';
const APPS = 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z';
const DOWNLOAD = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3';
const LINK =
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71';

const BY_KIND: Record<ActivityKind, string> = {
  sign_in: SIGN_IN,
  sign_in_failed: ALERT,
  password_changed: LOCK,
  password_reset: LOCK,
  password_reset_sent: MAIL,
  mfa_enabled: PHONE,
  mfa_disabled: PHONE,
  backup_code_used: LIST,
  backup_codes_renewed: LIST,
  email_change_requested: MAIL,
  email_changed: MAIL,
  signed_out_everywhere: SIGN_OUT,
  signed_out_others: SIGN_OUT,
  passkey_added: KEY,
  passkey_removed: KEY,
  device_signed_out: SIGN_OUT,
  app_access_removed: APPS,
  data_exported: DOWNLOAD,
  provider_linked: LINK,
  provider_unlinked: LINK,
  signed_out: SIGN_OUT,
};

/** The line icon for a row: a sign-in by how it was made, any other event by its kind. */
export function activityIcon(entry: ActivityEntry): string {
  if (entry.kind === 'sign_in') {
    if (entry.passkey) return KEY;
    if (entry.two_step) return PHONE;
    if (entry.password) return LOCK;
  }
  return BY_KIND[entry.kind];
}
