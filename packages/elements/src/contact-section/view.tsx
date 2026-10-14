/** The default look: the email row with its state, the change form or the waiting notice, then the phone. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { ContactSectionLogic } from './logic.js';
import '@bambiste/countries/elements';
import type {} from '../bambiste-jsx.js';

/** What the last change did, under the rows; an edit shows its own error inside its form. */
const Messages = (props: { p: ContactSectionLogic }) => (
  <>
    <Show when={props.p.notice()}>
      <p class="done" role="status">
        {() => props.p.notice()}
      </p>
    </Show>
    <Show when={props.p.error()}>
      <p class="alert" role="alert">
        {() => props.p.error()}
      </p>
    </Show>
  </>
);

export const contactSectionView = (p: ContactSectionLogic) => (
  <section part="contact" class="card" aria-labelledby="idp-contact-title">
    <style scoped>{`${infoStyles}
      bc-phone-input { max-width: 420px; }
    `}</style>
    <h2 id="idp-contact-title">{() => p.labels().title}</h2>
    <div class="row">
      <span class="label">{() => p.labels().email}</span>
      <span class="value">
        <span>{() => p.email()}</span>
        <Show when={p.verified()} fallback={<span class="pill warn">{() => p.labels().unverified}</span>}>
          <span class="pill ok">{() => p.labels().verified}</span>
        </Show>
      </span>
      <Show when={p.editing() !== 'email'}>
        <Button variant="outline" tone="neutral" size="sm" onPress={() => p.edit('email')}>
          {() => p.labels().change}
        </Button>
      </Show>
    </div>
    <Show when={p.pendingEmail()}>
      <div class="notice" role="status">
        <span>
          {() => p.labels().pending} <strong>{() => p.pendingEmail()}</strong>. {() => p.labels().pendingHint}
        </span>
        <Button variant="ghost" tone="neutral" size="sm" disabled={p.busy()} onPress={() => void p.cancelChange()}>
          {() => p.labels().cancelChange}
        </Button>
      </div>
    </Show>
    <Show when={p.editing() === 'email'}>
      <Form form={p.emailForm} onSubmit={(values) => p.requestChange(values)} novalidate>
        <div class="edit">
          <div class="fields">
            <FormField control={p.emailForm.get('email')} label={() => p.labels().newEmail}>
              {(b) => <Input type="email" name="email" autocomplete="email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />}
            </FormField>
            <FormField control={p.emailForm.get('password')} label={() => p.labels().password}>
              {(b) => (
                <Input type="password" name="password" autocomplete="current-password" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
              )}
            </FormField>
          </div>
          <span class="muted">{() => p.labels().passwordHint}</span>
          <Show when={p.error()}>
            <p class="alert" role="alert">
              {() => p.error()}
            </p>
          </Show>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={p.busy()}>
              {() => p.labels().sendLink}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => p.edit(null)}>
              {() => p.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show
      when={p.editing() === 'phone'}
      fallback={
        <div class="row">
          <span class="label">{() => p.labels().phone}</span>
          <span class="value">
            <Show when={p.phone()} fallback={<span class="muted">{() => p.labels().noPhone}</span>}>
              {() => p.phoneShown()}
            </Show>
          </span>
          <span class="buttons">
            <Show when={p.phone()}>
              <Button variant="ghost" tone="neutral" size="sm" disabled={p.busy()} onPress={() => void p.removePhone()}>
                {() => p.labels().remove}
              </Button>
            </Show>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => p.edit('phone')}>
              {() => (p.phone() ? p.labels().edit : p.labels().add)}
            </Button>
          </span>
        </div>
      }
    >
      <Form form={p.phoneForm} onSubmit={(values) => p.savePhone(values)} novalidate>
        <div class="edit">
          <FormField control={p.phoneForm.get('phone')} label={() => p.labels().phone} description={() => p.labels().phoneHint}>
            {(b) => (
              <bc-phone-input
                name="phone"
                value={b.value()}
                country={p.country()}
                preferred={p.country()}
                locale={p.locale()}
                aria-label={p.labels().phone}
                aria-invalid={b['aria-invalid']()}
                onInput={(event) => p.typePhone(event.detail.value)}
                onChange={(event) => b.onChange(event.detail.value)}
              />
            )}
          </FormField>
          <Show when={p.error()}>
            <p class="alert" role="alert">
              {() => p.error()}
            </p>
          </Show>
          <div class="buttons">
            <Button type="submit" variant="solid" size="sm" disabled={p.busy()}>
              {() => p.labels().save}
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onPress={() => p.edit(null)}>
              {() => p.labels().cancel}
            </Button>
          </div>
        </div>
      </Form>
    </Show>
    <Show when={!p.editing()}>
      <Messages p={p} />
    </Show>
  </section>
);

export const ContactSectionView = viewToken<ContactSectionLogic>('idp-contact-section', contactSectionView);
