/** The sign-in notice's default look: a bar with the reason and two actions. */
import { Button } from '@fluixi-ui/button';
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { AuthNoticeLogic } from './logic.js';

export const authNoticeView = (n: AuthNoticeLogic) => (
  <Show when={n.error()}>
    <div part="notice" class="notice" role="alert">
      <style scoped>{`
        .notice { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 14px; border: 1px solid color-mix(in srgb, var(--idp-warn) 40%, var(--idp-border)); border-radius: var(--idp-radius-sm); background: color-mix(in srgb, var(--idp-warn) 9%, var(--idp-surface)); color: var(--idp-text); }
        .message { flex: 1 1 240px; margin: 0; }
        .actions { display: flex; gap: 6px; }
      `}</style>
      <p class="message">{() => n.message()}</p>
      <div class="actions">
        <Button variant="solid" size="sm" part="retry" onPress={n.retry}>
          {() => n.labels().retry}
        </Button>
        <Button variant="ghost" tone="neutral" size="sm" part="dismiss" onPress={n.dismiss}>
          {() => n.labels().dismiss}
        </Button>
      </div>
    </div>
  </Show>
);

export const AuthNoticeView = viewToken<AuthNoticeLogic>('idp-auth-notice', authNoticeView);
