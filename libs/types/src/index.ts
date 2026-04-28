/**
 * Cross-package domain types. Keep this lib free of runtime deps so it can
 * be imported from any environment (server, client, edge).
 */

export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP';

export type DonationFrequency = 'once' | 'monthly';

export interface DonorContact {
  email: string;
  fullName: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface DonationDraft {
  amountZar: number;
  frequency: DonationFrequency;
  campaignId?: string;
  donor: DonorContact;
  requestTaxCertificate?: boolean;
  notes?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type DonationStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type CertificateStatus = 'REQUESTED' | 'GENERATED' | 'ISSUED' | 'REVOKED';

export type GiftTier = 'NONE' | 'TIER_1';

export interface FundAllocationSlice {
  id: string;
  label: string;
  percentage: number; // 0-100
  description?: string;
  colorToken: 'oceanBlue' | 'teal' | 'coralRed' | 'sand' | 'sun';
}

export interface CampaignProgress {
  campaignId: string;
  raisedZar: number;
  targetZar: number;
  donorCount: number;
  percentage: number;
}

export interface DashboardMetricsSnapshot {
  totalRaisedZar: number;
  mailingListSignups: number;
  activeCampaigns: number;
  pendingOrders: number;
  donationsLast30Days: Array<{ date: string; amountZar: number; count: number }>;
  campaignProgress: CampaignProgress[];
}
