/**
 * Panel- and dashboard-side access to what each site holds.
 *
 * A thin pass through the bridge: the background owns the grant and binding stores, and this never
 * caches them. A stale list would show a user authority that has already been revoked.
 */

import { sendBexMessage } from './bridge-client';
import type { ConnectedSite } from 'app/src-bex/services/connected-sites';

export type { ConnectedSite };

export const listConnectedSites = async (): Promise<ConnectedSite[]> =>
  (await sendBexMessage('sites.list')) ?? [];

export const disconnectSite = async (origin: string): Promise<boolean> =>
  (await sendBexMessage('sites.revoke', { origin })) ?? false;
