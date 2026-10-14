/** The default look: a rule above, Back at the start, the note centred, the step forward at the end. */
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { WizardFooterLogic } from './logic.js';

export const wizardFooterView = (w: WizardFooterLogic) => (
  <div part="footer" class="footer">
    <style scoped>{`
      .footer { display: flex; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid var(--idp-border); }
      .note { flex: 1; text-align: center; color: var(--idp-muted); font-size: 13px; }
      @media (max-width: 640px) { .footer { flex-wrap: wrap; } .note { flex-basis: 100%; order: 3; } }
    `}</style>
    <Button part="back" variant="outline" tone="neutral" onPress={w.back}>
      {() => w.backLabel()}
    </Button>
    <span class="note">{() => w.note()}</span>
    <Button part="next" variant="solid" disabled={w.busy()} onPress={w.next}>
      {() => w.nextLabel()}
    </Button>
  </div>
);

export const WizardFooterView = viewToken<WizardFooterLogic>('idp-wizard-footer', wizardFooterView);
