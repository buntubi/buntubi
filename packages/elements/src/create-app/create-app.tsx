/**
 * Creating an app: what kind it is, what people see of it, and which API products it uses.
 * The app is made through the injected `Developer` service; `created` tells the host where it
 * is, and the host decides where to go.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { AppKind, Localized, Platform, Product } from '@idp/sdk/types';
import { isRedirectUri } from '../credentials/logic.js';
import { useView } from '../view.js';
import {
  createAppLabels,
  defaultsFor,
  KINDS,
  PLATFORMS,
  type ClientType,
  type CreateAppLabels,
  type CreateAppLogic,
  type CreateStep,
  type InfoField,
} from './logic.js';
import { CreateAppView } from './view.js';

const LINKS: InfoField[] = ['homepage_url', 'privacy_url', 'terms_url', 'logo'];

const props = {
  organization: prop.string(''),
  products: prop.object<Product[]>([]),
  /** The platform's name, for the consent preview. */
  platform: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<CreateAppLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

function isLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch {
    return false;
  }
}

export class DpCreateApp extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...createAppLabels, ...this.labels });
    const step = signal<CreateStep>(1);
    const kind = signal<AppKind>('web');
    const info = signal<Partial<Record<InfoField, string>>>({});
    const clientType = signal<ClientType>(defaultsFor('web').clientType);
    const platforms = signal<Platform[]>(defaultsFor('web').platforms);
    // The identity product, when there is one: every app that signs people in uses it.
    const picked = signal<string[] | null>(null);
    const busy = signal(false);
    const error = signal<string | null>(null);

    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';
    const value = (field: InfoField) => info()[field] ?? '';
    const needsRedirect = () => defaultsFor(kind()).needsRedirect;
    const selectedProducts = () =>
      picked() ?? this.products.filter((product) => product.slug === 'identity' && needsRedirect()).map((p) => p.slug);

    /** What stops step 2, worded, or null. */
    const problem = (): string | null => {
      if (!value('name').trim()) return labels().nameRequired;
      if (needsRedirect() && !isRedirectUri(value('redirect_uri').trim())) return labels().invalidUrl;
      if (LINKS.some((field) => value(field).trim() && !isLink(value(field).trim()))) return labels().invalidUrl;
      return null;
    };

    const create = async () => {
      busy.set(true);
      error.set(null);
      try {
        const optional = (field: InfoField) => value(field).trim() || undefined;
        const answer = await developer.createApp({
          organization: this.organization,
          app: {
            name: value('name').trim(),
            client_type: clientType(),
            kind: kind(),
            description: value('description').trim(),
            platforms: platforms(),
            products: selectedProducts(),
            redirect_uris: needsRedirect() ? [value('redirect_uri').trim()] : [],
            homepage_url: optional('homepage_url'),
            privacy_url: optional('privacy_url'),
            terms_url: optional('terms_url'),
            brand: optional('logo') ? { logo: optional('logo') } : undefined,
            ...(needsRedirect() ? {} : { grant_types: ['client_credentials'] }),
          },
        });
        this.emit('created', { client_id: answer.app.client_id, client_secret: answer.client_secret });
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };

    const logic: CreateAppLogic = {
      labels,
      step,
      steps: () =>
        ([1, 2, 3] as CreateStep[]).map((n) => ({ step: n, state: n < step() ? 'done' : n === step() ? 'now' : 'todo' })),
      kinds: () =>
        KINDS.map((entry) => ({
          kind: entry,
          selected: kind() === entry,
          choose: () => {
            const defaults = defaultsFor(entry);
            kind.set(entry);
            clientType.set(defaults.clientType);
            platforms.set(defaults.platforms);
          },
        })),
      value,
      edit: (field, next) => {
        info.set({ ...info(), [field]: next });
        // What was wrong is being fixed: the old message would only mislead.
        error.set(null);
      },
      needsRedirect,
      clientType,
      chooseClientType: (type) => clientType.set(type),
      platforms: () =>
        PLATFORMS.map((platform) => ({
          platform,
          selected: platforms().includes(platform),
          toggle: () =>
            platforms.set(
              platforms().includes(platform) ? platforms().filter((p) => p !== platform) : [...platforms(), platform],
            ),
        })),
      products: () =>
        this.products.map((product) => ({
          slug: product.slug,
          name: words(product.names) || product.slug,
          description: words(product.descriptions),
          approval: product.approval,
          scopes: product.scopes.map((scope) => scope.name),
          selected: selectedProducts().includes(product.slug),
          toggle: () => {
            const current = selectedProducts();
            picked.set(current.includes(product.slug) ? current.filter((s) => s !== product.slug) : [...current, product.slug]);
          },
        })),
      platform: () => this.platform,
      back: () => {
        error.set(null);
        if (step() > 1) step.set((step() - 1) as CreateStep);
      },
      next: async () => {
        error.set(null);
        if (step() === 2) {
          const wrong = problem();
          if (wrong) {
            error.set(wrong);
            return;
          }
        }
        if (step() < 3) step.set((step() + 1) as CreateStep);
        else await create();
      },
      busy,
      error,
    };
    return useView(CreateAppView)(logic);
  }
}

defineCustomElement('dp-create-app', DpCreateApp);

declare global {
  interface HTMLElementTagNameMap {
    'dp-create-app': DpCreateApp;
  }
  interface JSXCustomElements {
    'dp-create-app': ElementAttributes<typeof props>;
  }
}
