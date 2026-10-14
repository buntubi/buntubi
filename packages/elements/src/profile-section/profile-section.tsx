/**
 * The profile card: the photo, made small in the browser before it is sent, and the name, edited
 * in place and checked with `schema`. Changes go through the injected `Account` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account } from '@buntu/sdk/account';
import { nameSchema, type NameInput } from '@buntu/sdk/schemas/account';
import { initials } from '../initials.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { profileSectionLabels, type NameForm, type ProfileSectionLabels, type ProfileSectionLogic } from './logic.js';
import { ProfileSectionView } from './view.js';

const props = {
  givenName: prop.string(''),
  familyName: prop.string(''),
  email: prop.string(''),
  picture: prop.string(''),
  schema: prop.any<FormSchema<NameInput>>(nameSchema),
  labels: prop.object<Partial<ProfileSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

/** A square of `size` pixels, cut from the middle of the picture, as WebP (JPEG where unsupported). */
async function shrink(file: File, size = 256): Promise<Blob> {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')?.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
  const as = (type: string) => new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.85));
  const webp = await as('image/webp');
  const blob = webp?.type === 'image/webp' ? webp : await as('image/jpeg');
  if (!blob) throw new Error('unsupported_picture');
  return blob;
}

export class IdpProfileSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...profileSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const check = <K extends keyof NameInput & string>(field: K) => fieldValidator<NameInput, K>(() => this.schema, field, text);
    const form: NameForm = createForm({
      given_name: createField(this.givenName, { validators: [check('given_name')] }),
      family_name: createField(this.familyName, { validators: [check('family_name')] }),
    });
    const editing = signal(false);
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
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: ProfileSectionLogic = {
      labels,
      picture: () => this.picture,
      initials: () => initials(`${this.givenName} ${this.familyName}`.trim() || this.email),
      name: () => `${this.givenName} ${this.familyName}`.trim(),
      editing,
      setEditing: (on) => {
        if (on) {
          form.get('given_name').reset(this.givenName);
          form.get('family_name').reset(this.familyName);
        }
        editing.set(on);
      },
      form,
      saveName: (values) =>
        run(async () => {
          await account.updateProfile({ given_name: values.given_name.trim(), family_name: values.family_name.trim() });
          editing.set(false);
        }, labels().saved),
      choosePhoto: () => {
        // A picker made on demand, never shown: the visible control is the button.
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/png,image/jpeg,image/webp';
        picker.addEventListener('change', () => {
          const file = picker.files?.[0];
          if (file) void run(async () => account.setPicture(await shrink(file)), null);
        });
        picker.click();
      },
      removePhoto: () => run(() => account.removePicture(), null),
      busy,
      notice,
      error,
    };
    return useView(ProfileSectionView)(logic);
  }
}

defineCustomElement('idp-profile-section', IdpProfileSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-profile-section': IdpProfileSection;
  }
  interface JSXCustomElements {
    'idp-profile-section': ElementAttributes<typeof props>;
  }
}
