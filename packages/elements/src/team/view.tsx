/** The default look: the organization's mark, name and counts beside the tabs, then the tab's card. */
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { TeamLogic } from './logic.js';

export const teamView = (t: TeamLogic) => (
  <div part="team" class="team">
    <style scoped>{`
      .team { display: grid; gap: 20px; }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px 24px; }
      .org { display: flex; align-items: center; gap: 16px; }
      .mark { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-size: 20px; font-weight: 700; color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 14%, var(--idp-surface)); }
      .names { display: grid; gap: 2px; }
      h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      .counts { color: var(--idp-muted); }
    `}</style>
    <div class="head">
      <div class="org">
        <span class="mark" aria-hidden="true">{() => t.mark()}</span>
        <span class="names">
          <h1>{() => t.name()}</h1>
          <span class="counts">{() => t.counts()}</span>
        </span>
      </div>
      <idp-segmented
        options={t.tabs()}
        value={t.tab()}
        label={t.labels().tabs.label}
        size="md"
        onChange={(event) => t.choose(event.detail.value)}
      />
    </div>
    <Show
      when={t.tab() === 'members'}
      fallback={
        <idp-test-users
          organization={t.organization()}
          testUsers={t.testUsers()}
          canManage={t.canManageTesters()}
          locale={t.locale()}
          labels={t.labels()}
          messages={t.messages()}
          describe={t.describe()}
        />
      }
    >
      <idp-members
        organization={t.organization()}
        members={t.members()}
        invitations={t.invitations()}
        locale={t.locale()}
        apps={t.apps()}
        canManage={t.canManage()}
        labels={t.labels()}
        messages={t.messages()}
        describe={t.describe()}
      />
    </Show>
  </div>
);

export const TeamView = viewToken<TeamLogic>('TeamView', teamView);
