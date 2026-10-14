/** The default look: a card, the intro, one ruled row per tester, the field to add one. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { TestUsersLogic } from './logic.js';

export const testUsersView = (t: TestUsersLogic) => (
  <section part="test-users" class="card" aria-labelledby="idp-test-users-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      p { margin: 0; color: var(--idp-muted); font-size: 13px; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--idp-border); }
      li:first-child { border-top: 0; }
      .who { display: grid; }
      .added { color: var(--idp-muted); font-size: 12.5px; }
      .add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; }
      .alert { color: var(--idp-bad); }
    `}</style>
    <h2 id="idp-test-users-title">{() => t.labels().testers}</h2>
    <p>{() => t.labels().testersIntro}</p>
    <Show when={t.testers().length} fallback={<p>{() => t.labels().noTesters}</p>}>
      <ul>
        <For each={t.testers()} by={(tester) => tester.email}>
          {(tester) => (
            <li>
              <span class="who">
                {() => tester().email}
                <span class="added">{() => `${t.labels().added} ${tester().added}`}</span>
              </span>
              <Show when={t.canManage()}>
                <Button variant="ghost" tone="danger" size="sm" disabled={t.busy() === tester().email} onPress={() => void t.remove(tester().email)}>
                  {() => t.labels().remove}
                </Button>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </Show>
    <Show when={t.canManage()}>
      <Form form={t.form} onSubmit={(values) => t.add(values)} novalidate>
        <div class="add">
          <FormField control={t.form.get('email')}>
            {(b) => (
              <Input
                type="email"
                name="email"
                placeholder={t.labels().testerEmail}
                aria-label={t.labels().testerEmail}
                value={b.value()}
                onInput={b.onInput}
                onBlur={b.onBlur}
              />
            )}
          </FormField>
          <Button type="submit" variant="outline" tone="neutral" disabled={t.busy() === 'add'}>
            {() => t.labels().addTester}
          </Button>
        </div>
      </Form>
    </Show>
    <Show when={t.error()}>
      <p class="alert" role="alert">
        {() => t.error()}
      </p>
    </Show>
  </section>
);

export const TestUsersView = viewToken<TestUsersLogic>('idp-test-users', testUsersView);
