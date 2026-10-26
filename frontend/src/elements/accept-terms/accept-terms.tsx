/**
 * The platform's terms, asked at a sign-in when the account has yet to accept the current
 * version. Validates, emits `submit`, runs the host's `action`: the sign-in goes on from there.
 */
import { useView } from '@buntubi/sdk/view';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { termsValidator, type TermsLabels, type TermsToAccept } from '../shared/terms-check.js';
import { AcceptTermsView } from './view.js';
import '../shared/form.css';

export interface AcceptTerms {
  acceptTerms: boolean;
}

export interface AcceptTermsLabels extends TermsLabels {
  intro: string;
  submit: string;
  pending: string;
}

export const acceptTermsLabels: AcceptTermsLabels = {
  intro: 'The terms of use have changed since you last accepted them. Read them, then accept to continue.',
  acceptTerms: 'I accept the {terms}',
  termsLink: 'terms of use',
  submit: 'Continue',
  pending: 'Continuing',
};

export interface AcceptTermsEvents {
  submit: AcceptTerms;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<AcceptTerms> | undefined>(undefined),
  terms: prop.any<TermsToAccept | null>(null),
  labels: prop.object<Partial<AcceptTermsLabels>>({}),
  messages: prop.object<Messages>({}),
};

export class IdpAcceptTerms extends typedElement(props) {
  logic() {
    const label = () => ({ ...acceptTermsLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const form = createForm({
      acceptTerms: createField(false, { validators: [termsValidator(() => this.terms, () => text('form.terms'))] }),
    });
    const { run, pending, error } = useElementAction('idp-accept-terms', () => this.action, text);
    const submit = (values: AcceptTerms) => {
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };
    return { error, form, label, pending, submit, terms: () => this.terms };
  }

  protected override render(): unknown {
    return useView(AcceptTermsView)(this.logic());
  }
}

export type AcceptTermsLogic = ReturnType<IdpAcceptTerms['logic']>;

defineCustomElement('idp-accept-terms', IdpAcceptTerms);

declare global {
  interface HTMLElementTagNameMap {
    'idp-accept-terms': IdpAcceptTerms;
  }
  interface JSXCustomElements {
    'idp-accept-terms': ElementAttributes<typeof props, AcceptTermsEvents>;
  }
}
