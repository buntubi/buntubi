/** The default look: a card, the two fields and the button on one line when there is room. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { OrganizationFormLogic } from './logic.js';

export const organizationFormView = (o: OrganizationFormLogic) => (
  <section part="organization-form" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .fields { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: start; }
      .submit { padding-top: 24px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 640px) { .fields { grid-template-columns: 1fr; } .submit { padding-top: 0; } }
    `}</style>
    <Show when={o.labels().title}>
      <h2>{() => o.labels().title}</h2>
    </Show>
    <Form form={o.form} onSubmit={(values) => o.create(values)} novalidate>
      <div class="fields">
        <FormField control={o.form.get('name')} label={() => o.labels().name} required>
          {(b) => <Input name="name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <FormField control={o.form.get('support_email')} label={() => o.labels().supportEmail}>
          {(b) => <Input type="email" name="support_email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
        </FormField>
        <div class="submit">
          <Button type="submit" variant="solid" disabled={o.busy()}>
            {() => o.labels().create}
          </Button>
        </div>
      </div>
    </Form>
    <Show when={o.error()}>
      <p class="alert" role="alert">
        {() => o.error()}
      </p>
    </Show>
  </section>
);

export const OrganizationFormView = viewToken<OrganizationFormLogic>('idp-organization-form', organizationFormView);
