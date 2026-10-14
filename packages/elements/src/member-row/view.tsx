/** The default look: a grid row, the role as a select, access with its editor below, two-step as a dot. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import { Toggle } from '@fluixi-ui/toggle';
import type { Role } from '@buntubi/sdk/types';
import { ROLES } from '../team/logic.js';
import { viewToken } from '../view.js';
import type { MemberRowLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const memberRowView = (m: MemberRowLogic) => (
  <div part="member" class="member" role="row">
    <style scoped>{`
      .member { display: grid; grid-template-columns: minmax(0, 1.4fr) 150px minmax(0, 1fr) 90px auto; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .who { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .initials { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 600; color: var(--idp-muted); background: var(--idp-surface-2); }
      .names { display: grid; min-width: 0; }
      .name { font-weight: 500; }
      .you { color: var(--idp-muted); font-weight: 400; margin-left: 6px; font-size: 12px; }
      .email { color: var(--idp-muted); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; }
      .access { color: var(--idp-muted); display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
      .two { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--idp-bad); }
      .two[data-on] { color: var(--idp-ok); }
      .two::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .editor { grid-column: 1 / -1; display: grid; gap: 10px; padding: 12px; border-radius: 10px; background: var(--idp-surface-2); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .hint { color: var(--idp-muted); font-size: 12.5px; }
      .actions { display: flex; gap: 8px; }
      @media (max-width: 860px) { .member { grid-template-columns: minmax(0, 1fr) auto; } .access, .two { grid-column: 1; } }
    `}</style>
    <span role="cell" class="who">
      <span class="initials" aria-hidden="true">{() => m.initials()}</span>
      <span class="names">
        <span class="name">
          {() => m.member()?.name || m.member()?.email}
          <Show when={m.member()?.self}>
            <span class="you">{() => `(${m.labels().you})`}</span>
          </Show>
        </span>
        <span class="email">{() => m.member()?.email}</span>
      </span>
    </span>
    <span role="cell">
      <Show when={m.canManage()} fallback={<span>{() => m.labels().roles[m.member()?.role ?? 'viewer'].name}</span>}>
        <Select
          value={String(m.member()?.role ?? 'viewer')}
          labels={(value: string) => m.labels().roles[value as Role].name}
          onChange={(value: string) => m.changeRole(value as Role)}
        >
          <SelectTrigger aria-label={() => `${m.labels().role}: ${m.member()?.email ?? ''}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <For each={ROLES}>{(role) => <SelectItem value={role}>{() => m.labels().roles[role].name}</SelectItem>}</For>
            </SelectContent>
          </SelectPortal>
        </Select>
      </Show>
    </span>
    <span role="cell" class="access">
      {() => (m.member()?.appNames.length ? m.member()?.appNames.join(', ') : m.labels().allApps)}
      <Show when={m.canManage() && m.member()?.limitable && !m.editing()}>
        <Button variant="ghost" tone="neutral" size="sm" onPress={() => m.edit(true)}>
          {() => m.labels().editAccess}
        </Button>
      </Show>
    </span>
    <span role="cell">
      <span class="two" data-on={() => (m.member()?.two_step ? '' : undefined)}>
        {() => (m.member()?.two_step ? m.labels().on : m.labels().off)}
      </span>
    </span>
    <span role="cell">
      <Show when={m.canManage()}>
        <Button variant="ghost" tone="danger" size="sm" disabled={m.busy()} onPress={m.remove}>
          {() => m.labels().remove}
        </Button>
      </Show>
    </span>
    <Show when={m.editing()}>
      <div class="editor">
        <span class="hint">{() => m.labels().accessHint}</span>
        <div class="chips">
          <For each={m.choices()} by={(choice) => choice.client_id}>
            {(choice) => (
              <Toggle data-choice="chip" pressed={choice().picked} onChange={() => m.toggle(choice().client_id)}>
                <span data-tick="" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d={CHECK} />
                  </svg>
                </span>
                {() => choice().name}
              </Toggle>
            )}
          </For>
        </div>
        <div class="actions">
          <Button variant="solid" size="sm" disabled={m.busy()} onPress={m.saveAccess}>
            {() => m.labels().saveAccess}
          </Button>
          <Button variant="ghost" tone="neutral" size="sm" onPress={() => m.edit(false)}>
            {() => m.labels().cancel}
          </Button>
        </div>
      </div>
    </Show>
  </div>
);

export const MemberRowView = viewToken<MemberRowLogic>('idp-member-row', memberRowView);
