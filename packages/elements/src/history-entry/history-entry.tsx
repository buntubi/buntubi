/** One review event: what happened, who and in which submission, the words, the scopes, the date. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { HistoryEntryLogic, HistoryTone } from './logic.js';
import { HistoryEntryView } from './view.js';

const props = {
  title: prop.string(''),
  meta: prop.string(''),
  text: prop.string(''),
  scopes: prop.object<string[]>([]),
  date: prop.string(''),
  tone: prop.string('muted'),
};

export class IdpHistoryEntry extends typedElement(props) {
  protected override render(): unknown {
    const logic: HistoryEntryLogic = {
      title: () => this.title,
      meta: () => this.meta,
      text: () => this.text,
      scopes: () => this.scopes,
      date: () => this.date,
      tone: () => this.tone as HistoryTone,
    };
    return useView(HistoryEntryView)(logic);
  }
}

defineCustomElement('idp-history-entry', IdpHistoryEntry);

declare global {
  interface HTMLElementTagNameMap {
    'idp-history-entry': IdpHistoryEntry;
  }
  interface JSXCustomElements {
    'idp-history-entry': ElementAttributes<typeof props>;
  }
}
