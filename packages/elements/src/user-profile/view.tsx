/** The default look: the profile form and the account facts side by side, then organizations and access. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input, Textarea } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { UserProfileLogic } from './logic.js';
import '@bambiste/countries/elements';
import type {} from '../bambiste-jsx.js';
import '../segmented/segmented.js';

export const userProfileView = (p: UserProfileLogic) => (
  <div part="user-profile" class="profile">
    <style scoped>{`
      .profile { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 16px; align-items: start; }
      .column { display: grid; gap: 16px; min-width: 0; }
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 14px; min-width: 0; }
      h2 { margin: 0; font-size: 14px; font-weight: 600; }
      .fields { display: grid; gap: 14px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .sub-title { margin: 6px 0 0; font-size: 13px; font-weight: 600; color: var(--idp-muted); }
      dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 10px 20px; font-size: 13.5px; }
      dt { color: var(--idp-muted); }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; background: var(--idp-surface-2); color: var(--idp-muted); }
      .tag[data-tone='ok'] { color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 12%, transparent); }
      .tag[data-tone='warn'] { color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 14%, transparent); }
      .tag[data-tone='accent'] { color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
      li { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13.5px; }
      .muted { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .action { display: grid; gap: 4px; justify-items: start; padding-top: 12px; border-top: 1px solid var(--idp-border); }
      .action:first-of-type { border-top: 0; padding-top: 0; }
      .notice { margin: 0; color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 900px) { .profile { grid-template-columns: minmax(0, 1fr); } .row { grid-template-columns: 1fr; } }
    `}</style>
    <div class="column">
      <section class="card">
        <h2>{() => p.labels().profile}</h2>
        <Form form={p.form} onSubmit={(values) => p.save(values)} novalidate>
          <div class="fields">
            <div class="row">
              <FormField control={p.form.get('given_name')} label={() => p.labels().givenName}>
                {(b) => <Input name="given_name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
              </FormField>
              <FormField control={p.form.get('family_name')} label={() => p.labels().familyName}>
                {(b) => <Input name="family_name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
              </FormField>
            </div>
            <FormField control={p.form.get('locale')} label={() => p.labels().language}>
              {(b) => (
                <idp-segmented
                  options={[
                    { value: 'fr', label: p.labels().languages.fr },
                    { value: 'en', label: p.labels().languages.en },
                  ]}
                  value={b.value()}
                  label={p.labels().language}
                  size="md"
                  onChange={(event) => b.onChange(event.detail.value === 'en' ? 'en' : 'fr')}
                />
              )}
            </FormField>
            <div class="row">
              <FormField control={p.form.get('country')} label={() => p.labels().country} description={() => p.labels().countryHint}>
                {(b) => (
                  <bc-country-select
                    name="country"
                    value={b.value()}
                    locale={p.locale()}
                    aria-label={p.labels().country}
                    onChange={(event) => b.onChange(event.detail.value)}
                  />
                )}
              </FormField>
              <FormField control={p.form.get('phone')} label={() => p.labels().phone} description={() => p.labels().phoneHint}>
                {(b) => (
                  <bc-phone-input
                    name="phone"
                    value={b.value()}
                    country={p.form.get('country').value()}
                    locale={p.locale()}
                    aria-label={p.labels().phone}
                    aria-invalid={b['aria-invalid']()}
                    onInput={(event) => p.typePhone(event.detail.value)}
                    onChange={(event) => b.onChange(event.detail.value)}
                  />
                )}
              </FormField>
            </div>
            <h3 class="sub-title">{() => p.labels().address}</h3>
            <FormField control={p.form.get('street_address')} label={() => p.labels().street}>
              {(b) => <Textarea name="street_address" rows={2} value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
            <div class="row">
              <FormField control={p.form.get('postal_code')} label={() => p.labels().postalCode}>
                {(b) => <Input name="postal_code" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
              </FormField>
              <FormField control={p.form.get('locality')} label={() => p.labels().locality}>
                {(b) => <Input name="locality" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
              </FormField>
            </div>
            <div class="row">
              <FormField control={p.form.get('region')} label={() => p.labels().region}>
                {(b) => <Input name="region" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
              </FormField>
              <FormField control={p.form.get('address_country')} label={() => p.labels().addressCountry}>
                {(b) => (
                  <bc-country-select
                    name="address_country"
                    value={b.value()}
                    locale={p.locale()}
                    aria-label={p.labels().addressCountry}
                    onChange={(event) => b.onChange(event.detail.value)}
                  />
                )}
              </FormField>
            </div>
            <div>
              <Button type="submit" variant="solid" disabled={p.busy()}>
                {() => p.labels().save}
              </Button>
            </div>
          </div>
        </Form>
      </section>
      <section class="card">
        <h2>{() => p.labels().organizations}</h2>
        <Show when={p.page()?.organizations.length} fallback={<p class="muted">{() => p.labels().noOrganization}</p>}>
          <ul>
            <For each={p.page()?.organizations ?? []}>
              {(org) => (
                <li>
                  <span>
                    {org.name}
                    <Show when={org.platform}>
                      {' '}
                      <span class="tag" data-tone="accent">{() => p.labels().platform}</span>
                    </Show>
                  </span>
                  <span class="tag">{() => p.labels().roles[org.role]}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
    </div>
    <div class="column">
      <section class="card">
        <h2>{() => p.labels().account}</h2>
        <dl>
          <dt>{() => p.labels().email}</dt>
          <dd>
            {() => p.user()?.email ?? ''}
            <span class="tag" data-tone={() => (p.user()?.email_verified ? 'ok' : 'warn')}>
              {() => (p.user()?.email_verified ? p.labels().verified : p.labels().unverified)}
            </span>
          </dd>
          <dt>{() => p.labels().signedUp}</dt>
          <dd>{() => p.date(p.user()?.created_at)}</dd>
          <dt>{() => p.labels().lastSignIn}</dt>
          <dd>{() => p.date(p.user()?.last_sign_in_at) || p.labels().never}</dd>
          <dt>{() => p.labels().password}</dt>
          <dd>{() => (p.user()?.password_set ? p.labels().passwordSet : p.labels().passwordInvited)}</dd>
          <dt>{() => p.labels().twoStep}</dt>
          <dd>{() => (p.user()?.mfa ? p.labels().on : p.labels().off)}</dd>
          <dt>{() => p.labels().sessions}</dt>
          <dd>{() => String(p.page()?.active_sessions ?? 0)}</dd>
          <dt>{() => p.labels().portal}</dt>
          <dd>
            {() =>
              p.user()?.developer_since
                ? `${p.labels().portalSince} ${p.date(p.user()?.developer_since)}`
                : p.labels().noPortal
            }
          </dd>
        </dl>
      </section>
      <section class="card">
        <h2>{() => p.labels().security}</h2>
        <Show
          when={!p.user()?.superadmin && !p.self()}
          fallback={<p class="muted">{() => (p.self() ? p.labels().yourselfHelp : p.labels().superadminHelp)}</p>}
        >
          <div class="action">
            <Button variant="outline" size="sm" tone="neutral" disabled={p.busy() || !!p.user()?.disabled} onPress={() => void p.act('reset')}>
              {() => p.labels().sendReset}
            </Button>
            <p class="muted">{() => p.labels().sendResetHelp}</p>
          </div>
          <div class="action">
            <Button variant="outline" size="sm" tone="neutral" disabled={p.busy()} onPress={() => void p.act('signOut')}>
              {() => p.labels().signOut}
            </Button>
            <p class="muted">{() => p.labels().signOutHelp}</p>
          </div>
          <Show when={p.user()?.mfa || !!p.user()?.passkeys}>
            <div class="action">
              <Button variant="outline" size="sm" tone="neutral" disabled={p.busy()} onPress={() => void p.act('twoStep')}>
                {() => p.labels().resetTwoStep}
              </Button>
              <p class="muted">{() => p.labels().resetTwoStepHelp}</p>
            </div>
          </Show>
          <Show when={p.managesAdmins()}>
            <div class="action">
              <Button variant="outline" size="sm" tone="neutral" disabled={p.busy()} onPress={() => void p.act('admin')}>
                {() => (p.user()?.roles.includes('admin') ? p.labels().removeAdmin : p.labels().makeAdmin)}
              </Button>
              <p class="muted">{() => p.labels().adminHelp}</p>
            </div>
          </Show>
          <div class="action">
            <Button
              variant="outline"
              size="sm"
              tone={p.user()?.disabled ? 'neutral' : 'danger'}
              disabled={p.busy()}
              onPress={() => void p.act('disabled')}
            >
              {() => (p.user()?.disabled ? p.labels().enable : p.labels().disable)}
            </Button>
            <p class="muted">{() => p.labels().disableHelp}</p>
          </div>
        </Show>
        <Show when={p.notice()}>
          <p class="notice" role="status">
            {() => p.notice()}
          </p>
        </Show>
        <Show when={p.error()}>
          <p class="alert" role="alert">
            {() => p.error()}
          </p>
        </Show>
      </section>
    </div>
  </div>
);

export const UserProfileView = viewToken<UserProfileLogic>('idp-user-profile', userProfileView);
