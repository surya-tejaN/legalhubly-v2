/**
 * Feature flags — all advanced surfaces enabled for Legalhubly v2 demo.
 * Toggle off individually if a module needs hardening before production.
 */
export const features = {
  clientDashboard: true,
  clientFindLawyers: true,
  clientLawyerProfile: true,
  clientSavedLawyers: true,
  clientCases: true,
  clientProfile: true,
  clientSettings: true,
  clientMessages: true,
  clientConsultations: true,
  clientDocuments: true,
  clientPayments: true,

  lawyerDashboard: true,
  lawyerClients: true,
  lawyerTools: true,
  lawyerSettings: true,
  lawyerLeads: true,
  lawyerMessages: true,
  lawyerCases: true,
  lawyerCalendar: true,
  lawyerBilling: true,
  lawyerDocuments: true,
} as const;

export type FeatureFlag = keyof typeof features;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
