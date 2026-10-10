/** One organization as a way into its workspace; apart from the look. */

export interface OrganizationTileLogic {
  name: () => string;
  detail: () => string;
  tag: () => string;
  href: () => string;
  /** Opening it is choosing it: the host may keep the choice. */
  choose: () => void;
}
