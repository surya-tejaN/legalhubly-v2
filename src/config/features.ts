/**
 * Production feature flags.
 * Only ship surfaces that are stable enough for real users.
 * Beta modules stay in the codebase but stay out of primary navigation
 * until hardened (RLS, empty states, error handling, load tests).
 */
export const features = {
  // Client — production
  clientDashboard: true,
  clientFindLawyers: true,
  clientLawyerProfile: true,
  clientSavedLawyers: true,
  clientCases: true,
  clientProfile: true,
  clientSettings: true,

  // Client — beta (hidden from nav until ready)
  clientMessages: false,
  clientConsultations: false,
  clientDocuments: false,
  clientPayments: false,

  // Lawyer — production
  lawyerDashboard: true,
  lawyerClients: true,
  lawyerTools: true,
  lawyerSettings: true,

  // Lawyer — beta
  lawyerLeads: false,
  lawyerMessages: false,
  lawyerCases: false,
  lawyerCalendar: false,
  lawyerBilling: false,
  lawyerDocuments: false,
} as const;

export type FeatureFlag = keyof typeof features;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
