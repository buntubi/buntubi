/** The preferences card. Each pick is saved at once; a new language is announced with `language`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account } from '@buntu/sdk/account';
import { useView } from '../view.js';
import {
  preferencesSectionLabels,
  type PreferencesSectionEvents,
  type PreferencesSectionLabels,
  type PreferencesSectionLogic,
} from './logic.js';
import { PreferencesSectionView } from './view.js';

const props = {
  locale: prop.string('fr'),
  country: prop.string(''),
  labels: prop.object<Partial<PreferencesSectionLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpPreferencesSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...preferencesSectionLabels, ...this.labels });
    const locale = () => (this.locale === 'en' ? 'en' : 'fr');
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (work: () => Promise<void>) => {
      busy.set(true);
      error.set(null);
      notice.set(null);
      try {
        await work();
        notice.set(labels().saved);
        return true;
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
        return false;
      } finally {
        busy.set(false);
      }
    };
    const logic: PreferencesSectionLogic = {
      labels,
      locale,
      country: () => (this.country ?? '').toUpperCase(),
      setLocale: async (next) => {
        if (await run(() => account.updateProfile({ locale: next }))) this.emit('language', { locale: next });
      },
      setCountry: async (code) => {
        await run(() => account.updateProfile({ country: code }));
      },
      busy,
      notice,
      error,
    };
    return useView(PreferencesSectionView)(logic);
  }
}

defineCustomElement('idp-preferences-section', IdpPreferencesSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-preferences-section': IdpPreferencesSection;
  }
  interface JSXCustomElements {
    'idp-preferences-section': ElementAttributes<typeof props, PreferencesSectionEvents>;
  }
}
