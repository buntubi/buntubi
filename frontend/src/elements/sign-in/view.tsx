/** The default look: the fields, the forgotten-password link, then the passkey button. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '@buntubi/sdk/view';
import type { SignInLogic } from './logic.js';

export const signInView = (s: SignInLogic) => (
  <Form form={s.form} onSubmit={s.submit} class="idp-form" novalidate>
    {() => (s.error() ? <p class="idp-alert" role="alert">{s.error()}</p> : null)}
    {() => (s.passkeyError() ? <p class="idp-alert" role="alert">{s.passkeyError()}</p> : null)}
    <FormField control={s.form.get('email')} label={() => s.labels().email}>
      {(b) => (
        <Input type="email" name="email" autocomplete="username webauthn" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
      )}
    </FormField>
    <FormField control={s.form.get('password')} label={() => s.labels().password}>
      {(b) => (
        <Input type="password" name="password" autocomplete="current-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
      )}
    </FormField>
    {() => (s.forgotHref() ? <a class="idp-link" href={s.forgotHref()}>{s.labels().forgot}</a> : null)}
    <Button type="submit" variant="solid" data-part="submit" disabled={s.pending()}>
      {() => (s.pending() ? s.labels().pending : s.labels().submit)}
    </Button>
    <Show when={s.canPasskey()}>
      <p class="idp-or">{() => s.labels().or}</p>
      <Button type="button" variant="outline" tone="neutral" data-part="passkey" disabled={s.passkeyPending()} onPress={s.askPasskey}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 11a4 4 0 1 1 3.9-4.9M12 7h9l-2 2 2 2-2 2M3 21v-2a4 4 0 0 1 4-4h3" />
        </svg>
        {() => (s.passkeyPending() ? s.labels().passkeyPending : s.labels().passkey)}
      </Button>
    </Show>
  </Form>
);

export const SignInView = viewToken<SignInLogic>('idp-sign-in', signInView);
