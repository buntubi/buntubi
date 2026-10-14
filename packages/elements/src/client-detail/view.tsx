/** The default look: facts, sign-in, then what the console decides (first-party, access), and the way to the portal. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Switch } from '@fluixi-ui/switch';
import { viewToken } from '../view.js';
import type { ClientDetailLogic } from './logic.js';

export const clientDetailView = (d: ClientDetailLogic) => (
  <div part="detail" class="detail">
    <style scoped>{`
      .detail { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; }
      .column { display: grid; gap: 16px; min-width: 0; }
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; min-width: 0; }
      h2 { margin: 0; font-size: 14px; font-weight: 600; }
      dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 10px 20px; font-size: 13.5px; }
      dt { color: var(--idp-muted); }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .mono { font-family: var(--idp-font-mono, ui-monospace, monospace); font-size: 12.5px; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      .state { display: inline-flex; align-items: center; gap: 6px; color: var(--idp-ok); }
      .state[data-tone='muted'] { color: var(--idp-muted); }
      .state::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { padding: 2px 8px; border-radius: 6px; background: var(--idp-surface-2); font-family: var(--idp-font-mono, ui-monospace, monospace); font-size: 12px; }
      .muted { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .setting { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
      .portal { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; color: var(--idp-accent-ink); text-decoration: none; }
      .portal:hover { text-decoration: underline; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 900px) { .detail { grid-template-columns: minmax(0, 1fr); } }
    `}</style>
    <div class="column">
      <section class="card">
        <h2>{() => d.labels().overview}</h2>
        <dl>
          <dt>{() => d.labels().organization}</dt>
          <dd>
            <Show when={d.client()?.platform} fallback={<span>{() => d.client()?.organization ?? ''}</span>}>
              <span class="tag">{() => d.labels().platform}</span>
            </Show>
          </dd>
          <dt>{() => d.labels().environment}</dt>
          <dd>
            <span class="state" data-tone={() => (d.client()?.environment === 'live' ? undefined : 'muted')}>
              {() => (d.client()?.environment === 'live' ? d.labels().live : d.labels().sandbox)}
            </span>
          </dd>
          <dt>{() => d.labels().review}</dt>
          <dd>{() => d.labels().reviews[d.client()?.review_status ?? 'none'] ?? d.client()?.review_status ?? ''}</dd>
          <dt>{() => d.labels().type}</dt>
          <dd>{() => (d.client()?.client_type === 'public' ? d.labels().public : d.labels().confidential)}</dd>
          <dt>{() => d.labels().clientId}</dt>
          <dd class="mono">{() => d.client()?.client_id ?? ''}</dd>
          <dt>{() => d.labels().created}</dt>
          <dd>{() => d.created()}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>{() => d.labels().signIn}</h2>
        <dl>
          <dt>{() => d.labels().redirects}</dt>
          <dd>
            <Show when={d.client()?.redirect_uris.length} fallback={<span class="muted">{() => d.labels().noRedirects}</span>}>
              <ul>
                <For each={d.client()?.redirect_uris ?? []}>{(uri) => <li class="mono">{uri}</li>}</For>
              </ul>
            </Show>
          </dd>
          <dt>{() => d.labels().permissions}</dt>
          <dd>
            <span class="chips">
              <For each={d.scopes()}>{(scope) => <span class="chip">{scope}</span>}</For>
            </span>
          </dd>
        </dl>
        <Show when={d.portalHref()}>
          <p class="muted">{() => d.labels().portalHelp}</p>
          <a class="portal" href={d.portalHref()}>
            {() => d.labels().openInPortal}
            <span aria-hidden="true">→</span>
          </a>
        </Show>
      </section>
    </div>
    <div class="column">
      <section class="card">
        <div class="setting">
          <h2>{() => d.labels().firstParty}</h2>
          <Switch
            aria-label={d.labels().firstParty}
            checked={d.client()?.first_party ?? false}
            disabled={d.busy() || !d.client()?.platform}
            onChange={(on) => void d.setFirstParty(on)}
          />
        </div>
        <p class="muted">{() => (d.client()?.platform ? d.labels().firstPartyHelp : d.labels().notPlatform)}</p>
      </section>
      <section class="card">
        <h2>{() => d.labels().access}</h2>
        <p class="muted">{() => (d.client()?.disabled ? d.labels().disabledHelp : d.labels().enabledHelp)}</p>
        <div>
          <Button variant="outline" size="sm" tone={d.client()?.disabled ? 'neutral' : 'danger'} disabled={d.busy()} onPress={() => void d.toggleDisabled()}>
            {() => (d.client()?.disabled ? d.labels().enable : d.labels().disable)}
          </Button>
        </div>
      </section>
      <Show when={d.error()}>
        <p class="alert" role="alert">
          {() => d.error()}
        </p>
      </Show>
    </div>
  </div>
);

export const ClientDetailView = viewToken<ClientDetailLogic>('idp-client-detail', clientDetailView);
