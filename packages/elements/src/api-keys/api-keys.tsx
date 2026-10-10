/**
 * The organization's API keys for one environment, one `idp-key-row` each, and making a new
 * one. Changes go through the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import { apiKeySchema, type ApiKeyInput } from '@idp/sdk/schemas/apps';
import type { ApiKey, Environment } from '@idp/sdk/types';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import '../key-row/key-row.js';
import '../one-time-value/one-time-value.js';
import { useView } from '../view.js';
import { apiKeysLabels, type ApiKeyForm, type ApiKeysLabels, type ApiKeysLogic } from './logic.js';
import { ApiKeysView } from './view.js';

const props = {
  keys: prop.object<ApiKey[]>([]),
  organization: prop.string(''),
  environment: prop.string('sandbox'),
  /** The environment's name, for "All sandbox scopes". */
  environmentName: prop.string(''),
  canManage: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<Partial<ApiKeysLabels>>({}),
  /** Checks a new key before it is made; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<ApiKeyInput>>(apiKeySchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpApiKeys extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...apiKeysLabels, ...this.labels });
    const creating = signal(false);
    const text = messageReader(() => this.messages);
    const check = <K extends keyof ApiKeyInput & string>(field: K) =>
      fieldValidator<ApiKeyInput, K>(() => this.schema, field, text);
    const form: ApiKeyForm = createForm({
      name: createField('', { validators: [check('name')] }),
      scopes: createField('', { validators: [check('scopes')] }),
    });
    const fresh = signal('');
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    const run = async (key: string, work: () => Promise<void>) => {
      busy.set(key);
      error.set(null);
      try {
        await work();
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(null);
      }
    };
    const logic: ApiKeysLogic = {
      labels,
      keys: () => this.keys.filter((key) => key.active && key.environment === this.environment),
      meta: (key) =>
        [
          key.scopes.length ? key.scopes.join(', ') : labels().allScopes.replace('{environment}', this.environmentName.toLowerCase()),
          labels().created.replace('{date}', day.format(new Date(key.created_at))),
        ].join(' · '),
      canManage: () => this.canManage,
      creating,
      open: () => creating.set(true),
      close: () => creating.set(false),
      form,
      create: (values) =>
        run('create', async () => {
          const answer = await developer.createKey({
            organization: this.organization,
            name: values.name.trim(),
            environment: this.environment as Environment,
            scopes: values.scopes.split(/\s+/).filter(Boolean),
          });
          fresh.set(answer.api_key);
          form.get('name').setValue('');
          form.get('scopes').setValue('');
          creating.set(false);
        }),
      revoke: (id) => run(id, async () => void (await developer.revokeKey({ organization: this.organization, key: id }))),
      fresh,
      busy,
      error,
    };
    return useView(ApiKeysView)(logic);
  }
}

defineCustomElement('idp-api-keys', IdpApiKeys);

declare global {
  interface HTMLElementTagNameMap {
    'idp-api-keys': IdpApiKeys;
  }
  interface JSXCustomElements {
    'idp-api-keys': ElementAttributes<typeof props>;
  }
}
