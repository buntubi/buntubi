/** The product browser's default look: search and categories, then one card per product. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { ProductBrowserLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const TONE = { none: 'var(--dp-ok)', review: 'var(--dp-warn)', restricted: 'var(--dp-bad)' } as const;

export const productBrowserView = (b: ProductBrowserLogic) => (
  <div part="product-browser" class="browser">
    <style scoped>{`
      .browser { display: grid; gap: 16px; }
      .tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      .search { flex: 0 1 360px; }
      .filters { display: flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 9px; background: var(--dp-surface-2); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      article { display: flex; flex-direction: column; gap: 12px; padding: 18px; border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); box-shadow: var(--dp-shadow); }
      .top { display: flex; gap: 12px; align-items: flex-start; }
      .names { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .meta { color: var(--dp-muted); font-size: 12.5px; }
      .badge { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; border: 1px solid var(--dp-border-2); color: var(--dp-muted); white-space: nowrap; }
      p { margin: 0; color: var(--dp-muted); font-size: 13.5px; }
      .scopes { display: flex; flex-wrap: wrap; gap: 6px; }
      code { font-family: var(--dp-mono); font-size: 11.5px; padding: 1px 7px; border-radius: 6px; background: var(--dp-surface-2); border: 1px solid var(--dp-border); }
      .foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--dp-border); font-size: 13px; }
      .approval { display: inline-flex; align-items: center; gap: 6px; color: var(--tone); }
      .approval::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .foot a { color: var(--dp-accent-ink); font-weight: 500; text-decoration: none; }
      .empty { margin: 0; color: var(--dp-muted); }
    `}</style>
    <div class="tools">
      <div class="search">
        <Input
          type="search"
          value={() => b.query()}
          placeholder={() => b.labels().search}
          aria-label={() => b.labels().search}
          onInput={(event: Event) => b.search(valueOf(event))}
        />
      </div>
      <Show when={b.categories().length > 2}>
        <div class="filters" role="group" part="categories">
          <For each={b.categories()} by={(entry) => entry.value}>
            {(entry) => (
              <Button
                variant={entry().current ? 'outline' : 'ghost'}
                tone="neutral"
                size="sm"
                aria-pressed={entry().current ? 'true' : 'false'}
                onPress={() => entry().choose()}
              >
                {() => entry().value || b.labels().all}
              </Button>
            )}
          </For>
        </div>
      </Show>
    </div>
    <Show when={b.total()} fallback={<p class="empty">{() => b.labels().empty}</p>}>
      <Show when={b.products().length} fallback={<p class="empty">{() => b.labels().noMatch}</p>}>
        <div class="grid">
          <For each={b.products()} by={(product) => product.slug}>
            {(product) => (
              <article part="product">
                <div class="top">
                  <div class="names">
                    <h2>{() => product().name}</h2>
                    <span class="meta">{() => [product().category, product().auth].filter(Boolean).join(' · ')}</span>
                  </div>
                  <span class="badge">{() => b.labels().availability[product().availability]}</span>
                </div>
                <Show when={product().description}>
                  <p>{() => product().description}</p>
                </Show>
                <div class="scopes">
                  <For each={product().scopes}>{(scope) => <code>{scope}</code>}</For>
                </div>
                <div class="foot">
                  <span class="approval" style={() => `--tone: ${TONE[product().approval]}`}>
                    {() => b.labels().approval[product().approval]}
                  </span>
                  <Show when={product().docs}>
                    <a href={() => product().docs ?? ''} target="_blank" rel="noopener noreferrer">
                      {() => b.labels().docs}
                    </a>
                  </Show>
                </div>
              </article>
            )}
          </For>
        </div>
      </Show>
    </Show>
  </div>
);

export const ProductBrowserView = viewToken<ProductBrowserLogic>('ProductBrowserView', productBrowserView);
