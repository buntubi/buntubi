/** The permissions' default look: scope cards per product, and the requested access beside them. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { PermissionsLogic, ScopeState } from './logic.js';

const TONE: Record<ScopeState, string> = {
  live: 'var(--idp-ok)',
  waiting: 'var(--idp-warn)',
  sandbox: 'var(--idp-info)',
  added: 'var(--idp-accent-ink)',
  available: 'var(--idp-muted)',
  restricted: 'var(--idp-muted)',
};

export const permissionsView = (p: PermissionsLogic) => (
  <div part="permissions" class="permissions">
    <style scoped>{`
      .permissions { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
      .groups { display: grid; gap: 16px; }
      .intro { grid-column: 1 / -1; margin: 0; color: var(--idp-muted); font-size: 13.5px; max-width: 70ch; }
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .scopes { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
      .scopes :deep(button) { height: auto; min-height: 0; padding: 12px 14px; justify-content: flex-start; text-align: left; white-space: normal; }
      .scope { display: grid; gap: 6px; width: 100%; }
      .top { display: flex; align-items: center; gap: 8px; }
      .top .pill { margin-left: auto; }
      code { font-family: var(--idp-mono); font-size: 12.5px; font-weight: 600; }
      .desc { color: var(--idp-muted); font-size: 12.5px; font-weight: 400; }
      .pill { display: inline-flex; align-items: center; gap: 5px; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .tick { width: 16px; height: 16px; border-radius: 5px; border: 1.5px solid var(--idp-border-2); display: grid; place-items: center; flex: none; }
      .scope[data-selected] .tick { border-color: var(--idp-accent); background: var(--idp-accent); color: var(--idp-accent-fg); }
      .aside { position: sticky; top: 16px; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .actions :deep(a) { font-size: 13px; color: var(--idp-accent-ink); text-decoration: none; font-weight: 500; }
      .ok { color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 960px) { .permissions { grid-template-columns: 1fr; } .aside { position: static; } }
    `}</style>
    <p class="intro">{() => p.labels().intro}</p>
    <div class="groups">
      <Show when={p.groups().length} fallback={<p class="hint">{() => p.labels().empty}</p>}>
        {/* Keyed, so a toggle updates a card in place and keyboard focus stays on it. */}
        <For each={p.groups()} by={(group) => group.slug}>
          {(group) => (
            <section class="card" part="product" aria-label={() => group().name}>
              <h2>{() => group().name}</h2>
              <Show when={group().description}>
                <p class="hint">{() => group().description}</p>
              </Show>
              <div class="scopes">
                <For each={group().scopes} by={(scope) => scope.name}>
                  {(scope) => (
                    <Button
                      variant="outline"
                      tone="neutral"
                      part="scope"
                      aria-pressed={scope().selected ? 'true' : 'false'}
                      disabled={scope().locked}
                      onPress={() => p.toggle(scope().name)}
                    >
                      <span class="scope" data-selected={() => (scope().selected ? '' : undefined)}>
                        <span class="top">
                          <span class="tick" aria-hidden="true">
                            <Show when={scope().selected}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                            </Show>
                          </span>
                          <code>{() => scope().name}</code>
                          <span class="pill" style={() => `--tone: ${TONE[scope().state]}`}>
                            {() => p.labels().states[scope().state]}
                          </span>
                        </span>
                        <Show when={scope().description}>
                          <span class="desc">{() => scope().description}</span>
                        </Show>
                      </span>
                    </Button>
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
      </Show>
    </div>
    <aside class="card aside" part="summary" aria-labelledby="idp-perm-summary">
      <h2 id="idp-perm-summary">{() => p.labels().summaryTitle}</h2>
      <p class="hint">
        {() =>
          p
            .labels()
            .summary.replace('{selected}', String(p.selectedCount()))
            .replace('{review}', String(p.needsReview().length))
        }
      </p>
      <Show when={p.needsReview().length}>
        <ul>
          <For each={p.needsReview()}>{(name) => <li><code>{name}</code></li>}</For>
        </ul>
        <p class="hint">{() => p.labels().reviewNote}</p>
      </Show>
      <p class="hint">{() => p.labels().sandboxNote}</p>
      <div class="actions">
        <Show when={p.canEdit() && p.changed()}>
          <Button variant="solid" disabled={p.busy()} onPress={p.save}>
            {() => p.labels().save}
          </Button>
        </Show>
        <Show when={p.saved()}>
          <span class="ok" role="status">{() => p.labels().saved}</span>
        </Show>
        <Show when={p.reviewHref() && !p.changed()}>
          <Link href={p.reviewHref()}>{() => p.labels().toReview}</Link>
        </Show>
      </div>
      <Show when={p.error()}>
        <p class="alert" role="alert">
          {() => p.error()}
        </p>
      </Show>
    </aside>
  </div>
);

export const PermissionsView = viewToken<PermissionsLogic>('PermissionsView', permissionsView);
