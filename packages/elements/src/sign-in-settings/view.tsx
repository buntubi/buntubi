/** The default look: a row per provider with its state, then sign-up and the profile fields. */
import { For, Show } from '@fluixi/core';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { SignInSettingsLogic } from './logic.js';

export const signInSettingsView = (s: SignInSettingsLogic) => (
  <Show when={s.settings()}>
    <section part="sign-in-settings" class="card" aria-labelledby="idp-sign-in-settings-title">
      <style scoped>{`${infoStyles}
        .about { margin: 0; padding: 0 18px 14px; font-size: 13px; }
        .state[data-on] { color: var(--idp-ok); }
      `}</style>
      <h2 id="idp-sign-in-settings-title">{() => s.labels().title}</h2>
      <p class="muted about">{() => s.labels().about}</p>
      <For each={s.settings()?.providers ?? []}>
        {(provider) => (
          <div class="row" data-provider={provider.id}>
            <span class="label">{provider.label}</span>
            <span class="value">
              <span class="state" data-on={s.state(provider).on ? '' : undefined}>
                {() => s.state(provider).text}
              </span>
            </span>
          </div>
        )}
      </For>
      <div class="row">
        <span class="label">{() => s.labels().signup}</span>
        <span class="value">{() => (s.settings()?.signup_open ? s.labels().signupOpen : s.labels().signupInvited)}</span>
      </div>
      <div class="row">
        <span class="label">{() => s.labels().profileFields}</span>
        <span class="value">{() => (s.fields().length ? s.fields().join(', ') : s.labels().noFields)}</span>
      </div>
    </section>
  </Show>
);

export const SignInSettingsView = viewToken<SignInSettingsLogic>('idp-sign-in-settings', signInSettingsView);
