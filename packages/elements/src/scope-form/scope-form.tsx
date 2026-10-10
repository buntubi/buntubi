/** The form for a new scope, checked with `schema` and sent through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import { scopeSchema, type ScopeInput } from '@idp/sdk/schemas/catalogue';
import type { Sensitivity } from '@idp/sdk/types';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  SENSITIVITIES,
  scopeFormLabels,
  type ScopeForm,
  type ScopeFormEvents,
  type ScopeFormLabels,
  type ScopeFormLogic,
  type ScopeValues,
} from './logic.js';
import { ScopeFormView } from './view.js';

const props = {
  /** Checks each field before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<ScopeInput>>(scopeSchema),
  labels: prop.object<Partial<ScopeFormLabels>>({}),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpScopeForm extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...scopeFormLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const check = <K extends keyof ScopeInput & string>(field: K) =>
      fieldValidator<ScopeInput, K>(() => this.schema, field, text);
    const form: ScopeForm = createForm({
      name: createField('', { validators: [check('name')] }),
      sensitivity: createField('public'),
      resource: createField('', { validators: [check('resource')] }),
      fr: createField('', { validators: [check('fr')] }),
      en: createField('', { validators: [check('en')] }),
    });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: ScopeFormLogic = {
      labels,
      form,
      create: async (values: ScopeValues) => {
        busy.set(true);
        error.set(null);
        const sensitivity = (SENSITIVITIES as string[]).includes(values.sensitivity)
          ? (values.sensitivity as Sensitivity)
          : 'public';
        try {
          await admin.createScope({
            name: values.name.trim(),
            sensitivity,
            resource: values.resource.trim(),
            descriptions: { fr: values.fr.trim(), en: values.en.trim() },
            notes: '',
          });
          for (const key of ['name', 'resource', 'fr', 'en'] as const) form.get(key).setValue('');
          form.get('sensitivity').setValue('public');
          this.emit('created', { name: values.name.trim() });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
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
