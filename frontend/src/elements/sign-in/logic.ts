/** What the sign-in view draws from: the form, its state and what it can do. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { SignIn, SignInLabels } from './sign-in.js';

export interface SignInLogic {
  form: ReactiveForm<SignIn>;
  labels: () => SignInLabels;
  /** The refusal of the last attempt, worded. */
  error: () => string | undefined;
  passkeyError: () => string | undefined;
  pending: () => boolean;
  passkeyPending: () => boolean;
  /** The browser offers passkeys and the host asked for them. */
  canPasskey: () => boolean;
  /** Where "forgot your password" leads; empty hides it. */
  forgotHref: () => string;
  submit: (values: SignIn) => void;
  askPasskey: () => void;
}
