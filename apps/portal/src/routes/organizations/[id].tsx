/** The address organizations had before the workspace: sends a saved link on to its workspace. */
import { Redirect, useParams } from '@fluixi/start/router';

export default function LegacyOrganizationPage() {
  const params = useParams<{ id: string }>();
  return <Redirect to={`/o/${encodeURIComponent(params().id ?? '')}`} />;
}
