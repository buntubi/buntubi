/**
 * The passkeys card. Adding one runs the device's own prompt through the injected `Account`
 * service; a sign-in a few minutes old is asked for the password first.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { onMount } from '@fluixi/core';
import { createField, createForm } from '@fluixi/forms';
import { memo, signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account, type Passkey } from '@buntubi/sdk/account';
import { passkeyNameSchema, reauthSchema, type PasskeyNameInput, type ReauthInput } from '@buntubi/sdk/schemas/account';
import { passkeysSupported } from '@buntubi/sdk/webauthn';
import { shortDate } from '../dates.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  passkeysSectionLabels,
  type PasskeyNameForm,
  type PasskeyRow,
  type PasskeysSectionLabels,
  type PasskeysSectionLogic,
  type ReauthForm,
} from './logic.js';
import { PasskeysSectionView } from './view.js';

const props = {
  passkeys: prop.object<Passkey[]>([]),
  locale: prop.string('en'),
  nameSchema: prop.any<FormSchema<PasskeyNameInput>>(passkeyNameSchema),
  reauthSchema: prop.any<FormSchema<ReauthInput>>(reauthSchema),
  labels: prop.object<Partial<PasskeysSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

const codeOf = (error: unknown) => (error instanceof Error ? error.message : '');

export class IdpPasskeysSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...passkeysSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const nameForm: PasskeyNameForm = createForm({
      name: createField('', { validators: [fieldValidator<PasskeyNameInput, 'name'>(() => this.nameSchema, 'name', text)] }),
    });
    const reauthForm: ReauthForm = createForm({
      password: createField('', {
        validators: [fieldValidator<ReauthInput, 'password'>(() => this.reauthSchema, 'password', text)],
      }),
    });
    // A browser check: known once mounted, so a render never depends on it.
    const supported = signal(true);
    onMount(() => supported.set(passkeysSupported()));
    const askingPassword = signal(false);
    const renaming = signal<string | null>(null);
    const removing = signal<string | null>(null);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (work: () => Promise<void>, done: string | null) => {
      busy.set(true);
      error.set(null);
      notice.set(null);
      try {
        await work();
        notice.set(done);
      } catch (failure) {
        if (codeOf(failure) === 'reauth_required') {
          reauthForm.get('password').reset('');
          askingPassword.set(true);
        } else if (codeOf(failure) === 'passkey_cancelled') {
          notice.set(labels().notAdded);
        } else {
          error.set(this.describe?.(failure) ?? labels().error);
        }
      } finally {
        busy.set(false);
      }
    };
    const detail = (passkey: Passkey, l: PasskeysSectionLabels) => {
      const kept = passkey.synced
        ? passkey.provider
          ? l.synced.replace('{provider}', passkey.provider)
          : l.syncedUnknown
        : passkey.provider || l.thisDevice;
      const added = l.addedOn.replace('{date}', shortDate(passkey.created_at, this.locale));
      const used = passkey.last_used_at ? l.lastUsed.replace('{date}', shortDate(passkey.last_used_at, this.locale)) : l.neverUsed;
      return `${kept} · ${added} · ${used}`;
    };
    const rows = memo((): PasskeyRow[] => {
      const l = labels();
      return this.passkeys.map((passkey) => ({ id: passkey.id, name: passkey.name || l.unnamed, detail: detail(passkey, l) }));
    });
    const cancel = () => {
      renaming.set(null);
      removing.set(null);
      askingPassword.set(false);
      error.set(null);
    };
    const logic: PasskeysSectionLogic = {
      labels,
      supported,
      rows,
      add: () => {
        cancel();
        return run(() => account.addPasskey(), labels().added);
      },
      askingPassword,
      reauthForm,
      reauth: (values) =>
        run(async () => {
          await account.addPasskey(values.password);
          askingPassword.set(false);
        }, labels().added),
      renaming,
      startRename: (row) => {
        cancel();
        nameForm.get('name').reset(row.name);
        renaming.set(row.id);
      },
      nameForm,
      rename: (values) =>
        run(async () => {
          const id = renaming();
          if (id) await account.renamePasskey(id, values.name.trim());
          renaming.set(null);
        }, null),
      removing,
      askRemove: (row) => {
        cancel();
        removing.set(row?.id ?? null);
      },
      remove: (id) =>
        run(async () => {
          await account.removePasskey(id);
          removing.set(null);
        }, labels().removed),
      cancel,
      busy,
      notice,
      error,
    };
    return useView(PasskeysSectionView)(logic);
  }
}

defineCustomElement('idp-passkeys-section', IdpPasskeysSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-passkeys-section': IdpPasskeysSection;
  }
  interface JSXCustomElements {
    'idp-passkeys-section': ElementAttributes<typeof props>;
  }
}
