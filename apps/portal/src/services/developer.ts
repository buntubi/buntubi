/**
 * The developer service the portal's elements inject: each call a named action on the
 * portal's server functions, so a change refetches the workspace and the app it touches.
 */
import { defineModule } from '@fluixi/start/app';
import { action } from '@fluixi/start/router';
import { Developer, type DeveloperService } from '@idp/sdk/developer';
import {
  addMember,
  addTestUser,
  changeMember,
  createApp,
  createKey,
  createOrganization,
  publishApp,
  removeMember,
  removeTestUser,
  revokeKey,
  revokeSecret,
  rotateSecret,
  updateApp,
} from '../server/developer.js';

const app = { invalidates: ['workspace', 'app'] };
const organization = { invalidates: ['workspace'] };

const service: DeveloperService = {
  createOrganization: action(createOrganization, 'organization.create', organization),
  createApp: action(
    ({ organization: id, app: input }) =>
      createApp(id, { name: input.name, client_type: input.client_type, redirect_uri: input.redirect_uris?.[0] ?? '' }),
    'app.create',
    organization,
  ),
  updateApp: action(({ client_id, patch }) => updateApp(client_id, patch), 'app.update', app),
  publishApp: action(async (clientId: string) => {
    const answer = await publishApp(clientId);
    return { state: answer.state === 'live' ? 'live' : 'pending', missing: answer.missing } as const;
  }, 'app.publish', app),
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
};

export const DeveloperModule = defineModule({ name: 'developer', providers: [{ provide: Developer, useValue: service }] });
