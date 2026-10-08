/**
 * The workspace shell around every page of an organization: the sidebar, the top bar, and the
 * page. The organization comes from the address, so a page can be shared and reloaded as is.
 */
import { cache, useLocation, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { useColorScheme } from '@fluixi/core';
import '@idp/elements/sidebar';
import type { SidebarContext, SidebarGroup } from '@idp/elements/sidebar/logic';
import { markOf, useBrand } from '../../../lib/brand.js';
import { t } from '../../../lib/i18n.js';
import { icons } from '../../../lib/icons.js';
import { sidebarLabels } from '../../../lib/labels.js';
import { usePreferences } from '../../../lib/preferences.js';
import type { Workspace } from '../../../lib/types.js';
import { paramOf } from '../../../lib/params.js';
import { appPath } from '../../../lib/paths.js';
import { loadWorkspace } from '../../../server/developer.js';

export const workspace = cache((organization: string) => loadWorkspace(organization), 'workspace');
export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

const SCHEMES = ['light', 'dark', 'system'] as const;

export default function WorkspaceLayout() {
  const data = useRouteData<Workspace>();
  const brand = useBrand();
  const location = useLocation();
  const scheme = useColorScheme();
  const { switchLanguage, sidebarFolded: collapsed } = usePreferences();

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
      ];
    }
    return [
      { label: t('shell.build'), items: [item(t('shell.home'), base(), icons.home)] },
      {
        label: t('shell.operate'),
        // The organization's settings still live on the page from before the workspace.
        items: [item(t('shell.settings'), `/organizations/${organization()?.id ?? ''}`, icons.sliders)],
      },
    ];
  };
  const nextScheme = () => SCHEMES[(SCHEMES.indexOf(scheme.value()) + 1) % SCHEMES.length]!;
  const schemeIcon = () => (scheme.value() === 'system' ? icons.monitor : scheme.value() === 'dark' ? icons.moon : icons.sun);
  const initials = () => markOf(data()?.me.name || data()?.me.email);

  return (
    <Show when={organization()} fallback={<NotFound />}>
      <div class="shell" data-collapsed={() => (collapsed() ? '' : undefined)}>
        <dp-sidebar
          class="shell-sidebar"
          brand={{ name: brand().name ?? '', mark: markOf(brand().name), href: base() }}
          context={context()}
          groups={groups()}
          collapsed={collapsed()}
          labels={sidebarLabels()}
          onToggle={(event: CustomEvent<{ collapsed: boolean }>) => collapsed.set(event.detail.collapsed)}
        />
        <div class="shell-main">
          <header class="topbar">
            <nav class="crumbs" aria-label={() => t('shell.navigation')}>
              <Show when={app()} fallback={<span>{() => organization()?.name ?? ''}</span>}>
                <Link href={base()}>{() => organization()?.name ?? ''}</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{() => app()?.name ?? ''}</span>
              </Show>
            </nav>
            <div class="topbar-actions">
              <Button
                variant="outline"
                tone="neutral"
                size="sm"
                aria-label={() => `${t('shell.theme')}: ${t(`shell.${scheme.value()}`)}`}
                title={() => t(`shell.${nextScheme()}`)}
                onPress={() => scheme.set(nextScheme())}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                  <path d={schemeIcon()} />
                </svg>
              </Button>
              <Button variant="ghost" tone="neutral" size="sm" onPress={switchLanguage}>
                {() => t('nav.language')}
              </Button>
              <a class="topbar-link" href="/auth/logout">
                {() => t('nav.signOut')}
              </a>
              <span class="avatar" title={() => data()?.me.email ?? ''}>
                {initials}
              </span>
            </div>
          </header>
          <main class="workspace">
            <Outlet />
          </main>
        </div>
      </div>
    </Show>
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
