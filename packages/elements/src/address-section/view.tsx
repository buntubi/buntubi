/** The default look: the address by lines in one row; the form with the street over the city, the region and the country. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input, Textarea } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { AddressSectionLogic } from './logic.js';
import '@bambiste/countries/elements';
import type {} from '../bambiste-jsx.js';

export const addressSectionView = (a: AddressSectionLogic) => (
  <section part="address" class="card" aria-labelledby="idp-address-title">
    <style scoped>{`${infoStyles}
      .lines { display: grid; gap: 2px; }
      .city { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 12px; }
      bc-country-select { width: 100%; }
      @media (max-width: 720px) { .city { grid-template-columns: 1fr; } }
    `}</style>
    <h2 id="idp-address-title">{() => a.labels().title}</h2>
    <Show
      when={a.editing()}
      fallback={
        <div class="row">
          <span class="label">{() => a.labels().address}</span>
          <span class="value">
            <Show when={a.lines().length > 0} fallback={<span class="muted">{() => a.labels().none}</span>}>
              <span class="lines">
                <For each={a.lines()}>{(line) => <span>{line}</span>}</For>
              </span>
            </Show>
          </span>
          <span class="buttons">
            <Show when={a.lines().length > 0}>
              <Button variant="ghost" tone="neutral" size="sm" disabled={a.busy()} onPress={() => void a.remove()}>
                {() => a.labels().remove}
              </Button>
            </Show>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => a.edit(true)}>
              {() => (a.lines().length > 0 ? a.labels().edit : a.labels().add)}
            </Button>
          </span>
        </div>
      }
    >
      <Form form={a.form} onSubmit={(values) => a.save(values)} novalidate>
        <div class="edit">
          <FormField control={a.form.get('street_address')} label={() => a.labels().street} description={() => a.labels().streetHint}>
            {(b) => (
              <Textarea name="street_address" rows={2} autocomplete="street-address" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
          <div class="city">
            <FormField control={a.form.get('postal_code')} label={() => a.labels().postalCode}>
              {(b) => <Input name="postal_code" autocomplete="postal-code" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
            <FormField control={a.form.get('locality')} label={() => a.labels().locality}>
              {(b) => <Input name="locality" autocomplete="address-level2" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
          </div>
          <div class="fields">
            <FormField control={a.form.get('region')} label={() => a.labels().region}>
              {(b) => <Input name="region" autocomplete="address-level1" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
            <FormField control={a.form.get('country')} label={() => a.labels().country}>
              {(b) => (
                <bc-country-select
                  name="country"
                  value={b.value()}
                  locale={a.locale()}
                  aria-label={a.labels().country}
                  onChange={(event) => b.onChange(event.detail.value)}
                />
              )}
            </FormField>
          </div>
          <Show when={a.error()}>
            <p class="alert" role="alert">
              {() => a.error()}
            </p>
          </Show>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={a.busy()}>
              {() => a.labels().save}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => a.edit(false)}>
              {() => a.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show when={!a.editing() && a.notice()}>
      <p class="done" role="status">
        {() => a.notice()}
      </p>
    </Show>
    <Show when={!a.editing() && a.error()}>
      <p class="alert" role="alert">
        {() => a.error()}
      </p>
    </Show>
  </section>
);

export const AddressSectionView = viewToken<AddressSectionLogic>('idp-address-section', addressSectionView);
