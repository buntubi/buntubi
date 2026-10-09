/** The form for a new scope, sent through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import { useView } from '../view.js';
import { scopeFormLabels, type ScopeDraft, type ScopeFormEvents, type ScopeFormLabels, type ScopeFormLogic } from './logic.js';
import { ScopeFormView } from './view.js';

const props = {
  labels: prop.object<Partial<ScopeFormLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

const EMPTY: ScopeDraft = { name: '', sensitivity: 'public', resource: '', fr: '', en: '' };

export class IdpScopeForm extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...scopeFormLabels, ...this.labels });
    const draft = signal<ScopeDraft>({ ...EMPTY });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: ScopeFormLogic = {
      labels,
      draft,
      edit: (key, value) => draft.set({ ...draft(), [key]: value }),
      canCreate: () => !busy() && !!draft().name.trim() && !!draft().fr.trim() && !!draft().en.trim(),
      create: async () => {
        const d = draft();
        busy.set(true);
        error.set(null);
        try {
          await admin.createScope({
            name: d.name.trim(),
            sensitivity: d.sensitivity,
            resource: d.resource.trim(),
            descriptions: { fr: d.fr.trim(), en: d.en.trim() },
            notes: '',
          });
          draft.set({ ...EMPTY });
          this.emit('created', { name: d.name.trim() });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      error,
    };
    return useView(ScopeFormView)(logic);
  }
}

defineCustomElement('idp-scope-form', IdpScopeForm);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-form': IdpScopeForm;
  }
  interface JSXCustomElements {
    'idp-scope-form': ElementAttributes<typeof props, ScopeFormEvents>;
  }
}
