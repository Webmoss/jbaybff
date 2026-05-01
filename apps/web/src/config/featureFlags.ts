type ClientFeatureFlags = {
  recurringDonations: boolean
  sponsorImpactSelfService: boolean
  adminSponsorImpactReporting: boolean
  adminRecurringRunner: boolean
  shopEnabled: boolean
}

const truthy = new Set(['1', 'true', 'yes', 'on'])
const falsy = new Set(['0', 'false', 'no', 'off'])

function parseFlag(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (truthy.has(normalized)) return true
  if (falsy.has(normalized)) return false
  return fallback
}

export const featureFlags: ClientFeatureFlags = {
  recurringDonations: parseFlag(import.meta.env.VITE_FEATURE_RECURRING_DONATIONS, true),
  sponsorImpactSelfService: parseFlag(import.meta.env.VITE_FEATURE_SPONSOR_IMPACT_SELF_SERVICE, true),
  adminSponsorImpactReporting: parseFlag(import.meta.env.VITE_FEATURE_ADMIN_SPONSOR_IMPACT_REPORTING, true),
  adminRecurringRunner: parseFlag(import.meta.env.VITE_FEATURE_ADMIN_RECURRING_RUNNER, true),
  shopEnabled: parseFlag(import.meta.env.VITE_FEATURE_SHOP, true),
}
