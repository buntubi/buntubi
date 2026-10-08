/** The organization settings' default look: a form card, then the deletion set apart. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { OrganizationSettingsLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

export const organizationSettingsView = (o: OrganizationSettingsLogic) => (
  <div part="organization-settings" class="settings">
    <style scoped>{`
      .settings { display: grid; gap: 16px; }
      .card { border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); box-shadow: var(--dp-shadow); padding: 18px 20px; display: grid; gap: 16px; }
      .danger { border-color: color-mix(in srgb, var(--dp-bad) 40%, var(--dp-border)); }
      .intro { display: grid; gap: 4px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--dp-muted); font-size: 13px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
      .field { display: grid; gap: 6px; align-content: start; }
      .field[data-wide] { grid-column: 1 / -1; }
      .caption { font-size: 12.5px; font-weight: 500; }
      .note { color: var(--dp-muted); font-size: 12px; }
      .actions { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }
      .actions .field { flex: 1 1 260px; }
      .ok { color: var(--dp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--dp-bad); font-size: 13px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    `}</style>
    <Show when={o.error()}>
      <p class="alert" role="alert">
        {() => o.error()}
      </p>
    </Show>
    <form
      class="card"
      part="details"
      onSubmit={(event: SubmitEvent) => {
        event.preventDefault();
        void o.save();
      }}
    >
      <div class="intro">
        <h2>{() => o.labels().title}</h2>
        <p class="hint">{() => o.labels().intro}</p>
      </div>
      <div class="grid">
        <For each={o.fields()}>
          {(field) => (
            <label class="field" data-wide={field === 'description' ? '' : undefined}>
              <span class="caption">{() => o.labels().fields[field]}</span>
              <Input
                type={field === 'support_email' ? 'email' : 'text'}
                value={() => o.value(field)}
                disabled={!o.canEdit()}
                required={field === 'name'}
                onInput={(event: Event) => o.edit(field, valueOf(event))}
              />
              <Show when={o.labels().hints[field]}>
                <span class="note">{() => o.labels().hints[field] ?? ''}</span>
              </Show>
            </label>
          )}
        </For>
      </div>
      <Show when={o.canEdit()}>
        <div class="actions">
          <Button type="submit" variant="solid" disabled={!o.changed() || o.busy() === 'save'}>
            {() => o.labels().save}
          </Button>
          <Show when={o.saved()}>
            <span class="ok" role="status">{() => o.labels().saved}</span>
          </Show>
        </div>
      </Show>
    </form>
    <Show when={o.canDelete()}>
      <section class="card danger" part="danger" aria-labelledby="dp-org-danger">
        <div class="intro">
          <h2 id="dp-org-danger">{() => o.labels().danger}</h2>
          <p class="hint">{() => o.labels().dangerText}</p>
        </div>
        <div class="actions">
          <label class="field">
            <span class="caption">{() => o.labels().confirm.replace('{name}', o.name())}</span>
            <Input value={() => o.confirmation()} onInput={(event: Event) => o.confirm(valueOf(event))} />
          </label>
          <Button variant="solid" tone="danger" disabled={!o.confirmed() || o.busy() === 'delete'} onPress={() => void o.remove()}>
            {() => o.labels().delete}
          </Button>
        </div>
      </section>
    </Show>
  </div>
);

export const OrganizationSettingsView = viewToken<OrganizationSettingsLogic>('OrganizationSettingsView', organizationSettingsView);
