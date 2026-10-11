/**
 * The Account service over the provider's /api/account endpoints, with this page's session.
 * `changed` runs after each change: the account area loads its pages again, a page on its own
 * has nothing to reload.
 */
import { type AccountService, type TwoStepEnrolment } from '@idp/sdk/account';
import { createPasskey } from '@idp/sdk/webauthn';
import type { Api, Redirect } from '../host/api.js';

export function accountService(api: Api, changed: () => void = () => {}): AccountService {
  const after = async (call: Promise<unknown>) => {
    await call;
    changed();
  };
  const backupCodes = async (call: Promise<{ backup_codes: string[] }>) => {
    const { backup_codes } = await call;
    changed();
    return backup_codes;
  };
  return {
    switchTo: async (id) => (await api<Redirect>('POST', `/api/accounts/${encodeURIComponent(id)}`)).redirect,
    signOut: async (id) => (await api<Redirect>('DELETE', `/api/accounts/${encodeURIComponent(id)}`)).redirect,
    signOutAll: async () => (await api<Redirect>('DELETE', '/api/accounts')).redirect,
    updateProfile: (patch) => after(api('PATCH', '/api/account/profile', patch)),
    setPicture: (picture) => after(api('POST', '/api/account/picture', picture)),
    removePicture: () => after(api('DELETE', '/api/account/picture')),
    requestEmailChange: (input) => after(api('POST', '/api/account/email', input)),
    cancelEmailChange: () => after(api('DELETE', '/api/account/email')),
    confirmEmailChange: async (token) => (await api<{ email: string }>('POST', '/api/account/email/confirm', { token })).email,
    changePassword: (input) => after(api('POST', '/api/account/password', input)),
    beginTwoStep: () => api<TwoStepEnrolment>('POST', '/api/mfa/totp', {}),
    confirmTwoStep: (code) => backupCodes(api('POST', '/api/mfa/totp/confirm', { code })),
    renewBackupCodes: (code) => backupCodes(api('POST', '/api/mfa/backup-codes', { code })),
    disableTwoStep: (code) => after(api('POST', '/api/mfa/disable', { code })),
    addPasskey: async (password) => {
      const options = await api<Record<string, unknown>>('POST', '/api/account/passkeys/options', password ? { password } : {});
      const credential = await createPasskey(options);
      await after(api('POST', '/api/account/passkeys', { credential }));
    },
    renamePasskey: (id, name) => after(api('PATCH', `/api/account/passkeys/${encodeURIComponent(id)}`, { name })),
    removePasskey: (id) => after(api('DELETE', `/api/account/passkeys/${encodeURIComponent(id)}`)),
    signOutDevice: (id) => after(api('DELETE', `/api/account/devices/${encodeURIComponent(id)}`)),
    signOutOtherDevices: () => after(api('POST', '/api/account/devices/sign-out-others', {})),
    removeApp: (id) => after(api('DELETE', `/api/account/apps/${encodeURIComponent(id)}`)),
    downloadData: async () => {
      // A file to save, so fetched as a blob and handed to the browser's download.
      const response = await fetch('/api/account/export', { credentials: 'same-origin' });
      if (!response.ok) throw new Error(response.status === 429 ? 'too_many_requests' : 'generic');
      const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'account.json';
      const href = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = href;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      changed();
    },
    deleteAccount: async (input) => (await api<Redirect>('DELETE', '/api/account', input)).redirect,
  };
}
