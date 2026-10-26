/**
 * The fields the platform requires, asked after a provider sign-in made no account yet: the
 * account is made with them. Validates, emits `submit`, runs the host's `action`.
 */
import { useView } from '@buntubi/sdk/view';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm, type Validator } from '@fluixi/forms';
import { PROFILE_FIELDS, type Gender, type ProfileField } from '@buntubi/sdk/account';
import { aboutSchema } from '@buntubi/sdk/schemas/account';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import { CompleteProfileView } from './view.js';
import { platformForm, platformValuesOf } from '@idp/elements/about-section/platform-field-input';
import type { PlatformField, PlatformValue } from '@buntubi/sdk/account';
import { termsValidator, type TermsToAccept } from '../shared/terms-check.js';
import '../shared/form.css';

export type CompleteProfile = Record<ProfileField, string> & {
  acceptTerms: boolean;
  /** The platform's own required fields, by key. */
  platformProfile?: Record<string, PlatformValue | null>;
};

export interface CompleteProfileLabels {
  /** {email}: the address the account is made for. */
  intro: string;
  submit: string;
  pending: string;
  fields: Record<ProfileField, string>;
  genders: Record<Gender, string>;
  acceptTerms: string;
  termsLink: string;
}

export const completeProfileLabels: CompleteProfileLabels = {
  intro: 'One more step to make the account for {email}.',
  submit: 'Create my account',
  pending: 'Creating',
  fields: {
    birthdate: 'Date of birth',
    gender: 'Gender',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    website: 'Website',
    zoneinfo: 'Time zone',
  },
  genders: { female: 'Female', male: 'Male', other: 'Other' },
  acceptTerms: 'I accept the {terms}',
  termsLink: 'terms of use',
};

export interface CompleteProfileEvents {
  submit: CompleteProfile;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<CompleteProfile> | undefined>(undefined),
  schema: prop.any<FormSchema<CompleteProfile>>(aboutSchema),
  labels: prop.object<Partial<CompleteProfileLabels>>({}),
  messages: prop.object<Messages>({}),
  fields: prop.any<ProfileField[]>([]),
  email: prop.string(''),
  /** The platform's terms to accept, when it has some. */
  terms: prop.any<TermsToAccept | null>(null),
  /** The platform's own fields to ask. */
  platformFields: prop.any<PlatformField[]>([]),
  locale: prop.string('en'),
};

export class IdpCompleteProfile extends typedElement(props) {
  logic() {
    const label = () => ({ ...completeProfileLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const asked = () => PROFILE_FIELDS.filter((field) => this.fields.includes(field));
    const field = <K extends ProfileField>(key: K) => {
      const required: Validator<string> = (value) =>
        this.fields.includes(key) && !value.trim() ? { type: 'required', message: text('form.required') } : null;
      return createField('', { validators: [fieldValidator<CompleteProfile, K>(() => this.schema, key, text), required] });
    };
    const form = createForm({
      birthdate: field('birthdate'),
      gender: field('gender'),
      middle_name: field('middle_name'),
      nickname: field('nickname'),
      website: field('website'),
      zoneinfo: field('zoneinfo'),
      acceptTerms: createField(false, { validators: [termsValidator(() => this.terms, () => text('form.terms'))] }),
    });
    const own = (this.platformFields ?? []).length ? platformForm(this.platformFields, {}, () => text('form.required')) : null;
    const { run, pending, error } = useElementAction('idp-complete-profile', () => this.action, text);
    const submit = async (entered: CompleteProfile) => {
      const platformProfile = own ? await platformValuesOf(own, this.platformFields) : undefined;
      if (platformProfile === null) return;
      const values = { ...entered, ...(platformProfile ? { platformProfile } : {}) };
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };
    return {
      asked,
      platform: () => this.platformFields ?? [],
      platformForm: own,
      locale: () => this.locale,
      error,
      form,
      terms: () => this.terms, intro: () => label().intro.replace('{email}', this.email), label, pending, submit };
  }

  protected override render(): unknown {
    return useView(CompleteProfileView)(this.logic());
  }
}

export type CompleteProfileLogic = ReturnType<IdpCompleteProfile['logic']>;

defineCustomElement('idp-complete-profile', IdpCompleteProfile);

declare global {
  interface HTMLElementTagNameMap {
    'idp-complete-profile': IdpCompleteProfile;
  }
  interface JSXCustomElements {
    'idp-complete-profile': ElementAttributes<typeof props, CompleteProfileEvents>;
  }
}
