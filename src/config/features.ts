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
  /**
   * When false: Book UI stays visible (preview), but Confirm is blocked.
   * Turn true only after real lawyer calendar / live time slots exist.
   */
  clientBooking: false,

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

  /** Floating guidelines-trained support chatbot */
  supportChat: true,
  /** Mic + spoken replies in SupportChat (browser Web Speech API) */
  supportChatVoice: true,
} as const;

export type FeatureFlag = keyof typeof features;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
