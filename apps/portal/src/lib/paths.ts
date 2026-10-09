/** The portal's addresses, built in one place so no page writes a path by hand. */

const segment = (value: string) => encodeURIComponent(value);

/** The sections of an app's workspace; the overview has none. */
export type AppSection = 'settings' | 'permissions' | 'credentials' | 'review';

/** The pages of an organization's workspace; home has none. */
export type OrganizationPage = 'products' | 'team' | 'settings';

export const paths = {
  /** The way in: sign in, the developer terms, a first organization. */
  start: () => '/',
  /** An organization's workspace, or one of its pages. */
  organization: (organization: string, page?: OrganizationPage) =>
    `/o/${segment(organization)}${page ? `/${page}` : ''}`,
  /** The focused flow that creates an app. */
  newApp: (organization: string) => `/o/${segment(organization)}/apps/new`,
  /** An app's overview, or one of its sections. */
  app: (organization: string, clientId: string, section?: AppSection) =>
    `/o/${segment(organization)}/apps/${segment(clientId)}${section ? `/${section}` : ''}`,
  /** For an element that fills in the organization itself: `{id}` is replaced. */
  organizationPattern: () => '/o/{id}',
} as const;

/** Where each launch check is fixed, for an app. */
export const checkLinks = (organization: string, clientId: string) => ({
  basic_info: paths.app(organization, clientId, 'settings'),
  policies: paths.app(organization, clientId, 'settings'),
  redirect_uri: paths.app(organization, clientId, 'credentials'),
  products: paths.app(organization, clientId, 'permissions'),
  permissions: paths.app(organization, clientId, 'permissions'),
  support_email: paths.organization(organization, 'settings'),
});
