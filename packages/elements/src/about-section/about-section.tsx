/**
 * The about-you card: the profile fields the platform shows, from `fields`, with their values.
 * Saved through the injected `Account` service; a required field cannot be left empty.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm, type Validator } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import {
  Account,
  PROFILE_FIELDS,
  type AccountSummary,
  type PlatformField,
  type PlatformValue,
  type ProfileField,
} from '@buntubi/sdk/account';
import { aboutSchema, type AboutInput } from '@buntubi/sdk/schemas/account';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { aboutSectionLabels, type AboutForm, type AboutSectionLabels, type AboutSectionLogic } from './logic.js';
import { AboutSectionView } from './view.js';
import { labelIn, platformForm, platformValuesOf, type PlatformForm } from './platform-field-input.js';

const props = {
  fields: prop.object<AccountSummary['fields']>({}),
  values: prop.object<Partial<Record<ProfileField, string | null>>>({}),
  /** The platform's own fields people see, and the person's values for them. */
  platformFields: prop.any<PlatformField[]>([]),
  platformValues: prop.object<Record<string, PlatformValue>>({}),
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
    const platform = () => this.platformFields ?? [];
    const ownForm = signal<PlatformForm | null>(null);
    const editing = signal(false);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const logic: AboutSectionLogic = {
      labels,
      shown,
      mode,
      platform,
      platformForm: ownForm,
      locale: () => this.locale,
      platformDisplay: (field) => {
        const value = this.platformValues[field.key];
        if (value === undefined || value === null || value === '') return '';
        const choice = (v: string) => labelIn(field.choices.find((c) => c.value === v)?.label ?? { fr: v, en: v }, this.locale);
        if (field.type === 'boolean') return value ? labels().yes : labels().no;
        if (field.type === 'choice') return choice(String(value));
        if (field.type === 'choices') return (Array.isArray(value) ? value : []).map(choice).join(', ');
        if (field.type === 'date') {
          return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${String(value)}T00:00:00Z`));
        }
        return String(value);
      },
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
          ownForm.set(platform().length ? platformForm(platform(), this.platformValues, () => text('form.required')) : null);
        }
        editing.set(on);
      },
      form,
      save: async (values) => {
        busy.set(true);
        error.set(null);
        notice.set(null);
        try {
          const own = ownForm();
          const ownValues = own ? await platformValuesOf(own, platform()) : {};
          if (ownValues === null) return;
          // Only the fields shown: the provider refuses one the platform hides.
          await account.updateProfile({
            ...Object.fromEntries(shown().map((field) => [field, values[field].trim()])),
            ...(own ? { platform_profile: ownValues } : {}),
          });
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
