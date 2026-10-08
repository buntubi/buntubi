/**
 * The page script: reads what the provider wrote into the page, mounts the screen it names,
 * hands the elements their words and actions, and follows the provider's answers. Leaving a
 * screen is always a full page load, since the next step is the provider's to decide.
 */
import { render, Show } from '@fluixi/core';
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
import './elements/mfa-setup/mfa-setup.js';
import './elements/app-links/app-links.js';
import type { MfaEnrolment } from './elements/mfa-setup/mfa-setup.js';
import type { AccountItem } from './elements/account-select/account-select.js';
import type { AppLink } from './elements/app-links/app-links.js';
import { createApi, type Redirect } from './host/api.js';
import { applyBrand } from './host/brand.js';
import { readConfig } from './host/config.js';
import { text } from './host/i18n.js';
import { FooterLink, Page } from './host/page.js';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './host/schemas.js';

const config = readConfig();
const t = text[config.locale] ?? text.fr;
const api = createApi(config.csrf);
const props = config.props;
const str = (key: string) => (typeof props[key] === 'string' ? (props[key] as string) : '');

const go = (url: string) => window.location.assign(url);
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
}

const screens: Record<string, () => Screen> = {
  'idp-sign-in': () => ({
    key: 'signIn',
    body: () => (
      <idp-sign-in
        action={(input) => api('POST', '/api/session', input)}
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

  'idp-account': () => ({
    key: 'account',
    body: () => (
      <div class="idp-done">
        <p>
          {t.notes.signedInAs} <strong>{str('email')}</strong>
        </p>
        <Show when={((props.apps as AppLink[] | undefined) ?? []).length}>
          <section class="idp-section">
            <h2>{t.titles.yourApps}</h2>
            <idp-app-links apps={(props.apps as AppLink[] | undefined) ?? []} labels={t.appLinks} />
          </section>
        </Show>
        <section class="idp-section">
          <h2>{t.titles.twoStep}</h2>
          <idp-mfa-setup
            enabled={props.mfa === true}
            backupCodesLeft={typeof props.backup_codes_left === 'number' ? props.backup_codes_left : 0}
            beginAction={() => api<MfaEnrolment>('POST', '/api/mfa/totp', {})}
            confirmAction={(input) => api<{ backup_codes: string[] }>('POST', '/api/mfa/totp/confirm', input)}
            renewAction={(input) => api<{ backup_codes: string[] }>('POST', '/api/mfa/backup-codes', input)}
            disableAction={(input) => api('POST', '/api/mfa/disable', input)}
            labels={t.mfaSetup}
            messages={t.messages}
          />
        </section>
        <Button
          variant="outline"
          class="idp-wide"
          onPress={() => api<Redirect>('DELETE', '/api/session').then(follow, () => go('/signin'))}
        >
          {t.links.signOut}
        </Button>
      </div>
    ),
    footer: () => <FooterLink href="/accounts">{t.links.switchAccount}</FooterLink>,
  }),

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
const screen = screens[config.element]?.();
if (root && screen) {
  render(
    () => (
      <Page
        brand={config.brand}
        locale={config.locale}
        title={t.titles[screen.key]}
        subtitle={t.subtitles[screen.key]}
        heroTitle={config.brand.tagline ?? t.hero.title}
        heroText={t.hero.text}
        languageLabel={t.links.language}
        footer={screen.footer?.()}
      >
        {screen.body()}
      </Page>
    ),
    root,
  );
}
