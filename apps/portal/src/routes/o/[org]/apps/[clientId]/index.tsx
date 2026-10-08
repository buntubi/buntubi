/** An app's overview: its way to live, what it still needs, and the access it has. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/launch-path';
import { appPath, appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText, t } from '../../../../../lib/i18n.js';
import { launchPathLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function AppOverviewPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  const overview = () => data()?.app.overview ?? null;
  const section = (name: string) => appPath(app()?.organization_id ?? '', app()?.client_id ?? '', name);
  const links = () => ({
    basic_info: section('settings'),
    policies: section('settings'),
    redirect_uri: section('credentials'),
    products: section('permissions'),
    permissions: section('permissions'),
    support_email: `/o/${app()?.organization_id ?? ''}/settings`,
  });
  const access = () => {
    const scopes = overview()?.scopes;
    return [
      { label: t('appws.scopesLive'), scopes: scopes?.live ?? [] },
      { label: t('appws.scopesWaiting'), scopes: scopes?.waiting ?? [] },
      { label: t('appws.scopesSandbox'), scopes: scopes?.sandbox ?? [] },
    ];
  };
  return (
    <div class="stack">
      <style scoped>{`
        .card { border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); box-shadow: var(--dp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
        .notice { border-color: color-mix(in srgb, var(--dp-warn) 40%, transparent); background: color-mix(in srgb, var(--dp-warn) 8%, var(--dp-surface)); }
        .notice p { margin: 0; font-size: 13.5px; }
        .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .head :deep(a) { font-size: 13px; font-weight: 500; color: var(--dp-accent-ink); text-decoration: none; }
        h2 { margin: 0; font-size: 15px; font-weight: 600; }
        dl { margin: 0; display: grid; gap: 10px; }
        .row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: baseline; font-size: 13.5px; }
        dt { color: var(--dp-muted); }
        dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
        code { font-family: var(--dp-mono); font-size: 12px; padding: 2px 7px; border-radius: 6px; background: var(--dp-surface-2); border: 1px solid var(--dp-border); }
        .muted { color: var(--dp-muted); }
        @media (max-width: 640px) { .row { grid-template-columns: 1fr; gap: 4px; } }
      `}</style>
      <Show when={app()?.review_note}>
        <section class="card notice" role="note">
          <strong>{() => t('appws.feedback')}</strong>
          <p>{() => app()?.review_note ?? ''}</p>
        </section>
      </Show>
      <dp-launch-path
        clientId={app()?.client_id ?? ''}
        overview={overview()}
        links={links()}
        canPublish={can(data()?.app.role, 'publish')}
        reviewHref={section('review')}
        labels={launchPathLabels()}
        describe={errorText}
      />
      <section class="card" aria-labelledby="app-access">
        <div class="head">
          <h2 id="app-access">{() => t('appws.access')}</h2>
          <Link href={section('permissions')}>{() => t('appws.manage')}</Link>
        </div>
        <dl>
          <For each={access()}>
            {(row) => (
              <div class="row">
                <dt>{row.label}</dt>
                <dd>
                  <Show when={row.scopes.length} fallback={<span class="muted">{t('appws.none')}</span>}>
                    <For each={row.scopes}>{(scope) => <code>{scope}</code>}</For>
                  </Show>
                </dd>
              </div>
            )}
          </For>
        </dl>
      </section>
    </div>
  );
}
