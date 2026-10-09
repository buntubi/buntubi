/**
 * The default look: the page's title, the legend and one scope group per product on the left; the
 * request panel on the right, level with the title.
 */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { PermissionsLogic } from './logic.js';

export const permissionsView = (p: PermissionsLogic) => (
  <div part="permissions" class="permissions">
    <style scoped>{`
      .permissions { display: grid; grid-template-columns: minmax(0, 1fr) 362px; gap: 20px; align-items: start; }
      .main { display: grid; gap: 22px; min-width: 0; }
      .head { display: grid; gap: 14px; }
      .side { position: sticky; top: 16px; }
      .empty { margin: 0; color: var(--idp-muted); }
      @media (max-width: 1100px) { .permissions { grid-template-columns: 1fr; } .side { position: static; } }
    `}</style>
    <div class="main">
      <div class="head">
        <idp-page-header title={p.labels().title} intro={p.labels().intro} />
        <idp-permission-legend states={p.labels().states} label={p.labels().legend} />
      </div>
      <Show when={p.groups().length} fallback={<p class="empty">{() => p.labels().empty}</p>}>
        <For each={p.groups()} by={(group) => group.slug}>
          {(group) => (
            <idp-scope-group
              name={group().name}
              scopes={group().scopes}
              states={p.labels().states}
              detailsHref={p.detailsHref()}
              detailsLabel={p.labels().productDetails}
              onToggle={(event) => p.toggle(event.detail.scope)}
            />
          )}
        </For>
      </Show>
    </div>
    <div class="side">
      <idp-access-request
        selected={p.selectedCount()}
        pending={p.pending()}
        changed={p.changed()}
        canEdit={p.canEdit()}
        busy={p.busy()}
        saved={p.saved()}
        error={p.error() ?? ''}
        reviewHref={p.reviewHref()}
        labels={p.labels().request}
        onSave={() => void p.save()}
      />
    </div>
  </div>
);

export const PermissionsView = viewToken<PermissionsLogic>('PermissionsView', permissionsView);
