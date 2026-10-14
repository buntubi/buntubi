/**
 * The admin service console elements inject: each call a named action, so a change refetches
 * the route data it touches.
 */
import { defineModule } from '@fluixi/start/app';
import { action } from '@fluixi/start/router';
import { Admin, type AdminService } from '@buntu/sdk/admin';
import {
  createProduct,
  createUser,
  resetTwoStep,
  sendPasswordReset,
  signOutUser,
  updateUser,
  createScope,
  restoreOrganization,
  reviewApp,
  setAdmin,
  setAvailability,
  setClientDisabled,
  setFirstParty,
  setScopeProduct,
  setUserDisabled,
  suspendOrganization,
} from '../server/admin.js';

const catalog = { invalidates: ['products'] };

const service: AdminService = {
  createProduct: action(createProduct, 'product.create', catalog),
  setAvailability: action(setAvailability, 'product.availability', catalog),
  // Moving a scope changes both lists: the products and the scopes still free.
  setScopeProduct: action(setScopeProduct, 'product.scope', { invalidates: ['products', 'scopes'] }),
  // An answer changes the queue, the app's own page and the counts on the overview.
  review: action(
    ({ client_id, approve, note }) => reviewApp({ clientId: client_id, approve, note }),
    'review.decide',
    { invalidates: ['reviews', 'review', 'overview'] },
  ),
  suspendOrganization: action(suspendOrganization, 'organization.suspend', { invalidates: ['organizations', 'overview'] }),
  restoreOrganization: action(restoreOrganization, 'organization.restore', { invalidates: ['organizations', 'overview'] }),
  setUserDisabled: action(setUserDisabled, 'user.toggle', { invalidates: ['users', 'user', 'overview'] }),
  createScope: action(createScope, 'scope.create', { invalidates: ['scopes'] }),
  setFirstParty: action(setFirstParty, 'client.firstParty', { invalidates: ['clients', 'client', 'overview'] }),
  setClientDisabled: action(setClientDisabled, 'client.disabled', { invalidates: ['clients', 'client'] }),
  setAdmin: action(setAdmin, 'user.admin', { invalidates: ['users', 'user'] }),
  createUser: action(createUser, 'user.create', { invalidates: ['users', 'overview'] }),
  updateUser: action(updateUser, 'user.update', { invalidates: ['users', 'user'] }),
  sendPasswordReset: action(sendPasswordReset, 'user.passwordReset'),
  signOutUser: action(signOutUser, 'user.signOut', { invalidates: ['user'] }),
  resetTwoStep: action(resetTwoStep, 'user.twoStep', { invalidates: ['users', 'user'] }),
};

export const AdminModule = defineModule({ name: 'admin', providers: [{ provide: Admin, useValue: service }] });
