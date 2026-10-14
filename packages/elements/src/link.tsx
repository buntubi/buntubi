/**
 * The elements' link: a plain anchor that moves through the app's navigation (`Navigation` in
 * @buntubi/sdk/navigation), so an element needs no router around it.
 */
import { splitProps } from '@fluixi/core';
import { followLink, useNavigation } from '@buntubi/sdk/navigation';

/** What the elements pass to a link; any other attribute goes to the anchor as it is. */
interface Props {
  href?: string | (() => string | undefined);
  class?: string;
  title?: string | (() => string | undefined);
  onClick?: (event: MouseEvent) => void;
  children?: unknown;
  [attribute: string]: unknown;
}

export function Link(props: Props) {
  const navigator = useNavigation();
  const [own, rest] = splitProps(props, ['onClick', 'children']);
  const children = own.children;
  return (
    <a
      {...rest}
      onClick={(event: MouseEvent) => {
        own.onClick?.(event);
        followLink(event, navigator);
      }}
    >
      {children as never}
    </a>
  );
}
