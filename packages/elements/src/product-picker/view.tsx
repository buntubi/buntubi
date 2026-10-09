/** The default look: the heading and line, then two cards to a row. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ProductPickerLogic } from './logic.js';

export const productPickerView = (p: ProductPickerLogic) => (
  <section part="products" class="products" aria-labelledby="idp-product-picker-title">
    <style scoped>{`
      .products { display: grid; gap: 18px; }
      .head { display: grid; gap: 6px; }
      h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--idp-muted); }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <h1 id="idp-product-picker-title">{() => p.title()}</h1>
      <p>{() => p.intro()}</p>
    </div>
    <Show when={p.products().length} fallback={<p>{() => p.empty()}</p>}>
      <div class="grid" role="group" aria-labelledby="idp-product-picker-title">
        <For each={p.products()} by={(entry) => entry.slug}>
          {(entry) => (
            <idp-product-card
              name={entry().name}
              text={entry().text}
              scopes={entry().scopes}
              meta={entry().meta}
              approval={entry().approval}
              approvalLabel={entry().approvalLabel}
              selected={entry().selected}
              onToggle={() => p.toggle(entry().slug)}
            />
          )}
        </For>
      </div>
    </Show>
  </section>
);

export const ProductPickerView = viewToken<ProductPickerLogic>('ProductPickerView', productPickerView);
