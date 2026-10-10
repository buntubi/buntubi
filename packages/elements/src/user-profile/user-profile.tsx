/**
 * One account's page. The profile is a form checked with `schema`; it and the access actions go
 * through the injected `Admin` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import { userEditSchema, type UserEditInput } from '@idp/sdk/schemas/users';
import type { AdminUserPage } from '@idp/sdk/types';
import { shortDate } from '../dates.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  userProfileLabels,
  type ProfileAction,
  type ProfileForm,
  type ProfileValues,
  type UserProfileLabels,
  type UserProfileLogic,
} from './logic.js';
import { UserProfileView } from './view.js';

const props = {
  page: prop.object<AdminUserPage | null>(null),
  /** The console's user: their own account offers no access actions. */
  viewerId: prop.string(''),
  /** Shows the admin role actions: the console's user is a superadmin. */
  managesAdmins: prop.boolean(false),
  locale: prop.string('en'),
  /** Checks each profile field before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<UserEditInput>>(userEditSchema),
  labels: prop.object<Partial<UserProfileLabels>>({}),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpUserProfile extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...userProfileLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const schema = () => this.schema;
    const check = <K extends keyof UserEditInput & string>(field: K) => fieldValidator<UserEditInput, K>(schema, field, text);
    const user = () => this.page?.user ?? null;
    const start = this.page?.user;
    const form: ProfileForm = createForm({
      given_name: createField(start?.given_name ?? '', { validators: [check('given_name')] }),
      family_name: createField(start?.family_name ?? '', { validators: [check('family_name')] }),
      locale: createField(start?.locale === 'en' ? 'en' : 'fr'),
      country: createField(start?.country ?? '', { validators: [check('country')] }),
      phone: createField(start?.phone ?? '', { validators: [check('phone')] }),
    });
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (change: () => Promise<void>, done: string) => {
      busy.set(true);
      error.set(null);
      notice.set(null);
      try {
        await change();
        notice.set(done);
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: UserProfileLogic = {
      labels,
      page: () => this.page,
      user,
      self: () => !!this.viewerId && this.viewerId === user()?.id,
      managesAdmins: () => this.managesAdmins,
      date: (iso) => shortDate(iso, this.locale),
      form,
      save: async (values: ProfileValues) => {
        const u = user();
        if (!u) return;
        await run(
          () =>
            admin.updateUser({
              id: u.id,
              given_name: values.given_name.trim(),
              family_name: values.family_name.trim(),
              locale: values.locale === 'en' ? 'en' : 'fr',
              country: values.country.trim().toUpperCase(),
              phone: values.phone.replace(/\s/g, ''),
            }),
          labels().saved,
        );
      },
      act: async (action: ProfileAction) => {
        const u = user();
        if (!u) return;
        const l = labels();
        if (action === 'reset') await run(() => admin.sendPasswordReset(u.id), l.resetSent);
        if (action === 'signOut') await run(() => admin.signOutUser(u.id), l.signedOut);
        if (action === 'twoStep') await run(() => admin.resetTwoStep(u.id), l.twoStepReset);
        if (action === 'disabled') {
          await run(() => admin.setUserDisabled({ id: u.id, disabled: !u.disabled }), u.disabled ? l.enabled : l.disabled);
        }
        if (action === 'admin') {
          const isAdmin = u.roles.includes('admin');
          await run(() => admin.setAdmin({ id: u.id, admin: !isAdmin }), isAdmin ? l.adminRemoved : l.adminGiven);
        }
      },
      busy,
      notice,
      error,
    };
    return useView(UserProfileView)(logic);
  }
}

defineCustomElement('idp-user-profile', IdpUserProfile);

declare global {
  interface HTMLElementTagNameMap {
    'idp-user-profile': IdpUserProfile;
  }
  interface JSXCustomElements {
    'idp-user-profile': ElementAttributes<typeof props>;
  }
}
