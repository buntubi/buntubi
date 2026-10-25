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
import '../shared/form.css';

export interface SignUp extends Record<ProfileField, string> {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
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
    });
    const { run, pending, error } = useElementAction('idp-sign-up', () => this.action, text);

    const submit = (values: SignUp) => {
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };

    return {
      asked,
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
