/** The catalog's default look: a card per product, then the form for a new one. */
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import { For, Show } from '@fluixi/core';
import type { Availability } from '@buntubi/sdk/admin';
import { viewToken } from '../view.js';
import type { ProductInput } from '@buntubi/sdk/schemas/catalogue';
import type { CatalogProduct, ProductCatalogLogic } from './logic.js';

const AVAILABILITIES: Availability[] = ['ga', 'beta', 'sandbox'];
const APPROVAL_TONE = { none: 'success', review: 'warning', restricted: 'danger' } as const;

export const productCatalogView = (c: ProductCatalogLogic) => {
  const field = (key: keyof ProductInput, label: () => string, placeholder = '') => (
    <FormField control={c.form.get(key)} label={label} required={key !== 'category'}>
      {(b) => <Input name={key} placeholder={placeholder} value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
    </FormField>
  );
  const product = (entry: CatalogProduct) => (
    <article part="product" class="product" aria-busy={() => (c.busy() === entry.slug ? 'true' : 'false')}>
      <div class="head">
        <div class="title">
          <h3>{entry.name}</h3>
          <code>{entry.slug}</code>
        </div>
        <Badge variant="soft" tone={APPROVAL_TONE[entry.approval]}>
          {() => c.labels().approvals[entry.approval]}
        </Badge>
      </div>
      <p class="description">{entry.description}</p>
      <div class="row">
        <span class="muted">{() => c.labels().availability}</span>
        <Select
          value={String(entry.availability)}
          labels={(value: string) => c.labels().availabilities[value as Availability]}
          onChange={(value: string) => c.setAvailability(entry.slug, value as Availability)}
        >
          <SelectTrigger part="availability">
            <SelectValue />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <For each={AVAILABILITIES}>
                {(value) => <SelectItem value={value}>{() => c.labels().availabilities[value]}</SelectItem>}
              </For>
            </SelectContent>
          </SelectPortal>
        </Select>
      </div>
      <div part="scopes" class="scopes">
        <Show when={entry.scopes.length} fallback={<span class="muted">{() => c.labels().noScopes}</span>}>
          <For each={entry.scopes}>
            {(scope) => (
              <span class="chip">
                <code>{scope}</code>
                <Button
                  variant="ghost"
                  tone="neutral"
                  size="sm"
                  aria-label={() => c.labels().removeScope.replace('{scope}', scope)}
                  disabled={c.busy() === scope}
                  onPress={() => c.removeScope(scope)}
                >
                  ×
                </Button>
              </span>
            )}
          </For>
        </Show>
      </div>
      <Show when={c.freeScopes().length}>
        <div class="row">
          <span class="muted">{() => c.labels().addScope}</span>
          <Select placeholder={c.labels().pickScope} onChange={(scope: string) => c.addScope(entry.slug, scope)}>
            <SelectTrigger part="add-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent>
                <For each={c.freeScopes()}>{(scope) => <SelectItem value={scope}>{scope}</SelectItem>}</For>
              </SelectContent>
            </SelectPortal>
          </Select>
        </div>
      </Show>
    </article>
  );
  return (
    <div part="catalog" class="catalog">
      <style scoped>{`
        .catalog { display: flex; flex-direction: column; gap: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .product, .new { display: flex; flex-direction: column; gap: 12px; padding: 18px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
        .product[aria-busy='true'] { opacity: 0.7; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .title { display: flex; flex-direction: column; gap: 2px; }
        h3, h2 { margin: 0; font-size: 15px; font-weight: 600; }
        code { font-family: var(--idp-mono); font-size: 12px; color: var(--idp-muted); }
        .description { margin: 0; color: var(--idp-muted); }
        .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .muted { color: var(--idp-muted); font-size: 13px; }
        .scopes { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { display: inline-flex; align-items: center; gap: 2px; padding-left: 8px; border: 1px solid var(--idp-border); border-radius: 7px; background: var(--idp-surface-2); }
        .chip code { color: var(--idp-text); }
        .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; }
        .alert { margin: 0; padding: 10px 12px; border-radius: var(--idp-radius-sm); background: color-mix(in srgb, var(--idp-bad) 10%, transparent); color: var(--idp-bad); }
        .empty { margin: 0; color: var(--idp-muted); }
      `}</style>
      <Show when={c.error()}>
        <p class="alert" role="alert">{() => c.error()}</p>
      </Show>
      <Show when={c.products().length} fallback={<p class="empty">{() => c.labels().empty}</p>}>
        <div class="grid">
          <For each={c.products()}>{product}</For>
        </div>
      </Show>
      <Form form={c.form} onSubmit={(values) => c.create(values)} novalidate>
      <div part="new" class="new">
        <h2>{() => c.labels().newProduct}</h2>
        <div class="fields">
          {field('slug', () => c.labels().slug, 'payments')}
          {field('category', () => c.labels().category)}
          {field('nameFr', () => c.labels().nameFr)}
          {field('nameEn', () => c.labels().nameEn)}
          {field('descriptionFr', () => c.labels().descriptionFr)}
          {field('descriptionEn', () => c.labels().descriptionEn)}
        </div>
        <div>
          <Button type="submit" variant="solid" disabled={c.busy() === 'new'}>
            {() => c.labels().create}
          </Button>
        </div>
      </div>
      </Form>
    </div>
  );
};

export const ProductCatalogView = viewToken<ProductCatalogLogic>('idp-product-catalog', productCatalogView);
