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
  scopes: () => '/scopes',
  products: () => '/products',
  /** A page a plugin adds. */
  plugin: (plugin: string, section: string) => `/p/${segment(plugin)}/${segment(section)}`,
} as const;
