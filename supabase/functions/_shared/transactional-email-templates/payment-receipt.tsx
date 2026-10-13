import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Legalhubly"

interface PaymentReceiptProps {
  clientName?: string
  amount?: string
  description?: string
  date?: string
}

const PaymentReceiptEmail = ({ clientName, amount, description, date }: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment receipt from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>⚖️ {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {clientName ? `Thank you, ${clientName}!` : 'Payment Received'}
        </Heading>

        <Text style={text}>Your payment has been successfully processed.</Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Amount:</strong> {amount || '$0.00'}</Text>
          <Text style={detailRow}><strong>Description:</strong> {description || 'Legal consultation'}</Text>
          <Text style={detailRow}><strong>Date:</strong> {date || 'N/A'}</Text>
          <Text style={detailRow}><strong>Status:</strong> ✅ Paid</Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          This is your payment receipt. If you have questions, please contact your lawyer through the {SITE_NAME} messaging system.
        </Text>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) => `Payment Receipt${data.amount ? ` — ${data.amount}` : ''} — ${SITE_NAME}`,
  displayName: 'Payment receipt',
  previewData: {
    clientName: 'Jane',
    amount: '$150.00',
    description: 'Consultation with Sarah Chen',
    date: 'Monday, April 7, 2025',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: 'hsl(224, 58%, 12%)', padding: '16px 20px', borderRadius: '12px 12px 0 0', marginBottom: '0' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', textAlign: 'center' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(224, 50%, 10%)', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(224, 12%, 48%)', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: 'hsl(225, 25%, 97%)', borderRadius: '8px', padding: '16px 20px', border: '1px solid hsl(225, 18%, 90%)' }
const detailRow = { fontSize: '14px', color: 'hsl(224, 50%, 10%)', lineHeight: '1.8', margin: '0' }
const hr = { borderColor: 'hsl(225, 18%, 90%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(224, 12%, 48%)', margin: '0 0 8px' }
