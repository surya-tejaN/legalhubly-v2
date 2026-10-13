/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your Legalhubly password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={logoText}>⚖️ Legalhubly</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>We received a request to reset your password. Click the button below to choose a new one.</Text>
        <Section style={btnWrap}><Button style={button} href={confirmationUrl}>Reset Password</Button></Section>
        <Text style={footer}>If you didn't request a password reset, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#162042', fontFamily: "'Playfair Display', Georgia, serif", margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '16px 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#162042', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const btnWrap = { textAlign: 'center' as const, margin: '0 0 28px' }
const button = { backgroundColor: '#c9952b', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
