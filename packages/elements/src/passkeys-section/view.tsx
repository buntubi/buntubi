/** The default look, after the board: the title with the add button, then one row per passkey. */
import { css, For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { PasskeysSectionLogic } from './logic.js';

const styles = css`
  .head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 18px; }
  .head > div { flex: 1; min-width: 220px; display: grid; gap: 2px; }
  .head h2 { padding: 0; }
  .item { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--idp-border); }
  .icon { width: 32px; height: 32px; flex: none; border-radius: 9px; display: grid; place-items: center; background: var(--idp-surface-2); }
  .text { flex: 1; min-width: 200px; display: grid; }
  .name { font-weight: 500; }
  .sub { color: var(--idp-muted); font-size: 12.5px; }
  .ask { flex: 1; min-width: 200px; font-size: 13.5px; }
  .narrow { max-width: 380px; }
  .note { margin: 0; padding: 0 18px 14px; color: var(--idp-muted); font-size: 13px; }
  .plus { display: inline-flex; }
`;

const KEY = 'M8 11a4 4 0 1 1 3.9-4.9M12 7h9l-2 2 2 2-2 2M3 21v-2a4 4 0 0 1 4-4h3';

export const passkeysSectionView = (k: PasskeysSectionLogic) => (
  <section part="passkeys" class="card" aria-labelledby="idp-passkeys-title">
    <style scoped>{`${infoStyles}${styles}`}</style>
    <div class="head">
      <div>
        <h2 id="idp-passkeys-title">{() => k.labels().title}</h2>
        <span class="muted">{() => k.labels().about}</span>
      </div>
      <Show when={k.supported()}>
        <Button variant="solid" size="sm" disabled={k.busy()} onPress={() => void k.add()}>
          <svg class="plus" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {() => (k.busy() && !k.renaming() && !k.removing() ? k.labels().adding : k.labels().add)}
        </Button>
      </Show>
    </div>
    <Show when={!k.supported()}>
      <p class="note">{() => k.labels().unsupported}</p>
    </Show>
    <Show when={k.askingPassword()}>
      <Form form={k.reauthForm} onSubmit={(values) => k.reauth(values)} novalidate>
        <div class="edit">
          <span class="muted">{() => k.labels().reauth}</span>
          <div class="narrow">
            <FormField control={k.reauthForm.get('password')} label={() => k.labels().password}>
              {(b) => (
                <Input type="password" name="password" autocomplete="current-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
              )}
            </FormField>
          </div>
          <Show when={k.error()}>
            <p class="alert" role="alert">
              {() => k.error()}
            </p>
          </Show>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={k.busy()}>
              {() => k.labels().continue}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => k.cancel()}>
              {() => k.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show when={k.rows().length} fallback={<p class="note">{() => k.labels().empty}</p>}>
      <For each={k.rows()} by={(row) => row.id}>
        {(row) => (
          <Show
            when={k.renaming() === row().id}
            fallback={
              <div class="item">
                <span class="icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d={KEY} />
                  </svg>
                </span>
                <Show
                  when={k.removing() === row().id}
                  fallback={
                    <>
                      <span class="text">
                        <span class="name">{() => row().name}</span>
                        <span class="sub">{() => row().detail}</span>
                      </span>
                      <Button variant="outline" tone="neutral" size="sm" onPress={() => k.startRename(row())}>
                        {() => k.labels().rename}
                      </Button>
                      <Button variant="outline" tone="danger" size="sm" aria-label={`${k.labels().remove} ${row().name}`} onPress={() => k.askRemove(row())}>
                        {() => k.labels().remove}
                      </Button>
                    </>
                  }
                >
                  <span class="ask">{() => k.labels().removeAsk.replace('{name}', row().name)}</span>
                  <Button variant="solid" tone="danger" size="sm" disabled={k.busy()} onPress={() => void k.remove(row().id)}>
                    {() => k.labels().removeConfirm}
                  </Button>
                  <Button variant="outline" tone="neutral" size="sm" onPress={() => k.askRemove(null)}>
                    {() => k.labels().cancel}
                  </Button>
                </Show>
              </div>
            }
          >
            <Form form={k.nameForm} onSubmit={(values) => k.rename(values)} novalidate>
              <div class="edit">
                <div class="narrow">
                  <FormField control={k.nameForm.get('name')} label={() => k.labels().name}>
                    {(b) => <Input name="name" maxlength={64} value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
                  </FormField>
                </div>
                <div class="buttons">
                  <Button type="submit" variant="solid" size="sm" disabled={k.busy()}>
                    {() => k.labels().save}
                  </Button>
                  <Button variant="outline" tone="neutral" size="sm" onPress={() => k.cancel()}>
                    {() => k.labels().cancel}
                  </Button>
                </div>
              </div>
            </Form>
          </Show>
        )}
      </For>
    </Show>
    <Show when={!k.askingPassword() && k.error()}>
      <p class="alert" role="alert">
        {() => k.error()}
      </p>
    </Show>
    <Show when={k.notice()}>
      <p class="done" role="status">
        {() => k.notice()}
      </p>
    </Show>
  </section>
);

export const PasskeysSectionView = viewToken<PasskeysSectionLogic>('PasskeysSectionView', passkeysSectionView);
