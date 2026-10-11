/** The default look: the address with its role and dates, the way to withdraw it at the end. */
import { css, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { InvitationRowLogic } from './logic.js';

const styles = css`
  .invitation { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
  .mark { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--idp-muted); border: 1px dashed var(--idp-border-2); box-sizing: border-box; }
  .text { flex: 1; min-width: 200px; display: grid; }
  .email { font-weight: 500; overflow-wrap: anywhere; }
  .sub { color: var(--idp-muted); font-size: 12.5px; }
`;

const MAIL = 'M4 6h16v12H4zM4 7l8 6 8-6';

export const invitationRowView = (i: InvitationRowLogic) => (
  <div part="invitation" class="invitation">
    <style scoped>{`${styles}`}</style>
    <span class="mark" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
        <path d={MAIL} />
      </svg>
    </span>
    <span class="text">
      <span class="email">{() => i.invitation()?.email}</span>
      <span class="sub">
        {() => (i.invitation() ? `${i.labels().roles[i.invitation()!.role].name} · ${i.dates()}` : '')}
      </span>
    </span>
    <Show when={i.canManage()}>
      <Button variant="outline" tone="neutral" size="sm" disabled={i.busy()} onPress={() => i.withdraw()}>
        {() => i.labels().withdraw}
      </Button>
    </Show>
  </div>
);

export const InvitationRowView = viewToken<InvitationRowLogic>('InvitationRowView', invitationRowView);
