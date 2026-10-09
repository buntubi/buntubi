/** The default look: a muted line, a 26px title and the intro, the actions at the end of the row. */
import { For, Show } from '@fluixi/core';
import { useNavigate } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { PageHeaderLogic } from './logic.js';

export const pageHeaderView = (p: PageHeaderLogic) => {
  const navigate = useNavigate();
  return (
    <div part="page-header" class="head">
      <style scoped>{`
        .head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; }
        .text { display: grid; gap: 6px; min-width: 0; }
        .eyebrow { color: var(--idp-muted); font-size: 13px; }
        h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
        p { margin: 0; color: var(--idp-muted); max-width: 620px; }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      `}</style>
      <div class="text">
        <Show when={p.eyebrow()}>
          <span class="eyebrow">{() => p.eyebrow()}</span>
        </Show>
        <h1>{() => p.title()}</h1>
        <Show when={p.intro()}>
          <p>{() => p.intro()}</p>
        </Show>
      </div>
      <Show when={p.actions().length}>
        <div class="actions">
          <For each={p.actions()} by={(action) => action.href}>
            {(action) => (
              <Button variant={action().variant ?? 'outline'} tone={action().variant === 'solid' ? undefined : 'neutral'} onPress={() => navigate(action().href)}>
                <Show when={action().icon}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d={action().icon} />
                  </svg>
                </Show>
                {() => action().label}
              </Button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export const PageHeaderView = viewToken<PageHeaderLogic>('PageHeaderView', pageHeaderView);
