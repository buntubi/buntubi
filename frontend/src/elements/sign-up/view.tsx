/** The default look of idp-sign-up. */
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntu/sdk/view';
import type { SignUpLogic } from './sign-up.js';

export const signUpView = ({ error, form, label, pending, submit }: SignUpLogic) =>
  (
      <Form form={form} onSubmit={submit} class="idp-form" novalidate>
        {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
        <div class="idp-row">
          <FormField control={form.get('givenName')} label={() => label().givenName}>
            {(b) => (
              <Input name="given_name" autocomplete="given-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
          <FormField control={form.get('familyName')} label={() => label().familyName}>
            {(b) => (
              <Input name="family_name" autocomplete="family-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
        </div>
        <FormField control={form.get('email')} label={() => label().email}>
          {(b) => (
            <Input type="email" name="email" autocomplete="email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
          )}
        </FormField>
        <FormField control={form.get('password')} label={() => label().password} description={() => label().passwordHint}>
          {(b) => (
            <Input
              type="password"
              name="password"
              autocomplete="new-password"
              value={b.value()}
              onInput={b.onInput}
              onBlur={b.onBlur}
            />
          )}
        </FormField>
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
      </Form>
    );

export const SignUpView = viewToken<SignUpLogic>('idp-sign-up', signUpView);
