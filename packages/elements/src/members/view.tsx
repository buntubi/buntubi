/** The default look: a card, title and Invite member, the invite form when open, the rows, the role cards. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { Role } from '@idp/sdk/types';
import { ROLES } from '../team/logic.js';
import { viewToken } from '../view.js';
import type { MembersLogic } from './logic.js';

export const membersView = (m: MembersLogic) => (
  <section part="members" class="card" aria-labelledby="idp-members-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      form { display: grid; grid-template-columns: minmax(0, 1fr) 170px auto auto; gap: 8px; align-items: center; padding: 14px 20px; border-top: 1px solid var(--idp-border); background: var(--idp-surface-2); }
      .hint { grid-column: 1 / -1; color: var(--idp-muted); font-size: 12.5px; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.4fr) 150px minmax(0, 1fr) 90px auto; gap: 12px; padding: 10px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; }
      .rows > :deep(idp-member-row) { display: block; }
      .roles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; padding: 14px 20px 18px; border-top: 1px solid var(--idp-border); }
      .roles > :deep(idp-role-card) { display: block; }
      .alert { margin: 0; padding: 0 20px 14px; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 860px) { .columns { display: none; } .roles { grid-template-columns: repeat(2, minmax(0, 1fr)); } form { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <h2 id="idp-members-title">{() => m.labels().members}</h2>
      <Show when={m.canManage() && !m.inviting()}>
        <Button variant="solid" size="sm" onPress={() => m.openInvite(true)}>
          {() => m.labels().invite}
        </Button>
      </Show>
    </div>
    <Show when={m.inviting()}>
      <form
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          if (m.inviteEmail().trim()) void m.invite();
        }}
      >
        <Input
          type="email"
          value={() => m.inviteEmail()}
          placeholder={() => m.labels().inviteEmail}
          aria-label={() => m.labels().inviteEmail}
          onInput={(event: Event) => m.editInvite('email', (event.target as HTMLInputElement).value)}
        />
        <Select
          value={String(m.inviteRole())}
          labels={(value: string) => m.labels().roles[value as Role].name}
          onChange={(value: string) => m.editInvite('role', value)}
        >
          <SelectTrigger aria-label={() => m.labels().role}>
            <SelectValue />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <For each={ROLES}>{(role) => <SelectItem value={role}>{() => m.labels().roles[role].name}</SelectItem>}</For>
            </SelectContent>
          </SelectPortal>
        </Select>
        <Button type="submit" variant="solid" size="sm" disabled={!m.inviteEmail().trim() || m.busy() === 'invite'}>
          {() => m.labels().invite}
        </Button>
        <Button variant="ghost" tone="neutral" size="sm" onPress={() => m.openInvite(false)}>
          {() => m.labels().cancel}
        </Button>
        <span class="hint">{() => m.labels().inviteHint}</span>
      </form>
    </Show>
    <div role="table" aria-labelledby="idp-members-title">
      <div class="columns" role="row">
        <span role="columnheader">{() => m.labels().member}</span>
        <span role="columnheader">{() => m.labels().role}</span>
        <span role="columnheader">{() => m.labels().access}</span>
        <span role="columnheader">{() => m.labels().twoStep}</span>
        <span role="columnheader" />
      </div>
      <div class="rows">
        <For each={m.members()} by={(member) => member.id}>
          {(member) => (
            <idp-member-row
              member={member()}
              apps={m.apps()}
              canManage={m.canManage()}
              busy={m.busy() === member().id}
              labels={m.labels()}
              onRole={(event) => void m.changeRole(member().id, event.detail.role)}
              onAccess={(event) => void m.changeAccess(member().id, event.detail.apps)}
              onRemove={() => void m.remove(member().id)}
            />
          )}
        </For>
      </div>
    </div>
    <Show when={m.error()}>
      <p class="alert" role="alert">
        {() => m.error()}
      </p>
    </Show>
    <div class="roles">
      <For each={ROLES}>{(role) => <idp-role-card name={m.labels().roles[role].name} text={m.labels().roles[role].text} />}</For>
    </div>
  </section>
);

export const MembersView = viewToken<MembersLogic>('MembersView', membersView);
