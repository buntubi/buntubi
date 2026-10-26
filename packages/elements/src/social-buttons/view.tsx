/** The default look: the buttons stacked, then a ruled separator with its word in the middle. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { SocialButtonsLogic } from './logic.js';
import '../social-button/social-button.js';

export const socialButtonsView = (s: SocialButtonsLogic) => (
  <Show when={s.items().length > 0}>
    <div part="social-buttons" class="social">
      <style scoped>{`
        .social { display: grid; gap: 10px; }
        .separator { display: flex; align-items: center; gap: 12px; margin-block: 6px; color: var(--idp-muted); font-size: 13px; }
        .separator::before, .separator::after { content: ''; flex: 1; border-top: 1px solid var(--idp-border); }
      `}</style>
      <For each={s.items()}>{(item) => <idp-social-button provider={item.provider} label={item.label} href={item.href} />}</For>
      <p class="separator" role="separator">
        {() => s.labels().separator}
      </p>
    </div>
  </Show>
);

export const SocialButtonsView = viewToken<SocialButtonsLogic>('idp-social-buttons', socialButtonsView);
