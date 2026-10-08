/** Creating an app in three steps (kind, information, API products), apart from how it looks. */
import type { AppKind, Platform } from '@idp/sdk/types';

export type CreateStep = 1 | 2 | 3;
export type ClientType = 'public' | 'confidential';
export type InfoField = 'name' | 'description' | 'redirect_uri' | 'homepage_url' | 'privacy_url' | 'terms_url' | 'logo';

export const KINDS: AppKind[] = ['web', 'mobile', 'consumer', 'business', 'backend', 'internal'];
export const PLATFORMS: Platform[] = ['web', 'ios', 'android', 'backend'];
export const INFO_FIELDS: InfoField[] = ['name', 'description', 'redirect_uri', 'homepage_url', 'privacy_url', 'terms_url', 'logo'];

/** What a kind starts with; every one of them can be changed in step 2. */
export function defaultsFor(kind: AppKind): { clientType: ClientType; platforms: Platform[]; needsRedirect: boolean } {
  switch (kind) {
    case 'mobile':
      return { clientType: 'public', platforms: ['ios', 'android'], needsRedirect: true };
    case 'consumer':
      return { clientType: 'public', platforms: ['web'], needsRedirect: true };
    case 'backend':
      // A service calls as itself with client credentials: no one signs in, nothing to redirect to.
      return { clientType: 'confidential', platforms: ['backend'], needsRedirect: false };
    default:
      return { clientType: 'confidential', platforms: ['web'], needsRedirect: true };
  }
}

export interface CreateAppLabels {
  steps: Record<CreateStep, string>;
  kindTitle: string;
  kindIntro: string;
  kinds: Record<AppKind, { title: string; text: string }>;
  infoTitle: string;
  fields: Record<InfoField, string>;
  hints: Partial<Record<InfoField, string>>;
  clientType: string;
  clientTypes: Record<ClientType, { title: string; text: string }>;
  platforms: string;
  platformNames: Record<Platform, string>;
  preview: string;
  /** "{app} wants to access your {platform} account". */
  previewText: string;
  previewLinks: string;
  previewNote: string;
  productsTitle: string;
  productsIntro: string;
  approvals: Record<'none' | 'review' | 'restricted', string>;
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
  steps: { 1: 'App type', 2: 'Information', 3: 'API products' },
  kindTitle: 'What are you building?',
  kindIntro: 'Sets sensible defaults for credentials and redirects. You can change them later.',
  kinds: {
    web: { title: 'Web app', text: 'A site with its own server that signs people in.' },
    mobile: { title: 'Mobile app', text: 'An iOS or Android app, with no secret on the device.' },
    consumer: { title: 'Browser app', text: 'A single-page app that runs entirely in the browser.' },
    business: { title: 'Business integration', text: 'A product other organizations connect to their accounts.' },
    backend: { title: 'Backend service', text: 'A server calling platform APIs as itself, nobody signs in.' },
    internal: { title: 'Internal tool', text: 'Used by your own team only.' },
  },
  infoTitle: 'App information',
  fields: {
    name: 'App name',
    description: 'Description',
    redirect_uri: 'Redirect URI',
    homepage_url: 'Homepage',
    privacy_url: 'Privacy policy',
    terms_url: 'Terms of service',
    logo: 'Logo URL',
  },
  hints: {
    redirect_uri: 'Where people come back after signing in. More can be added later.',
    logo: 'A square image over https, shown on the consent screen.',
  },
  clientType: 'Client type',
  clientTypes: {
    confidential: { title: 'Confidential', text: 'Runs on a server that keeps a secret.' },
    public: { title: 'Public', text: 'Runs in a browser or on a device; proves itself with PKCE.' },
  },
  platforms: 'Platforms',
  platformNames: { web: 'Web', ios: 'iOS', android: 'Android', backend: 'Server' },
  preview: 'Consent preview',
  previewText: '{app} wants to access your {platform} account',
  previewLinks: 'Privacy policy · Terms',
  previewNote: 'Reviewers check the name, logo and links before an app goes live.',
  productsTitle: 'Select API products',
  productsIntro: 'Each product brings the scopes you can request. Some need a review before production.',
  approvals: { none: 'No review', review: 'App review', restricted: 'Restricted' },
  noProducts: 'No API product is available yet.',
  back: 'Back',
  next: 'Continue',
  create: 'Create app',
  sandboxNote: 'New apps start in the sandbox. Nothing goes live until you submit it.',
  nameRequired: 'The app needs a name.',
  invalidUrl: 'Enter a full address starting with https:// (or http://localhost).',
  error: 'Something went wrong. Try again.',
};

export interface ProductChoice {
  slug: string;
  name: string;
  description: string;
  approval: 'none' | 'review' | 'restricted';
  scopes: string[];
  selected: boolean;
  toggle: () => void;
}

export interface CreateAppLogic {
  labels: () => CreateAppLabels;
  step: () => CreateStep;
  steps: () => { step: CreateStep; state: 'done' | 'now' | 'todo' }[];
  kinds: () => { kind: AppKind; selected: boolean; choose: () => void }[];
  value: (field: InfoField) => string;
  edit: (field: InfoField, value: string) => void;
  needsRedirect: () => boolean;
  clientType: () => ClientType;
  chooseClientType: (type: ClientType) => void;
  platforms: () => { platform: Platform; selected: boolean; toggle: () => void }[];
  products: () => ProductChoice[];
  platform: () => string;
  back: () => void;
  next: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}

export interface CreateAppEvents {
  /** The app exists; a confidential app's secret comes with it, once. */
  created: { client_id: string; client_secret: string | null };
}
