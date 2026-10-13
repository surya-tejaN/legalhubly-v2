/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Legalhubly verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={logoText}>⚖️ Legalhubly</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>This code will expire shortly. If you didn't request this, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#162042', fontFamily: "'Playfair Display', Georgia, serif", margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '16px 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#162042', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#162042', margin: '0 0 28px', textAlign: 'center' as const, letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
