/** The default look, after the board: the state with its button, the app and codes rows, then the current step. */
import { css, For, Match, Show, Switch } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { TwoStepSectionLogic } from './logic.js';

const styles = css`
  .head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 18px; }
  .head > div { flex: 1; min-width: 220px; display: grid; gap: 2px; }
  .title { display: flex; align-items: center; gap: 8px; }
  .head h2 { padding: 0; }
  .item { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--idp-border); }
  .icon { width: 32px; height: 32px; flex: none; border-radius: 9px; display: grid; place-items: center; background: var(--idp-surface-2); }
  .icon.warn { color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 14%, transparent); }
  .text { flex: 1; min-width: 200px; display: grid; }
  .name { font-weight: 500; }
  .sub { color: var(--idp-muted); font-size: 12.5px; }
  .sub.warn { color: var(--idp-warn); }
  .narrow { max-width: 380px; }
  .qr { width: 180px; height: 180px; border-radius: 12px; background: #fff; }
  .key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all; }
  .codes { display: grid; grid-template-columns: repeat(2, max-content); gap: 8px 32px; margin: 0; padding: 14px 16px; border-radius: 12px; background: var(--idp-surface); list-style: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; letter-spacing: 0.04em; }
  .note { margin: 0; color: var(--idp-muted); font-size: 13px; }
`;

const PHONE = 'M7 2h10v20H7zM11 18h2';
const GRID = 'M4 6h16v12H4zM8 10h2M14 10h2M8 14h2M14 14h2';

const icon = (path: string, warn: () => boolean) => (
  <span class={() => (warn() ? 'icon warn' : 'icon')} aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d={path} />
    </svg>
  </span>
);

export const twoStepSectionView = (t: TwoStepSectionLogic) => (
  <section part="two-step" class="card" aria-labelledby="idp-two-step-title">
    <style scoped>{`${infoStyles}${styles}`}</style>
    <div class="head">
      <div>
        <span class="title">
          <h2 id="idp-two-step-title">{() => t.labels().title}</h2>
          <Show when={t.enabled()} fallback={<span class="pill warn">{() => t.labels().off}</span>}>
            <span class="pill ok">{() => t.labels().on}</span>
          </Show>
        </span>
        <span class="muted">{() => (t.enabled() ? t.labels().aboutOn : t.labels().aboutOff)}</span>
      </div>
      <Show when={t.step() === 'idle'}>
        <Show
          when={t.enabled()}
          fallback={
            <Button variant="solid" size="sm" disabled={t.busy()} onPress={() => void t.begin()}>
              {() => t.labels().turnOn}
            </Button>
          }
        >
          <Button variant="outline" tone="danger" size="sm" onPress={() => t.go('disable')}>
            {() => t.labels().turnOff}
          </Button>
        </Show>
      </Show>
    </div>
    <Show when={t.enabled() && t.step() !== 'codes'}>
      <div class="item">
        {icon(PHONE, () => false)}
        <span class="text">
          <span class="name">{() => t.labels().app}</span>
          <span class="sub">{() => t.added()}</span>
        </span>
      </div>
      <div class="item">
        {icon(GRID, t.low)}
        <span class="text">
          <span class="name">{() => t.labels().backupCodes}</span>
          <span class={() => (t.low() ? 'sub warn' : 'sub')}>
            {() => t.labels().codesLeft.replace('{n}', String(t.left())).replace('{total}', String(t.total()))}
            {() => (t.low() ? ` ${t.labels().codesLow}` : '')}
          </span>
        </span>
        <Show when={t.step() === 'idle'}>
          <Button variant={t.low() ? 'solid' : 'outline'} tone={t.low() ? undefined : 'neutral'} size="sm" onPress={() => t.go('renew')}>
            {() => t.labels().renew}
          </Button>
        </Show>
      </div>
    </Show>
    <Switch>
      <Match when={t.step() === 'codes'}>
        <div class="edit">
          <p class="note">{() => t.labels().saveCodes}</p>
          <ol class="codes">
            <For each={t.codes()}>{(code) => <li>{code}</li>}</For>
          </ol>
          <div class="buttons">
            <Button variant="outline" tone="neutral" size="sm" onPress={() => t.copy()}>
              {() => (t.copied() ? t.labels().copied : t.labels().copy)}
            </Button>
            <Button variant="solid" size="sm" onPress={() => t.go('idle')}>
              {() => t.labels().done}
            </Button>
          </div>
        </div>
      </Match>
      <Match when={t.step() !== 'idle'}>
        <Form form={t.form} onSubmit={(values) => t.submit(values)} novalidate>
          <div class="edit">
            <Show when={t.step() === 'enrolling'} fallback={<p class="note">{() => t.labels().confirmWithCode}</p>}>
              <p class="note">{() => t.labels().scan}</p>
              <img class="qr" src={t.enrolment()?.qr ?? ''} alt="" width="180" height="180" />
              <p class="note">
                {() => t.labels().manual} <code class="key">{() => t.enrolment()?.secret ?? ''}</code>
              </p>
            </Show>
            <div class="narrow">
              <FormField control={t.form.get('code')} label={() => t.labels().code}>
                {(b) => (
                  <Input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
                )}
              </FormField>
            </div>
            <Show when={t.error()}>
              <p class="alert" role="alert">
                {() => t.error()}
              </p>
            </Show>
            <div class="buttons">
              <Button type="submit" variant="solid" tone={t.step() === 'disable' ? 'danger' : undefined} size="sm" disabled={t.busy()}>
                {() => (t.step() === 'enrolling' ? t.labels().confirmOn : t.step() === 'renew' ? t.labels().renew : t.labels().turnOff)}
              </Button>
              <Button variant="outline" tone="neutral" size="sm" onPress={() => t.go('idle')}>
                {() => t.labels().cancel}
              </Button>
            </div>
          </div>
        </Form>
      </Match>
    </Switch>
    <Show when={t.step() === 'idle' && t.error()}>
      <p class="alert" role="alert">
        {() => t.error()}
      </p>
    </Show>
  </section>
);

export const TwoStepSectionView = viewToken<TwoStepSectionLogic>('TwoStepSectionView', twoStepSectionView);
