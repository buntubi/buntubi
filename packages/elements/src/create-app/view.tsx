/** Creating an app, default look: a stepper, one panel per step, and Back / Continue below. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import { INFO_FIELDS, type CreateAppLogic, type InfoField } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const TYPES: Partial<Record<InfoField, string>> = {
  redirect_uri: 'url',
  homepage_url: 'url',
  privacy_url: 'url',
  terms_url: 'url',
  logo: 'url',
};
const TONE = { none: 'var(--dp-ok)', review: 'var(--dp-warn)', restricted: 'var(--dp-bad)' } as const;
const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const createAppView = (c: CreateAppLogic) => (
  <div part="create-app" class="create">
    <style scoped>{`
      .create { display: grid; gap: 24px; }
      ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 24px; }
      li.step { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dp-muted); }
      li.step[data-state='now'] { color: var(--dp-text); font-weight: 600; }
      li.step[data-state='done'] { color: var(--dp-text); }
      .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600; border: 1.5px solid var(--dp-border-2); }
      [data-state='now'] > .dot { border-color: var(--dp-accent); color: var(--dp-accent-ink); background: var(--dp-accent-soft); }
      [data-state='done'] > .dot { border: 0; background: var(--dp-accent); color: var(--dp-accent-fg); }
      .panel { display: grid; gap: 16px; }
      h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
      .intro { margin: 0; color: var(--dp-muted); max-width: 62ch; }
      .choices { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
      .choices :deep(button) { height: auto; min-height: 0; padding: 14px 16px; justify-content: flex-start; text-align: left; white-space: normal; }
      .choices :deep(button[aria-pressed='true']) { border-color: var(--dp-accent); box-shadow: 0 0 0 1px var(--dp-accent) inset; }
      .choice { display: grid; gap: 4px; width: 100%; }
      .choice strong { font-weight: 600; }
      .choice span { color: var(--dp-muted); font-size: 13px; font-weight: 400; }
      .info { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
      .form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
      .field { display: grid; gap: 6px; align-content: start; }
      .field[data-wide] { grid-column: 1 / -1; }
      .caption { font-size: 12.5px; font-weight: 500; }
      .note { color: var(--dp-muted); font-size: 12px; }
      .group { display: grid; gap: 8px; grid-column: 1 / -1; }
      .toggles { display: flex; flex-wrap: wrap; gap: 6px; }
      .preview { position: sticky; top: 16px; display: grid; gap: 12px; padding: 18px; border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); }
      .preview-label { font-size: 12px; font-weight: 500; color: var(--dp-muted); }
      .consent { display: grid; justify-items: center; gap: 10px; padding: 18px; border-radius: var(--dp-radius-sm); background: var(--dp-surface-2); text-align: center; font-size: 13.5px; }
      .mark { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; font-weight: 700; background: var(--dp-accent-soft); color: var(--dp-accent-ink); }
      .links { color: var(--dp-accent-ink); font-size: 12px; }
      .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
      .products :deep(button) { height: auto; min-height: 0; padding: 14px 16px; justify-content: flex-start; text-align: left; white-space: normal; }
      .products :deep(button[aria-pressed='true']) { border-color: var(--dp-accent); box-shadow: 0 0 0 1px var(--dp-accent) inset; }
      .product { display: grid; gap: 8px; width: 100%; }
      .top { display: flex; align-items: center; gap: 8px; }
      .tick { width: 16px; height: 16px; border-radius: 5px; border: 1.5px solid var(--dp-border-2); display: grid; place-items: center; flex: none; }
      .product[data-selected] .tick { border-color: var(--dp-accent); background: var(--dp-accent); color: var(--dp-accent-fg); }
      .pill { margin-left: auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .desc { color: var(--dp-muted); font-size: 13px; font-weight: 400; }
      .scopes { display: flex; flex-wrap: wrap; gap: 4px; }
      code { font-family: var(--dp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; background: var(--dp-surface-2); border: 1px solid var(--dp-border); }
      .foot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid var(--dp-border); }
      .foot .note { flex: 1; text-align: center; }
      .alert { margin: 0; color: var(--dp-bad); font-size: 13px; }
      @media (max-width: 860px) { .info { grid-template-columns: 1fr; } .preview { position: static; } .form { grid-template-columns: 1fr; } .foot .note { flex-basis: 100%; order: 3; } }
    `}</style>
    <ol aria-label={() => c.labels().steps[c.step()]}>
      <For each={c.steps()} by={(entry) => entry.step}>
        {(entry) => (
          <li class="step" data-state={() => entry().state} aria-current={() => (entry().state === 'now' ? 'step' : undefined)}>
            <span class="dot">
              <Show when={entry().state === 'done'} fallback={String(entry().step)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d={CHECK} />
                </svg>
              </Show>
            </span>
            <span>{() => c.labels().steps[entry().step]}</span>
          </li>
        )}
      </For>
    </ol>

    <Show when={c.step() === 1}>
      <section class="panel" part="kind" aria-labelledby="dp-create-kind">
        <h1 id="dp-create-kind">{() => c.labels().kindTitle}</h1>
        <p class="intro">{() => c.labels().kindIntro}</p>
        <div class="choices" role="group" aria-labelledby="dp-create-kind">
          <For each={c.kinds()} by={(entry) => entry.kind}>
            {(entry) => (
              <Button variant="outline" tone="neutral" aria-pressed={entry().selected ? 'true' : 'false'} onPress={() => entry().choose()}>
                <span class="choice">
                  <strong>{() => c.labels().kinds[entry().kind].title}</strong>
                  <span>{() => c.labels().kinds[entry().kind].text}</span>
                </span>
              </Button>
            )}
          </For>
        </div>
      </section>
    </Show>

    <Show when={c.step() === 2}>
      <section class="panel" part="info" aria-labelledby="dp-create-info">
        <h1 id="dp-create-info">{() => c.labels().infoTitle}</h1>
        <div class="info">
          <div class="form">
            <For each={INFO_FIELDS}>
              {(field) => (
                <Show when={field !== 'redirect_uri' || c.needsRedirect()}>
                  <label class="field" data-wide={field === 'description' || field === 'redirect_uri' ? '' : undefined}>
                    <span class="caption">{() => c.labels().fields[field]}</span>
                    <Input
                      type={TYPES[field] ?? 'text'}
                      value={() => c.value(field)}
                      required={field === 'name' || field === 'redirect_uri'}
                      onInput={(event: Event) => c.edit(field, valueOf(event))}
                    />
                    <Show when={c.labels().hints[field]}>
                      <span class="note">{() => c.labels().hints[field] ?? ''}</span>
                    </Show>
                  </label>
                </Show>
              )}
            </For>
            <div class="group" role="group" aria-label={() => c.labels().clientType}>
              <span class="caption">{() => c.labels().clientType}</span>
              <div class="choices">
                <For each={['confidential', 'public'] as const}>
                  {(type) => (
                    <Button variant="outline" tone="neutral" aria-pressed={c.clientType() === type ? 'true' : 'false'} onPress={() => c.chooseClientType(type)}>
                      <span class="choice">
                        <strong>{() => c.labels().clientTypes[type].title}</strong>
                        <span>{() => c.labels().clientTypes[type].text}</span>
                      </span>
                    </Button>
                  )}
                </For>
              </div>
            </div>
            <div class="group" role="group" aria-label={() => c.labels().platforms}>
              <span class="caption">{() => c.labels().platforms}</span>
              <div class="toggles">
                <For each={c.platforms()} by={(entry) => entry.platform}>
                  {(entry) => (
                    <Button
                      variant={entry().selected ? 'solid' : 'outline'}
                      tone="neutral"
                      size="sm"
                      aria-pressed={entry().selected ? 'true' : 'false'}
                      onPress={() => entry().toggle()}
                    >
                      {() => c.labels().platformNames[entry().platform]}
                    </Button>
                  )}
                </For>
              </div>
            </div>
          </div>
          <aside class="preview" part="preview" aria-label={() => c.labels().preview}>
            <span class="preview-label">{() => c.labels().preview}</span>
            <div class="consent">
              <span class="mark">{() => (c.value('name').trim()[0] ?? '?').toUpperCase()}</span>
              <span>
                {() =>
                  c
                    .labels()
                    .previewText.replace('{app}', c.value('name').trim() || c.labels().fields.name)
                    .replace('{platform}', c.platform())
                }
              </span>
              <span class="links">{() => c.labels().previewLinks}</span>
            </div>
            <p class="note">{() => c.labels().previewNote}</p>
          </aside>
        </div>
      </section>
    </Show>

    <Show when={c.step() === 3}>
      <section class="panel" part="products" aria-labelledby="dp-create-products">
        <h1 id="dp-create-products">{() => c.labels().productsTitle}</h1>
        <p class="intro">{() => c.labels().productsIntro}</p>
        <Show when={c.products().length} fallback={<p class="intro">{() => c.labels().noProducts}</p>}>
          <div class="products">
            <For each={c.products()} by={(product) => product.slug}>
              {(product) => (
                <Button variant="outline" tone="neutral" aria-pressed={product().selected ? 'true' : 'false'} onPress={() => product().toggle()}>
                  <span class="product" data-selected={() => (product().selected ? '' : undefined)}>
                    <span class="top">
                      <span class="tick" aria-hidden="true">
                        <Show when={product().selected}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d={CHECK} />
                          </svg>
                        </Show>
                      </span>
                      <strong>{() => product().name}</strong>
                      <span class="pill" style={() => `--tone: ${TONE[product().approval]}`}>
                        {() => c.labels().approvals[product().approval]}
                      </span>
                    </span>
                    <Show when={product().description}>
                      <span class="desc">{() => product().description}</span>
                    </Show>
                    <span class="scopes">
                      <For each={product().scopes}>{(scope) => <code>{scope}</code>}</For>
                    </span>
                  </span>
                </Button>
              )}
            </For>
          </div>
        </Show>
      </section>
    </Show>

    <Show when={c.error()}>
      <p class="alert" role="alert">
        {() => c.error()}
      </p>
    </Show>
    <div class="foot">
      <Show when={c.step() > 1}>
        <Button variant="outline" tone="neutral" onPress={c.back}>
          {() => c.labels().back}
        </Button>
      </Show>
      <span class="note">{() => c.labels().sandboxNote}</span>
      <Button variant="solid" part="next" disabled={c.busy()} onPress={() => void c.next()}>
        {() => (c.step() === 3 ? c.labels().create : c.labels().next)}
      </Button>
    </div>
  </div>
);

export const CreateAppView = viewToken<CreateAppLogic>('CreateAppView', createAppView);
