/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for Legalhubly</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={logoText}>⚖️ Legalhubly</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>You requested to change your email from <Link href={`mailto:${email}`} style={link}>{email}</Link> to <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.</Text>
        <Section style={btnWrap}><Button style={button} href={confirmationUrl}>Confirm Email Change</Button></Section>
        <Text style={footer}>If you didn't request this change, please secure your account immediately.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#162042', fontFamily: "'Playfair Display', Georgia, serif", margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '16px 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#162042', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#c9952b', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '0 0 28px' }
const button = { backgroundColor: '#c9952b', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
