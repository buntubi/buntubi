/** The default look: the title and last change with the button, then the form under it. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Checkbox } from '@fluixi-ui/checkbox';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { PasswordSectionLogic } from './logic.js';

export const passwordSectionView = (p: PasswordSectionLogic) => (
  <section part="password" class="card" aria-labelledby="idp-password-title">
    <style scoped>{`${infoStyles}
      .head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 18px; }
      .head > div { flex: 1; min-width: 220px; display: grid; gap: 2px; }
      .head h2 { padding: 0; }
      .narrow { display: grid; gap: 12px; max-width: 380px; }
      .check { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
    `}</style>
    <div class="head">
      <div>
        <h2 id="idp-password-title">{() => p.labels().title}</h2>
        <span class="muted">{() => (p.hasPassword() ? p.changed() : p.labels().noPassword)}</span>
      </div>
      <Show when={p.hasPassword() && !p.editing()}>
        <Button variant="outline" tone="neutral" size="sm" onPress={() => p.setEditing(true)}>
          {() => p.labels().change}
        </Button>
      </Show>
    </div>
    <Show when={p.editing()}>
      <Form form={p.form} onSubmit={(values) => p.save(values)} novalidate>
        <div class="edit">
          <div class="narrow">
            <FormField control={p.form.get('current_password')} label={() => p.labels().current}>
              {(b) => (
                <Input type="password" name="current_password" autocomplete="current-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
              )}
            </FormField>
            <FormField control={p.form.get('new_password')} label={() => p.labels().next} description={() => p.labels().nextHint}>
              {(b) => <Input type="password" name="new_password" autocomplete="new-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
          </div>
          <label class="check">
            <Checkbox
              checked={p.signOutOthers()}
              onChange={(checked) => p.setSignOutOthers(checked === true)}
            />
            {() => p.labels().signOutOthers}
          </label>
          <Show when={p.error()}>
            <p class="alert" role="alert">
              {() => p.error()}
            </p>
          </Show>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={p.busy()}>
              {() => p.labels().save}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => p.setEditing(false)}>
              {() => p.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show when={p.notice()}>
      <p class="done" role="status">
        {() => p.notice()}
      </p>
    </Show>
  </section>
);

export const PasswordSectionView = viewToken<PasswordSectionLogic>('PasswordSectionView', passwordSectionView);
