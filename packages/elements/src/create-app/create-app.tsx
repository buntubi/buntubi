/**
 * Creating an app: what kind it is, what people see of it, and which API products it uses.
 * This element holds the flow's state and composes one block per part (the steps, the kind
 * picker, the information form and its consent preview, the product picker, the footer), each
 * replaceable on its own. The app is made through the injected `Developer` service; `created`
 * tells the host where it is, and the host decides where to go.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntu/sdk/developer';
import type { AppKind, Localized, Platform, Product } from '@buntu/sdk/types';
import '../app-info-form/app-info-form.js';
import type { InfoField } from '../app-info-form/logic.js';
import '../consent-preview/consent-preview.js';
import '../kind-picker/kind-picker.js';
import '../product-picker/product-picker.js';
import '../step-indicator/step-indicator.js';
import '../wizard-footer/wizard-footer.js';
import { useView } from '../view.js';
import {
  createAppLabels,
  defaultsFor,
  KIND_ICONS,
  KINDS,
  LINK_FIELDS,
  PLATFORMS,
  type CreateAppEvents,
  type CreateAppLabels,
  type CreateStep,
} from './logic.js';
import { CreateAppView, type CreateAppLogic } from './view.js';

const props = {
  organization: prop.string(''),
  products: prop.object<Product[]>([]),
  /** The platform's name, for the kinds' texts and the consent preview. */
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

export class IdpCreateApp extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...createAppLabels, ...this.labels });
    const step = signal<CreateStep>(1);
    const kind = signal<AppKind>('web');
    const info = signal<Partial<Record<InfoField, string>>>({});
    const platforms = signal<Platform[]>(defaultsFor('web').platforms);
    // Until the reader picks, the identity product for an app that signs people in.
    const picked = signal<string[] | null>(null);
    const busy = signal(false);
    const error = signal<string | null>(null);

    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';
    const value = (field: InfoField) => info()[field] ?? '';
    const selected = () =>
      picked() ?? this.products.filter((product) => product.slug === 'identity' && defaultsFor(kind()).signsIn).map((p) => p.slug);

    /** What stops step 2, worded, or null. */
    const problem = (): string | null => {
      if (!value('name').trim()) return labels().nameRequired;
      if (LINK_FIELDS.some((field) => value(field).trim() && !isLink(value(field).trim()))) return labels().invalidUrl;
      return null;
    };

    const create = async () => {
      busy.set(true);
      error.set(null);
      try {
        const optional = (field: InfoField) => value(field).trim() || undefined;
        const defaults = defaultsFor(kind());
        const answer = await developer.createApp({
          organization: this.organization,
          app: {
            name: value('name').trim(),
            client_type: defaults.clientType,
            kind: kind(),
            description: value('description').trim(),
            category: optional('category'),
            platforms: platforms(),
            products: selected(),
            homepage_url: optional('homepage_url'),
            privacy_url: optional('privacy_url'),
            terms_url: optional('terms_url'),
            brand: optional('logo') ? { logo: optional('logo') } : undefined,
            ...(defaults.signsIn ? {} : { grant_types: ['client_credentials'] }),
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
      step,
      steps: () =>
        ([1, 2, 3] as CreateStep[]).map((n) => ({
          label: labels().steps[n],
          state: n < step() ? 'done' : n === step() ? 'now' : 'todo',
        })),
      stepsLabel: () => labels().stepsLabel,
      kindTitle: () => labels().kindTitle,
      kindIntro: () => labels().kindIntro,
      kinds: () =>
        KINDS.map((entry) => ({
          kind: entry,
          title: labels().kinds[entry].title,
          text: labels().kinds[entry].text.replace('{platform}', this.platform),
          icon: KIND_ICONS[entry],
        })),
      kind,
      chooseKind: (next) => {
        const entry = next as AppKind;
        kind.set(entry);
        platforms.set(defaultsFor(entry).platforms);
      },
      infoLabels: () => labels().info,
      values: info,
      edit: (field, next) => {
        info.set({ ...info(), [field]: next });
        // What was wrong is being fixed: the old message would only mislead.
        error.set(null);
      },
      platforms: () =>
        PLATFORMS.map((platform) => ({ platform, label: labels().platformNames[platform], selected: platforms().includes(platform) })),
      togglePlatform: (platform) => {
        const entry = platform as Platform;
        platforms.set(platforms().includes(entry) ? platforms().filter((p) => p !== entry) : [...platforms(), entry]);
      },
      preview: () => labels().preview,
      appName: () => value('name'),
      logo: () => value('logo'),
      platform: () => this.platform,
      productsTitle: () => labels().productsTitle,
      productsIntro: () => labels().productsIntro,
      noProducts: () => labels().noProducts,
      products: () =>
        this.products.map((product) => ({
          slug: product.slug,
          name: words(product.names) || product.slug,
          text: words(product.descriptions),
          scopes: product.scopes.map((scope) => scope.name),
          meta: [...product.auth.map((a) => labels().auth[a]), labels().availability[product.availability]].join(' · '),
          approval: product.approval,
          approvalLabel: labels().approvals[product.approval],
          selected: selected().includes(product.slug),
        })),
      toggleProduct: (slug) => {
        const current = selected();
        picked.set(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
      },
      backLabel: () => labels().back,
      nextLabel: () => (step() === 3 ? labels().create : labels().next),
      note: () => labels().sandboxNote,
      back: () => {
        error.set(null);
        if (step() > 1) step.set((step() - 1) as CreateStep);
        else this.emit('cancel', {});
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

defineCustomElement('idp-create-app', IdpCreateApp);

declare global {
  interface HTMLElementTagNameMap {
    'idp-create-app': IdpCreateApp;
  }
  interface JSXCustomElements {
    'idp-create-app': ElementAttributes<typeof props, CreateAppEvents>;
  }
}
