/** The default look: a tinted card, the ring beside its label, the items, the button and its note. */
import { For, Show } from '@fluixi/core';
import { useNavigation } from '@buntu/sdk/navigation';
import { Link } from '../link.js';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { ReadinessLogic } from './logic.js';

export const readinessView = (r: ReadinessLogic) => {
  const navigate = useNavigation().go;
  return (
    <section part="readiness" class="card">
      <style scoped>{`
        .card { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface-2); }
        .top { display: flex; align-items: center; gap: 12px; }
        .ring { flex: none; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; }
        .ring span { width: 42px; height: 42px; border-radius: 50%; background: var(--idp-surface-2); display: grid; place-items: center; font-size: 13px; font-weight: 600; }
        .what { display: grid; }
        .what strong { font-weight: 600; }
        .muted { color: var(--idp-muted); font-size: 12.5px; }
        ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
        li :deep(a), li .plain { display: flex; align-items: center; gap: 8px; padding: 5px 4px; color: var(--idp-text); text-decoration: none; font-size: 13px; }
        .mark { flex: none; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; border: 1.5px solid var(--idp-warn); }
        li[data-done] .mark { border: 0; color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 16%, transparent); }
        .action :deep(button) { width: 100%; }
      `}</style>
      <div class="top">
        <span class="ring" style={() => `background: conic-gradient(var(--idp-accent) 0 ${r.percent()}%, var(--idp-border) ${r.percent()}% 100%)`}>
          <span>{() => `${r.percent()}%`}</span>
        </span>
        <span class="what">
          <strong>{() => r.labels().ready}</strong>
          <span class="muted">{() => r.labels().left.replace('{n}', String(r.left()))}</span>
        </span>
      </div>
      <ol>
        <For each={r.items()} by={(item) => item.key}>
          {(item) => (
            <li data-done={() => (item().done ? '' : undefined)}>
              <Show
                when={item().href && !item().done}
                fallback={
                  <span class="plain">
                    <span class="mark" aria-hidden="true">{() => (item().done ? '✓' : '')}</span>
                    {() => item().label}
                  </span>
                }
              >
                <Link href={item().href}>
                  <span class="mark" aria-hidden="true" />
                  {() => item().label}
                </Link>
              </Show>
            </li>
          )}
        </For>
      </ol>
      <Show when={r.submitHref()}>
        <div class="action">
          <Button variant="solid" disabled={!r.canSubmit()} onPress={() => navigate(r.submitHref())}>
            {() => r.labels().submit}
          </Button>
        </div>
        <span class="muted">{() => r.labels().note}</span>
      </Show>
    </section>
  );
};

export const ReadinessView = viewToken<ReadinessLogic>('ReadinessView', readinessView);
