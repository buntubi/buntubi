/** The default look: a card, the photo row, then the name row or its form. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { ProfileSectionLogic } from './logic.js';

export const profileSectionView = (p: ProfileSectionLogic) => (
  <section part="profile" class="card" aria-labelledby="idp-profile-title">
    <style scoped>{`${infoStyles}
      .avatar { width: 44px; height: 44px; flex: none; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 700; color: var(--idp-accent-ink); background: var(--idp-accent-soft); }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
    `}</style>
    <h2 id="idp-profile-title">{() => p.labels().title}</h2>
    <div class="row">
      <span class="label">{() => p.labels().photo}</span>
      <span class="value">
        <span class="avatar" aria-hidden="true">
          <Show when={p.picture()} fallback={p.initials()}>
            <img src={p.picture()} alt="" />
          </Show>
        </span>
        <span class="muted">{() => p.labels().photoHint}</span>
      </span>
      <span class="buttons">
        <Show when={p.picture()}>
          <Button variant="ghost" tone="neutral" size="sm" disabled={p.busy()} onPress={() => void p.removePhoto()}>
            {() => p.labels().removePhoto}
          </Button>
        </Show>
        <Button variant="outline" tone="neutral" size="sm" disabled={p.busy()} onPress={() => p.choosePhoto()}>
          {() => p.labels().changePhoto}
        </Button>
      </span>
    </div>
    <Show
      when={p.editing()}
      fallback={
        <div class="row">
          <span class="label">{() => p.labels().name}</span>
          <span class="value">{() => p.name()}</span>
          <Button variant="outline" tone="neutral" size="sm" onPress={() => p.setEditing(true)}>
            {() => p.labels().edit}
          </Button>
        </div>
      }
    >
      <Form form={p.form} onSubmit={(values) => p.saveName(values)} novalidate>
        <div class="edit">
          <div class="fields">
            <FormField control={p.form.get('given_name')} label={() => p.labels().givenName}>
              {(b) => <Input name="given_name" autocomplete="given-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
            <FormField control={p.form.get('family_name')} label={() => p.labels().familyName}>
              {(b) => <Input name="family_name" autocomplete="family-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
          </div>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={p.busy()}>
              {() => p.labels().save}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => p.setEditing(false)}>
              {() => p.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show when={p.notice()}>
      <p class="done" role="status">
        {() => p.notice()}
      </p>
    </Show>
    <Show when={p.error()}>
      <p class="alert" role="alert">
        {() => p.error()}
      </p>
    </Show>
  </section>
);

export const ProfileSectionView = viewToken<ProfileSectionLogic>('idp-profile-section', profileSectionView);
