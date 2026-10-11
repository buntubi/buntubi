/** The default look, after the board: a red-edged card, what stops the deletion, then the confirmation. */
import { css, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { AccountDeletionLogic } from './logic.js';

const styles = css`
  .card { display: grid; gap: 12px; padding: 18px; border: 1px solid color-mix(in srgb, var(--idp-bad) 40%, var(--idp-border)); border-radius: var(--idp-radius); background: var(--idp-surface); }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .about { margin: 0; max-width: 640px; color: var(--idp-muted); font-size: 13px; }
  .block { display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--idp-warn) 9%, var(--idp-surface)); font-size: 13px; }
  .block::before { content: ''; width: 8px; height: 8px; margin-top: 6px; flex: none; border-radius: 50%; background: var(--idp-warn); }
  .block a { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
  .fields { display: grid; gap: 12px; max-width: 380px; }
  .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
`;

export const accountDeletionView = (d: AccountDeletionLogic) => (
  <section part="account-deletion" class="card" aria-labelledby="idp-deletion-title">
    <style scoped>{`${styles}`}</style>
    <h2 id="idp-deletion-title">{() => d.labels().title}</h2>
    <p class="about">{() => d.labels().about}</p>
    <Show when={d.owned()}>
      <div class="block" role="note">
        <span>
          {() => d.labels().owns.replace('{names}', d.owned())} {() => d.labels().ownsAfter}{' '}
          <Show when={d.portalHref()} fallback={<>{() => d.labels().portal}</>}>
            <a href={d.portalHref()}>{() => d.labels().portal}</a>
          </Show>
          .
        </span>
      </div>
    </Show>
    <Show when={d.lastAdmin()}>
      <div class="block" role="note">
        <span>{() => d.labels().lastAdmin}</span>
      </div>
    </Show>
    <Show when={!d.blocked()}>
      <Form form={d.form} onSubmit={(values) => d.remove(values)} novalidate>
        <div class="fields">
          <FormField control={d.form.get('email')} label={() => d.labels().confirm}>
            {(b) => <Input type="email" name="confirm-email" autocomplete="off" placeholder={d.email()} value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
          </FormField>
          <Show when={d.passwordNeeded()}>
            <FormField control={d.form.get('password')} label={() => d.labels().password} description={() => d.labels().passwordHint}>
              {(b) => <Input type="password" name="password" autocomplete="current-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
          </Show>
          <Show when={d.error()}>
            <p class="alert" role="alert">
              {() => d.error()}
            </p>
          </Show>
          <div>
            <Button type="submit" variant="outline" tone="danger" size="sm" disabled={!d.matches() || d.busy()}>
              {() => (d.busy() ? d.labels().deleting : d.labels().delete)}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
  </section>
);

export const AccountDeletionView = viewToken<AccountDeletionLogic>('AccountDeletionView', accountDeletionView);
