/** The default look: a card with the icon row, then the fields, two to a row where they pair. */
import { For, Show } from '@fluixi/core';
import { Input, Textarea } from '@fluixi-ui/input';
import { Toggle } from '@fluixi-ui/toggle';
import { viewToken } from '../view.js';
import type { AppInfoFormLogic, InfoField } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const PAIRS: [InfoField, InfoField][] = [
  ['homepage_url', 'category'],
  ['privacy_url', 'terms_url'],
];

export const appInfoFormView = (f: AppInfoFormLogic) => {
  const field = (name: InfoField, type = 'text') => (
    <label class="field">
      {() => f.labels().fields[name]}
      <Input type={type} value={() => f.value(name)} placeholder={f.labels().placeholders[name] ?? ''} onInput={(event: Event) => f.edit(name, valueOf(event))} />
    </label>
  );
  return (
    <section part="info" class="card" aria-labelledby="idp-app-info-title">
      <style scoped>{`
        .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 24px; display: grid; gap: 16px; }
        h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
        .icon-row { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 14px; align-items: center; }
        .tile { width: 58px; height: 58px; box-sizing: border-box; border-radius: 12px; border: 1.5px dashed var(--idp-border-2); display: grid; place-items: center; color: var(--idp-muted); overflow: hidden; }
        .tile img { width: 100%; height: 100%; object-fit: cover; }
        .icon-field { display: grid; gap: 6px; }
        .hint { color: var(--idp-muted); font-size: 12.5px; }
        .field { display: grid; gap: 7px; font-size: 13px; font-weight: 500; }
        .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; }
        legend { font-size: 13px; font-weight: 500; padding: 0; margin-bottom: 8px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 640px) { .pair { grid-template-columns: 1fr; } }
      `}</style>
      <h1 id="idp-app-info-title">{() => f.labels().title}</h1>
      <div class="icon-row">
        <span class="tile" aria-hidden="true">
          <Show
            when={/^https:\/\//.test(f.value('logo'))}
            fallback={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          >
            <img src={f.value('logo')} alt="" />
          </Show>
        </span>
        <div class="icon-field">
          <Input
            type="url"
            value={() => f.value('logo')}
            placeholder={f.labels().placeholders.logo ?? ''}
            aria-label={() => f.labels().fields.logo}
            onInput={(event: Event) => f.edit('logo', valueOf(event))}
          />
          <span class="hint">{() => f.labels().logoHint}</span>
        </div>
      </div>
      {field('name')}
      <label class="field">
        {() => f.labels().fields.description}
        <Textarea rows={3} value={() => f.value('description')} onInput={(event: Event) => f.edit('description', valueOf(event))} />
      </label>
      <For each={PAIRS}>
        {([left, right]) => (
          <div class="pair">
            {field(left, left === 'category' ? 'text' : 'url')}
            {field(right, right === 'category' ? 'text' : 'url')}
          </div>
        )}
      </For>
      <fieldset>
        <legend>{() => f.labels().platforms}</legend>
        <div class="chips">
          <For each={f.platforms()} by={(entry) => entry.platform}>
            {(entry) => (
              <Toggle data-choice="chip" pressed={entry().selected} onChange={() => f.toggle(entry().platform)}>
                <span data-tick="" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d={CHECK} />
                  </svg>
                </span>
                {() => entry().label}
              </Toggle>
            )}
          </For>
        </div>
      </fieldset>
    </section>
  );
};

export const AppInfoFormView = viewToken<AppInfoFormLogic>('idp-app-info-form', appInfoFormView);
