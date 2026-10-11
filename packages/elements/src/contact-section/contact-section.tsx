/**
 * The contact card. A new address needs the password and changes only once the link sent to it
 * is opened; until then the card shows it as waiting. The phone is edited in place.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { formatPhone } from '@bambiste/countries';
import { Account } from '@idp/sdk/account';
import { emailChangeSchema, phoneSchema, type EmailChangeInput, type PhoneInput } from '@idp/sdk/schemas/account';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  contactSectionLabels,
  type ContactEditing,
  type ContactSectionLabels,
  type ContactSectionLogic,
  type EmailForm,
  type PhoneForm,
} from './logic.js';
import { ContactSectionView } from './view.js';

const props = {
  email: prop.string(''),
  verified: prop.boolean(false),
  pendingEmail: prop.string(''),
  phone: prop.string(''),
  /** The account's country, alpha-2: the phone field starts there. */
  country: prop.string(''),
  locale: prop.string('en'),
  emailSchema: prop.any<FormSchema<EmailChangeInput>>(emailChangeSchema),
  phoneSchema: prop.any<FormSchema<PhoneInput>>(phoneSchema),
  labels: prop.object<Partial<ContactSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpContactSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...contactSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const emailCheck = <K extends keyof EmailChangeInput & string>(field: K) =>
      fieldValidator<EmailChangeInput, K>(() => this.emailSchema, field, text);
    const emailForm: EmailForm = createForm({
      email: createField('', { validators: [emailCheck('email')] }),
      password: createField('', { validators: [emailCheck('password')] }),
    });
    const phoneForm: PhoneForm = createForm({
      phone: createField(this.phone, { validators: [fieldValidator<PhoneInput, 'phone'>(() => this.phoneSchema, 'phone', text)] }),
    });
    const editing = signal<ContactEditing>(null);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (work: () => Promise<void>, done: string | null) => {
      busy.set(true);
      error.set(null);
      notice.set(null);
      try {
        await work();
        editing.set(null);
        notice.set(done);
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: ContactSectionLogic = {
      labels,
      email: () => this.email,
      verified: () => this.verified,
      pendingEmail: () => this.pendingEmail,
      phone: () => this.phone,
      phoneShown: () => (this.phone ? formatPhone(this.phone) : ''),
      country: () => this.country.toUpperCase(),
      locale: () => this.locale,
      typePhone: (value) => phoneForm.get('phone').setValue(value, { pristine: true }),
      editing,
      edit: (what) => {
        error.set(null);
        notice.set(null);
        if (what === 'email') {
          emailForm.get('email').reset('');
          emailForm.get('password').reset('');
        }
        if (what === 'phone') phoneForm.get('phone').reset(this.phone);
        editing.set(what);
      },
      emailForm,
      phoneForm,
      requestChange: (values) =>
        run(() => account.requestEmailChange({ email: values.email.trim(), password: values.password }), labels().linkSent),
      cancelChange: () => run(() => account.cancelEmailChange(), null),
      savePhone: (values) => run(() => account.updateProfile({ phone: values.phone.replace(/\s/g, '') }), labels().saved),
      removePhone: () => run(() => account.updateProfile({ phone: '' }), labels().saved),
      busy,
      notice,
      error,
    };
    return useView(ContactSectionView)(logic);
  }
}

defineCustomElement('idp-contact-section', IdpContactSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-contact-section': IdpContactSection;
  }
  interface JSXCustomElements {
    'idp-contact-section': ElementAttributes<typeof props>;
  }
}
