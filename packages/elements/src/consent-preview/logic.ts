/** How the consent screen will show an app; apart from the look. */

export interface ConsentPreviewLogic {
  title: () => string;
  /** "{app} wants to access your {platform} account", already filled. */
  text: () => string;
  links: () => string;
  note: () => string;
  mark: () => string;
  logo: () => string;
}
