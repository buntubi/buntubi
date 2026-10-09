/** The default look: name and state, the facts, then suspend with a reason or restore. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { OrganizationCardLogic } from './logic.js';

export const organizationCardView = (c: OrganizationCardLogic) => (
  <section part="organization" class="card" data-suspended={() => (c.organization()?.suspended ? '' : undefined)}>
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 16px 18px; display: grid; gap: 10px; }
      .card[data-suspended] { border-color: color-mix(in srgb, var(--idp-bad) 40%, var(--idp-border)); }
      .head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .pill { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--idp-bad); background: color-mix(in srgb, var(--idp-bad) 12%, transparent); }
      .meta { margin: 0; color: var(--idp-muted); font-size: 13px; }
      code { font-family: var(--idp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); margin-right: 4px; }
      .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <h2>{() => c.organization()?.name ?? ''}</h2>
      <Show when={c.organization()?.suspended}>
        <span class="pill">{() => c.labels().suspended}</span>
      </Show>
    </div>
    <p class="meta">{() => c.summary()}</p>
    <Show when={c.organization()?.approved_scopes.length}>
      <p class="meta">
        {() => `${c.labels().approved} `}
        <For each={c.organization()?.approved_scopes ?? []}>{(scope) => <code>{scope}</code>}</For>
      </p>
    </Show>
    <Show
      when={c.organization()?.suspended}
      fallback={
        <div class="row">
          <Input
            value={() => c.reason()}
            aria-label={() => c.labels().reason}
            placeholder={() => c.labels().reason}
            onInput={(event: Event) => c.editReason((event.target as HTMLInputElement).value)}
          />
          <Button variant="outline" tone="danger" disabled={!c.canSuspend()} onPress={() => void c.suspend()}>
            {() => c.labels().suspend}
          </Button>
        </div>
      }
    >
      <p class="meta">{() => c.organization()?.suspended_reason ?? ''}</p>
      <div>
        <Button variant="outline" tone="neutral" disabled={c.busy()} onPress={() => void c.restore()}>
          {() => c.labels().restore}
        </Button>
      </div>
    </Show>
    <Show when={c.error()}>
      <p class="alert" role="alert">
        {() => c.error()}
      </p>
    </Show>
  </section>
);

export const OrganizationCardView = viewToken<OrganizationCardLogic>('OrganizationCardView', organizationCardView);
