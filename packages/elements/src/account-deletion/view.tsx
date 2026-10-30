/** The default look, after the board: a red-edged card, what stops the deletion, then the confirmation. */
import { css, Show } from '@fluixi/core';
import { Alert } from '@fluixi-ui/alert';
import { Button } from '@fluixi-ui/button';
import { Card } from '@fluixi-ui/card';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { AccountDeletionLogic } from './logic.js';

const styles = css`
  .card { --flx-ui-card-border: 1px solid color-mix(in srgb, var(--flx-ui-color-danger) 40%, var(--flx-ui-color-border)); display: grid; gap: 12px; padding: 18px; }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .about { margin: 0; max-width: 640px; color: var(--idp-muted); font-size: 13px; }
  .block a { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
  .fields { display: grid; gap: 12px; max-width: 380px; }
  .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
`;

export const accountDeletionView = (d: AccountDeletionLogic) => (
  <Card part="account-deletion" class="card" aria-labelledby="idp-deletion-title" role="region">
    <style scoped>{`${styles}`}</style>
    <h2 id="idp-deletion-title">{() => d.labels().title}</h2>
    <p class="about">{() => d.labels().about}</p>
    <Show when={d.owned()}>
      <Alert class="block" variant="warning" role="note">
        <span>
          {() => d.labels().owns.replace('{names}', d.owned())} {() => d.labels().ownsAfter}{' '}
          <Show when={d.portalHref()} fallback={<>{() => d.labels().portal}</>}>
            <a href={d.portalHref()}>{() => d.labels().portal}</a>
          </Show>
          .
        </span>
      </Alert>
    </Show>
    <Show when={d.lastAdmin()}>
      <Alert class="block" variant="warning" role="note">
        <span>{() => d.labels().lastAdmin}</span>
      </Alert>
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
  </Card>
);

export const AccountDeletionView = viewToken<AccountDeletionLogic>('idp-account-deletion', accountDeletionView);
