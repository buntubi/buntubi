/** The console's addresses, built in one place so no page writes a path by hand. */

const segment = (value: string) => encodeURIComponent(value);
const query = (q?: string) => (q ? `?q=${encodeURIComponent(q)}` : '');

export const paths = {
  overview: () => '/',
  reviews: () => '/reviews',
  review: (clientId: string) => `/reviews/${segment(clientId)}`,
  /** For an element that fills in the app itself: `{client_id}` is replaced. */
  reviewPattern: () => '/reviews/{client_id}',
  organizations: (q?: string) => `/organizations${query(q)}`,
  users: (q?: string) => `/users${query(q)}`,
  user: (id: string) => `/users/${segment(id)}`,
  /** For an element that fills in the account: `{id}` is replaced. */
  userPattern: () => '/users/{id}',
  newUser: () => '/users/new',
  apps: (q?: string) => `/apps${query(q)}`,
  app: (clientId: string) => `/apps/${segment(clientId)}`,
  /** For an element that fills in the app itself: `{client_id}` is replaced. */
  appPattern: () => '/apps/{client_id}',
  /** For an element that fills in the organization: `{name}` is replaced. */
  organizationAppsPattern: () => '/apps?q={name}',
  scopes: () => '/scopes',
  products: () => '/products',
  /** A page a plugin adds. */
  plugin: (plugin: string, section: string) => `/p/${segment(plugin)}/${segment(section)}`,
} as const;

/** Pages of the developer portal, which the console links to; `base` is its address. */
export const portalPaths = {
  /** For an element that fills in the app: `{organization_id}` and `{client_id}` are replaced. */
  appPattern: (base: string) => `${base}/o/{organization_id}/apps/{client_id}`,
  newApp: (base: string, organizationId: string) => `${base}/o/${segment(organizationId)}/apps/new`,
} as const;
