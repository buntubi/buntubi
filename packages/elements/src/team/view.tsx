/** The team's default look: members in a table with their roles, then the sandbox test users. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { Role } from '@idp/sdk/types';
import { viewToken } from '../view.js';
import { ROLES, type TeamLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const teamView = (t: TeamLogic) => (
  <div part="team" class="team">
    <style scoped>{`
      .team { display: grid; gap: 16px; }
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 14px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .scroll { overflow-x: auto; }
      table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13.5px; }
      th { text-align: left; padding: 8px 10px; color: var(--idp-muted); font-weight: 500; font-size: 12px; border-bottom: 1px solid var(--idp-border); }
      td { padding: 10px; border-bottom: 1px solid var(--idp-border); vertical-align: middle; }
      .who { display: flex; align-items: center; gap: 10px; }
      .initial { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600; background: var(--idp-accent-soft); color: var(--idp-accent-ink); flex: none; }
      .names { display: flex; flex-direction: column; }
      .email { color: var(--idp-muted); font-size: 12.5px; }
      .you { margin-left: 6px; font-size: 11.5px; color: var(--idp-muted); }
      .end { text-align: right; white-space: nowrap; }
      .access-edit td { background: var(--idp-surface-2); }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .invite { display: grid; grid-template-columns: minmax(0, 1fr) minmax(160px, 220px) auto; gap: 8px; align-items: end; }
      .invite > * { min-width: 0; }
      .field { display: grid; gap: 6px; }
      .caption { font-size: 12.5px; font-weight: 500; }
      .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px; margin: 0; font-size: 12.5px; }
      .roles dt { font-weight: 600; }
      .roles dd { margin: 0; color: var(--idp-muted); }
      ul { list-style: none; margin: 0; padding: 0; display: grid; }
      li.tester { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--idp-border); font-size: 13.5px; }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
      .add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 720px) { .invite, .add { grid-template-columns: 1fr; } }
    `}</style>
    <Show when={t.error()}>
      <p class="alert" role="alert">
        {() => t.error()}
      </p>
    </Show>

    <section class="card" part="members" aria-labelledby="idp-team-members">
      <div>
        <h2 id="idp-team-members">{() => t.labels().members}</h2>
        <p class="hint">{() => t.labels().membersIntro}</p>
      </div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{() => t.labels().member}</th>
              <th>{() => t.labels().role}</th>
              <th>{() => t.labels().access}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <For each={t.members()} by={(member) => member.id}>
              {(member) => (
                <>
                  <tr part="member">
                    <td>
                      <span class="who">
                        <span class="initial">{() => (member().name || member().email).slice(0, 1).toUpperCase()}</span>
                        <span class="names">
                          <span>
                            {() => member().name || member().email}
                            <Show when={member().self}>
                              <span class="you">{() => `(${t.labels().you})`}</span>
                            </Show>
                          </span>
                          <span class="email">{() => member().email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Show when={t.canManage() && !member().self} fallback={<span>{() => t.labels().roles[member().role].name}</span>}>
                        <Select
                          value={String(member().role)}
                          labels={(value: string) => t.labels().roles[value as Role].name}
                          onChange={(value: string) => void t.changeRole(member().id, value as Role)}
                        >
                          <SelectTrigger part="role" aria-label={() => `${t.labels().role}: ${member().email}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPortal>
                            <SelectContent>
                              <For each={ROLES}>{(role) => <SelectItem value={role}>{() => t.labels().roles[role].name}</SelectItem>}</For>
                            </SelectContent>
                          </SelectPortal>
                        </Select>
                      </Show>
                    </td>
                    <td>{() => (member().limitable && member().appNames.length ? member().appNames.join(', ') : t.labels().allApps)}</td>
                    <td class="end">
                      <Show when={t.canManage() && member().limitable}>
                        <Button variant="ghost" tone="neutral" size="sm" onPress={() => t.editAccess(t.editing() === member().id ? null : member().id)}>
                          {() => t.labels().editAccess}
                        </Button>
                      </Show>
                      <Show when={t.canManage() && !member().self}>
                        <Button variant="ghost" tone="neutral" size="sm" disabled={t.busy() === member().id} onPress={() => void t.remove(member().id)}>
                          {() => t.labels().remove}
                        </Button>
                      </Show>
                    </td>
                  </tr>
                  <Show when={t.editing() === member().id}>
                    <tr class="access-edit">
                      <td colSpan={4}>
                        <div class="row">
                          <div class="chips" role="group" aria-label={() => t.labels().access}>
                            <For each={t.accessChoices()} by={(choice) => choice.client_id}>
                              {(choice) => (
                                <Button
                                  variant={choice().picked ? 'solid' : 'outline'}
                                  tone="neutral"
                                  size="sm"
                                  aria-pressed={choice().picked ? 'true' : 'false'}
                                  onPress={() => choice().toggle()}
                                >
                                  {() => choice().name}
                                </Button>
                              )}
                            </For>
                          </div>
                          <span class="email">{() => t.labels().accessHint}</span>
                          <Button variant="solid" size="sm" disabled={t.busy() === member().id} onPress={() => void t.saveAccess()}>
                            {() => t.labels().saveAccess}
                          </Button>
                          <Button variant="ghost" tone="neutral" size="sm" onPress={() => t.editAccess(null)}>
                            {() => t.labels().cancel}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </Show>
                </>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={t.canManage()}>
        <div class="invite">
          <label class="field">
            <span class="caption">{() => t.labels().inviteEmail}</span>
            <Input type="email" value={() => t.inviteEmail()} onInput={(event: Event) => t.editInvite('email', valueOf(event))} />
          </label>
          <div class="field">
            <span class="caption">{() => t.labels().role}</span>
            <Select
              value={String(t.inviteRole())}
              labels={(value: string) => t.labels().roles[value as Role].name}
              onChange={(value: string) => t.editInvite('role', value)}
            >
              <SelectTrigger part="invite-role" aria-label={() => t.labels().role}>
                <SelectValue />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  <For each={ROLES}>{(role) => <SelectItem value={role}>{() => t.labels().roles[role].name}</SelectItem>}</For>
                </SelectContent>
              </SelectPortal>
            </Select>
          </div>
          <Button variant="solid" disabled={!t.inviteEmail().trim() || t.busy() === 'invite'} onPress={() => void t.invite()}>
            {() => t.labels().invite}
          </Button>
        </div>
        <p class="hint">{() => t.labels().inviteHint}</p>
      </Show>
      <dl class="roles">
        <For each={ROLES}>
          {(role) => (
            <div>
              <dt>{() => t.labels().roles[role].name}</dt>
              <dd>{() => t.labels().roles[role].text}</dd>
            </div>
          )}
        </For>
      </dl>
    </section>

    <section class="card" part="testers" aria-labelledby="idp-team-testers">
      <div>
        <h2 id="idp-team-testers">{() => t.labels().testers}</h2>
        <p class="hint">{() => t.labels().testersIntro}</p>
      </div>
      <Show when={t.testers().length} fallback={<p class="hint">{() => t.labels().noTesters}</p>}>
        <ul>
          <For each={t.testers()} by={(tester) => tester.email}>
            {(tester) => (
              <li class="tester">
                <span>
                  {() => tester().email} <span class="meta">{() => `${t.labels().added} ${tester().added}`}</span>
                </span>
                <Show when={t.canManageTesters()}>
                  <Button variant="ghost" tone="neutral" size="sm" disabled={t.busy() === tester().email} onPress={() => void t.removeTester(tester().email)}>
                    {() => t.labels().remove}
                  </Button>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={t.canManageTesters()}>
        <div class="add">
          <Input
            type="email"
            value={() => t.testerEmail()}
            aria-label={() => t.labels().testerEmail}
            placeholder={() => t.labels().testerEmail}
            onInput={(event: Event) => t.editTester(valueOf(event))}
          />
          <Button variant="outline" tone="neutral" disabled={!t.testerEmail().trim() || t.busy() === 'tester'} onPress={() => void t.addTester()}>
            {() => t.labels().addTester}
          </Button>
        </div>
      </Show>
    </section>
  </div>
);

export const TeamView = viewToken<TeamLogic>('TeamView', teamView);
