/** What one role may do, as a small card; apart from the look. */

export interface RoleCardLogic {
  name: () => string;
  text: () => string;
}
