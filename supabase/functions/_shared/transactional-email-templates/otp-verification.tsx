import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Legalhubly"

interface OtpVerificationProps {
  code?: string
}

const OtpVerificationEmail = ({ code = '000000' }: OtpVerificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} verification code: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>⚖️ {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Verify Your Email</Heading>

        <Text style={text}>
          Use the code below to verify your email address and complete your registration.
        </Text>

        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>

        <Text style={expiryText}>
          This code expires in 10 minutes.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          If you didn't create a {SITE_NAME} account, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OtpVerificationEmail,
  subject: `Your ${SITE_NAME} Verification Code`,
  displayName: 'Email verification OTP',
  previewData: { code: '847291' },
} satisfies TemplateEntry

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
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(224, 50%, 10%)', margin: '24px 0 12px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: 'hsl(224, 12%, 48%)', lineHeight: '1.6', margin: '0 0 16px', textAlign: 'center' as const }
const codeBox = {
  backgroundColor: 'hsl(225, 25%, 97%)',
  borderRadius: '12px',
  padding: '24px',
  border: '2px solid hsl(42, 78%, 55%)',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const codeText = {
  fontSize: '36px',
  fontWeight: '800' as const,
  color: 'hsl(224, 58%, 12%)',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: "'Plus Jakarta Sans', monospace",
}
const expiryText = { fontSize: '13px', color: 'hsl(224, 12%, 48%)', textAlign: 'center' as const, margin: '0 0 16px' }
const hr = { borderColor: 'hsl(225, 18%, 90%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(224, 12%, 48%)', margin: '0 0 8px' }
