/** How tokens are signed and where the keys are published; apart from the look. */

export interface SigningKeysLabels {
  title: string;
  text: string;
}

export const signingKeysLabels: SigningKeysLabels = {
  title: 'Signing keys',
  text: 'Tokens are signed with RS256. Verify them with the published key set; the key ID is in each token header.',
};

export interface SigningKeysLogic {
  labels: () => SigningKeysLabels;
  jwksUrl: () => string;
}
