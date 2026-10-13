# Legalhubly v2

Clean rewrite of Legalhubly — **same UI + advanced features**, **zero Lovable**.

## Live locally

```bash
cp .env.example .env   # or use your Supabase keys
npm install
npm run dev
```

Open http://127.0.0.1:5173

## What’s included

### Public
- Landing, About, Contact, Privacy, Terms
- Find Lawyers + lawyer profiles

### Auth
- Login / Signup with **6-digit OTP**
- Forgot / reset password

### Client portal
- Dashboard, Saved lawyers, Messages, Cases, Consultations, Documents, Payments, Profile, Settings

### Lawyer portal
- Dashboard, Leads, Clients, Messages, Cases, Calendar, Billing, Documents, Tools, Settings

### Backend (in repo)
- Supabase migrations
- Edge Functions (OTP, email, Stripe, AI agents, matching)

## Stack

React + TypeScript + Vite · Tailwind · shadcn/ui · Supabase · TanStack Query

## GitHub

https://github.com/surya-tejaN/legalhubly-v2
