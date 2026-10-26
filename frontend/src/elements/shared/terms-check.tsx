/** "I accept the terms", with the terms linked: the same on sign-up, the provider step and the accept page. */
import { FormField, type ReactiveControl } from '@fluixi-ui/form';
import { Checkbox } from '@fluixi-ui/checkbox';
import type { Validator } from '@fluixi/forms';

export interface TermsLabels {
  /** {terms} is where the link goes. */
  acceptTerms: string;
  termsLink: string;
}

/** Where the deployment's terms are, and the version being accepted, as the page gets them. */
export interface TermsToAccept {
  version: string;
  url: string;
}

/** Refuses an unticked box while there are terms to accept. */
export const termsValidator =
  (terms: () => TermsToAccept | null, message: () => string): Validator<boolean> =>
  (value) =>
    terms() && value !== true ? { type: 'required', message: message() } : null;

export function TermsCheck(props: { control: ReactiveControl<boolean>; terms: TermsToAccept; labels: TermsLabels }) {
  const [before, after] = props.labels.acceptTerms.split('{terms}');
  return (
    <FormField control={props.control}>
      {(b) => (
        <label class="idp-check">
          <Checkbox name="accept_terms" checked={b.value()} onChange={(checked) => b.onChange(checked === true)} />
          <span>
            {before}
            <a class="idp-link" href={props.terms.url} target="_blank" rel="noopener noreferrer">
              {props.labels.termsLink}
            </a>
            {after ?? ''}
          </span>
        </label>
      )}
    </FormField>
  );
}
