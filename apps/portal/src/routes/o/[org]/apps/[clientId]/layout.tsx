/**
 * An app's workspace: its header (name, where it stands, its ID and kind) above the section
 * the sidebar chose. The sidebar itself is the organization layout's, switched to the app.
 */
import { useRouteData } from '@fluixi/start/router';
import { statusOf } from '@idp/elements/app-list/logic';
import { appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { t } from '../../../../../lib/i18n.js';
import { markOf } from '../../../../../lib/brand.js';

export const routeData = appRouteData;

const TONE = { live: 'ok', in_review: 'info', changes_requested: 'warn', draft: 'muted' } as const;
const STATUS = { live: 'apps.live', in_review: 'apps.inReview', changes_requested: 'apps.changes', draft: 'apps.draft' } as const;

export default function AppLayout() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  const status = () => (app() ? statusOf(app()!) : 'draft');
  return (
    <Show when={app()} fallback={<AppNotFound organization={data()?.workspace.current?.organization.id ?? ''} />}>
      <div class="stack">
        <style scoped>{`
          .app-head { display: flex; align-items: center; gap: 14px; }
          .app-mark { flex: none; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; font-weight: 700; background: var(--dp-accent-soft); color: var(--dp-accent-ink); }
          .app-title { display: grid; gap: 4px; min-width: 0; }
          .app-name { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
          h1 { margin: 0; font-size: 24px; font-weight: 650; letter-spacing: -0.01em; }
          .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
          .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
          .pill[data-tone='ok'] { --tone: var(--dp-ok); }
          .pill[data-tone='info'] { --tone: var(--dp-info); }
          .pill[data-tone='warn'] { --tone: var(--dp-warn); }
          .pill[data-tone='muted'] { --tone: var(--dp-muted); }
          .app-meta { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; color: var(--dp-muted); font-size: 13px; }
          code { font-family: var(--dp-mono); font-size: 12px; color: var(--dp-text); }
        `}</style>
        <header class="app-head">
          <span class="app-mark">{() => markOf(app()?.name)}</span>
          <div class="app-title">
            <div class="app-name">
              <h1>{() => app()?.name ?? ''}</h1>
              <span class="pill" data-tone={() => TONE[status()]}>
                {() => t(STATUS[status()])}
              </span>
            </div>
            <p class="app-meta">
              <span>
                {() => t('appws.appId')} <code>{() => app()?.client_id ?? ''}</code>
              </span>
              <span>{() => t(`appws.kind.${app()?.kind ?? 'web'}`)}</span>
              <span>{() => t(app()?.environment === 'live' ? 'apps.production' : 'apps.sandbox')}</span>
            </p>
          </div>
        </header>
        <Outlet />
      </div>
    </Show>
  );
}

function AppNotFound(props: { organization: string }) {
  return (
    <div class="stack">
      <style scoped>{`
        h1 { margin: 0; font-size: 24px; }
        p { margin: 0; color: var(--dp-muted); }
      `}</style>
      <h1>{() => t('appws.notFound')}</h1>
      <p>{() => t('appws.notFoundText')}</p>
      <Link href={`/o/${props.organization}`}>{() => t('appws.allApps')}</Link>
    </div>
  );
}
