/** The default look: the why, the two options in one card, and "not now"; then the setup or the done note. */
import { css, Match, Show, Switch } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { SecureAccountLogic } from './logic.js';

const KEY = 'M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zM16.5 9.5h.01';
const PHONE = 'M7 2h10v20H7zM11 18h2';

const styles = css`
  .secure { display: grid; gap: 16px; }
  .intro { margin: 0; color: var(--idp-muted); font-size: 14px; line-height: 1.55; }
  .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); overflow: clip; }
  .card > :deep(idp-secure-option) { display: block; }
  .card > :deep(idp-secure-option + idp-secure-option) { border-top: 1px solid var(--idp-border); }
  .later { display: grid; gap: 6px; justify-items: center; text-align: center; }
  .note { margin: 0; color: var(--idp-muted); font-size: 12.5px; }
  .done { margin: 0; display: flex; gap: 10px; align-items: center; font-weight: 600; }
  .tick { width: 28px; height: 28px; flex: none; border-radius: 999px; display: grid; place-items: center; color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 14%, transparent); }
  .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
  .setup { display: block; font-size: 14px; }
`;

export const secureAccountView = (s: SecureAccountLogic) => (
  <div part="secure-account" class="secure">
    <style scoped>{`${styles}`}</style>
    <Switch>
      <Match when={s.step() === 'choose'}>
        <p class="intro">{() => s.labels().intro}</p>
        <div class="card">
          <Show when={s.passkeys()}>
            <idp-secure-option
              icon={KEY}
              title={s.labels().passkey.title}
              text={s.labels().passkey.text}
              badge={s.labels().passkey.badge}
              action={s.labels().passkey.action}
              busy={s.busy()}
              onChoose={() => void s.addPasskey()}
            />
          </Show>
          <idp-secure-option
            icon={PHONE}
            title={s.labels().app.title}
            text={s.labels().app.text}
            action={s.labels().app.action}
            busy={s.busy()}
            onChoose={() => s.setUpApp()}
          />
        </div>
        <Show when={s.error()}>
          <p class="alert" role="alert">
            {() => s.error()}
          </p>
        </Show>
        <div class="later">
          <Button variant="ghost" tone="neutral" disabled={s.busy()} onPress={() => s.answer()}>
            {() => s.labels().later}
          </Button>
          <p class="note">{() => s.labels().laterNote}</p>
        </div>
      </Match>
      <Match when={s.step() === 'app'}>
        <idp-two-step-section
          class="setup"
          start
          labels={s.twoStepLabels()}
          describe={s.describe()}
          onEnabled={() => s.appEnabled()}
          onCancel={() => s.back()}
        />
      </Match>
      <Match when={s.step() === 'done'}>
        <p class="done">
          <span class="tick" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          {() => s.done()}
        </p>
        <Button variant="solid" onPress={() => s.answer()}>
          {() => s.labels().continue}
        </Button>
      </Match>
    </Switch>
  </div>
);

export const SecureAccountView = viewToken<SecureAccountLogic>('SecureAccountView', secureAccountView);
