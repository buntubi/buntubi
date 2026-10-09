/** The default look: a card with the name and a muted second line. */
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { OrganizationTileLogic } from './logic.js';

export const organizationTileView = (o: OrganizationTileLogic) => (
  <div part="tile" class="tile">
    <style scoped>{`
      .tile > :deep(a) { display: grid; gap: 4px; padding: 16px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); color: var(--idp-text); text-decoration: none; }
      strong { font-weight: 600; }
      span { color: var(--idp-muted); font-size: 12.5px; }
    `}</style>
    <Link href={o.href()}>
      <strong>{() => o.name()}</strong>
      <span>{() => o.detail()}</span>
    </Link>
  </div>
);

export const OrganizationTileView = viewToken<OrganizationTileLogic>('OrganizationTileView', organizationTileView);
