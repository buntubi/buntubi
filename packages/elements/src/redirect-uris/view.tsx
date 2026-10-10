/** The default look: a card, one row per address with Remove, the field to add, Save at the end. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { RedirectUrisLogic } from './logic.js';

export const redirectUrisView = (r: RedirectUrisLogic) => (
  <section part="redirects" class="card" aria-labelledby="idp-redirects-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px; display: grid; gap: 14px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      p { margin: 0; color: var(--idp-muted); font-size: 13px; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--idp-border); }
      li:first-child { border-top: 0; }
      code { font-size: 12.5px; overflow-wrap: anywhere; }
      .add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; }
      .foot { display: flex; align-items: center; gap: 12px; }
      .status { color: var(--idp-ok); }
      .alert { color: var(--idp-bad); }
    `}</style>
    <h2 id="idp-redirects-title">{() => r.labels().title}</h2>
    <p>{() => r.labels().intro}</p>
    <Show when={r.uris().length} fallback={<p>{() => r.labels().empty}</p>}>
      <ul>
        <For each={r.uris()}>
          {(uri) => (
            <li>
              <code>{uri}</code>
              <Show when={r.canManage()}>
                <Button variant="ghost" tone="danger" size="sm" onPress={() => r.remove(uri)}>
                  {() => r.labels().remove}
                </Button>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </Show>
    <Show when={r.canManage()}>
      <Form form={r.form} onSubmit={(values) => r.add(values)} novalidate>
        <div class="add">
          <FormField control={r.form.get('uri')}>
            {(b) => (
              <Input
                type="url"
                name="uri"
                placeholder={r.labels().placeholder}
                aria-label={r.labels().title}
                value={b.value()}
                onInput={b.onInput}
                onBlur={b.onBlur}
              />
            )}
          </FormField>
          <Button type="submit" variant="outline" tone="neutral">
            {() => r.labels().add}
          </Button>
        </div>
      </Form>
      <div class="foot">
        <Button variant="solid" disabled={!r.changed() || r.busy()} onPress={() => void r.save()}>
          {() => r.labels().save}
        </Button>
        <Show when={r.saved()}>
          <p class="status" role="status">
            {() => r.labels().saved}
          </p>
        </Show>
      </div>
    </Show>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </section>
);

export const RedirectUrisView = viewToken<RedirectUrisLogic>('RedirectUrisView', redirectUrisView);
