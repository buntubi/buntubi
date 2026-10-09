/** The credentials' default look: an environment switch, then one card per kind of credential. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { CredentialsLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const credentialsView = (c: CredentialsLogic) => (
  <div part="credentials" class="credentials">
    <style scoped>{`
      .credentials { display: grid; gap: 16px; }
      .bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
      .intro { margin: 0; color: var(--idp-muted); font-size: 13.5px; max-width: 62ch; }
      .switch { display: flex; gap: 2px; padding: 3px; border-radius: 9px; background: var(--idp-surface-2); }
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 14px; }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .field { display: grid; gap: 6px; }
      .caption { font-size: 12px; color: var(--idp-muted); font-weight: 500; }
      .copyable { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      code { font-family: var(--idp-mono); font-size: 12.5px; padding: 5px 8px; border-radius: var(--idp-radius-sm); background: var(--idp-surface-2); border: 1px solid var(--idp-border); overflow-wrap: anywhere; }
      .scroll { overflow-x: auto; }
      table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px 10px; color: var(--idp-muted); font-weight: 500; font-size: 12px; border-bottom: 1px solid var(--idp-border); }
      td { padding: 9px 10px; border-bottom: 1px solid var(--idp-border); }
      tr[data-active='false'] td { color: var(--idp-muted); }
      .end { text-align: right; }
      .once { display: grid; gap: 6px; padding: 12px 14px; border-radius: var(--idp-radius-sm); background: color-mix(in srgb, var(--idp-warn) 10%, transparent); border: 1px solid color-mix(in srgb, var(--idp-warn) 35%, transparent); font-size: 13px; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
      li.uri, li.key { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
      .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
      .key-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; gap: 8px; align-items: end; }
      .actions { display: flex; gap: 8px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 720px) { .key-form, .row { grid-template-columns: 1fr; } }
    `}</style>
    <div class="bar">
      <p class="intro">{() => c.labels().intro[c.environment()]}</p>
      <div class="switch" role="group" aria-label={() => c.labels().title} part="environments">
        <For each={c.environments()}>
          {(env) => (
            <Button
              variant={env.current ? 'outline' : 'ghost'}
              tone="neutral"
              size="sm"
              aria-pressed={env.current ? 'true' : 'false'}
              onPress={env.choose}
            >
              {c.labels().environments[env.value]}
            </Button>
          )}
        </For>
      </div>
    </div>

    <Show when={c.fresh()}>
      <div class="once" role="status" part="once">
        <strong>{() => c.fresh()?.note ?? ''}</strong>
        <code>{() => c.fresh()?.value ?? ''}</code>
      </div>
    </Show>
    <Show when={c.error()}>
      <p class="alert" role="alert">
        {() => c.error()}
      </p>
    </Show>

    <section class="card" part="client" aria-labelledby="idp-cred-client">
      <div class="head">
        <h2 id="idp-cred-client">{() => c.labels().client}</h2>
        <Show when={c.confidential() && c.canManage()}>
          <Button variant="outline" tone="neutral" size="sm" disabled={c.busy() === 'rotate'} onPress={c.rotate}>
            {() => c.labels().rotate}
          </Button>
        </Show>
      </div>
      <div class="field">
        <span class="caption">{() => c.labels().clientId}</span>
        <div class="copyable">
          <code>{() => c.clientId()}</code>
          <Button variant="ghost" tone="neutral" size="sm" onPress={c.copy}>
            {() => (c.copied() ? c.labels().copied : c.labels().copy)}
          </Button>
        </div>
      </div>
      <Show when={c.confidential()} fallback={<p class="hint">{() => c.labels().publicClient}</p>}>
        <Show when={c.secrets().length} fallback={<p class="hint">{() => c.labels().noSecret}</p>}>
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>{() => c.labels().secret}</th>
                  <th>{() => c.labels().created}</th>
                  <th>{() => c.labels().lastUsed}</th>
                  <th>{() => c.labels().expires}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={c.secrets()}>
                  {(secret) => (
                    <tr data-active={secret.active ? 'true' : 'false'}>
                      <td>
                        <code>{`${secret.prefix}…`}</code>
                      </td>
                      <td>{c.date(secret.created_at)}</td>
                      <td>{c.date(secret.last_used_at)}</td>
                      <td>{secret.expires_at ? c.date(secret.expires_at) : ''}</td>
                      <td class="end">
                        <Show when={secret.active && c.canManage()} fallback={secret.active ? '' : c.labels().revoked}>
                          <Button variant="ghost" tone="neutral" size="sm" disabled={c.busy() === secret.id} onPress={() => c.revokeSecret(secret.id)}>
                            {() => c.labels().revoke}
                          </Button>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
        <p class="hint">{() => c.labels().rotationNote}</p>
      </Show>
    </section>

    <section class="card" part="redirects" aria-labelledby="idp-cred-redirects">
      <div class="head">
        <h2 id="idp-cred-redirects">{() => c.labels().redirects}</h2>
      </div>
      <p class="hint">{() => c.labels().redirectsHint}</p>
      <ul>
        <For each={c.redirects()}>
          {(uri) => (
            <li class="uri">
              <code>{uri}</code>
              <Show when={c.canManage()}>
                <Button variant="ghost" tone="neutral" size="sm" onPress={() => c.removeRedirect(uri)}>
                  {() => c.labels().remove}
                </Button>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Show when={c.canManage()}>
        <div class="row">
          <Input
            type="url"
            value={() => c.redirectDraft()}
            placeholder="https://example.com/auth/callback"
            aria-label={() => c.labels().redirects}
            onInput={(event: Event) => c.editRedirect(valueOf(event))}
          />
          <Button variant="outline" tone="neutral" onPress={c.addRedirect}>
            {() => c.labels().addRedirect}
          </Button>
        </div>
        <Show when={c.redirectsChanged()}>
          <div class="actions">
            <Button variant="solid" disabled={c.busy() === 'redirects'} onPress={c.saveRedirects}>
              {() => c.labels().save}
            </Button>
          </div>
        </Show>
      </Show>
    </section>

    <section class="card" part="keys" aria-labelledby="idp-cred-keys">
      <div class="head">
        <h2 id="idp-cred-keys">{() => c.labels().keys}</h2>
      </div>
      <p class="hint">{() => c.labels().keysHint}</p>
      <Show when={c.keys().length} fallback={<p class="hint">{() => c.labels().noKeys}</p>}>
        <ul>
          <For each={c.keys()}>
            {(key) => (
              <li class="key">
                <span>
                  {key.name} <code>{`${key.prefix}…`}</code>
                  <span class="meta">
                    {' '}
                    {key.scopes.join(' ')} · {c.labels().lastUsed} {c.date(key.last_used_at)}
                  </span>
                </span>
                <Show when={key.active && c.canManage()} fallback={key.active ? '' : c.labels().revoked}>
                  <Button variant="ghost" tone="neutral" size="sm" disabled={c.busy() === key.id} onPress={() => c.revokeKey(key.id)}>
                    {() => c.labels().revoke}
                  </Button>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={c.canManage()}>
        <div class="key-form">
          <label class="field">
            <span class="caption">{() => c.labels().keyName}</span>
            <Input value={() => c.keyName()} onInput={(event: Event) => c.editKey('name', valueOf(event))} />
          </label>
          <label class="field">
            <span class="caption">{() => c.labels().keyScopes}</span>
            <Input value={() => c.keyScopes()} onInput={(event: Event) => c.editKey('scopes', valueOf(event))} />
          </label>
          <Button variant="outline" tone="neutral" disabled={!c.keyName().trim() || c.busy() === 'key'} onPress={c.createKey}>
            {() => c.labels().createKey}
          </Button>
        </div>
      </Show>
    </section>

    <section class="card" part="signing" aria-labelledby="idp-cred-signing">
      <h2 id="idp-cred-signing">{() => c.labels().signing}</h2>
      <p class="hint">{() => c.labels().signingText}</p>
      <code>{() => `GET ${c.jwksUrl()}`}</code>
    </section>
  </div>
);

export const CredentialsView = viewToken<CredentialsLogic>('CredentialsView', credentialsView);
