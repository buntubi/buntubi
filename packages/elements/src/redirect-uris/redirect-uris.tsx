/** Editing an app's redirect addresses: add, remove, then save, through the injected `Developer` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@buntu/sdk/developer';
import { redirectUriSchema, type RedirectUriInput } from '@buntu/sdk/schemas/apps';
import type { App } from '@buntu/sdk/types';
import { freshest } from '../fresh.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { redirectUrisLabels, type RedirectUriForm, type RedirectUrisLabels, type RedirectUrisLogic } from './logic.js';
import { RedirectUrisView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  canManage: prop.boolean(false),
  labels: prop.object<Partial<RedirectUrisLabels>>({}),
  /** Checks an address before it joins the list; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<RedirectUriInput>>(redirectUriSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpRedirectUris extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...redirectUrisLabels, ...this.labels });
    const app = freshest(() => this.app);
    // Null while the list is the app's own; a list once the reader starts changing it.
    const edits = signal<string[] | null>(null);
    const text = messageReader(() => this.messages);
    const form: RedirectUriForm = createForm({
      uri: createField('', { validators: [fieldValidator<RedirectUriInput, 'uri'>(() => this.schema, 'uri', text)] }),
    });
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const uris = () => edits() ?? app.current()?.redirect_uris ?? [];
    const logic: RedirectUrisLogic = {
      labels,
      uris,
      form,
      add: (values) => {
        const uri = values.uri.trim();
        if (!uris().includes(uri)) edits.set([...uris(), uri]);
        form.get('uri').reset('');
        saved.set(false);
      },
      remove: (uri) => {
        edits.set(uris().filter((entry) => entry !== uri));
        saved.set(false);
      },
      changed: () => edits() !== null,
      canManage: () => this.canManage,
      save: async () => {
        busy.set(true);
        error.set(null);
        try {
          app.adopt(await developer.updateApp({ client_id: app.current()?.client_id ?? '', patch: { redirect_uris: uris() } }));
          edits.set(null);
          saved.set(true);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      saved,
      error,
    };
    return useView(RedirectUrisView)(logic);
  }
}

defineCustomElement('idp-redirect-uris', IdpRedirectUris);

declare global {
  interface HTMLElementTagNameMap {
    'idp-redirect-uris': IdpRedirectUris;
  }
  interface JSXCustomElements {
    'idp-redirect-uris': ElementAttributes<typeof props>;
  }
}
