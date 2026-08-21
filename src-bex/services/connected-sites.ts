/**
 * What a site currently holds: which identity it is bound to, and what it may do without asking.
 *
 * The pieces existed and nothing joined them. `getGrantedPermissions` and `revokePermission` were
 * written months ago with no bridge event and no caller, so no user has ever been able to see or
 * revoke a grant (#116). Bindings arrived with the same gap.
 *
 * Joined here rather than in the view, so what "connected" means is one answer the panel, the
 * dashboard and any future surface all read the same way.
 */

import { getGrantedPermissions, revokePermission } from '../handlers/permission-handler';
import { listBindings, removeBinding } from './site-binding-store';
import { normalizeOrigin } from './origin';
import type { PermissionEventKind } from '../types/background';

export interface ConnectedSiteGrant {
  /**
   * The account this grant belongs to.
   *
   * A site can hold grants for more than one identity — each was given while that account was the
   * one acting — so a grant list that did not say which would be ambiguous exactly where it matters.
   */
  accountPubkey: string;
  requestType: string;
  eventKind: PermissionEventKind;
  /** Absent for a grant that does not expire. */
  expiresAt?: number;
  grantedAt: number;
}

export interface ConnectedSite {
  origin: string;
  /** The account this site signs as, or null when it holds grants but was never bound. */
  boundPubkey: string | null;
  boundAt: number | null;
  grants: ConnectedSiteGrant[];
}

/**
 * Every site with a binding, a grant, or both.
 *
 * A site can have one without the other: a binding with no grants is a site that asked once and was
 * answered "just this once", which is worth showing — it still signs as that identity next time.
 */
export const listConnectedSites = async (): Promise<ConnectedSite[]> => {
  const [bindings, grants] = await Promise.all([listBindings(), getGrantedPermissions()]);

  const sites = new Map<string, ConnectedSite>();

  const siteFor = (origin: string): ConnectedSite => {
    const existing = sites.get(origin);
    if (existing) return existing;

    const site: ConnectedSite = { origin, boundPubkey: null, boundAt: null, grants: [] };
    sites.set(origin, site);
    return site;
  };

  for (const binding of bindings) {
    const site = siteFor(binding.origin);
    site.boundPubkey = binding.pubkey;
    site.boundAt = binding.boundAt;
  }

  for (const grant of grants) {
    if (!grant.granted) continue;

    siteFor(grant.origin).grants.push({
      accountPubkey: grant.accountPubkey,
      requestType: grant.requestType,
      eventKind: grant.eventKind,
      grantedAt: grant.timestamp,
      ...(grant.expiry !== undefined ? { expiresAt: grant.expiry } : {}),
    });
  }

  return [...sites.values()].sort((a, b) => a.origin.localeCompare(b.origin));
};

/**
 * Disconnect a site entirely: every grant it holds, and its binding.
 *
 * Deliberately all-or-nothing rather than per-grant. A site whose grants are revoked but whose
 * binding remains still signs as that identity the next time it asks, which is not what "disconnect"
 * means to anyone reading it. Removing the binding lets the next request bind afresh, and the user
 * is asked again for everything.
 */
/**
 * How many sites hold at least one standing permission for an account.
 *
 * The dashboard's "Approved Clients" figure used to count distinct hostnames in the approvals log,
 * which answers a different question: it counted sites that *asked*, including ones the user
 * rejected, and kept counting them after a grant was revoked (#116).
 */
export const countSitesHoldingGrantsFor = async (accountPubkey: string): Promise<number> => {
  if (!accountPubkey) return 0;

  const sites = await listConnectedSites();
  return sites.filter((site) =>
    site.grants.some((grant) => grant.accountPubkey === accountPubkey),
  ).length;
};

export const disconnectSite = async (origin: string): Promise<boolean> => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const grants = await getGrantedPermissions();
  const held = grants.filter((grant) => grant.origin === normalized);

  for (const grant of held) {
    await revokePermission(normalized, grant.accountPubkey, grant.requestType, grant.eventKind);
  }

  await removeBinding(normalized);

  return true;
};
