/** The default look of idp-accept-terms: why it is asked, the box with the terms linked, then continue. */
import { Form } from '@fluixi-ui/form';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '@buntubi/sdk/view';
import { TermsCheck } from '../shared/terms-check.js';
import type { AcceptTermsLogic } from './accept-terms.js';

export const acceptTermsView = ({ error, form, label, pending, submit, terms }: AcceptTermsLogic) => (
  <Form form={form} onSubmit={submit} class="idp-form" novalidate>
    <p class="idp-note">{() => label().intro}</p>
    {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
    {() => {
      const toAccept = terms();
      return toAccept ? <TermsCheck control={form.get('acceptTerms')} terms={toAccept} labels={label()} /> : null;
    }}
    <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
      {() => (pending() ? label().pending : label().submit)}
    </Button>
  </Form>
);

export const AcceptTermsView = viewToken<AcceptTermsLogic>('idp-accept-terms', acceptTermsView);
