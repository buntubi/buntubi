/** The default look: a card, the fields stacked, the sensitivity as a segmented choice. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import type { Sensitivity } from '@buntu/sdk/types';
import { viewToken } from '../view.js';
import { SENSITIVITIES, type ScopeFormLogic } from './logic.js';
import '../segmented/segmented.js';

const DOT = { public: 'var(--idp-ok)', sensitive: 'var(--idp-warn)', restricted: 'var(--idp-bad)' } as const;

export const scopeFormView = (f: ScopeFormLogic) => (
  <section part="scope-form" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .fields { display: grid; gap: 12px; max-width: 560px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
    `}</style>
    <h2>{() => f.labels().title}</h2>
    <Form form={f.form} onSubmit={(values) => f.create(values)} novalidate>
      <div class="fields">
        <FormField control={f.form.get('name')} label={() => f.labels().name} required>
          {(b) => <Input name="name" placeholder="orders.read" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <FormField control={f.form.get('sensitivity')} label={() => f.labels().sensitivity}>
          {(b) => (
            <idp-segmented
              options={SENSITIVITIES.map((level) => ({ value: level, label: f.labels().sensitivities[level], dot: DOT[level] }))}
              value={b.value()}
              label={f.labels().sensitivity}
              size="md"
              onChange={(event) => b.onChange(event.detail.value as Sensitivity)}
            />
          )}
        </FormField>
        <FormField control={f.form.get('resource')} label={() => f.labels().resource}>
          {(b) => <Input name="resource" placeholder="orders" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <FormField control={f.form.get('fr')} label={() => f.labels().fr} required>
          {(b) => <Input name="fr" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <FormField control={f.form.get('en')} label={() => f.labels().en} required>
          {(b) => <Input name="en" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <Show when={f.error()}>
          <p class="alert" role="alert">
            {() => f.error()}
          </p>
        </Show>
        <div>
          <Button type="submit" variant="solid" disabled={f.busy()}>
            {() => f.labels().create}
          </Button>
        </div>
      </div>
    </Form>
  </section>
);

export const ScopeFormView = viewToken<ScopeFormLogic>('idp-scope-form', scopeFormView);
