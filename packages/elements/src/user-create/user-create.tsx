/**
 * A form that creates an account through the injected `Admin` service: invited by email, or
 * ready with a first password. Fields are checked with `schema` before anything is sent;
 * `created` carries the new account's id.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@buntu/sdk/admin';
import { newUserSchema, type NewUserInput } from '@buntu/sdk/schemas/users';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  userCreateLabels,
  type CreateMode,
  type UserCreateEvents,
  type UserCreateForm,
  type UserCreateLabels,
  type UserCreateLogic,
  type UserCreateValues,
} from './logic.js';
import { UserCreateView } from './view.js';

const props = {
  /** The language a new account starts with. */
  locale: prop.string('fr'),
  /** Checks each field before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<NewUserInput>>(newUserSchema),
  labels: prop.object<Partial<UserCreateLabels>>({}),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpUserCreate extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...userCreateLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const schema = () => this.schema;
    const mode = signal<CreateMode>('invite');
    const check = <K extends keyof NewUserInput & string>(field: K) => fieldValidator<NewUserInput, K>(schema, field, text);
    const password = check('password');
    const form: UserCreateForm = createForm({
      email: createField('', { validators: [check('email')] }),
      given_name: createField('', { validators: [check('given_name')] }),
      family_name: createField('', { validators: [check('family_name')] }),
      locale: createField(this.locale === 'en' ? 'en' : 'fr'),
      // An invitation has no password: the person chooses it.
      password: createField('', { validators: [(value, ctx) => (mode() === 'password' ? password(value, ctx) : null)] }),
    });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const submit = async (values: UserCreateValues) => {
      busy.set(true);
      error.set(null);
      try {
        const id = await admin.createUser({
          email: values.email.trim(),
          given_name: values.given_name.trim(),
          family_name: values.family_name.trim(),
          locale: values.locale === 'en' ? 'en' : 'fr',
          ...(mode() === 'password' ? { password: values.password } : {}),
        });
        this.emit('created', { id });
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: UserCreateLogic = {
      labels,
      form,
      submit,
      mode,
      setMode: (next) => {
        mode.set(next);
        form.get('password').reset('');
      },
      busy,
      error,
    };
    return useView(UserCreateView)(logic);
  }
}

defineCustomElement('idp-user-create', IdpUserCreate);

declare global {
  interface HTMLElementTagNameMap {
    'idp-user-create': IdpUserCreate;
  }
  interface JSXCustomElements {
    'idp-user-create': ElementAttributes<typeof props, UserCreateEvents>;
  }
}
