/** The default look: a card, title and Invite member, the invite form when open, the rows, the role cards. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { Role } from '@idp/sdk/types';
import { ROLES } from '../team/logic.js';
import { viewToken } from '../view.js';
import type { MembersLogic } from './logic.js';
import '../invitation-row/invitation-row.js';

export const membersView = (m: MembersLogic) => (
  <section part="members" class="card" aria-labelledby="idp-members-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .invite { display: grid; grid-template-columns: minmax(0, 1fr) 210px auto auto; gap: 8px; align-items: start; padding: 14px 20px; border-top: 1px solid var(--idp-border); background: var(--idp-surface-2); }
      .hint { grid-column: 1 / -1; color: var(--idp-muted); font-size: 12.5px; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.4fr) 150px minmax(0, 1fr) 90px auto; gap: 12px; padding: 10px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; }
      .rows > :deep(idp-member-row) { display: block; }
      .roles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; padding: 14px 20px 18px; border-top: 1px solid var(--idp-border); }
      .roles > :deep(idp-role-card) { display: block; }
      .alert { margin: 0; padding: 0 20px 14px; color: var(--idp-bad); font-size: 13px; }
      .done { margin: 0; padding: 0 20px 14px; color: var(--idp-ok); font-size: 13px; }
      .waiting { padding: 10px 20px 6px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; }
      .invitations > :deep(idp-invitation-row) { display: block; }
      @media (max-width: 860px) { .columns { display: none; } .roles { grid-template-columns: repeat(2, minmax(0, 1fr)); } .invite { grid-template-columns: 1fr; } }
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
      <Form form={m.inviteForm} onSubmit={(values) => m.invite(values)} novalidate>
        <div class="invite">
          <FormField control={m.inviteForm.get('email')}>
            {(b) => (
              <Input
                type="email"
                name="email"
                placeholder={m.labels().inviteEmail}
                aria-label={m.labels().inviteEmail}
                value={b.value()}
                onInput={b.onInput}
                onBlur={b.onBlur}
              />
            )}
          </FormField>
          <FormField control={m.inviteForm.get('role')}>
            {(b) => (
              <Select value={b.value()} labels={(value: string) => m.labels().roles[value as Role].name} onChange={(value: string) => b.onChange(value)}>
                <SelectTrigger aria-label={() => m.labels().role}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent>
                    <For each={ROLES}>{(role) => <SelectItem value={role}>{() => m.labels().roles[role].name}</SelectItem>}</For>
                  </SelectContent>
                </SelectPortal>
              </Select>
            )}
          </FormField>
          <Button type="submit" variant="solid" size="sm" disabled={m.busy() === 'invite'}>
            {() => m.labels().invite}
          </Button>
          <Button variant="ghost" tone="neutral" size="sm" onPress={() => m.openInvite(false)}>
            {() => m.labels().cancel}
          </Button>
          <span class="hint">{() => m.labels().inviteHint}</span>
        </div>
      </Form>
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
    <Show when={m.invitations().length}>
      <div class="waiting">{() => m.labels().invitations}</div>
      <div class="invitations">
        <For each={m.invitations()} by={(invitation) => invitation.id}>
          {(invitation) => (
            <idp-invitation-row
              invitation={invitation()}
              canManage={m.canManage()}
              busy={m.busy() === invitation().id}
              locale={m.locale()}
              labels={m.labels()}
              onWithdraw={(event) => void m.withdraw(event.detail.id)}
            />
          )}
        </For>
      </div>
    </Show>
    <Show when={m.notice()}>
      <p class="done" role="status">
        {() => m.notice()}
      </p>
    </Show>
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
