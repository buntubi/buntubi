/** The default look: a card, the avatar, the greeting over the address, the way to edit. */
import { Show } from '@fluixi/core';
import { Avatar, AvatarFallback, AvatarImage } from '@fluixi-ui/avatar';
import { Card } from '@fluixi-ui/card';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AccountHelloLogic } from './logic.js';

export const accountHelloView = (h: AccountHelloLogic) => (
  <Card part="hello" class="hello">
    <style scoped>{`
      .hello { padding: 22px; display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 18px; }
      .mark { width: 64px; height: 64px; font-size: 22px; font-weight: 700; }
      .text { flex: 1; min-width: 220px; display: grid; gap: 2px; }
      h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
      .meta { color: var(--idp-muted); }
    `}</style>
    <Avatar class="mark" aria-hidden="true">
      <Show when={h.picture()} fallback={<AvatarFallback>{() => h.initials()}</AvatarFallback>}>
        <AvatarImage src={h.picture()} alt="" />
      </Show>
    </Avatar>
    <div class="text">
      <h1>{() => h.labels().welcome.replace('{name}', h.firstName())}</h1>
      <span class="meta">
        {() => h.email()}
        {() => (h.since() ? ` · ${h.labels().since.replace('{date}', h.since())}` : '')}
      </span>
    </div>
    <Show when={h.editHref()}>
      <span class="edit">
        <Link href={h.editHref()} data-variant="outline" data-tone="neutral" data-size="sm">
          {() => h.labels().edit}
        </Link>
      </span>
    </Show>
  </Card>
);

export const AccountHelloView = viewToken<AccountHelloLogic>('idp-account-hello', accountHelloView);
