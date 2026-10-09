/** The default look: a card, the two fields and the button on one line when there is room. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { OrganizationFormLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const organizationFormView = (o: OrganizationFormLogic) => (
  <section part="organization-form" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end; }
      label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 640px) { form { grid-template-columns: 1fr; } }
    `}</style>
    <Show when={o.labels().title}>
      <h2>{() => o.labels().title}</h2>
    </Show>
    <form
      onSubmit={(event: SubmitEvent) => {
        event.preventDefault();
        if (o.canCreate()) void o.create();
      }}
    >
      <label>
        {() => o.labels().name}
        <Input value={() => o.name()} onInput={(event: Event) => o.editName(valueOf(event))} />
      </label>
      <label>
        {() => o.labels().supportEmail}
        <Input type="email" value={() => o.supportEmail()} onInput={(event: Event) => o.editSupportEmail(valueOf(event))} />
      </label>
      <Button type="submit" variant="solid" disabled={!o.canCreate()}>
        {() => o.labels().create}
      </Button>
    </form>
    <Show when={o.error()}>
      <p class="alert" role="alert">
        {() => o.error()}
      </p>
    </Show>
  </section>
);

export const OrganizationFormView = viewToken<OrganizationFormLogic>('OrganizationFormView', organizationFormView);
