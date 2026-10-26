/** The default look of idp-complete-profile: a line naming the account, then the fields. */
import { For } from '@fluixi/core';
import { Form } from '@fluixi-ui/form';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntubi/sdk/view';
import { ProfileFieldInput } from '@idp/elements/about-section/field-input';
import type { CompleteProfileLogic } from './complete-profile.js';

export const completeProfileView = ({ asked, error, form, intro, label, pending, submit }: CompleteProfileLogic) => (
  <Form form={form} onSubmit={submit} class="idp-form" novalidate>
    <p class="idp-note">{intro}</p>
    {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
    <For each={asked()}>
      {(field) => <ProfileFieldInput field={field} control={form.get(field)} label={label().fields[field]} genders={label().genders} />}
    </For>
    <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
      {() => (pending() ? label().pending : label().submit)}
    </Button>
  </Form>
);

export const CompleteProfileView = viewToken<CompleteProfileLogic>('idp-complete-profile', completeProfileView);
