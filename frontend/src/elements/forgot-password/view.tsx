/** The default look of idp-forgot-password. */
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntubi/sdk/view';
import type { ForgotPasswordLogic } from './forgot-password.js';

export const forgotPasswordView = ({ error, form, label, pending, sent, submit }: ForgotPasswordLogic) =>
  () =>
      sent() ? (
        <div class="idp-form">
          <p class="idp-note" role="status">{label().sent}</p>
        </div>
      ) : (
        <Form form={form} onSubmit={submit} class="idp-form" novalidate>
          <p class="idp-note">{() => label().intro}</p>
          {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
          <FormField control={form.get('email')} label={() => label().email}>
            {(b) => (
              <Input type="email" name="email" autocomplete="email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
          <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
            {() => (pending() ? label().pending : label().submit)}
          </Button>
        </Form>
      );

export const ForgotPasswordView = viewToken<ForgotPasswordLogic>('idp-forgot-password', forgotPasswordView);
