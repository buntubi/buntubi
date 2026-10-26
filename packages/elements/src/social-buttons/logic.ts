/** The providers a sign-in page offers, as buttons, and the line between them and the form. */
export interface SocialButtonsLabels {
  /** `{provider}` is the provider's name. */
  continueWith: string;
  separator: string;
}

export const socialButtonsLabels: SocialButtonsLabels = {
  continueWith: 'Continue with {provider}',
  separator: 'or',
};

export interface SocialProviderItem {
  id: string;
  label: string;
}

export interface SocialButtonsLogic {
  labels: () => SocialButtonsLabels;
  /** Each provider with its button text and where it leads. */
  items: () => { provider: string; label: string; href: string }[];
}
