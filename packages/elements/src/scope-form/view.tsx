/** The default look: a card, the fields stacked, the sensitivity as a segmented choice. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import type { Sensitivity } from '@idp/sdk/types';
import { viewToken } from '../view.js';
import { SENSITIVITIES, type ScopeFormLogic } from './logic.js';
import '../segmented/segmented.js';

const DOT = { public: 'var(--idp-ok)', sensitive: 'var(--idp-warn)', restricted: 'var(--idp-bad)' } as const;

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const scopeFormView = (f: ScopeFormLogic) => (
  <section part="scope-form" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      form { display: grid; gap: 12px; max-width: 560px; }
      label, .field { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .field { justify-items: start; }
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
      <div class="field">
        <span>{() => f.labels().sensitivity}</span>
        <idp-segmented
          options={SENSITIVITIES.map((level) => ({ value: level, label: f.labels().sensitivities[level], dot: DOT[level] }))}
          value={f.draft().sensitivity}
          label={f.labels().sensitivity}
          size="md"
          onChange={(event) => f.edit('sensitivity', event.detail.value as Sensitivity)}
        />
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
