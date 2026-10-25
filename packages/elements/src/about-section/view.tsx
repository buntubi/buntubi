/** The default look: one row per field shown; the form with each field in the same order. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form } from '@fluixi-ui/form';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import { ProfileFieldInput } from './field-input.js';
import type { AboutSectionLogic } from './logic.js';

export const aboutSectionView = (a: AboutSectionLogic) => (
  <Show when={a.shown().length > 0}>
    <section part="about" class="card" aria-labelledby="idp-about-title">
      <style scoped>{`${infoStyles}`}</style>
      <h2 id="idp-about-title">{() => a.labels().title}</h2>
      <Show
        when={a.editing()}
        fallback={
          <>
            <For each={a.shown()}>
              {(field) => (
                <div class="row">
                  <span class="label">{() => a.labels().fields[field]}</span>
                  <span class="value">
                    <Show when={a.display(field)} fallback={<span class="muted">{() => a.labels().none}</span>}>
                      {() => a.display(field)}
                    </Show>
                  </span>
                </div>
              )}
            </For>
            <div class="buttons">
              <Button variant="outline" tone="neutral" size="sm" onPress={() => a.edit(true)}>
                {() => a.labels().edit}
              </Button>
            </div>
          </>
        }
      >
        <Form form={a.form} onSubmit={(values) => a.save(values)} novalidate>
          <div class="edit">
            <div class="fields">
              <For each={a.shown()}>
                {(field) => (
                  <ProfileFieldInput
                    field={field}
                    control={a.form.get(field)}
                    label={a.labels().fields[field]}
                    description={a.labels().hints[field] ?? (a.mode(field) === 'required' ? a.labels().required : '')}
                    genders={a.labels().genders}
                  />
                )}
              </For>
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
    </section>
  </Show>
);

export const AboutSectionView = viewToken<AboutSectionLogic>('idp-about-section', aboutSectionView);
