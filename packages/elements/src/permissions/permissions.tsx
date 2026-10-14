/**
 * The scopes an app asks for, grouped by API product, with where each stands: approved, waiting
 * for a review, sandbox only. Saving goes through the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { memo, signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@buntu/sdk/developer';
import type { App, AppOverview, Localized, Product } from '@buntu/sdk/types';
import { freshest } from '../fresh.js';
import '../access-request/access-request.js';
import '../page-header/page-header.js';
import '../permission-legend/permission-legend.js';
import '../scope-group/scope-group.js';
import { useView } from '../view.js';
import { permissionsLabels, type PermissionsLabels, type PermissionsLogic, type ScopeState } from './logic.js';
import { PermissionsView } from './view.js';

/** Always granted: an OpenID Connect sign-in is what the app is for. */
const ALWAYS = new Set(['openid']);

const props = {
  app: prop.object<App | null>(null),
  products: prop.object<Product[]>([]),
  overview: prop.object<AppOverview | null>(null),
  /** Whether this member may change the app's scopes. */
  canEdit: prop.boolean(false),
  /** Where the review is prepared. */
  reviewHref: prop.string(''),
  /** Where the API products are described. */
  productsHref: prop.string(''),
  /** The reader's language, for product and scope descriptions. */
  locale: prop.string('en'),
  labels: prop.object<Partial<PermissionsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpPermissions extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...permissionsLabels, ...this.labels });
    const app = freshest(() => this.app);
    // Null while the selection is the app's own.
    const edits = signal<string[] | null>(null);
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);

    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';
    const stored = () => app.current()?.scopes ?? [];
    const selected = memo(() => new Set(edits() ?? stored()));
    const sensitiveScopes = memo(
      () => new Set(this.products.flatMap((p) => p.scopes.filter((s) => s.sensitivity !== 'public').map((s) => s.name))),
    );
    const stateOf = (name: string, sensitivity: string): ScopeState => {
      if (sensitivity === 'restricted' && !selected().has(name)) return 'restricted';
      if (!selected().has(name)) return 'available';
      if (!stored().includes(name)) return 'added';
      const scopes = this.overview?.scopes;
      if (scopes?.live.includes(name)) return 'live';
      if (scopes?.waiting.includes(name)) return 'waiting';
      return 'sandbox';
    };

    const logic: PermissionsLogic = {
      labels,
      groups: () =>
        this.products
          .filter((product) => product.scopes.length > 0)
          .map((product) => ({
            slug: product.slug,
            name: words(product.names) || product.slug,
            description: words(product.descriptions),
            scopes: product.scopes.map((scope) => ({
              name: scope.name,
              description: words(scope.descriptions),
              sensitive: scope.sensitivity !== 'public',
              state: stateOf(scope.name, scope.sensitivity),
              selected: selected().has(scope.name),
              locked: ALWAYS.has(scope.name) || scope.sensitivity === 'restricted' || !this.canEdit,
            })),
          })),
      toggle: (scope) => {
        if (ALWAYS.has(scope)) return;
        const next = new Set(selected());
        if (next.has(scope)) next.delete(scope);
        else next.add(scope);
        edits.set([...next]);
        saved.set(false);
      },
      pending: () => {
        const approved = new Set(this.overview?.scopes.live ?? []);
        const restricted = new Set(this.products.flatMap((p) => p.scopes.filter((s) => s.sensitivity === 'restricted').map((s) => s.name)));
        return [...selected()]
          .filter((name) => sensitiveScopes().has(name) && !approved.has(name))
          .sort()
          .map((name) => ({ name, restricted: restricted.has(name) }));
      },
      detailsHref: () => this.productsHref,
      selectedCount: () => selected().size,
      changed: () => {
        const current = edits();
        if (!current) return false;
        const before = new Set(stored());
        return current.length !== before.size || current.some((name) => !before.has(name));
      },
      canEdit: () => this.canEdit,
      save: async () => {
        busy.set(true);
        error.set(null);
        try {
          // A product whose scope is picked is one the app uses. Only added: a product can be
          // used without any of its scopes, through API keys.
          const using = this.products
            .filter((product) => product.scopes.some((scope) => !ALWAYS.has(scope.name) && selected().has(scope.name)))
            .map((product) => product.slug);
          const products = [...new Set([...(app.current()?.products ?? []), ...using])];
          app.adopt(await developer.updateApp({ client_id: app.current()?.client_id ?? '', patch: { scopes: [...selected()], products } }));
          edits.set(null);
          saved.set(true);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      saved,
      error,
      reviewHref: () => this.reviewHref,
    };
    return useView(PermissionsView)(logic);
  }
}

defineCustomElement('idp-permissions', IdpPermissions);

declare global {
  interface HTMLElementTagNameMap {
    'idp-permissions': IdpPermissions;
  }
  interface JSXCustomElements {
    'idp-permissions': ElementAttributes<typeof props>;
  }
}
