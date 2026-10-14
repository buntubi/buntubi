/** The default look: the avatar and name as a pill, the accounts in a popover under it. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@fluixi-ui/popover';
import { viewToken } from '../view.js';
import type { AccountSwitcherLogic } from './logic.js';

export const accountSwitcherView = (a: AccountSwitcherLogic) => (
  <div part="account-switcher" class="switcher">
  <Popover placement="bottom-end" offset={8}>
    <style scoped>{`
      /* The trigger and the popover's content are components: their elements carry no scope. */
      .switcher :deep(.pill) { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px 0 4px; border: 1px solid var(--idp-border); border-radius: 999px; background: var(--idp-surface); color: var(--idp-text); font: inherit; cursor: pointer; }
      .switcher :deep(.pill:hover) { background: var(--idp-surface-2); }
      .mark { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 11.5px; font-weight: 700; color: var(--idp-accent-ink); background: var(--idp-accent-soft); }
      .who { font-size: 13px; font-weight: 500; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* The popover draws the surface; the panel only lays out what is in it. */
      .panel { width: 320px; max-width: calc(100vw - 48px); display: grid; gap: 4px; }
      .caption { padding: 6px 10px 4px; font-size: 12px; color: var(--idp-muted); }
      .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; }
      .row[data-current] { background: var(--idp-surface-2); }
      .row .mark { width: 32px; height: 32px; font-size: 12px; }
      .names { flex: 1; min-width: 0; display: grid; }
      .name { font-weight: 600; font-size: 13px; }
      .email { font-size: 12px; color: var(--idp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .here { font-size: 12px; font-weight: 500; color: var(--idp-ok); }
      .rule { height: 1px; margin: 4px 6px; background: var(--idp-border); }
      .action { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; color: var(--idp-text); font-weight: 500; text-decoration: none; }
      .action:hover { background: var(--idp-surface-2); }
      .actions > :deep(button) { justify-content: flex-start; width: 100%; gap: 10px; }
      .alert { margin: 0; padding: 4px 10px; color: var(--idp-bad); font-size: 12.5px; }
    `}</style>
    <PopoverTrigger class="pill" aria-label={`${a.labels().menu}: ${a.current()?.name || a.current()?.email || ''}`}>
      <span class="mark" aria-hidden="true">{() => (a.current() ? a.initials(a.current()!) : '')}</span>
      <span class="who">{() => a.current()?.name || a.current()?.email || ''}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent aria-label={a.labels().menu}>
        <div class="panel">
        <span class="caption">{() => a.labels().signedInHere}</span>
        <For each={a.accounts()} by={(entry) => entry.id}>
          {(entry) => (
            <div class="row" data-current={() => (entry().current ? '' : undefined)}>
              <span class="mark" aria-hidden="true">{() => a.initials(entry())}</span>
              <span class="names">
                <span class="name">{() => entry().name || entry().email}</span>
                <span class="email">{() => entry().email}</span>
              </span>
              <Show
                when={entry().current}
                fallback={
                  <Button variant="outline" tone="neutral" size="sm" disabled={a.busy() !== null} onPress={() => void a.switchTo(entry().id)}>
                    {() => a.labels().switchTo}
                  </Button>
                }
              >
                <span class="here">{() => a.labels().current}</span>
              </Show>
              <Button
                variant="ghost"
                tone="neutral"
                size="sm"
                disabled={a.busy() !== null}
                aria-label={a.labels().signOutOf.replace('{email}', entry().email)}
                title={a.labels().signOutOf.replace('{email}', entry().email)}
                onPress={() => void a.signOut(entry().id)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </Button>
            </div>
          )}
        </For>
        <span class="rule" />
        <a class="action" href={a.addHref()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {() => a.labels().addAccount}
        </a>
        <div class="actions">
        <Button variant="ghost" tone="neutral" disabled={a.busy() !== null} onPress={() => void a.signOutAll()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {() => a.labels().signOutAll}
        </Button>
        </div>
        <Show when={a.error()}>
          <p class="alert" role="alert">
            {() => a.error()}
          </p>
        </Show>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </Popover>
  </div>
);

export const AccountSwitcherView = viewToken<AccountSwitcherLogic>('idp-account-switcher', accountSwitcherView);
