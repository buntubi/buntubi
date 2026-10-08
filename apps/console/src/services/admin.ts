/**
 * The admin service console elements inject: each call a named action, so a change refetches
 * the route data it touches.
 */
import { defineModule } from '@fluixi/start/app';
import { action } from '@fluixi/start/router';
import { Admin, type AdminService } from '@idp/sdk/admin';
import { createProduct, reviewApp, setAvailability, setScopeProduct } from '../server/admin.js';

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
};

export const AdminModule = defineModule({ name: 'admin', providers: [{ provide: Admin, useValue: service }] });
