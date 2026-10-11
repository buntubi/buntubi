/** JSX for the `@bambiste/countries` form fields used in views. */
import type { CountryLabels, PhoneChange } from '@bambiste/countries/elements';

declare global {
  interface JSXCustomElements {
    'bc-phone-input': {
      name?: string;
      value?: string;
      country?: string;
      locale?: string;
      preferred?: string;
      placeholder?: string;
      required?: boolean;
      disabled?: boolean;
      'aria-label'?: string;
      'aria-invalid'?: 'true' | undefined;
      labels?: Partial<CountryLabels>;
      onInput?: (event: CustomEvent<PhoneChange>) => void;
      onChange?: (event: CustomEvent<PhoneChange>) => void;
    };
  }
}

export {};
