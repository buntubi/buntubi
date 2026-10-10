/** The default look: a table row; the organization, owner, counts, scopes, status, then the action. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { OrganizationRowLogic } from './logic.js';

export const organizationRowView = (r: OrganizationRowLogic) => (
  <div part="organization" class="organization" role="row" data-suspended={() => (r.organization()?.suspended ? '' : undefined)}>
    <style scoped>{`
      .organization { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.2fr) 84px 100px minmax(0, 1.2fr) 110px 110px; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .who { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .mark { flex: none; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: var(--idp-accent-ink); background: var(--idp-accent-soft); }
      .name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
      .tag { flex: none; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      /* Link is a component: its <a> carries no scope, so :deep. */
      .number > :deep(a) { color: inherit; text-decoration: underline; text-decoration-color: var(--idp-border-2); text-underline-offset: 3px; }
      .number > :deep(a:hover) { color: var(--idp-accent-ink); }
      .muted { color: var(--idp-muted); overflow: hidden; text-overflow: ellipsis; }
      .number { font-variant-numeric: tabular-nums; }
      .scopes { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
      code { font-family: var(--idp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); }
      .state { display: grid; gap: 2px; }
      .dot { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--idp-ok); }
      .organization[data-suspended] .dot { color: var(--idp-bad); }
      .dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .why { color: var(--idp-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
      .action { display: flex; justify-content: flex-end; }
      .editor { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: start; padding: 12px; border-radius: 10px; background: var(--idp-surface-2); }
      .alert { grid-column: 1 / -1; margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 960px) { .organization { grid-template-columns: minmax(0, 1fr) auto; } .organization > [role='cell']:not(.who):not(.action) { grid-column: 1; } .action { grid-row: 1; grid-column: 2; } .editor { grid-template-columns: 1fr; } }
    `}</style>
    <span role="cell" class="who">
      <span class="mark" aria-hidden="true">{() => r.initials()}</span>
      <span class="name">{() => r.organization()?.name ?? ''}</span>
      <Show when={r.organization()?.platform}>
        <span class="tag" title={() => r.labels().platformHelp}>{() => r.labels().platform}</span>
      </Show>
    </span>
    <span role="cell" class="muted">{() => r.organization()?.owner?.email ?? ''}</span>
    <span role="cell" class="number">{() => r.organization()?.members ?? 0}</span>
    <span role="cell" class="number">
      <Link class="count" href={r.appsHref()}>{() => r.organization()?.apps ?? 0}</Link>
    </span>
    <span role="cell" class="scopes" aria-label={() => r.labels().approved}>
      <Show when={r.organization()?.approved_scopes.length} fallback={<span class="muted">{() => r.labels().none}</span>}>
        <For each={r.organization()?.approved_scopes ?? []}>{(scope) => <code>{scope}</code>}</For>
      </Show>
    </span>
    <span role="cell" class="state">
      <span class="dot">{() => (r.organization()?.suspended ? r.labels().suspended : r.labels().active)}</span>
      <Show when={r.organization()?.suspended && r.organization()?.suspended_reason}>
        <span class="why" title={() => r.organization()?.suspended_reason ?? ''}>
          {() => r.organization()?.suspended_reason ?? ''}
        </span>
      </Show>
    </span>
    <span role="cell" class="action">
      <Show when={!r.organization()?.platform}>
      <Show
        when={r.organization()?.suspended}
        fallback={
          <Show when={!r.suspending()}>
            <Button variant="ghost" tone="danger" size="sm" onPress={() => r.openSuspend(true)}>
              {() => r.labels().suspend}
            </Button>
          </Show>
        }
      >
        <Button variant="ghost" tone="neutral" size="sm" disabled={r.busy()} onPress={() => void r.restore()}>
          {() => r.labels().restore}
        </Button>
      </Show>
      </Show>
    </span>
    <Show when={r.suspending() && !r.organization()?.suspended}>
      <Form form={r.form} onSubmit={(values) => r.suspend(values)} novalidate>
        <div class="editor">
          <FormField control={r.form.get('reason')}>
            {(b) => (
              <Input
                name="reason"
                aria-label={r.labels().reason}
                placeholder={r.labels().reason}
                value={b.value()}
                onInput={b.onInput}
                onBlur={b.onBlur}
              />
            )}
          </FormField>
          <Button type="submit" variant="solid" tone="danger" size="sm" disabled={r.busy()}>
            {() => r.labels().confirm}
          </Button>
          <Button variant="ghost" tone="neutral" size="sm" onPress={() => r.openSuspend(false)}>
            {() => r.labels().cancel}
          </Button>
        </div>
      </Form>
    </Show>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </div>
);

export const OrganizationRowView = viewToken<OrganizationRowLogic>('OrganizationRowView', organizationRowView);
