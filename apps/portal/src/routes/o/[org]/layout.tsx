/**
 * The workspace shell around every page of an organization: the sidebar, the top bar, and the
 * page. The organization comes from the address, so a page can be shared and reloaded as is.
 */
import { cache, useLocation, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import type { SidebarContext, SidebarGroup } from '@idp/elements/sidebar/logic';
import { markOf, useBrand } from '@idp/shell/brand';
import { icons } from '@idp/shell/icons';
import { usePreferences } from '@idp/shell/preferences';
import { Shell, type Crumb } from '@idp/shell/shell';
import { locale, setLocale, t } from '../../../lib/i18n.js';
import { shellLabels, sidebarLabels } from '../../../lib/labels.js';
import type { Workspace } from '../../../lib/types.js';
import { paramOf } from '../../../lib/params.js';
import { appPath } from '../../../lib/paths.js';
import { loadWorkspace } from '../../../server/developer.js';

export const workspace = cache((organization: string) => loadWorkspace(organization), 'workspace');
export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function WorkspaceLayout() {
  const data = useRouteData<Workspace>();
  const brand = useBrand();
  const location = useLocation();
  const { switchLanguage, sidebarFolded: collapsed } = usePreferences('portal', { locale, setLocale });

  const organization = () => data()?.current?.organization ?? null;
  const base = () => `/o/${organization()?.id ?? ''}`;
  // Inside an app, the sidebar is the app's: its sections, and the way back to all apps.
  const app = () => {
    const id = location.pathname.slice(base().length).match(/^\/apps\/([^/]+)/)?.[1];
    return id ? (data()?.current?.apps.find((entry) => entry.client_id === decodeURIComponent(id)) ?? null) : null;
  };
  const context = (): SidebarContext => {
    const current = app();
    if (!current) return { name: organization()?.name ?? '', detail: t('shell.organization'), mark: markOf(organization()?.name) };
    return {
      name: current.name,
      detail: t(current.environment === 'live' ? 'apps.production' : 'apps.sandbox'),
      mark: markOf(current.name),
      back: { label: t('appws.allApps'), href: base() },
    };
  };
  const groups = (): SidebarGroup[] => {
    const here = location.pathname;
    const item = (label: string, href: string, icon: string) => ({ label, href, icon, current: here === href });
    const current = app();
    if (current) {
      const section = (name = '') => appPath(organization()?.id ?? '', current.client_id, name);
      return [
        { label: '', items: [item(t('appws.overview'), section(), icons.overview)] },
        { label: t('appws.configure'), items: [item(t('appws.basicInfo'), section('settings'), icons.sliders)] },
        {
          label: t('appws.apisAccess'),
          items: [
            item(t('appws.permissions'), section('permissions'), icons.lock),
            item(t('appws.credentials'), section('credentials'), icons.key),
          ],
        },
        { label: t('appws.ship'), items: [item(t('appws.review'), section('review'), icons.shield)] },
      ];
    }
    return [
      {
        label: t('shell.build'),
        items: [item(t('shell.home'), base(), icons.home), item(t('shell.products'), `${base()}/products`, icons.box)],
      },
      {
        label: t('shell.operate'),
        items: [item(t('shell.team'), `${base()}/team`, icons.users), item(t('shell.settings'), `${base()}/settings`, icons.sliders)],
      },
    ];
  };

  const crumbs = (): Crumb[] => {
    const current = app();
    if (!current) return [{ label: organization()?.name ?? '' }];
    return [{ label: organization()?.name ?? '', href: base() }, { label: current.name }];
  };

  // Creating an app is a focused flow: the page alone, with a way out.
  const focused = () => location.pathname === `${base()}/apps/new`;

  return (
    <Show when={organization()} fallback={<NotFound />}>
      <Show when={!focused()} fallback={<Focused brand={brand().name ?? ''} close={base()} />}>
      <Shell
        brand={{ name: brand().name ?? '', href: base() }}
        context={context()}
        groups={groups()}
        sidebarLabels={sidebarLabels()}
        collapsed={collapsed()}
        onToggle={(folded) => collapsed.set(folded)}
        crumbs={crumbs()}
        user={data()?.me ?? null}
        signOutHref="/auth/logout"
        onLanguage={switchLanguage}
        labels={shellLabels()}
      >
        <Outlet />
      </Shell>
      </Show>
    </Show>
  );
}

function Focused(props: { brand: string; close: string }) {
  return (
    <div class="focused">
      <style scoped>{`
        .focused { min-height: 100vh; display: flex; flex-direction: column; }
        header { display: flex; align-items: center; gap: 12px; padding: 12px 28px; border-bottom: 1px solid var(--dp-border); background: var(--dp-surface); }
        .mark { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: var(--dp-accent); color: var(--dp-accent-fg); font-weight: 700; font-size: 14px; }
        .title { flex: 1; font-weight: 600; }
        header :deep(a) { color: var(--dp-muted); text-decoration: none; font-size: 13.5px; }
        main { width: 100%; max-width: 1040px; box-sizing: border-box; margin: 0 auto; padding: 32px 28px 56px; }
      `}</style>
      <header>
        <span class="mark" aria-hidden="true">{() => markOf(props.brand)}</span>
        <span class="title">{() => t('shell.newApp')}</span>
        <Link href={props.close}>{() => t('shell.close')}</Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <main class="missing">
      <style scoped>{`
        .missing { max-width: 640px; margin: 0 auto; padding: 72px 24px; display: grid; gap: 12px; }
        h1 { margin: 0; font-size: 26px; }
        p { margin: 0; color: var(--dp-muted); }
      `}</style>
      <h1>{() => t('workspace.notFound')}</h1>
      <p>{() => t('workspace.notFoundText')}</p>
      <Link href="/">{() => t('workspace.backHome')}</Link>
    </main>
  );
}
