/**
 * The admin service console elements inject: each call a named action, so a change refetches
 * the route data it touches.
 */
import { defineModule } from '@fluixi/start/app';
import { action } from '@fluixi/start/router';
import { Admin, type AdminService } from '@idp/sdk/admin';
import {
  createProduct,
  createScope,
  restoreOrganization,
  reviewApp,
  setAvailability,
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
  setUserDisabled: action(setUserDisabled, 'user.toggle', { invalidates: ['users', 'overview'] }),
  createScope: action(createScope, 'scope.create', { invalidates: ['scopes'] }),
  setFirstParty: action(setFirstParty, 'client.firstParty', { invalidates: ['clients', 'overview'] }),
};

export const AdminModule = defineModule({ name: 'admin', providers: [{ provide: Admin, useValue: service }] });
