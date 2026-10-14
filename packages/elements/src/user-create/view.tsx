/** The default look: a card, the person's fields, then how they get in. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { CreateMode, UserCreateLogic } from './logic.js';
import '../segmented/segmented.js';

export const userCreateView = (f: UserCreateLogic) => (
  <section part="user-create" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 16px; max-width: 640px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .fields { display: grid; gap: 14px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .choice { display: grid; gap: 6px; justify-items: start; font-size: 13px; font-weight: 500; }
      .help { margin: 0; color: var(--idp-muted); font-size: 13px; font-weight: 400; max-width: 560px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
    `}</style>
    <h2>{() => f.labels().title}</h2>
    <Form form={f.form} onSubmit={(values) => f.submit(values)} novalidate>
      <div class="fields">
        <FormField control={f.form.get('email')} label={() => f.labels().email} required>
          {(b) => <Input type="email" name="email" autocomplete="off" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <div class="row">
          <FormField control={f.form.get('given_name')} label={() => f.labels().givenName}>
            {(b) => <Input name="given_name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
          </FormField>
          <FormField control={f.form.get('family_name')} label={() => f.labels().familyName}>
            {(b) => <Input name="family_name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
          </FormField>
        </div>
        <FormField control={f.form.get('locale')} label={() => f.labels().language}>
          {(b) => (
            <idp-segmented
              options={[
                { value: 'fr', label: f.labels().languages.fr },
                { value: 'en', label: f.labels().languages.en },
              ]}
              value={b.value()}
              label={f.labels().language}
              size="md"
              onChange={(event) => b.onChange(event.detail.value === 'en' ? 'en' : 'fr')}
            />
          )}
        </FormField>
        <div class="choice">
          <span>{() => f.labels().mode}</span>
          <idp-segmented
            options={[
              { value: 'invite', label: f.labels().modes.invite },
              { value: 'password', label: f.labels().modes.password },
            ]}
            value={f.mode()}
            label={f.labels().mode}
            size="md"
            onChange={(event) => f.setMode(event.detail.value as CreateMode)}
          />
          <p class="help">{() => (f.mode() === 'invite' ? f.labels().inviteHelp : f.labels().passwordHelp)}</p>
        </div>
        <Show when={f.mode() === 'password'}>
          <FormField control={f.form.get('password')} label={() => f.labels().password} required>
            {(b) => (
              <Input type="password" name="password" autocomplete="new-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
        </Show>
        <Show when={f.error()}>
          <p class="alert" role="alert">
            {() => f.error()}
          </p>
        </Show>
        <div>
          <Button type="submit" variant="solid" disabled={f.busy()}>
            {() => (f.busy() ? f.labels().pending : f.labels().create)}
          </Button>
        </div>
      </div>
    </Form>
  </section>
);

export const UserCreateView = viewToken<UserCreateLogic>('idp-user-create', userCreateView);
