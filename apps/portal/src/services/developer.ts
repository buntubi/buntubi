/**
 * The developer service the portal's elements inject: each call a named action on the
 * portal's server functions, so a change refetches the workspace and the app it touches.
 */
import { defineModule } from '@fluixi/start/app';
import { action } from '@fluixi/start/router';
import { Developer, type DeveloperService } from '@idp/sdk/developer';
import {
  acceptTerms,
  addMember,
  addTestUser,
  changeMember,
  createApp,
  createKey,
  createOrganization,
  deleteOrganization,
  publishApp,
  removeMember,
  withdrawInvitation,
  removeTestUser,
  revokeKey,
  revokeSecret,
  rotateSecret,
  updateApp,
  updateOrganization,
} from '../server/developer.js';

const app = { invalidates: ['workspace', 'app'] };
// Going live also writes the app's review history.
const submission = { invalidates: ['workspace', 'app', 'reviews'] };
const organization = { invalidates: ['workspace', 'home'] };

const service: DeveloperService = {
  acceptTerms: action(() => acceptTerms(), 'developer.terms', { invalidates: ['home'] }),
  createOrganization: action(createOrganization, 'organization.create', organization),
  updateOrganization: action(({ organization: id, patch }) => updateOrganization(id, patch), 'organization.update', organization),
  deleteOrganization: action((id: string) => deleteOrganization(id), 'organization.delete', { invalidates: ['workspace', 'home'] }),
  createApp: action(({ organization: id, app: input }) => createApp(id, input), 'app.create', organization),
  updateApp: action(({ client_id, patch }) => updateApp(client_id, patch), 'app.update', app),
  publishApp: action(
    async ({ client_id, ...input }) => {
      const answer = await publishApp(client_id, input);
      return { state: answer.state === 'live' ? 'live' : 'pending', missing: answer.missing } as const;
    },
    'app.publish',
    submission,
  ),
  rotateSecret: action((clientId: string) => rotateSecret(clientId), 'secret.rotate', app),
  revokeSecret: action(({ client_id, secret }) => revokeSecret(client_id, secret), 'secret.revoke', app),
  createKey: action(({ organization: id, ...input }) => createKey(id, input), 'key.create', organization),
  revokeKey: action(({ organization: id, key }) => revokeKey(id, key), 'key.revoke', organization),
  addTestUser: action(({ organization: id, email }) => addTestUser(id, email), 'testUser.add', organization),
  removeTestUser: action(({ organization: id, email }) => removeTestUser(id, email), 'testUser.remove', organization),
  addMember: action(({ organization: id, ...input }) => addMember(id, input), 'member.add', organization),
  changeMember: action(
    ({ organization: id, member, ...patch }) => changeMember(id, member, patch),
    'member.change',
    organization,
  ),
  removeMember: action(({ organization: id, member }) => removeMember(id, member), 'member.remove', organization),
  withdrawInvitation: action(
    ({ organization: id, invitation }) => withdrawInvitation(id, invitation),
    'invitation.withdraw',
    organization,
  ),
};

export const DeveloperModule = defineModule({ name: 'developer', providers: [{ provide: Developer, useValue: service }] });
