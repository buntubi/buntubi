/** What the reviewer last said about an app; apart from the look. */

export interface ReviewNoteLogic {
  title: () => string;
  note: () => string;
}
