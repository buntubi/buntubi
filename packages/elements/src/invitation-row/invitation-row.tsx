/** One address asked to join before it had an account. Withdrawing it emits `withdraw`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { Invitation } from '@buntu/sdk/types';
import { shortDate } from '../dates.js';
import { teamLabels, type TeamLabels } from '../team/logic.js';
import { useView } from '../view.js';
import type { InvitationRowEvents, InvitationRowLogic } from './logic.js';
import { InvitationRowView } from './view.js';

const props = {
  invitation: prop.object<Invitation | null>(null),
  canManage: prop.boolean(false),
  busy: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<TeamLabels>(teamLabels),
};

export class IdpInvitationRow extends typedElement(props) {
  protected override render(): unknown {
    const logic: InvitationRowLogic = {
      labels: () => this.labels,
      invitation: () => this.invitation,
      dates: () => {
        const i = this.invitation;
        if (!i) return '';
        return this.labels.invitedOn
          .replace('{date}', shortDate(i.invited_at, this.locale))
          .replace('{until}', shortDate(i.expires_at, this.locale));
      },
      canManage: () => this.canManage,
      busy: () => this.busy,
      withdraw: () => {
        if (this.invitation) this.emit('withdraw', { id: this.invitation.id });
      },
    };
    return useView(InvitationRowView)(logic);
  }
}

defineCustomElement('idp-invitation-row', IdpInvitationRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-invitation-row': IdpInvitationRow;
  }
  interface JSXCustomElements {
    'idp-invitation-row': ElementAttributes<typeof props, InvitationRowEvents>;
  }
}
