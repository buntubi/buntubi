/** The default look of idp-mfa-verify. */
import { Show } from '@fluixi/core';
import { PinInput } from '@fluixi-ui/pin-input';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntubi/sdk/view';
import type { MfaVerifyLogic } from './mfa-verify.js';

export const mfaVerifyView = ({ askPasskey, backup, canPasskey, code, label, passkey, pending, problem, submit, toggle }: MfaVerifyLogic) =>
  (
      <form
        class="idp-form"
        novalidate
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <p class="idp-note">{() => (backup() ? label().backupIntro : label().intro)}</p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        <Show
          when={backup()}
          fallback={
            <PinInput
              class="idp-code"
              length={6}
              otp
              aria-label={label().code}
              value={code()}
              onValueChange={(value: string) => code.set(value)}
              onComplete={submit}
            />
          }
        >
          {() => (
            <Input
              name="backup_code"
              autocomplete="off"
              aria-label={label().backupCode}
              placeholder="XXXX-XXXX"
              value={code()}
              onInput={(event: InputEvent) => code.set((event.currentTarget as HTMLInputElement).value)}
            />
          )}
        </Show>
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
        <Show when={canPasskey()}>
          <Button type="button" variant="outline" tone="neutral" data-part="passkey" disabled={passkey.pending()} onPress={askPasskey}>
            {() => (passkey.pending() ? label().passkeyPending : label().usePasskey)}
          </Button>
        </Show>
        <Button type="button" variant="ghost" onPress={toggle}>
          {() => (backup() ? label().useApp : label().useBackup)}
        </Button>
      </form>
    );

export const MfaVerifyView = viewToken<MfaVerifyLogic>('idp-mfa-verify', mfaVerifyView);
