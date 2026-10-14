# Legalhubly v2

Independent Chicago legal marketplace — owned stack on **your** Supabase + Vercel + GitHub.

## Live locally

```bash
cp .env.example .env   # your Supabase project keys only
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Stack

React + TypeScript + Vite · Tailwind · shadcn/ui · **Supabase Pro** · TanStack Query · Vercel

## What’s included

### Public
- Landing, About, Contact, Privacy, Terms
- Find Lawyers + lawyer profiles (Chicago)

### Auth
- Login / Signup with **6-digit OTP**
- Forgot / reset password · Google/Apple OAuth (when enabled)

### Client portal
- Dashboard, Saved lawyers, Messages, Cases, Consultations, Documents, Payments, Profile, Settings

### Lawyer portal
- Dashboard, Leads, Clients, Messages, Cases, Calendar, Billing, Documents, Tools, Settings + public listing editor

### Backend (in repo)
- Supabase migrations (ownership RLS)
- Edge Functions (OTP, email, Stripe, AI agents, matching)

## Security

See [SECURITY.md](./SECURITY.md) for the database ownership model and what was hardened.

## GitHub

https://github.com/surya-tejaN/legalhubly-v2

## Ownership

| Layer | Owner |
|-------|--------|
| App code | This GitHub repo |
| Auth + DB | Supabase project `ubljuduaxtdojaaggqpw` |
| Hosting | Vercel → legalhubly.com |
| Brand assets | `/public/brand` |
