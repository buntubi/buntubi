/** The default look of idp-reset-password. */
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntubi/sdk/view';
import type { ResetPasswordLogic } from './reset-password.js';

export const resetPasswordView = ({ error, form, label, password, pending, submit }: ResetPasswordLogic) =>
  (
      <Form form={form} onSubmit={submit} class="idp-form" novalidate>
        {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
        <FormField control={form.get('password')} label={() => label().password} description={() => label().passwordHint}>
          {(b) => (
            <Input type="password" name="password" autocomplete="new-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
          )}
        </FormField>
        <FormField control={form.get('confirm')} label={() => label().confirm}>
          {(b) => (
            <Input type="password" name="confirm" autocomplete="new-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
          )}
        </FormField>
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
      </Form>
    );

export const ResetPasswordView = viewToken<ResetPasswordLogic>('idp-reset-password', resetPasswordView);
