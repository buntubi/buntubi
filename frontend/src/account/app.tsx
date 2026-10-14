/**
 * The account area: one app under /account, routed in the browser, in the portal's frame. Its
 * data comes from the provider's /api/account endpoints, with this page's session.
 */
import '@idp/theme/tokens.css';
import '@idp/skin/fonts.css';
import '@idp/skin/styles.css';
import './account.css';
import { render, Show, ThemeProvider } from '@fluixi/core';
import { Link, Outlet, revalidate, Router, useLocation, useRouteData } from '@fluixi/core/router';
import type { ComponentChild } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';
import { provideRoot } from '@fluixi/start/di';
import { Grid, Stack } from '@fluixi-ui/layout';
import {
  Account,
  type AccountActivity,
  type AccountClosing,
  type AccountService,
  type AccountSummary,
  type ConnectedApp,
  type Device,
  type Passkey,
} from '@buntu/sdk/account';
import '@idp/elements/account-area';
import '@idp/elements/account-check';
import '@idp/elements/account-deletion';
import type { AccountCheck } from '@idp/elements/account-check/logic';
import '@idp/elements/account-hello';
import '@idp/elements/account-switcher';
import '@idp/elements/connected-apps';
import '@idp/elements/data-export';
import '@idp/elements/devices';
import '@idp/elements/app-launcher';
import '@idp/elements/address-section';
import '@idp/elements/contact-section';
import '@idp/elements/preferences-section';
import '@idp/elements/profile-section';
import '@idp/elements/page-header';
import '@idp/elements/passkeys-section';
import '@idp/elements/password-section';
import '@idp/elements/security-activity';
import '@idp/elements/two-step-section';
import { Shell, type Crumb } from '@idp/shell/shell';
import { createDocumentScheme } from '@idp/theme/document';
import type { Api, Redirect } from '../host/api.js';
import type { PageConfig } from '../host/config.js';
import type { Text } from '../host/i18n.js';
import { accountWords, type AccountWords } from './i18n.js';
import { accountService } from './service.js';

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  laptop: 'M4 5h16v10H4zM2 19h20',
  apps: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  data: 'M12 3v12M7 10l5 5 5-5M4 21h16',
};

/** The account area's addresses, built in one place. */
const paths = {
  home: () => '/account',
  info: () => '/account/info',
  emailConfirm: () => '/account/email/confirm',
  security: () => '/account/security',
  devices: () => '/account/devices',
  apps: () => '/account/apps',
  data: () => '/account/data',
  signIn: () => '/signin',
} as const;

interface Context {
  api: Api;
  words: AccountWords;
  text: Text;
  config: PageConfig;
}

function checksOf(summary: AccountSummary, w: AccountWords): AccountCheck[] {
  const c = w.check;
  const checks: AccountCheck[] = [
    summary.user.email_verified
      ? { key: 'email', title: c.emailVerified, note: summary.user.email, tone: 'ok' }
      : { key: 'email', title: c.emailUnverified, note: summary.user.email, tone: 'warn' },
    summary.mfa.enabled
      ? { key: 'two-step', title: c.twoStepOn, note: c.twoStepOnNote, tone: 'ok' }
      : { key: 'two-step', title: c.twoStepOff, note: c.twoStepOffNote, tone: 'warn', action: c.turnOn, href: paths.security() },
  ];
  if (summary.mfa.enabled) {
    const left = summary.mfa.backup_codes_left;
    checks.push(
      left <= 3
        ? { key: 'codes', title: c.codesLow.replace('{n}', String(left)), note: c.codesLowNote, tone: 'warn', action: c.newCodes, href: paths.security() }
        : { key: 'codes', title: c.codesOk.replace('{n}', String(left)), note: c.codesOkNote, tone: 'ok' },
    );
  }
  return checks;
}

export function mountAccount(root: HTMLElement, context: Context): void {
  const { api, words: w, config } = context;
  // Every change shows at once: the pages on screen load the summary again.
  const service = accountService(api, () => revalidate(() => true));
  provideRoot([{ provide: Account, useValue: service }]);
  const summary = () => api<AccountSummary>('GET', '/api/account');
  const security = async () => {
    const [account, activity, keys] = await Promise.all([
      summary(),
      api<AccountActivity>('GET', '/api/account/activity'),
      api<{ passkeys: Passkey[] }>('GET', '/api/account/passkeys'),
    ]);
    return { account, activity, passkeys: keys.passkeys };
  };
  const describe = (error: unknown) => {
    const code = error instanceof Error ? error.message : 'generic';
    return context.text.messages[code] ?? context.text.messages.generic ?? '';
  };

  function Layout(): ComponentChild {
    const location = useLocation();
    const data = useRouteData<AccountSummary>();
    const collapsed = signal(false);
    const item = (label: string, href: string, icon: string) => ({ label, href, icon, current: location.pathname === href });
    const crumbs = (): Crumb[] => {
      const titles: Record<string, string> = {
        [paths.home()]: w.nav.home,
        [paths.security()]: w.nav.security,
        [paths.devices()]: w.nav.devices,
        [paths.apps()]: w.nav.apps,
        [paths.data()]: w.nav.data,
      };
      const here = titles[location.pathname] ?? w.nav.info;
      return [{ label: w.product, href: paths.home() }, { label: here }];
    };
    return (
      <Shell
        brand={{ name: config.brand.name ?? '', href: paths.home() }}
        context={null}
        groups={[{ label: '', items: [
              item(w.nav.home, paths.home(), ICONS.home),
              item(w.nav.info, paths.info(), ICONS.person),
              item(w.nav.security, paths.security(), ICONS.lock),
              item(w.nav.devices, paths.devices(), ICONS.laptop),
              item(w.nav.apps, paths.apps(), ICONS.apps),
              item(w.nav.data, paths.data(), ICONS.data),
            ], }]}
        sidebarLabels={{ product: w.product, ...w.sidebar }}
        collapsed={collapsed()}
        onToggle={(next) => collapsed.set(next)}
        crumbs={crumbs()}
        user={null}
        signOutHref={paths.signIn()}
        onLanguage={() => window.location.assign(`?lang=${config.locale === 'fr' ? 'en' : 'fr'}`)}
        labels={w.shell}
        actions={
          <idp-account-switcher
            accounts={data()?.accounts ?? []}
            addHref={paths.signIn()}
            labels={w.switcher}
            onLeave={(event) => window.location.assign(event.detail.href)}
          />
        }
      >
        <Outlet />
      </Shell>
    );
  }

  function Home(): ComponentChild {
    const data = useRouteData<AccountSummary>();
    return (
      <Show when={data()} fallback={<p>{w.loading}</p>}>
        <Stack gap={5}>
          <idp-account-hello
            name={data()?.user.name ?? ''}
            firstName={data()?.user.given_name ?? ''}
            email={data()?.user.email ?? ''}
            createdAt={data()?.user.created_at ?? ''}
            picture={data()?.user.picture ?? ''}
            locale={config.locale}
            editHref={paths.info()}
            labels={w.hello}
          />
          <idp-account-check checks={data() ? checksOf(data()!, w) : []} labels={w.check} />
          <Grid columns={{ base: 1, md: 2 }} gap={4}>
            <idp-account-area
              title={w.areas.info.title}
              note={w.areas.info.note}
              link={w.areas.info.link}
              href={paths.info()}
              icon={ICONS.person}
            />
            <idp-account-area
              title={w.areas.security.title}
              note={w.areas.security.note}
              link={w.areas.security.link}
              href={paths.security()}
              icon={ICONS.lock}
            />
            <idp-account-area
              title={w.areas.devices.title}
              note={w.areas.devices.note}
              link={w.areas.devices.link}
              href={paths.devices()}
              icon={ICONS.laptop}
            />
            <idp-account-area
              title={w.areas.apps.title}
              note={w.areas.apps.note}
              link={w.areas.apps.link}
              href={paths.apps()}
              icon={ICONS.apps}
            />
            <idp-account-area
              title={w.areas.data.title}
              note={w.areas.data.note}
              link={w.areas.data.link}
              href={paths.data()}
              icon={ICONS.data}
            />
          </Grid>
          <idp-app-launcher apps={data()?.apps ?? []} title={w.apps} />
        </Stack>
      </Show>
    );
  }

  function Info(): ComponentChild {
    const data = useRouteData<AccountSummary>();
    const user = () => data()?.user;
    return (
      <Stack gap={5}>
        <idp-page-header title={w.info.title} intro={w.info.intro} />
        <Show when={user()} fallback={<p>{w.loading}</p>}>
          <idp-profile-section
            givenName={user()?.given_name ?? ''}
            familyName={user()?.family_name ?? ''}
            email={user()?.email ?? ''}
            picture={user()?.picture ?? ''}
            labels={w.info.profile}
            messages={context.text.messages}
            describe={describe}
          />
          <idp-contact-section
            email={user()?.email ?? ''}
            verified={user()?.email_verified === true}
            pendingEmail={user()?.pending_email ?? ''}
            phone={user()?.phone ?? ''}
            country={user()?.country ?? ''}
            locale={config.locale}
            labels={w.info.contact}
            messages={context.text.messages}
            describe={describe}
          />
          <idp-address-section
            address={user()?.address}
            country={user()?.country ?? ''}
            locale={config.locale}
            labels={w.info.address}
            messages={context.text.messages}
            describe={describe}
          />
          <idp-preferences-section
            locale={user()?.locale ?? config.locale}
            country={user()?.country ?? ''}
            labels={w.info.preferences}
            describe={describe}
            onLanguage={(event) => window.location.assign(`?lang=${event.detail.locale}`)}
          />
        </Show>
      </Stack>
    );
  }

  /** The link from the new address: confirmed while the page loads, once. */
  const confirmEmail = ({ location }: { location: () => { query: Record<string, string> } }) =>
    service.confirmEmailChange(location().query.token ?? '').then(
      (email) => ({ email, error: null }),
      (error: unknown) => ({ email: null, error: describe(error) }),
    );

  function EmailConfirm(): ComponentChild {
    const result = useRouteData<{ email: string | null; error: string | null }>();
    return (
      <Stack gap={5}>
        <idp-page-header title={w.emailConfirm.title} />
        <Show when={result()} fallback={<p>{w.emailConfirm.working}</p>}>
          <section class="account-card" role="status">
            <Show when={result()?.email} fallback={<p class="account-alert">{result()?.error}</p>}>
              <p>{w.emailConfirm.done.replace('{email}', result()?.email ?? '')}</p>
            </Show>
            <Link href={paths.info()}>{w.emailConfirm.back}</Link>
          </section>
        </Show>
      </Stack>
    );
  }

  function Devices(): ComponentChild {
    const data = useRouteData<Device[]>();
    return (
      <Stack gap={5}>
        <idp-page-header title={w.devices.title} intro={w.devices.intro} />
        <Show when={data()} fallback={<p>{w.loading}</p>}>
          <idp-devices devices={data() ?? []} locale={config.locale} labels={w.devices.list} describe={describe} />
        </Show>
      </Stack>
    );
  }

  function Apps(): ComponentChild {
    const data = useRouteData<ConnectedApp[]>();
    return (
      <Stack gap={5}>
        <idp-page-header title={w.connected.title} intro={w.connected.intro} />
        <Show when={data()} fallback={<p>{w.loading}</p>}>
          <idp-connected-apps
            apps={data() ?? []}
            brand={config.brand.name ?? ''}
            locale={config.locale}
            scopeWords={context.text.scopes}
            labels={w.connected.list}
            describe={describe}
          />
        </Show>
      </Stack>
    );
  }

  function Data(): ComponentChild {
    const loaded = useRouteData<{ closing: AccountClosing; email: string }>();
    return (
      <Stack gap={5}>
        <idp-page-header title={w.data.title} intro={w.data.intro} />
        <Show when={loaded()} fallback={<p>{w.loading}</p>}>
          <idp-data-export lastExportAt={loaded()?.closing.last_export_at ?? ''} locale={config.locale} labels={w.data.export} describe={describe} />
          <idp-account-deletion
            email={loaded()?.email ?? ''}
            organizations={loaded()?.closing.organizations ?? []}
            lastAdmin={loaded()?.closing.last_admin === true}
            passwordNeeded={loaded()?.closing.password_needed === true}
            portalHref={loaded()?.closing.portal_url ?? ''}
            labels={w.data.deletion}
            messages={context.text.messages}
            describe={describe}
            onLeave={(event) => window.location.assign(event.detail.href)}
          />
        </Show>
      </Stack>
    );
  }

  function Security(): ComponentChild {
    const loaded = useRouteData<{ account: AccountSummary; activity: AccountActivity; passkeys: Passkey[] }>();
    const data = () => loaded()?.account;
    const t = context.text;
    return (
      <Stack gap={5}>
        <idp-page-header title={w.security.title} intro={w.security.intro} />
        <Show when={data()} fallback={<p>{w.loading}</p>}>
          <idp-password-section
            hasPassword={data()?.user.has_password !== false}
            changedAt={data()?.user.password_changed_at ?? ''}
            locale={config.locale}
            labels={w.security.password}
            messages={t.messages}
            describe={describe}
          />
          <idp-passkeys-section
            passkeys={loaded()?.passkeys ?? []}
            locale={config.locale}
            labels={w.security.passkeys}
            messages={t.messages}
            describe={describe}
          />
          <idp-two-step-section
            enabled={data()?.mfa.enabled === true}
            since={data()?.mfa.since ?? ''}
            backupCodesLeft={data()?.mfa.backup_codes_left ?? 0}
            locale={config.locale}
            labels={w.security.twoStepCard}
            messages={t.messages}
            describe={describe}
          />
          <idp-security-activity
            events={loaded()?.activity.events ?? []}
            days={loaded()?.activity.days ?? 30}
            locale={config.locale}
            labels={w.security.activity}
          />
        </Show>
      </Stack>
    );
  }

  const routes = [
    {
      path: paths.home(),
      component: Layout,
      data: summary,
      children: [
        { path: paths.home(), component: Home, data: summary },
        { path: paths.info(), component: Info, data: summary },
        { path: paths.emailConfirm(), component: EmailConfirm, data: confirmEmail },
        { path: paths.security(), component: Security, data: security },
        {
          path: paths.devices(),
          component: Devices,
          data: async () => (await api<{ devices: Device[] }>('GET', '/api/account/devices')).devices,
        },
        {
          path: paths.data(),
          component: Data,
          data: async () => {
            const [closing, account] = await Promise.all([api<AccountClosing>('GET', '/api/account/closing'), summary()]);
            return { closing, email: account.user.email };
          },
        },
        {
          path: paths.apps(),
          component: Apps,
          data: async () => (await api<{ apps: ConnectedApp[] }>('GET', '/api/account/apps')).apps,
        },
      ],
    },
  ];
  render(() => {
    // Made inside the render: the scheme keeps the page's attribute in step only from there,
    // so made outside it a reload lost the reader's choice.
    const scheme = createDocumentScheme();
    return (
      <ThemeProvider themes={{ scheme }}>
        <Router routes={routes as never} />
      </ThemeProvider>
    );
  }, root);
}
