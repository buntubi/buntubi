/** The default look: a full-width outline button with the provider's mark before its text. */
import { For } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { SocialButtonLogic } from './logic.js';

export const socialButtonView = (b: SocialButtonLogic) => (
  <div part="social-button" data-provider={b.provider()} class="social">
    <style scoped>{`
      .social > :deep(button) { width: 100%; justify-content: center; }
      .mark { display: inline-flex; margin-inline-end: 10px; }
      svg { width: 18px; height: 18px; }
      svg path:not([fill]) { fill: currentColor; }
    `}</style>
    <Button variant="outline" tone="neutral" onPress={() => b.go()}>
      {() => {
        const icon = b.icon();
        return icon ? (
          <span class="mark">
            <svg viewBox={icon.viewBox} aria-hidden="true" focusable="false">
              <For each={icon.paths}>{(path) => <path d={path.d} fill={path.fill} />}</For>
            </svg>
          </span>
        ) : null;
      }}
      {() => b.label()}
    </Button>
  </div>
);

export const SocialButtonView = viewToken<SocialButtonLogic>('idp-social-button', socialButtonView);
