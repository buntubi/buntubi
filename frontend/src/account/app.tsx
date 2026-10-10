/**
 * The account area: one app under /account, routed in the browser, in the portal's frame. Its
 * data comes from the provider's /api/account endpoints, with this page's session.
 */
import '@idp/theme/tokens.css';
import '@idp/skin/fonts.css';
import '@idp/skin/styles.css';
import './account.css';
import { render, Show, ThemeProvider } from '@fluixi/core';
import { Outlet, Router, useLocation, useRouteData } from '@fluixi/core/router';
import type { ComponentChild } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';
import { provideRoot } from '@fluixi/start/di';
import { Grid, Stack } from '@fluixi-ui/layout';
import { Account, type AccountSummary } from '@idp/sdk/account';
import '@idp/elements/account-area';
import '@idp/elements/account-check';
import type { AccountCheck } from '@idp/elements/account-check/logic';
import '@idp/elements/account-hello';
import '@idp/elements/account-switcher';
import '@idp/elements/app-launcher';
import '@idp/elements/page-header';
import { Shell, type Crumb } from '@idp/shell/shell';
import { createDocumentScheme } from '@idp/theme/document';
import type { Api, Redirect } from '../host/api.js';
import type { PageConfig } from '../host/config.js';
import type { Text } from '../host/i18n.js';
import type { MfaEnrolment } from '../elements/mfa-setup/mfa-setup.js';
import '../elements/mfa-setup/mfa-setup.js';
import { accountWords, type AccountWords } from './i18n.js';

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
};

/** The account area's addresses, built in one place. */
const paths = {
  home: () => '/account',
  security: () => '/account/security',
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
  provideRoot([
    {
      provide: Account,
      useValue: {
        switchTo: async (id: string) => (await api<Redirect>('POST', `/api/accounts/${encodeURIComponent(id)}`)).redirect,
        signOut: async (id: string) => (await api<Redirect>('DELETE', `/api/accounts/${encodeURIComponent(id)}`)).redirect,
        signOutAll: async () => (await api<Redirect>('DELETE', '/api/accounts')).redirect,
      },
    },
  ]);
  const summary = () => api<AccountSummary>('GET', '/api/account');

  function Layout(): ComponentChild {
    const location = useLocation();
    const data = useRouteData<AccountSummary>();
    const collapsed = signal(false);
    const item = (label: string, href: string, icon: string) => ({ label, href, icon, current: location.pathname === href });
    const crumbs = (): Crumb[] => {
      const here = location.pathname === paths.security() ? w.nav.security : w.nav.home;
      return [{ label: w.product, href: paths.home() }, { label: here }];
    };
    return (
      <Shell
        brand={{ name: config.brand.name ?? '', href: paths.home() }}
        context={null}
        groups={[{ label: '', items: [item(w.nav.home, paths.home(), ICONS.home), item(w.nav.security, paths.security(), ICONS.lock)] }]}
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
            locale={config.locale}
            labels={w.hello}
          />
          <idp-account-check checks={data() ? checksOf(data()!, w) : []} labels={w.check} />
          <Grid columns={{ base: 1, md: 2 }} gap={4}>
            <idp-account-area
              title={w.areas.security.title}
              note={w.areas.security.note}
              link={w.areas.security.link}
              href={paths.security()}
              icon={ICONS.lock}
            />
          </Grid>
          <idp-app-launcher apps={data()?.apps ?? []} title={w.apps} />
        </Stack>
      </Show>
    );
  }

  function Security(): ComponentChild {
    const data = useRouteData<AccountSummary>();
    const t = context.text;
    return (
      <Stack gap={5}>
        <idp-page-header title={w.security.title} intro={w.security.intro} />
        <Show when={data()} fallback={<p>{w.loading}</p>}>
          <section class="account-card" aria-label={w.security.twoStep}>
            <h2>{w.security.twoStep}</h2>
            <idp-mfa-setup
              enabled={data()?.mfa.enabled === true}
              backupCodesLeft={data()?.mfa.backup_codes_left ?? 0}
              beginAction={() => api<MfaEnrolment>('POST', '/api/mfa/totp', {})}
              confirmAction={(input) => api<{ backup_codes: string[] }>('POST', '/api/mfa/totp/confirm', input)}
              renewAction={(input) => api<{ backup_codes: string[] }>('POST', '/api/mfa/backup-codes', input)}
              disableAction={(input) => api('POST', '/api/mfa/disable', input)}
              labels={t.mfaSetup}
              messages={t.messages}
            />
          </section>
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
        { path: paths.security(), component: Security, data: summary },
      ],
    },
  ];
  const scheme = createDocumentScheme();
  render(
    () => (
      <ThemeProvider themes={{ scheme }}>
        <Router routes={routes as never} />
      </ThemeProvider>
    ),
    root,
  );
}
