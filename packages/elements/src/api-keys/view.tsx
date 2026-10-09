/** The default look: a card, the title and Create key, the form when asked for, one row per key. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { ApiKeysLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const apiKeysView = (k: ApiKeysLogic) => (
  <section part="api-keys" class="card" aria-labelledby="idp-api-keys-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px; display: grid; gap: 14px; align-content: start; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      p { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .list { display: grid; gap: 8px; }
      .list > :deep(idp-key-row) { display: block; }
      form { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--idp-border); border-radius: 10px; }
      label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .actions { display: flex; gap: 8px; }
      .alert { color: var(--idp-bad); }
    `}</style>
    <div class="head">
      <h2 id="idp-api-keys-title">{() => k.labels().title}</h2>
      <Show when={k.canManage() && !k.creating()}>
        <Button variant="outline" tone="neutral" size="sm" onPress={k.open}>
          {() => k.labels().create}
        </Button>
      </Show>
    </div>
    <p>{() => k.labels().intro}</p>
    <Show when={k.fresh()}>
      <idp-one-time-value value={k.fresh()} note={k.labels().keyOnce} copyLabel={k.labels().copy} copiedLabel={k.labels().copied} />
    </Show>
    <Show when={k.creating()}>
      <form
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          if (k.name().trim()) void k.create();
        }}
      >
        <label>
          {() => k.labels().name}
          <Input value={() => k.name()} onInput={(event: Event) => k.edit('name', valueOf(event))} />
        </label>
        <label>
          {() => k.labels().scopes}
          <Input value={() => k.scopes()} onInput={(event: Event) => k.edit('scopes', valueOf(event))} />
        </label>
        <div class="actions">
          <Button type="submit" variant="solid" size="sm" disabled={!k.name().trim() || k.busy() === 'create'}>
            {() => k.labels().create}
          </Button>
          <Button variant="ghost" tone="neutral" size="sm" onPress={k.close}>
            {() => k.labels().cancel}
          </Button>
        </div>
      </form>
    </Show>
    <Show when={k.keys().length} fallback={<p>{() => k.labels().empty}</p>}>
      <div class="list">
        <For each={k.keys()} by={(key) => key.id}>
          {(key) => (
            <idp-key-row
              name={key().name}
              meta={k.meta(key())}
              prefix={key().prefix}
              revokeLabel={k.labels().revoke}
              canRevoke={k.canManage()}
              busy={k.busy() === key().id}
              onRevoke={() => void k.revoke(key().id)}
            />
          )}
        </For>
      </div>
    </Show>
    <Show when={k.error()}>
      <p class="alert" role="alert">
        {() => k.error()}
      </p>
    </Show>
  </section>
);

export const ApiKeysView = viewToken<ApiKeysLogic>('ApiKeysView', apiKeysView);
