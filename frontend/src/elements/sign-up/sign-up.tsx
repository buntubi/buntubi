/**
 * Account creation: first and last name, email, password, and the profile fields the platform
 * requires. Validates, emits `submit`, runs the host's `action`: `success` with its result, or
 * the refusal it threw.
 */
import { useView } from '@buntubi/sdk/view';
import { SignUpView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm, type Validator } from '@fluixi/forms';
import { PROFILE_FIELDS, type Gender, type ProfileField } from '@buntubi/sdk/account';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import { platformForm, platformValuesOf } from '@idp/elements/about-section/platform-field-input';
import type { PlatformField, PlatformValue } from '@buntubi/sdk/account';
import { termsValidator, type TermsToAccept } from '../shared/terms-check.js';
import '../shared/form.css';

export interface SignUp extends Record<ProfileField, string> {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  /** Ticked when the page has terms to accept. */
  acceptTerms: boolean;
  /** The platform's own required fields, by key. */
  platformProfile?: Record<string, PlatformValue | null>;
}

export interface SignUpLabels {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  pending: string;
  fields: Record<ProfileField, string>;
  genders: Record<Gender, string>;
  acceptTerms: string;
  termsLink: string;
}

export const signUpLabels: SignUpLabels = {
  givenName: 'First name',
  familyName: 'Last name',
  email: 'Email address',
  password: 'Password',
  passwordHint: 'At least 10 characters.',
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

export interface SignUpEvents {
  submit: SignUp;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<SignUp> | undefined>(undefined),
  schema: prop.any<FormSchema<SignUp> | undefined>(undefined),
  labels: prop.object<SignUpLabels>(signUpLabels),
  messages: prop.object<Messages>({}),
  /** The address to start from, when the app named one. */
  email: prop.string(''),
  /** The profile fields the platform requires, asked after the password. */
  fields: prop.any<ProfileField[]>([]),
  /** The platform's terms to accept, when it has some. */
  terms: prop.any<TermsToAccept | null>(null),
  /** The platform's own fields it requires, asked after the standard ones. */
  platformFields: prop.any<PlatformField[]>([]),
  locale: prop.string('en'),
};

export class IdpSignUp extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
    const label = () => ({ ...signUpLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const validate = <K extends keyof SignUp & string>(key: K) => [
      fieldValidator<SignUp, K>(() => this.schema, key, text),
    ];
    const asked = () => PROFILE_FIELDS.filter((field) => this.fields.includes(field));
    // Only a field the page asks for must be filled; the others stay empty and are not sent.
    const profile = <K extends ProfileField>(key: K) => {
      const required: Validator<string> = (value) =>
        this.fields.includes(key) && !value.trim() ? { type: 'required', message: text('form.required') } : null;
      return createField('', { validators: [...validate(key), required] });
    };
    const form = createForm({
      givenName: createField('', { validators: validate('givenName') }),
      familyName: createField('', { validators: validate('familyName') }),
      email: createField(this.email, { validators: validate('email') }),
      password: createField('', { validators: validate('password') }),
      birthdate: profile('birthdate'),
      gender: profile('gender'),
      middle_name: profile('middle_name'),
      nickname: profile('nickname'),
      website: profile('website'),
      zoneinfo: profile('zoneinfo'),
      acceptTerms: createField(false, { validators: [termsValidator(() => this.terms, () => text('form.terms'))] }),
    });
    const own = (this.platformFields ?? []).length ? platformForm(this.platformFields, {}, () => text('form.required')) : null;
    const { run, pending, error } = useElementAction('idp-sign-up', () => this.action, text);

    const submit = async (entered: SignUp) => {
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
      terms: () => this.terms,
      error,
      form,
      label,
      pending,
      submit,
    };
  }

  protected override render(): unknown {
    return useView(SignUpView)(this.logic());
  }
}

export type SignUpLogic = ReturnType<IdpSignUp['logic']>;

defineCustomElement('idp-sign-up', IdpSignUp);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sign-up': IdpSignUp;
  }
  interface JSXCustomElements {
    'idp-sign-up': ElementAttributes<typeof props, SignUpEvents>;
  }
}
