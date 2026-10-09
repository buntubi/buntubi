/** The default look: the terms in a narrow column, then the acceptance. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { DeveloperTermsLogic } from './logic.js';

export const developerTermsView = (d: DeveloperTermsLogic) => (
  <section part="terms" class="terms">
    <style scoped>{`
      .terms { max-width: 560px; margin: 0 auto; padding: 48px 0; display: grid; gap: 14px; justify-items: start; }
      h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--idp-muted); line-height: 1.55; }
      .alert { color: var(--idp-bad); font-size: 13px; }
    `}</style>
    <h1>{() => d.labels().title}</h1>
    <p>{() => d.labels().text}</p>
    <Show when={d.error()}>
      <p class="alert" role="alert">
        {() => d.error()}
      </p>
    </Show>
    <Button variant="solid" disabled={d.busy()} onPress={() => void d.accept()}>
      {() => d.labels().accept}
    </Button>
  </section>
);

export const DeveloperTermsView = viewToken<DeveloperTermsLogic>('DeveloperTermsView', developerTermsView);
