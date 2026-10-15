/**
 * The page script: reads what the provider wrote into the page, mounts the screen it names,
 * hands the elements their words and actions, and follows the provider's answers. Leaving a
 * screen is always a full page load, since the next step is the provider's to decide.
 */
import { render, Show, ThemeProvider } from '@fluixi/core';
import { createDocumentScheme } from '@idp/theme/document';
import type { ComponentChild } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';
import { Button } from '@fluixi-ui/button';
import './styles.css';
import './elements/sign-in/sign-in.js';
import './elements/sign-up/sign-up.js';
import './elements/verify-email/verify-email.js';
import './elements/forgot-password/forgot-password.js';
import './elements/reset-password/reset-password.js';
import './elements/consent/consent.js';
import './elements/account-select/account-select.js';
import './elements/device-activate/device-activate.js';
import './elements/mfa-verify/mfa-verify.js';
import type { AccountItem } from './elements/account-select/account-select.js';
import { createApi, type Redirect } from './host/api.js';
import { lookOf, viewsOf } from '@buntubi/sdk/plugins';
import { overrideViews } from '@buntubi/sdk/view';
import { getPasskey } from '@buntubi/sdk/webauthn';
import builtUiPlugins from 'virtual:idp-ui-plugins';
import { mountedUiPlugins } from '@buntubi/sdk/runtime';
import { applyBrand } from './host/brand.js';
import { readConfig } from './host/config.js';
import { text } from './host/i18n.js';
import { FooterLink, Page } from './host/page.js';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './host/schemas.js';

// The deployment's UI plugins: built in (development), then mounted (loaded by ./boot first).
const uiPlugins = [...builtUiPlugins, ...mountedUiPlugins().plugins];
// A deployment's views in place of the elements' own, before anything renders.
overrideViews(viewsOf(uiPlugins));

const config = readConfig();
const t = text[config.locale] ?? text.fr;
const api = createApi(config.csrf, config.session);
const props = config.props;
const str = (key: string) => (typeof props[key] === 'string' ? (props[key] as string) : '');

const go = (url: string) => window.location.assign(url);
const describe = (error: unknown) => {
  const code = error instanceof Error ? error.message : 'generic';
  return t.messages[code] ?? t.messages.generic ?? '';
};

// The offer after signing up: its elements and the Account service, only on its own page.
const secure =
  config.element === 'idp-secure-account'
    ? await (async () => {
        const [{ accountService }, { accountWords }, { provideRoot }, { Account }] = await Promise.all([
          import('./account/service.js'),
          import('./account/i18n.js'),
          import('@fluixi/start/di'),
          import('@buntubi/sdk/account'),
          import('@idp/elements/secure-account'),
        ]);
        provideRoot([{ provide: Account, useValue: accountService(api) }]);
        return { twoStep: (accountWords[config.locale] ?? accountWords.fr).security.twoStepCard };
      })()
    : null;
const follow = (result: unknown) => {
  const answer = result as Partial<Redirect> & { next?: string };
  const steps: Record<string, string> = { verify_email: '/verify-email', mfa: '/mfa' };
  go((answer.next && steps[answer.next]) || answer.redirect || '/account');
};

interface Screen {
  /** Which entry of `titles` and `subtitles` the screen shows. */
  key: keyof typeof t.titles;
  body: () => ComponentChild;
  footer?: () => ComponentChild;
  layout?: 'hero' | 'card';
  /** In place of the key's subtitle. */
  subtitle?: string;
}

const screens: Record<string, () => Screen> = {
  'idp-sign-in': () => ({
    key: 'signIn',
    body: () => (
      <idp-sign-in
        action={(input) => api('POST', '/api/session', input)}
        passkeyAction={async ({ conditional, signal }) => {
          const options = await api<Record<string, unknown>>('POST', '/api/passkey/options', {});
          const credential = await getPasskey(options, conditional, signal);
          return api('POST', '/api/passkey', { credential });
        }}
        schema={signInSchema}
        labels={t.signIn}
        messages={t.messages}
        forgotHref="/forgot-password"
        onSuccess={(event) => follow(event.detail.result)}
      />
    ),
    footer: () => (
      <FooterLink lead={t.links.noAccount} href="/signup">
        {t.links.signUp}
      </FooterLink>
    ),
  }),

  'idp-sign-up': () => ({
    key: 'signUp',
    body: () => (
      <idp-sign-up
        action={(input) =>
          api('POST', '/api/signup', {
            given_name: input.givenName,
            family_name: input.familyName,
            email: input.email,
            password: input.password,
            locale: config.locale,
          })
        }
        schema={signUpSchema}
        labels={t.signUp}
        messages={t.messages}
        onSuccess={(event) => follow(event.detail.result)}
      />
    ),
    footer: () => (
      <FooterLink lead={t.links.haveAccount} href="/signin">
        {t.links.signIn}
      </FooterLink>
    ),
  }),

  'idp-verify-email': () => ({
    key: 'verifyEmail',
    body: () => (
      <idp-verify-email
        email={str('email')}
        action={(input) => api('POST', '/api/email/verify', input)}
        resendAction={() => api('POST', '/api/email/resend', {})}
        labels={t.verifyEmail}
        messages={t.messages}
        onSuccess={(event) => follow(event.detail.result)}
      />
    ),
    footer: () => <FooterLink href="/signin">{t.links.backToSignIn}</FooterLink>,
  }),

  'idp-mfa-verify': () => ({
    key: 'mfa',
    body: () => (
      <idp-mfa-verify
        action={(input) => api('POST', '/api/mfa/verify', input)}
        hasPasskey={props.passkey === true}
        passkeyAction={async () => {
          const options = await api<Record<string, unknown>>('POST', '/api/passkey/options', { second_step: true });
          const credential = await getPasskey(options);
          return api('POST', '/api/passkey', { credential, second_step: true });
        }}
        labels={t.mfaVerify}
        messages={t.messages}
        onSuccess={(event) => follow(event.detail.result)}
      />
    ),
    footer: () => <FooterLink href="/signin">{t.links.backToSignIn}</FooterLink>,
  }),

  'idp-forgot-password': () => ({
    key: 'forgotPassword',
    body: () => (
      <idp-forgot-password
        action={(input) => api('POST', '/api/password/forgot', input)}
        schema={forgotPasswordSchema}
        labels={t.forgotPassword}
        messages={t.messages}
      />
    ),
    footer: () => <FooterLink href="/signin">{t.links.backToSignIn}</FooterLink>,
  }),

  'idp-reset-password': () => ({
    key: 'resetPassword',
    body: () => (
      <idp-reset-password
        action={(input) => api('POST', '/api/password/reset', { token: str('token'), password: input.password })}
        schema={resetPasswordSchema}
        labels={t.resetPassword}
        messages={t.messages}
        onSuccess={(event) => follow(event.detail.result)}
      />
    ),
    footer: () => <FooterLink href="/forgot-password">{t.titles.forgotPassword}</FooterLink>,
  }),

  'idp-consent': () => {
    const client = (props.client ?? {}) as {
      name?: string;
      logo?: string;
      verified?: boolean;
      homepage?: string | null;
      privacy?: string | null;
      terms?: string | null;
    };
    const links = [
      [t.notes.homepage, client.homepage],
      [t.notes.privacy, client.privacy],
      [t.notes.terms, client.terms],
    ]
      .filter((pair): pair is [string, string] => typeof pair[1] === 'string' && pair[1].length > 0)
      .map(([label, href]) => ({ label, href }));
    const scopes = (props.scopes as string[] | undefined) ?? [];
    return {
      key: 'consent',
      body: () => (
        <idp-consent
          clientName={client.name ?? ''}
          clientLogo={client.logo ?? ''}
          userEmail={str('email')}
          warning={client.verified === false ? t.notes.unverified : ''}
          links={links}
          scopes={scopes.map((id) => ({ id, text: t.scopes[id] ?? id }))}
          action={(input) => api<Redirect>('POST', `/oauth/authorize${window.location.search}`, input)}
          labels={t.consent}
          messages={t.messages}
          onSuccess={(event) => follow(event.detail.result)}
        />
      ),
      footer: () => <FooterLink href="/accounts">{t.links.switchAccount}</FooterLink>,
    };
  },

  'idp-account-select': () => ({
    key: 'accounts',
    layout: 'card',
    subtitle: str('client') ? t.accountSelect.continueTo.replace('{app}', str('client')) : undefined,
    footer: () => (str('client') ? <p>{t.accountSelect.sees.replace('{app}', str('client'))}</p> : null),
    body: () => (
      <idp-account-select
        accounts={(props.accounts as AccountItem[] | undefined) ?? []}
        action={(input) => api('POST', `/api/accounts/${encodeURIComponent(input.id)}`, {})}
        labels={t.accountSelect}
        onSelect={(event) => follow(event.detail.result)}
        onOther={() => go('/signin')}
      />
    ),
  }),

  'idp-device-activate': () => {
    const outcome = signal<'approved' | 'refused' | null>(null);
    return {
      key: 'device',
      body: () => (
        <Show
          when={outcome()}
          fallback={
            <idp-device-activate
              userCode={str('user_code')}
              action={(input) => api('POST', '/api/device', { user_code: input.userCode, approve: input.approve })}
              labels={t.deviceActivate}
              messages={t.messages}
              onSuccess={(event) => outcome.set(event.detail.approve ? 'approved' : 'refused')}
            />
          }
        >
          {() => (
            <div class="idp-done" role="status">
              <strong>{outcome() === 'approved' ? t.titles.deviceDone : t.titles.deviceRefused}</strong>
              <p>{outcome() === 'approved' ? t.notes.deviceDone : t.notes.deviceRefused}</p>
            </div>
          )}
        </Show>
      ),
    };
  },

  'idp-blocked': () => {
    const contact = str('support_email');
    return {
      key: 'blocked',
      body: () => (
        <div class="idp-done" role="alert">
          <p>{t.notes.blocked}</p>
          <Show when={contact}>
            <p>
              {t.notes.blockedContact} <a class="idp-link" href={`mailto:${contact}`}>{contact}</a>
            </p>
          </Show>
        </div>
      ),
      footer: () => <FooterLink href="/accounts">{t.links.switchAccount}</FooterLink>,
    };
  },

  'idp-secure-account': () => ({
    key: 'secureAccount',
    body: () => (
      <idp-secure-account
        locale={config.locale}
        labels={t.secureAccount}
        twoStepLabels={secure?.twoStep ?? {}}
        messages={t.messages}
        describe={describe}
        onAnswer={() => void api<Redirect>('POST', '/api/account/security-prompt', {}).then((answer) => go(answer.redirect))}
      />
    ),
  }),

  'idp-logout-confirm': () => {
    const app = str('app');
    const busy = signal(false);
    return {
      key: 'logoutConfirm',
      body: () => (
        <div class="idp-done">
          <p>{app ? t.notes.logoutAskApp.replace('{app}', app) : t.notes.logoutAsk}</p>
          <div class="idp-actions">
            <Button
              variant="solid"
              disabled={busy()}
              onPress={() => {
                busy.set(true);
                void api<Redirect>('POST', window.location.pathname + window.location.search, {})
                  .then((answer) => go(answer.redirect))
                  .catch(() => busy.set(false));
              }}
            >
              {t.notes.logoutAction}
            </Button>
            <Button variant="outline" tone="neutral" onPress={() => go('/account')}>
              {t.notes.logoutCancel}
            </Button>
          </div>
        </div>
      ),
    };
  },

  'idp-signed-out': () => ({
    key: 'signedOut',
    body: () => (
      <div class="idp-done">
        <p>{t.notes.signedOut}</p>
      </div>
    ),
    footer: () => <FooterLink href="/signin">{t.links.signIn}</FooterLink>,
  }),
};

applyBrand(config.brand);
const root = document.getElementById('idp-root');
// The account area is its own app, in the portal's frame: loaded only on its pages.
if (root && config.element === 'idp-account-app') {
  const { mountAccount } = await import('./account/app.js');
  const { accountWords } = await import('./account/i18n.js');
  mountAccount(root, { api, words: accountWords[config.locale] ?? accountWords.fr, text: t, config });
}
const screen = screens[config.element]?.();
// A look a plugin gives this client: its stylesheet, and the element beside the form, both
// ready before the page draws so it does not change under the reader.
const look = lookOf(uiPlugins, config.brand.look);
await Promise.all([look?.styles?.(), look?.aside?.load()]);
if (root && screen) {
  render(() => {
    // Inside the render, so a reload keeps the reader's choice (the account area's cookie).
    const scheme = createDocumentScheme();
    return (
      <ThemeProvider themes={{ scheme }}>
      <Page
        brand={config.brand}
        aside={look?.aside?.element}
        locale={config.locale}
        title={t.titles[screen.key]}
        subtitle={screen.subtitle ?? t.subtitles[screen.key]}
        layout={screen.layout}
        links={[
          ...(config.links?.privacy_url ? [{ label: t.links.privacy, href: config.links.privacy_url }] : []),
          ...(config.links?.terms_url ? [{ label: t.links.terms, href: config.links.terms_url }] : []),
        ]}
        heroTitle={config.brand.tagline ?? t.hero.title}
        heroText={t.hero.text}
        languageLabel={t.links.language}
        theme={t.theme}
        footer={screen.footer?.()}
      >
        {screen.body()}
      </Page>
      </ThemeProvider>
    );
  }, root);
}
