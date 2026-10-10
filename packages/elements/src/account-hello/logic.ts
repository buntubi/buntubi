/** Who is signed in, at the top of the account home; apart from the look. */

export interface AccountHelloLabels {
  /** "Welcome, {name}". */
  welcome: string;
  /** "Member since {date}". */
  since: string;
  edit: string;
}

export const accountHelloLabels: AccountHelloLabels = {
  welcome: 'Welcome, {name}',
  since: 'Member since {date}',
  edit: 'Edit personal info',
};

export interface AccountHelloLogic {
  labels: () => AccountHelloLabels;
  name: () => string;
  firstName: () => string;
  email: () => string;
  since: () => string;
  initials: () => string;
  editHref: () => string;
}
