/** Recent security activity, read from the account's audit trail; the host loads the entries. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { memo } from '@fluixi/reactive/signal';
import type { ActivityEntry, ActivityKind } from '@buntubi/sdk/account';
import { dateTime } from '../dates.js';
import { useView } from '../view.js';
import {
  securityActivityLabels,
  type ActivityRow,
  type ActivityTone,
  type SecurityActivityLabels,
  type SecurityActivityLogic,
} from './logic.js';
import { SecurityActivityView } from './view.js';
import { SOCIAL_ICONS } from '../social-button/icons.js';
import { activityIcon } from './icons.js';

const props = {
  events: prop.object<ActivityEntry[]>([]),
  days: prop.number(30),
  locale: prop.string('en'),
  labels: prop.object<Partial<SecurityActivityLabels>>({}),
};

const WARN: ActivityKind[] = ['sign_in_failed', 'backup_code_used', 'mfa_disabled', 'password_reset_sent', 'signed_out_everywhere'];
const INFO: ActivityKind[] = [
  'email_change_requested',
  'signed_out_others',
  'password_reset',
  'passkey_added',
  'passkey_removed',
  'device_signed_out',
  'app_access_removed',
  'data_exported',
  'provider_linked',
  'provider_unlinked',
];

const toneOf = (kind: ActivityKind): ActivityTone => (WARN.includes(kind) ? 'warn' : INFO.includes(kind) ? 'info' : 'ok');

export class IdpSecurityActivity extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...securityActivityLabels, ...this.labels, kinds: { ...securityActivityLabels.kinds, ...this.labels.kinds } });
    const what = (entry: ActivityEntry, l: SecurityActivityLabels) => {
      const how = signIn(entry, l);
      if (how !== null) return entry.app ? l.toApp.replace('{what}', how).replace('{app}', entry.app) : how;
      if (entry.kind === 'signed_out' && entry.app) return l.signedOutFrom.replace('{app}', entry.app);
      if (entry.kind === 'sign_in_failed' && entry.count > 1) return l.wrongPasswords.replace('{n}', String(entry.count));
      if ((entry.kind === 'provider_linked' || entry.kind === 'provider_unlinked') && entry.provider) {
        return l.withName.replace('{what}', l.kinds[entry.kind]).replace('{name}', entry.provider);
      }
      const said = l.kinds[entry.kind];
      return entry.name ? l.withName.replace('{what}', said).replace('{name}', entry.name) : said;
    };
    /** How a sign-in was made, in words; null for any other event. */
    const signIn = (entry: ActivityEntry, l: SecurityActivityLabels): string | null => {
      if (entry.kind !== 'sign_in') return null;
      if (entry.provider) return (entry.two_step ? l.signInWithTwoStep : l.signInWith).replace('{provider}', entry.provider);
      if (entry.passkey) return l.signInPasskey;
      if (entry.two_step) return l.signInTwoStep;
      if (entry.password) return l.signInPassword;
      return l.kinds.sign_in;
    };
    const where = (entry: ActivityEntry, l: SecurityActivityLabels) => {
      const device =
        entry.browser && entry.system
          ? l.device.replace('{browser}', entry.browser).replace('{system}', entry.system)
          : entry.browser || entry.system || l.unknownDevice;
      return entry.ip ? `${device} · ${entry.ip}` : device;
    };
    const rows = memo((): ActivityRow[] => {
      const l = labels();
      return this.events.map((entry, index) => ({
        key: `${entry.at}-${index}`,
        brand: (entry.provider_id && SOCIAL_ICONS[entry.provider_id]) || null,
        icon: activityIcon(entry),
        what: what(entry, l),
        where: where(entry, l),
        when: dateTime(entry.at, this.locale),
        tone: toneOf(entry.kind),
      }));
    });
    const logic: SecurityActivityLogic = {
      labels,
      period: () => labels().period.replace('{n}', String(this.days)),
      rows,
    };
    return useView(SecurityActivityView)(logic);
  }
}

defineCustomElement('idp-security-activity', IdpSecurityActivity);

declare global {
  interface HTMLElementTagNameMap {
    'idp-security-activity': IdpSecurityActivity;
  }
  interface JSXCustomElements {
    'idp-security-activity': ElementAttributes<typeof props>;
  }
}
