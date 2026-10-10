/** The default look: one card, the column headings, the rows. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { OrganizationListLogic } from './logic.js';

export const organizationListView = (l: OrganizationListLogic) => (
  <section part="organizations" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.2fr) 84px 100px minmax(0, 1.2fr) 110px 110px; gap: 12px; padding: 10px 20px; color: var(--idp-muted); font-size: 12.5px; font-weight: 500; background: var(--idp-surface-2); position: sticky; top: calc(var(--idp-topbar, 0px) + var(--idp-head, 0px)); z-index: 1; }
      .rows > :deep(idp-organization-row) { display: block; }
      .empty { margin: 0; padding: 16px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
      @media (max-width: 960px) { .columns { display: none; } }
    `}</style>
    <div role="table" aria-label={() => l.labels().title}>
      <div class="columns" role="row">
        <span role="columnheader">{() => l.labels().organization}</span>
        <span role="columnheader">{() => l.labels().owner}</span>
        <span role="columnheader">{() => l.labels().members}</span>
        <span role="columnheader">{() => l.labels().apps}</span>
        <span role="columnheader">{() => l.labels().approved}</span>
        <span role="columnheader">{() => l.labels().status}</span>
        <span role="columnheader" />
      </div>
      <Show when={l.organizations().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
        <div class="rows">
          <For each={l.organizations()} by={(organization) => organization.id}>
            {(organization) => <idp-organization-row organization={organization()} appsHref={l.appsHref()} labels={l.rowLabels()} describe={l.describe()} />}
          </For>
        </div>
      </Show>
    </div>
  </section>
);

export const OrganizationListView = viewToken<OrganizationListLogic>('OrganizationListView', organizationListView);
