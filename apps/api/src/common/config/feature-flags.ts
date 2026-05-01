export type ServerFeatureFlags = {
  recurringDonations: boolean;
  sponsorImpactSelfService: boolean;
  adminSponsorImpactReporting: boolean;
  adminRecurringRunner: boolean;
  shopEnabled: boolean;
};

const truthy = new Set(['1', 'true', 'yes', 'on']);
const falsy = new Set(['0', 'false', 'no', 'off']);

function parseFlag(value: string | undefined, fallback = true): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;
  return fallback;
}

export function getServerFeatureFlags(): ServerFeatureFlags {
  return {
    recurringDonations: parseFlag(process.env.FEATURE_FLAG_RECURRING_DONATIONS, true),
    sponsorImpactSelfService: parseFlag(process.env.FEATURE_FLAG_SPONSOR_IMPACT_SELF_SERVICE, true),
    adminSponsorImpactReporting: parseFlag(process.env.FEATURE_FLAG_ADMIN_SPONSOR_IMPACT_REPORTING, true),
    adminRecurringRunner: parseFlag(process.env.FEATURE_FLAG_ADMIN_RECURRING_RUNNER, true),
    shopEnabled: parseFlag(process.env.FEATURE_FLAG_SHOP, true),
  };
}
