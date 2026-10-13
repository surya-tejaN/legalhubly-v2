/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as otpVerification } from './otp-verification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'payment-receipt': paymentReceipt,
  'otp-verification': otpVerification,
}
