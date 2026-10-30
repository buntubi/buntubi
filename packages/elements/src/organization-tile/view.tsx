/** The default look: a card with the name and a muted second line. */
import { Show } from '@fluixi/core';
import { Badge } from '@fluixi-ui/badge';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { OrganizationTileLogic } from './logic.js';

export const organizationTileView = (o: OrganizationTileLogic) => (
  <div part="tile" class="tile">
    <style scoped>{`
      .tile > :deep(a) { display: grid; gap: 4px; padding: 16px; color: var(--idp-text); text-decoration: none; }
      strong { font-weight: 600; }
      span { color: var(--idp-muted); font-size: 12.5px; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--idp-text); font-size: inherit; }
    `}</style>
    <Link href={o.href()} onClick={() => o.choose()} data-card="">
      <span class="top">
        <strong>{() => o.name()}</strong>
        <Show when={o.tag()}>
          <Badge tone="primary">{() => o.tag()}</Badge>
        </Show>
      </span>
      <span>{() => o.detail()}</span>
    </Link>
  </div>
);

export const OrganizationTileView = viewToken<OrganizationTileLogic>('idp-organization-tile', organizationTileView);
