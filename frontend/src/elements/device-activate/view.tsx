/** The default look of idp-device-activate. */
import { PinInput } from '@fluixi-ui/pin-input';
import { Button } from '@fluixi-ui/button';
import { clean, CODE_LENGTH } from './device-activate.js';
import { viewToken } from '@buntubi/sdk/view';
import type { DeviceActivateLogic } from './device-activate.js';

export const deviceActivateView = ({ code, decide, label, pending, problem }: DeviceActivateLogic) =>
  (
      <div class="idp-form">
        <p class="idp-note">{() => label().intro}</p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        <PinInput
          class="idp-code"
          type="alphanumeric"
          length={CODE_LENGTH}
          aria-label={() => label().code}
          value={code()}
          onValueChange={(value: string) => code.set(clean(value))}
        />
        <div class="idp-actions">
          <Button type="button" variant="outline" disabled={pending()} onPress={() => decide(false)}>
            {() => label().deny}
          </Button>
          <Button type="button" variant="solid" disabled={pending()} onPress={() => decide(true)}>
            {() => (pending() ? label().pending : label().approve)}
          </Button>
        </div>
      </div>
    );

export const DeviceActivateView = viewToken<DeviceActivateLogic>('idp-device-activate', deviceActivateView);
