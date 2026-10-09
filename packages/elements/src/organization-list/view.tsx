/** The default look: the cards stacked. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { OrganizationListLogic } from './logic.js';

export const organizationListView = (l: OrganizationListLogic) => (
  <div part="organizations" class="list">
    <style scoped>{`
      .list { display: grid; gap: 12px; }
      .empty { margin: 0; color: var(--idp-muted); }
    `}</style>
    <Show when={l.organizations().length} fallback={<p class="empty">{() => l.empty()}</p>}>
      <For each={l.organizations()} by={(organization) => organization.id}>
        {(organization) => <idp-organization-card organization={organization()} labels={l.cardLabels()} describe={l.describe()} />}
      </For>
    </Show>
  </div>
);

export const OrganizationListView = viewToken<OrganizationListLogic>('OrganizationListView', organizationListView);
