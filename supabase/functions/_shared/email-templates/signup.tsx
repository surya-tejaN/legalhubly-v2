/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Verify your Legalhubly account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={logoText}>⚖️ Legalhubly</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>Verify your email</Heading>
        <Text style={text}>
          Welcome to <Link href={siteUrl} style={link}><strong>Legalhubly</strong></Link>! Please confirm your email address (<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) to get started.
        </Text>
        <Section style={btnWrap}><Button style={button} href={confirmationUrl}>Verify Email</Button></Section>
        <Text style={footer}>If you didn't create an account, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
