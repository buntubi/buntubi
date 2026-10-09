/** Something the address names does not exist, or not for this visitor; apart from the look. */

export interface NotFoundLabels {
  title: string;
  text: string;
  back: string;
}

export const notFoundLabels: NotFoundLabels = {
  title: 'Not found',
  text: 'It does not exist, or this account cannot see it.',
  back: 'Back',
};

export interface NotFoundLogic {
  labels: () => NotFoundLabels;
  href: () => string;
}
