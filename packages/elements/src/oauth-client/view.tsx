/** The default look: a card, the title and Rotate, the ID row, the secrets table, the redirect list. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { OAuthClientLogic } from './logic.js';

export const oauthClientView = (c: OAuthClientLogic) => (
  <section part="oauth-client" class="card" aria-labelledby="idp-oauth-client-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      h3 { margin: 0; font-size: 14px; font-weight: 600; }
      .id { display: grid; grid-template-columns: 140px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); }
      .label { color: var(--idp-muted); }
      code { font-size: 13px; overflow-wrap: anywhere; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.6fr) 1fr 1fr 1fr 90px; gap: 12px; padding: 10px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; }
      .rows > :deep(idp-secret-row) { display: block; }
      .block { display: grid; gap: 8px; padding: 14px 20px 18px; border-top: 1px solid var(--idp-border); }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
      li code { font-size: 12.5px; color: var(--idp-muted); }
      .redirect-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .redirect-head :deep(a) { color: var(--idp-accent-ink); font-size: 13px; font-weight: 500; text-decoration: none; }
      .muted { margin: 0; color: var(--idp-muted); font-size: 12.5px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 760px) { .columns { display: none; } .id { grid-template-columns: minmax(0, 1fr) auto; } .label { grid-column: 1 / -1; } }
    `}</style>
    <div class="head">
      <h2 id="idp-oauth-client-title">{() => c.labels().title}</h2>
      <Show when={c.canManage() && c.confidential()}>
        <Button variant="solid" size="sm" disabled={c.busy() === 'rotate'} onPress={() => void c.rotate()}>
          {() => c.labels().rotate}
        </Button>
      </Show>
    </div>
    <div class="id">
      <span class="label">{() => c.labels().clientId}</span>
      <code>{() => c.clientId()}</code>
      <Button variant="outline" tone="neutral" size="sm" onPress={c.copy}>
        {() => c.copyLabel()}
      </Button>
    </div>
    <Show when={c.fresh()}>
      <div class="block">
        <idp-one-time-value value={c.fresh()} note={c.labels().secretOnce} copyLabel={c.labels().copy} copiedLabel={c.labels().copied} />
      </div>
    </Show>
    <Show when={c.confidential()} fallback={<div class="block"><p class="muted">{() => c.labels().publicClient}</p></div>}>
      <div role="table" aria-label={() => c.labels().secret}>
        <div class="columns" role="row">
          <span role="columnheader">{() => c.labels().secret}</span>
          <span role="columnheader">{() => c.labels().created}</span>
          <span role="columnheader">{() => c.labels().lastUsed}</span>
          <span role="columnheader">{() => c.labels().expires}</span>
          <span role="columnheader" />
        </div>
        <div class="rows">
          <Show when={c.secrets().length} fallback={<div class="block"><p class="muted">{() => c.labels().noSecret}</p></div>}>
            <For each={c.secrets()} by={(secret) => secret.id}>
              {(secret) => (
                <idp-secret-row
                  prefix={secret().prefix}
                  created={c.date(secret().created_at)}
                  lastUsed={c.date(secret().last_used_at)}
                  expires={c.date(secret().expires_at)}
                  revokeLabel={c.labels().revoke}
                  canRevoke={c.canManage() && c.secrets().length > 1}
                  busy={c.busy() === secret().id}
                  onRevoke={() => void c.revoke(secret().id)}
                />
              )}
            </For>
          </Show>
        </div>
      </div>
    </Show>
    <div class="block">
      <div class="redirect-head">
        <h3>{() => c.labels().redirects}</h3>
        <Show when={c.redirectsHref()}>
          <Link href={c.redirectsHref()}>{() => c.labels().manageRedirects}</Link>
        </Show>
      </div>
      <Show when={c.redirects().length} fallback={<p class="muted">{() => c.labels().noRedirects}</p>}>
        <ul>
          <For each={c.redirects()}>{(uri) => <li><code>{uri}</code></li>}</For>
        </ul>
      </Show>
      <Show when={c.confidential()}>
        <p class="muted">{() => c.labels().rotationNote}</p>
      </Show>
      <Show when={c.error()}>
        <p class="alert" role="alert">
          {() => c.error()}
        </p>
      </Show>
    </div>
  </section>
);

export const OAuthClientView = viewToken<OAuthClientLogic>('OAuthClientView', oauthClientView);
