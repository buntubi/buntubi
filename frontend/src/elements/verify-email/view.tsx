/** The default look of idp-verify-email. */
import { PinInput } from '@fluixi-ui/pin-input';
import { Button } from '@fluixi-ui/button';
import { CODE_LENGTH } from './verify-email.js';
import { viewToken } from '@buntubi/sdk/view';
import type { VerifyEmailLogic } from './verify-email.js';

export const verifyEmailView = ({ askAgain, code, label, problem, resend, resent, submit, verify, email }: VerifyEmailLogic) =>
  (
      <form
        class="idp-form"
        novalidate
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <p class="idp-note">
          {() => label().sentTo} <strong>{() => email()}</strong>
        </p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        {() => (resent() ? <p class="idp-note" role="status">{label().resent}</p> : null)}
        <PinInput
          class="idp-code"
          length={CODE_LENGTH}
          otp
          aria-label={() => label().code}
          value={code()}
          onValueChange={(value: string) => code.set(value)}
          onComplete={submit}
        />
        <Button type="submit" variant="solid" data-part="submit" disabled={verify.pending()}>
          {() => (verify.pending() ? label().pending : label().submit)}
        </Button>
        <Button type="button" variant="ghost" disabled={resend.pending()} onPress={askAgain}>
          {() => label().resend}
        </Button>
      </form>
    );

export const VerifyEmailView = viewToken<VerifyEmailLogic>('idp-verify-email', verifyEmailView);
