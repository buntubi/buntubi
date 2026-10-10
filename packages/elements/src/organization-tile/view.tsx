/** The default look: a card with the name and a muted second line. */
import { Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { OrganizationTileLogic } from './logic.js';

export const organizationTileView = (o: OrganizationTileLogic) => (
  <div part="tile" class="tile">
    <style scoped>{`
      .tile > :deep(a) { display: grid; gap: 4px; padding: 16px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); color: var(--idp-text); text-decoration: none; }
      strong { font-weight: 600; }
      span { color: var(--idp-muted); font-size: 12.5px; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--idp-text); font-size: inherit; }
      .tag { font-style: normal; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
    `}</style>
    <Link href={o.href()} onClick={() => o.choose()}>
      <span class="top">
        <strong>{() => o.name()}</strong>
        <Show when={o.tag()}>
          <em class="tag">{() => o.tag()}</em>
        </Show>
      </span>
      <span>{() => o.detail()}</span>
    </Link>
  </div>
);

export const OrganizationTileView = viewToken<OrganizationTileLogic>('OrganizationTileView', organizationTileView);
