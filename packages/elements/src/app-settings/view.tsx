/** The basic information's default look: one card, the fields two by two. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { AppSettingsLogic, SettingsField } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const TYPES: Partial<Record<SettingsField, string>> = { homepage_url: 'url', privacy_url: 'url', terms_url: 'url', logo: 'url' };

export const appSettingsView = (s: AppSettingsLogic) => (
  <form
    part="settings"
    class="card"
    onSubmit={(event: SubmitEvent) => {
      event.preventDefault();
      void s.save();
    }}
  >
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 16px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .intro { display: grid; gap: 4px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
      .field { display: grid; gap: 6px; align-content: start; }
      .field[data-wide] { grid-column: 1 / -1; }
      .caption { font-size: 12.5px; font-weight: 500; }
      .note { color: var(--idp-muted); font-size: 12px; }
      .actions { display: flex; align-items: center; gap: 10px; }
      .ok { color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    `}</style>
    {/* A page that already names itself in its header gives no title: the card starts with the fields. */}
    <Show when={s.labels().title || s.labels().intro}>
      <div class="intro">
        <Show when={s.labels().title}>
          <h2>{() => s.labels().title}</h2>
        </Show>
        <Show when={s.labels().intro}>
          <p class="hint">{() => s.labels().intro}</p>
        </Show>
      </div>
    </Show>
    <div class="grid">
      <For each={s.fields()}>
        {(field) => (
          <label class="field" data-wide={field === 'description' ? '' : undefined}>
            <span class="caption">{() => s.labels().fields[field]}</span>
            <Input
              type={TYPES[field] ?? 'text'}
              value={() => s.value(field)}
              disabled={!s.canEdit()}
              required={field === 'name'}
              onInput={(event: Event) => s.edit(field, valueOf(event))}
            />
            <Show when={s.labels().hints[field]}>
              <span class="note">{() => s.labels().hints[field] ?? ''}</span>
            </Show>
          </label>
        )}
      </For>
    </div>
    <Show when={s.canEdit()}>
      <div class="actions">
        <Button type="submit" variant="solid" disabled={!s.changed() || s.busy()}>
          {() => s.labels().save}
        </Button>
        <Show when={s.saved()}>
          <span class="ok" role="status">{() => s.labels().saved}</span>
        </Show>
      </div>
    </Show>
    <Show when={s.error()}>
      <p class="alert" role="alert">
        {() => s.error()}
      </p>
    </Show>
  </form>
);

export const AppSettingsView = viewToken<AppSettingsLogic>('AppSettingsView', appSettingsView);
