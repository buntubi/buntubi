/** The sign-in notice's words and behaviour, apart from how it looks. */

export interface AuthNoticeLabels {
  /** What the provider's answer means for the reader, by OAuth error code. */
  reasons: Record<string, string>;
  /** For a code without its own sentence. */
  generic: string;
  retry: string;
  dismiss: string;
}

export const authNoticeLabels: AuthNoticeLabels = {
  reasons: {
    access_denied: 'The sign-in was refused.',
    server_error: 'The identity provider could not complete the sign-in.',
    temporarily_unavailable: 'The identity provider is unavailable for a moment.',
  },
  generic: 'The sign-in did not go through.',
  retry: 'Try again',
  dismiss: 'Dismiss',
};

export interface AuthNoticeEvents {
  /** The reader wants another attempt; the host starts it. */
  retry: { error: string };
  /** The reader closed the notice; the host drops the error from the address. */
  dismiss: { error: string };
}

export interface AuthNoticeLogic {
  /** The OAuth error code, or empty when there is nothing to say. */
  error: () => string;
  /** The sentence for that code. */
  message: () => string;
  labels: () => AuthNoticeLabels;
  retry: () => void;
  dismiss: () => void;
}
