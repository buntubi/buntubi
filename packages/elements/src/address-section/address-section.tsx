/**
 * The postal address card. Saved through the injected `Account` service; a new address starts in
 * the account's country.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { countryName } from '@bambiste/countries';
import { Account, type PostalAddress } from '@buntu/sdk/account';
import { addressSchema, type AddressInput } from '@buntu/sdk/schemas/account';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { addressSectionLabels, type AddressForm, type AddressSectionLabels, type AddressSectionLogic } from './logic.js';
import { AddressSectionView } from './view.js';

const EMPTY: PostalAddress = { street_address: '', locality: '', region: '', postal_code: '', country: null };

const props = {
  address: prop.object<PostalAddress>(EMPTY),
  /** The account's country, alpha-2: a new address starts there. */
  country: prop.string(''),
  locale: prop.string('en'),
  schema: prop.any<FormSchema<AddressInput>>(addressSchema),
  labels: prop.object<Partial<AddressSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAddressSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...addressSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const check = <K extends keyof AddressInput & string>(field: K) =>
      fieldValidator<AddressInput, K>(() => this.schema, field, text);
    const form: AddressForm = createForm({
      street_address: createField('', { validators: [check('street_address')] }),
      postal_code: createField('', { validators: [check('postal_code')] }),
      locality: createField('', { validators: [check('locality')] }),
      region: createField('', { validators: [check('region')] }),
      country: createField('', { validators: [check('country')] }),
    });
    const current = () => ({ ...EMPTY, ...this.address });
    const editing = signal(false);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (work: () => Promise<void>) => {
      busy.set(true);
      error.set(null);
      notice.set(null);
      try {
        await work();
        editing.set(false);
        notice.set(labels().saved);
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: AddressSectionLogic = {
      labels,
      lines: () => {
        const a = current();
        const city = [a.postal_code, a.locality].filter(Boolean).join(' ');
        const country = a.country ? countryName(a.country, this.locale) : '';
        return [...a.street_address.split('\n'), city, a.region, country].map((line) => line.trim()).filter(Boolean);
      },
      locale: () => this.locale,
      editing,
      edit: (on) => {
        error.set(null);
        notice.set(null);
        if (on) {
          const a = current();
          form.get('street_address').reset(a.street_address);
          form.get('postal_code').reset(a.postal_code);
          form.get('locality').reset(a.locality);
          form.get('region').reset(a.region);
          form.get('country').reset(a.country ?? this.country.toUpperCase());
        }
        editing.set(on);
      },
      form,
      save: (values) => run(() => account.updateProfile({ address: { ...values, country: values.country.toUpperCase() } })),
      remove: () => run(() => account.updateProfile({ address: { ...EMPTY, country: '' } })),
      busy,
      notice,
      error,
    };
    return useView(AddressSectionView)(logic);
  }
}

defineCustomElement('idp-address-section', IdpAddressSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-address-section': IdpAddressSection;
  }
  interface JSXCustomElements {
    'idp-address-section': ElementAttributes<typeof props>;
  }
}
