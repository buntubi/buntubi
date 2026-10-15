/**
 * The workspace shell around every page of an organization: the sidebar, the top bar, and the
 * page. The organization comes from the address, so a page can be shared and reloaded as is.
 */
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import type { SidebarContext, SidebarGroup, SidebarSwitcher } from '@idp/elements/sidebar/logic';
import { sectionOf, sectionsOf } from '@buntubi/sdk/plugins';
import { uiPlugins } from '../../../lib/ui-plugins.js';
import { markOf, useBrand } from '@idp/shell/brand';
import { icons } from '@idp/shell/icons';
import { usePreferences } from '@idp/shell/preferences';
import { Focused } from '@idp/shell/focused';
import { Shell, type Crumb } from '@idp/shell/shell';
import '@idp/elements/not-found';
import { locale, setLocale, t } from '../../../lib/i18n.js';
import { shellLabels, sidebarLabels, workspaceNotFoundLabels } from '../../../lib/labels.js';
import type { Workspace } from '../../../lib/types.js';
import { paramOf } from '../../../lib/params.js';
import { paths, type AppSection } from '../../../lib/paths.js';
import { PageBoundary } from '../../../components/page-boundary.js';
import { workspace } from '../../../data/developer.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function WorkspaceLayout() {
  const data = useRouteData<Workspace>();
  const brand = useBrand();
  const location = useLocation();
  const { switchLanguage, sidebarFolded: collapsed, chooseOrganization, forgetOrganization } = usePreferences('portal', { locale, setLocale });
  const navigate = useNavigate();

  const organization = () => data()?.current?.organization ?? null;
  const id = () => organization()?.id ?? '';
  const base = () => paths.organization(id());
  // Inside an app, the sidebar is the app's: its sections, and the way back to all apps.
  const app = () => {
    const id = location.pathname.slice(base().length).match(/^\/apps\/([^/]+)/)?.[1];
    return id ? (data()?.current?.apps.find((entry) => entry.client_id === decodeURIComponent(id)) ?? null) : null;
  };
  // The organizations to switch to, and inside an app the organization's other apps.
  const organizations = (): SidebarSwitcher => ({
    label: t('switch.organizations'),
    items: (data()?.organizations ?? []).map((entry) => ({
      key: `organization:${entry.id}`,
      label: entry.name,
      detail: entry.role ? t(`tm.role.${entry.role}`) : '',
      mark: markOf(entry.name),
      href: paths.organization(entry.id),
      current: entry.id === id(),
    })),
    actions: [
      { key: 'organizations', label: t('org.new.back'), href: paths.organizations() },
      { key: 'create', label: t('org.create'), href: paths.newOrganization() },
    ],
  });
  const apps = (current: { client_id: string }): SidebarSwitcher => ({
    label: t('switch.apps'),
    items: (data()?.current?.apps ?? []).map((entry) => ({
      key: `app:${entry.client_id}`,
      label: entry.name,
      detail: t(entry.environment === 'live' ? 'apps.production' : 'apps.sandbox'),
      mark: markOf(entry.name),
      href: paths.app(id(), entry.client_id),
      current: entry.client_id === current.client_id,
    })),
    actions: [{ key: 'apps', label: t('appws.allApps'), href: base() }],
  });
  const context = (): SidebarContext => {
    const current = app();
    if (!current) {
      return { name: organization()?.name ?? '', detail: t('shell.organization'), mark: markOf(organization()?.name), switcher: organizations() };
    }
    return {
      name: current.name,
      detail: t(current.environment === 'live' ? 'apps.production' : 'apps.sandbox'),
      mark: markOf(current.name),
      back: { label: t('appws.allApps'), href: base() },
      switcher: apps(current),
    };
  };
  // Switching organization is choosing it: the next visit to the portal starts there.
  const switchTo = (key: string, href: string) => {
    if (key.startsWith('organization:')) chooseOrganization(key.slice('organization:'.length));
    navigate(href);
  };
  const groups = (): SidebarGroup[] => {
    const here = location.pathname;
    const item = (label: string, href: string, icon: string) => ({ label, href, icon, current: here === href });
    const current = app();
    // The deployment's own pages, from its plugins, after the portal's.
    const extensions = (place: 'organization' | 'app') => {
      const items = sectionsOf(uiPlugins, place, data()?.plugins ?? []).map(({ plugin, section }) => {
        const href =
          place === 'app' && current
            ? paths.appPlugin(id(), current.client_id, plugin, section.key)
            : paths.organizationPlugin(id(), plugin, section.key);
        return item(section.label[locale()], href, section.icon);
      });
      return items.length ? [{ label: t('shell.extensions'), items }] : [];
    };
    if (current) {
      const section = (name?: AppSection) => paths.app(id(), current.client_id, name);
      return [
        { label: '', items: [item(t('appws.overview'), section(), icons.overview)] },
        {
          label: t('appws.configure'),
          items: [item(t('appws.basicInfo'), section('settings'), icons.sliders), item(t('appws.redirects'), section('redirects'), icons.link)],
        },
        {
          label: t('appws.apisAccess'),
          items: [
            item(t('appws.permissions'), section('permissions'), icons.lock),
            item(t('appws.credentials'), section('credentials'), icons.key),
          ],
        },
        { label: t('appws.ship'), items: [item(t('appws.review'), section('review'), icons.shield)] },
        ...extensions('app'),
      ];
    }
    return [
      {
        label: t('shell.build'),
        items: [item(t('shell.home'), base(), icons.home), item(t('shell.products'), paths.organization(id(), 'products'), icons.box)],
      },
      {
        label: t('shell.operate'),
        items: [item(t('shell.team'), paths.organization(id(), 'team'), icons.users), item(t('shell.settings'), paths.organization(id(), 'settings'), icons.sliders)],
      },
      ...extensions('organization'),
    ];
  };

  // The organization and the page; inside an app, the app and its section.
  const ORG_PAGES: Record<string, string> = { '': 'shell.home', products: 'shell.products', team: 'shell.team', settings: 'shell.settings' };
  const APP_PAGES: Record<string, string> = {
    settings: 'appws.basicInfo',
    redirects: 'appws.redirects',
    permissions: 'appws.permissions',
    credentials: 'appws.credentials',
    review: 'appws.review',
  };
  const crumbs = (): Crumb[] => {
    const current = app();
    const rest = location.pathname.slice(base().length).replace(/^\//, '');
    const parts = rest.split('/').map(decodeURIComponent);
    // A plugin's page: `p/<plugin>/<key>`, after the organization or the app.
    const pluginLabel = (at: number, place: 'organization' | 'app') =>
      parts[at] === 'p' ? sectionOf(uiPlugins, place, parts[at + 1] ?? '', parts[at + 2] ?? '')?.label[locale()] : undefined;
    if (!current) {
      const page = ORG_PAGES[parts[0] ?? ''];
      const extension = pluginLabel(0, 'organization');
      const label = page ? t(page) : extension;
      return [{ label: organization()?.name ?? '', href: base() }, ...(label ? [{ label }] : [])];
    }
    const extension = pluginLabel(2, 'app');
    if (extension) return [{ label: current.name, href: paths.app(id(), current.client_id) }, { label: extension }];
    const section = parts[2] ?? '';
    const page = APP_PAGES[section];
    if (!page) return [{ label: organization()?.name ?? '', href: base() }, { label: t('shell.apps'), href: base() }, { label: current.name }];
    return [{ label: current.name, href: paths.app(id(), current.client_id) }, { label: t(page) }];
  };

  // Creating an app is a focused flow: the page alone, with a way out.
  const focused = () => location.pathname === paths.newApp(id());

  return (
    <Show when={organization()} fallback={<idp-not-found href="/" labels={workspaceNotFoundLabels()} />}>
      <Show
        when={!focused()}
        fallback={
          <Focused
            brand={{ name: brand().name ?? '', href: base() }}
            title={t('shell.createApp')}
            close={{ label: t('shell.close'), href: base() }}
            labels={shellLabels()}
          >
            <PageBoundary>
              <Outlet />
            </PageBoundary>
          </Focused>
        }
      >
      <Shell
        brand={{ name: brand().name ?? '', href: base() }}
        context={context()}
        groups={groups()}
        sidebarLabels={sidebarLabels()}
        collapsed={collapsed()}
        onToggle={(folded) => collapsed.set(folded)}
        onSwitch={switchTo}
        crumbs={crumbs()}
        user={
          data()?.me
            ? { name: data()?.me?.name || data()?.me?.email || '', detail: organization()?.role ? t(`tm.role.${organization()?.role}`) : '' }
            : null
        }
        signOutHref="/auth/logout"
        onSignOut={forgetOrganization}
        onLanguage={switchLanguage}
        labels={shellLabels()}
      >
        <PageBoundary>
          <Outlet />
        </PageBoundary>
      </Shell>
      </Show>
    </Show>
  );
}
