/** The default look: a card, the fields stacked, the sensitivity as a choice of three. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import { SENSITIVITIES, type ScopeFormLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const scopeFormView = (f: ScopeFormLogic) => (
  <section part="scope-form" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      form { display: grid; gap: 12px; max-width: 560px; }
      label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .choice { display: flex; flex-wrap: wrap; gap: 6px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
    `}</style>
    <h2>{() => f.labels().title}</h2>
    <form
      onSubmit={(event: SubmitEvent) => {
        event.preventDefault();
        if (f.canCreate()) void f.create();
      }}
    >
      <label>
        {() => f.labels().name}
        <Input value={() => f.draft().name} placeholder="orders.read" onInput={(event: Event) => f.edit('name', valueOf(event))} />
      </label>
      <div role="radiogroup" aria-label={() => f.labels().sensitivity} class="choice">
        <For each={SENSITIVITIES}>
          {(level) => (
            <Button
              type="button"
              role="radio"
              aria-checked={() => f.draft().sensitivity === level}
              variant={f.draft().sensitivity === level ? 'solid' : 'outline'}
              tone="neutral"
              onPress={() => f.edit('sensitivity', level)}
            >
              {() => f.labels().sensitivities[level]}
            </Button>
          )}
        </For>
      </div>
      <label>
        {() => f.labels().resource}
        <Input value={() => f.draft().resource} placeholder="orders" onInput={(event: Event) => f.edit('resource', valueOf(event))} />
      </label>
      <label>
        {() => f.labels().fr}
        <Input value={() => f.draft().fr} onInput={(event: Event) => f.edit('fr', valueOf(event))} />
      </label>
      <label>
        {() => f.labels().en}
        <Input value={() => f.draft().en} onInput={(event: Event) => f.edit('en', valueOf(event))} />
      </label>
      <Show when={f.error()}>
        <p class="alert" role="alert">
          {() => f.error()}
        </p>
      </Show>
      <div>
        <Button type="submit" variant="solid" disabled={!f.canCreate()}>
          {() => f.labels().create}
        </Button>
      </div>
    </form>
  </section>
);

export const ScopeFormView = viewToken<ScopeFormLogic>('ScopeFormView', scopeFormView);
