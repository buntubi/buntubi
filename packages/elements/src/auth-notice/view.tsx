/** The sign-in notice's default look: a bar with the reason and two actions. */
import { Alert } from '@fluixi-ui/alert';
import { Button } from '@fluixi-ui/button';
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { AuthNoticeLogic } from './logic.js';

export const authNoticeView = (n: AuthNoticeLogic) => (
  <Show when={n.error()}>
    <Alert part="notice" class="notice" variant="warning">
      <style scoped>{`
        .notice { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
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
    </Alert>
  </Show>
);

export const AuthNoticeView = viewToken<AuthNoticeLogic>('idp-auth-notice', authNoticeView);
