/** JSX for the `@bambiste/countries` form fields used in views. */
import type { CountryChange, CountryLabels, PhoneChange } from '@bambiste/countries/elements';

declare global {
  interface JSXCustomElements {
    'bc-country-select': {
      name?: string;
      value?: string;
      locale?: string;
      preferred?: string;
      placeholder?: string;
      required?: boolean;
      disabled?: boolean;
      'show-calling-code'?: boolean;
      'aria-label'?: string;
      labels?: Partial<CountryLabels>;
      onInput?: (event: CustomEvent<CountryChange>) => void;
      onChange?: (event: CustomEvent<CountryChange>) => void;
    };
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
