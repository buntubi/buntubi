/** The default look: one card, a checkbox per provider the deployment offers, then the sign-up switch. */
import { For, Show } from '@fluixi/core';
import { Checkbox } from '@fluixi-ui/checkbox';
import { Switch } from '@fluixi-ui/switch';
import { viewToken } from '../view.js';
import type { AppSignInLogic } from './logic.js';

export const appSignInView = (s: AppSignInLogic) => (
  <div part="sign-in" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 14px; }
      h2, h3 { margin: 0; font-size: 15px; font-weight: 600; }
      h3 { font-size: 13px; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .intro, .providers { display: grid; gap: 6px; }
      .check { display: flex; align-items: center; gap: 8px; font-size: 13.5px; }
      .setting { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ok { color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
    `}</style>
    <div class="intro">
      <h2>{() => s.labels().title}</h2>
      <p class="hint">{() => s.labels().intro}</p>
    </div>
    <div class="providers">
      <h3>{() => s.labels().providers}</h3>
      <Show when={s.offered().length > 0} fallback={<p class="hint">{() => s.labels().noneOffered}</p>}>
        <For each={s.offered()}>
          {(provider) => (
            <label class="check">
              <Checkbox
                checked={s.offers(provider.id)}
                disabled={!s.canEdit() || s.busy()}
                onChange={(checked) => s.setOffers(provider.id, checked === true)}
              />
              {provider.label}
            </label>
          )}
        </For>
      </Show>
    </div>
    <div class="providers">
      <h3>{() => s.labels().profileFields}</h3>
      <Show when={s.fieldsOffered().length > 0} fallback={<p class="hint">{() => s.labels().noProfileFields}</p>}>
        <p class="hint">{() => s.labels().profileFieldsHelp}</p>
        <For each={s.fieldsOffered()}>
          {(field) => (
            <label class="check">
              <Checkbox
                checked={s.needs(field.key)}
                disabled={!s.canEdit() || s.busy()}
                onChange={(checked) => s.setNeeds(field.key, checked === true)}
              />
              {field.label}
            </label>
          )}
        </For>
      </Show>
    </div>
    <div class="intro">
      <div class="setting">
        <h3>{() => s.labels().signup}</h3>
        <Switch
          aria-label={s.labels().signup}
          checked={s.signupOpen()}
          disabled={!s.canEdit() || s.busy()}
          onChange={(on) => s.setSignupOpen(on)}
        />
      </div>
      <p class="hint">{() => s.labels().signupHelp}</p>
    </div>
    <Show when={s.saved()}>
      <span class="ok" role="status">{() => s.labels().saved}</span>
    </Show>
    <Show when={s.error()}>
      <p class="alert" role="alert">
        {() => s.error()}
      </p>
    </Show>
  </div>
);

export const AppSignInView = viewToken<AppSignInLogic>('idp-app-sign-in', appSignInView);
