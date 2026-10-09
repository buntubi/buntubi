/** One sensitive scope to explain: its name and meaning, the question, and the answer field. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { ScopeJustificationEvents, ScopeJustificationLogic } from './logic.js';
import { ScopeJustificationView } from './view.js';

const props = {
  scope: prop.string(''),
  description: prop.string(''),
  /** The question asked; `{scope}` is replaced. */
  question: prop.string('Why does the app need {scope}?'),
  hint: prop.string(''),
  /** The words for explained and not yet. */
  explainedLabel: prop.string('Explained'),
  missingLabel: prop.string('Required'),
  value: prop.string(''),
};

export class IdpScopeJustification extends typedElement(props) {
  protected override render(): unknown {
    const explained = () => this.value.trim().length > 0;
    const logic: ScopeJustificationLogic = {
      scope: () => this.scope,
      description: () => this.description,
      question: () => this.question.replace('{scope}', this.scope),
      hint: () => this.hint,
      status: () => (explained() ? this.explainedLabel : this.missingLabel),
      explained,
      value: () => this.value,
      edit: (value) => this.emit('edit', { value }),
    };
    return useView(ScopeJustificationView)(logic);
  }
}

defineCustomElement('idp-scope-justification', IdpScopeJustification);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-justification': IdpScopeJustification;
  }
  interface JSXCustomElements {
    'idp-scope-justification': ElementAttributes<typeof props, ScopeJustificationEvents>;
  }
}
