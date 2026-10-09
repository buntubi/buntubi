/** One organization as a way into its workspace; apart from the look. */

export interface OrganizationTileLogic {
  name: () => string;
  detail: () => string;
  href: () => string;
}
