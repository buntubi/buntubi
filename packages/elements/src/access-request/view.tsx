/** The default look: a card with the count, one tinted row per pending scope, the main action, notes. */
import { For, Show } from '@fluixi/core';
import { useNavigation } from '@buntu/sdk/navigation';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { AccessRequestLogic } from './logic.js';

export const accessRequestView = (r: AccessRequestLogic) => {
  const navigate = useNavigation().go;
  return (
    <section part="access-request" class="card" aria-labelledby="idp-access-request-title">
      <style scoped>{`
        .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px; display: grid; gap: 14px; }
        h2 { margin: 0; font-size: 15px; font-weight: 600; }
        p { margin: 0; font-size: 13px; color: var(--idp-muted); line-height: 1.5; }
        .summary { color: var(--idp-text); font-size: 14px; }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--idp-surface-2); }
        code { font-size: 12.5px; }
        .tone { font-size: 12.5px; font-weight: 500; color: var(--idp-warn); }
        li[data-restricted] .tone { color: var(--idp-bad); }
        .action :deep(button) { width: 100%; }
        .status { color: var(--idp-ok); }
        .alert { color: var(--idp-bad); }
      `}</style>
      <h2 id="idp-access-request-title">{() => r.labels().title}</h2>
      <p class="summary">{() => r.summary()}</p>
      <Show when={r.pending().length}>
        <ul>
          <For each={r.pending()} by={(scope) => scope.name}>
            {(scope) => (
              <li data-restricted={() => (scope().restricted ? '' : undefined)}>
                <code>{() => scope().name}</code>
                <span class="tone">{() => (scope().restricted ? r.labels().restricted : r.labels().review)}</span>
              </li>
            )}
          </For>
        </ul>
        <p>{() => r.labels().note}</p>
      </Show>
      <Show when={r.canEdit()}>
        <div class="action">
          <Show
            when={r.changed()}
            fallback={
              <Show when={r.pending().length && r.reviewHref()}>
                <Button variant="solid" onPress={() => navigate(r.reviewHref())}>
                  {() => r.labels().continue}
                </Button>
              </Show>
            }
          >
            <Button variant="solid" disabled={r.busy()} onPress={() => r.save()}>
              {() => r.labels().save}
            </Button>
          </Show>
        </div>
      </Show>
      <Show when={r.saved()}>
        <p class="status" role="status">
          {() => r.labels().saved}
        </p>
      </Show>
      <Show when={r.error()}>
        <p class="alert" role="alert">
          {() => r.error()}
        </p>
      </Show>
      <p>{() => r.labels().sandboxNote}</p>
    </section>
  );
};

export const AccessRequestView = viewToken<AccessRequestLogic>('idp-access-request', accessRequestView);
