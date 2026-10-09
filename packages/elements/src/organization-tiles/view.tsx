/** The default look: the heading, then a grid of tiles. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { OrganizationTilesLogic } from './logic.js';

export const organizationTilesView = (o: OrganizationTilesLogic) => (
  <section part="organizations" class="tiles">
    <style scoped>{`
      .tiles { display: grid; gap: 14px; }
      h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
      .muted { margin: 0; color: var(--idp-muted); }
    `}</style>
    <h1>{() => o.title()}</h1>
    <Show when={o.organizations().length} fallback={<p class="muted">{() => o.empty()}</p>}>
      <div class="grid">
        <For each={o.organizations()} by={(organization) => organization.id}>
          {(organization) => (
            <idp-organization-tile
              name={organization().name}
              detail={organization().support_email ?? ''}
              href={o.hrefOf(organization())}
            />
          )}
        </For>
      </div>
    </Show>
  </section>
);

export const OrganizationTilesView = viewToken<OrganizationTilesLogic>('OrganizationTilesView', organizationTilesView);
