/** One thing that needs the reader, as a line; apart from the look. */

export type AttentionTone = 'warn' | 'bad' | 'info' | 'ok';

export interface AttentionItemLogic {
  title: () => string;
  text: () => string;
  href: () => string;
  tone: () => AttentionTone;
}
