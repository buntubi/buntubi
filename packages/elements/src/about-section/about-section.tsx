/**
 * The about-you card: the profile fields the platform shows, from `fields`, with their values.
 * Saved through the injected `Account` service; a required field cannot be left empty.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm, type Validator } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account, PROFILE_FIELDS, type AccountSummary, type ProfileField } from '@buntubi/sdk/account';
import { aboutSchema, type AboutInput } from '@buntubi/sdk/schemas/account';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { aboutSectionLabels, type AboutForm, type AboutSectionLabels, type AboutSectionLogic } from './logic.js';
import { AboutSectionView } from './view.js';

const props = {
  fields: prop.object<AccountSummary['fields']>({}),
  values: prop.object<Partial<Record<ProfileField, string | null>>>({}),
  locale: prop.string('en'),
  schema: prop.any<FormSchema<AboutInput>>(aboutSchema),
  labels: prop.object<Partial<AboutSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAboutSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...aboutSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const shown = () => PROFILE_FIELDS.filter((field) => this.fields[field]);
    const mode = (field: ProfileField) => this.fields[field] ?? 'optional';
    const required =
      (field: ProfileField): Validator<string> =>
      (value) =>
        mode(field) === 'required' && !value.trim() ? { type: 'required', message: text('form.required') } : null;
    const check = <K extends ProfileField>(field: K) => [
      fieldValidator<AboutInput, K>(() => this.schema, field, text),
      required(field),
    ];
    const form: AboutForm = createForm({
      birthdate: createField('', { validators: check('birthdate') }),
      gender: createField('', { validators: check('gender') }),
      middle_name: createField('', { validators: check('middle_name') }),
      nickname: createField('', { validators: check('nickname') }),
      website: createField('', { validators: check('website') }),
      zoneinfo: createField('', { validators: check('zoneinfo') }),
    });
    const value = (field: ProfileField) => this.values[field] ?? '';
    const editing = signal(false);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const logic: AboutSectionLogic = {
      labels,
      shown,
      mode,
      display: (field) => {
        const raw = value(field);
        if (!raw) return '';
        if (field === 'birthdate') {
          return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${raw}T00:00:00Z`));
        }
        if (field === 'gender') return labels().genders[raw as keyof AboutSectionLabels['genders']] ?? raw;
        return raw;
      },
      editing,
      edit: (on) => {
        error.set(null);
        notice.set(null);
        if (on) {
          for (const field of PROFILE_FIELDS) form.get(field).reset(value(field));
          // A zone not set yet starts from this device's.
          if (!value('zoneinfo')) form.get('zoneinfo').reset(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
        editing.set(on);
      },
      form,
      save: async (values) => {
        busy.set(true);
        error.set(null);
        notice.set(null);
        try {
          // Only the fields shown: the provider refuses one the platform hides.
          await account.updateProfile(Object.fromEntries(shown().map((field) => [field, values[field].trim()])));
          editing.set(false);
          notice.set(labels().saved);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      notice,
      error,
    };
    return useView(AboutSectionView)(logic);
  }
}

defineCustomElement('idp-about-section', IdpAboutSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-about-section': IdpAboutSection;
  }
  interface JSXCustomElements {
    'idp-about-section': ElementAttributes<typeof props>;
  }
}
