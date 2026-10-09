/** The invitation a signed-out visitor sees, apart from the look. */

export interface WelcomeLabels {
  title: string;
  text: string;
  signIn: string;
}

export const welcomeLabels: WelcomeLabels = {
  title: 'Build on the platform',
  text: 'Register apps, choose the APIs they use, and take them live.',
  signIn: 'Sign in',
};

export interface WelcomeLogic {
  labels: () => WelcomeLabels;
  signIn: () => void;
}

export interface WelcomeEvents {
  /** The visitor asked to sign in; the host starts it. */
  signin: Record<string, never>;
}
