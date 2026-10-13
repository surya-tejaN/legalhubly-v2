import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Legalhubly"

interface BookingConfirmationProps {
  clientName?: string
  lawyerName?: string
  consultationType?: string
  date?: string
  time?: string
  duration?: string
}

const BookingConfirmationEmail = ({
  clientName,
  lawyerName,
  consultationType,
  date,
  time,
  duration,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your consultation with {lawyerName || 'your lawyer'} is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>⚖️ {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {clientName ? `Hi ${clientName},` : 'Consultation Confirmed!'}
        </Heading>

        <Text style={text}>
          Your consultation has been successfully booked. Here are the details:
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}>
            <strong>Lawyer:</strong> {lawyerName || 'TBD'}
          </Text>
          <Text style={detailRow}>
            <strong>Type:</strong> {consultationType || 'Video Call'}
          </Text>
          <Text style={detailRow}>
            <strong>Date:</strong> {date || 'TBD'}
          </Text>
          <Text style={detailRow}>
            <strong>Time:</strong> {time || 'TBD'}
          </Text>
          <Text style={detailRow}>
            <strong>Duration:</strong> {duration || '30 minutes'}
          </Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://legalhubly.com/client/consultations">
            View My Consultations
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          If you need to reschedule, please contact your lawyer through the {SITE_NAME} messaging system.
        </Text>
        <Text style={footer}>
          Best regards, The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Consultation Confirmed${data.lawyerName ? ` with ${data.lawyerName}` : ''} — ${SITE_NAME}`,
  displayName: 'Booking confirmation',
  previewData: {
    clientName: 'Jane',
    lawyerName: 'Sarah Chen',
    consultationType: 'Video Call',
    date: 'Monday, April 7, 2025',
    time: '10:00 AM',
    duration: '30 minutes',
  },
} satisfies TemplateEntry

// Styles — Legalhubly brand: deep navy primary, gold accent
const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '520px', margin: '0 auto' }
const logoBanner = {
  backgroundColor: 'hsl(224, 58%, 12%)',
  padding: '16px 20px',
  borderRadius: '12px 12px 0 0',
  marginBottom: '0',
}
const logoText = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '0',
  textAlign: 'center' as const,
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(224, 50%, 10%)', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(224, 12%, 48%)', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = {
  backgroundColor: 'hsl(225, 25%, 97%)',
  borderRadius: '8px',
  padding: '16px 20px',
  border: '1px solid hsl(225, 18%, 90%)',
}
const detailRow = { fontSize: '14px', color: 'hsl(224, 50%, 10%)', lineHeight: '1.8', margin: '0' }
const button = {
  backgroundColor: 'hsl(42, 78%, 55%)',
  color: 'hsl(224, 58%, 10%)',
  padding: '12px 28px',
  borderRadius: '8px',
  fontWeight: '600' as const,
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: 'hsl(225, 18%, 90%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(224, 12%, 48%)', margin: '0 0 8px' }
