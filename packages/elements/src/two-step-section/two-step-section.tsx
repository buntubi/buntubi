/**
 * The two-step card. Off: turning it on shows the QR code and the key, then takes a first code.
 * Turned on, or renewed: the backup codes, shown this once. On: renew the codes or turn it off,
 * both with a current code. Goes through the injected `Account` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account, type TwoStepEnrolment } from '@idp/sdk/account';
import { twoStepCodeSchema, type TwoStepCodeInput } from '@idp/sdk/schemas/account';
import { shortDate } from '../dates.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { twoStepSectionLabels, type CodeForm, type TwoStepSectionLabels, type TwoStepSectionLogic, type TwoStepStep } from './logic.js';
import { TwoStepSectionView } from './view.js';

const props = {
  enabled: prop.boolean(false),
  /** ISO: when it was turned on. */
  since: prop.string(''),
  backupCodesLeft: prop.number(0),
  backupCodesTotal: prop.number(10),
  locale: prop.string('en'),
  schema: prop.any<FormSchema<TwoStepCodeInput>>(twoStepCodeSchema),
  labels: prop.object<Partial<TwoStepSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpTwoStepSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...twoStepSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const form: CodeForm = createForm({
      code: createField('', { validators: [fieldValidator<TwoStepCodeInput, 'code'>(() => this.schema, 'code', text)] }),
    });
    const step = signal<TwoStepStep>('idle');
    const enrolment = signal<TwoStepEnrolment | null>(null);
    const codes = signal<string[]>([]);
    const copied = signal(false);
    const busy = signal(false);
    const error = signal<string | null>(null);
    const go = (next: TwoStepStep) => {
      form.get('code').reset('');
      copied.set(false);
      error.set(null);
      step.set(next);
    };
    const run = async (work: () => Promise<void>) => {
      busy.set(true);
      error.set(null);
      try {
        await work();
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const show = (list: string[]) => {
      codes.set(list);
      go('codes');
    };
    const logic: TwoStepSectionLogic = {
      labels,
      enabled: () => this.enabled,
      added: () => (this.since ? labels().addedOn.replace('{date}', shortDate(this.since, this.locale)) : ''),
      left: () => this.backupCodesLeft,
      total: () => this.backupCodesTotal,
      low: () => this.backupCodesLeft <= 3,
      step,
      go,
      enrolment,
      codes,
      copied,
      form,
      begin: () =>
        run(async () => {
          enrolment.set(await account.beginTwoStep());
          go('enrolling');
        }),
      submit: (values) =>
        run(async () => {
          const code = values.code.trim();
          if (step() === 'enrolling') show(await account.confirmTwoStep(code));
          else if (step() === 'renew') show(await account.renewBackupCodes(code));
          else if (step() === 'disable') {
            await account.disableTwoStep(code);
            go('idle');
          }
        }),
      copy: () =>
        void navigator.clipboard?.writeText(codes().join('\n')).then(
          () => copied.set(true),
          () => {},
        ),
      busy,
      error,
    };
    return useView(TwoStepSectionView)(logic);
  }
}

defineCustomElement('idp-two-step-section', IdpTwoStepSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-two-step-section': IdpTwoStepSection;
  }
  interface JSXCustomElements {
    'idp-two-step-section': ElementAttributes<typeof props>;
  }
}
