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

const props = {
  events: prop.object<ActivityEntry[]>([]),
  days: prop.number(30),
  locale: prop.string('en'),
  labels: prop.object<Partial<SecurityActivityLabels>>({}),
};

const WARN: ActivityKind[] = ['sign_in_failed', 'backup_code_used', 'mfa_disabled', 'password_reset_sent', 'signed_out_everywhere'];
const INFO: ActivityKind[] = ['email_change_requested', 'signed_out_others', 'password_reset', 'passkey_added', 'passkey_removed', 'device_signed_out', 'app_access_removed', 'data_exported'];

const toneOf = (kind: ActivityKind): ActivityTone => (WARN.includes(kind) ? 'warn' : INFO.includes(kind) ? 'info' : 'ok');

export class IdpSecurityActivity extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...securityActivityLabels, ...this.labels, kinds: { ...securityActivityLabels.kinds, ...this.labels.kinds } });
    const what = (entry: ActivityEntry, l: SecurityActivityLabels) => {
      if (entry.kind === 'sign_in' && entry.passkey) return l.signInPasskey;
      if (entry.kind === 'sign_in' && entry.two_step) return l.signInTwoStep;
      if (entry.kind === 'sign_in_failed' && entry.count > 1) return l.wrongPasswords.replace('{n}', String(entry.count));
      const said = l.kinds[entry.kind];
      return entry.name ? l.withName.replace('{what}', said).replace('{name}', entry.name) : said;
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
