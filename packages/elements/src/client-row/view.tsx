/** The default look: a table row; the app, its organization, where it runs, first-party. */
import { Show } from '@fluixi/core';
import { Link } from '../link.js';
import { Switch } from '@fluixi-ui/switch';
import { viewToken } from '../view.js';
import type { ClientRowLogic } from './logic.js';

export const clientRowView = (r: ClientRowLogic) => (
  <div part="client" class="client" role="row" data-disabled={() => (r.client()?.disabled ? '' : undefined)}>
    <style scoped>{`
      .client { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) 110px 110px; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .client[data-disabled] .app { opacity: 0.55; }
      .app { display: grid; min-width: 0; }
      /* Link is a component: its <a> carries no scope, so :deep. */
      .app > :deep(a) { font-weight: 500; color: inherit; text-decoration: none; justify-self: start; }
      .app > :deep(a:hover) { color: var(--idp-accent-ink); text-decoration: underline; }
      .id { color: var(--idp-muted); font-family: var(--idp-font-mono, ui-monospace, monospace); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .organization { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      .state { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--idp-ok); }
      .state[data-tone='muted'] { color: var(--idp-muted); }
      .state[data-tone='bad'] { color: var(--idp-bad); }
      .state::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .first { display: flex; justify-content: flex-end; }
      .alert { grid-column: 1 / -1; margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 860px) { .client { grid-template-columns: minmax(0, 1fr) auto; } .organization, .environment { grid-column: 1; } .first { grid-row: 1; grid-column: 2; } }
    `}</style>
    <span role="cell" class="app">
      <Link class="name" href={r.href()}>{() => r.client()?.name ?? ''}</Link>
      <span class="id">{() => r.client()?.client_id ?? ''}</span>
    </span>
    <span role="cell" class="organization">
      <Show when={r.client()?.platform} fallback={<span>{() => r.client()?.organization ?? ''}</span>}>
        <span class="tag">{() => r.labels().platform}</span>
      </Show>
    </span>
    <span role="cell" class="environment">
      <span
        class="state"
        data-tone={() => (r.client()?.disabled ? 'bad' : r.client()?.environment === 'live' ? undefined : 'muted')}
      >
        {() => (r.client()?.disabled ? r.labels().disabled : r.client()?.environment === 'live' ? r.labels().live : r.labels().sandbox)}
      </span>
    </span>
    <span role="cell" class="first">
      <Switch
        aria-label={r.labels().firstParty}
        title={r.client()?.platform ? r.labels().firstParty : r.labels().notPlatform}
        checked={r.client()?.first_party ?? false}
        disabled={r.busy() || !r.client()?.platform}
        onChange={(on) => void r.setFirstParty(on)}
      />
    </span>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </div>
);

export const ClientRowView = viewToken<ClientRowLogic>('idp-client-row', clientRowView);
