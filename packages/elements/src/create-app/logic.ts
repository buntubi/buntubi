/** Creating an app in three steps (kind, information, API products), apart from how it looks. */
import type { AppKind, Platform, Product } from '@buntu/sdk/types';
import type { AppInfoFormLabels, InfoField } from '../app-info-form/logic.js';
import type { Approval } from '../product-card/logic.js';

export type CreateStep = 1 | 2 | 3;
export type ClientType = 'public' | 'confidential';

export const KINDS: AppKind[] = ['consumer', 'business', 'web', 'mobile', 'backend', 'internal'];
export const PLATFORMS: Platform[] = ['web', 'ios', 'android', 'backend'];

/** Each kind's icon, as an SVG path in a 24 box. */
export const KIND_ICONS: Record<AppKind, string> = {
  consumer: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  business: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1',
  web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  mobile: 'M7 2h10v20H7zM11 18h2',
  backend: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  internal: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
};

/**
 * What a kind starts with. The client type follows from it: a mobile app holds no secret, so it
 * proves itself with PKCE; every other kind runs where a secret is kept. A backend service calls
 * as itself and nobody signs in. Redirect addresses are set on the credentials page.
 */
export function defaultsFor(kind: AppKind): { clientType: ClientType; platforms: Platform[]; signsIn: boolean } {
  switch (kind) {
    case 'mobile':
      return { clientType: 'public', platforms: ['ios', 'android'], signsIn: true };
    case 'backend':
      return { clientType: 'confidential', platforms: ['backend'], signsIn: false };
    default:
      return { clientType: 'confidential', platforms: ['web'], signsIn: true };
  }
}

export interface CreateAppLabels {
  steps: Record<CreateStep, string>;
  stepsLabel: string;
  kindTitle: string;
  /** `{platform}` is replaced in each text. */
  kinds: Record<AppKind, { title: string; text: string }>;
  kindIntro: string;
  info: AppInfoFormLabels;
  platformNames: Record<Platform, string>;
  preview: { title: string; text: string; links: string; note: string };
  productsTitle: string;
  productsIntro: string;
  approvals: Record<Approval, string>;
  availability: Record<Product['availability'], string>;
  auth: Record<Product['auth'][number], string>;
  noProducts: string;
  back: string;
  next: string;
  create: string;
  sandboxNote: string;
  nameRequired: string;
  invalidUrl: string;
  error: string;
}

export const createAppLabels: CreateAppLabels = {
  steps: { 1: 'What you build', 2: 'App information', 3: 'API products' },
  stepsLabel: 'Steps',
  kindTitle: 'What are you building?',
  kindIntro: 'Sets sensible defaults for credentials and redirects. You can change it later.',
  kinds: {
    consumer: { title: 'Consumer app', text: 'People sign in with {platform} and use your app for themselves.' },
    business: { title: 'Business app', text: 'Companies connect their {platform} workspace to your product.' },
    web: { title: 'Web application', text: 'A site with a server that keeps a client secret.' },
    mobile: { title: 'Mobile app', text: 'iOS or Android, public client with PKCE.' },
    backend: { title: 'Backend service', text: 'Server to server, client credentials or API keys.' },
    internal: { title: 'Internal tool', text: 'Your organization only, never listed.' },
  },
  info: {
    title: 'App information',
    fields: {
      logo: 'Icon URL',
      name: 'App name',
      description: 'Description',
      homepage_url: 'Website',
      category: 'Category',
      privacy_url: 'Privacy policy URL',
      terms_url: 'Terms of service URL',
    },
    placeholders: { homepage_url: 'https://', category: 'Productivity', privacy_url: 'https://', terms_url: 'https://', logo: 'https://' },
    logoHint: 'Square, at least 512 px. Shown on the consent screen.',
    platforms: 'Platforms',
  },
  platformNames: { web: 'Web', ios: 'iOS', android: 'Android', backend: 'Backend' },
  preview: {
    title: 'Consent preview',
    text: '{app} wants to access your {platform} account',
    links: 'Privacy policy · Terms',
    note: 'Reviewers check the name, icon and links before an app goes live.',
  },
  productsTitle: 'Select API products',
  productsIntro: 'Each product brings endpoints and the scopes you can request. Some need a review before production.',
  approvals: { none: 'No review', review: 'Review required', restricted: 'Restricted' },
  availability: { ga: 'Available', beta: 'Beta', sandbox: 'Sandbox only' },
  auth: { oauth2: 'OAuth 2', oidc: 'OpenID Connect', api_key: 'API keys', webhooks: 'Webhooks' },
  noProducts: 'No API product is available yet.',
  back: 'Back',
  next: 'Continue',
  create: 'Create app',
  sandboxNote: 'New apps start in the sandbox. Nothing goes live until you submit it.',
  nameRequired: 'The app needs a name.',
  invalidUrl: 'Enter a full address starting with https:// (or http://localhost).',
  error: 'Something went wrong. Try again.',
};

export const LINK_FIELDS: InfoField[] = ['homepage_url', 'privacy_url', 'terms_url', 'logo'];

export interface CreateAppEvents {
  /** The app exists; a confidential app's secret comes with it, once. */
  created: { client_id: string; client_secret: string | null };
  /** Back from the first step: the reader leaves the flow. */
  cancel: Record<string, never>;
}
