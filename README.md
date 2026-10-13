# Legalhubly v2

Clean rewrite of Legalhubly — **same UI**, **no Lovable**, production-ready foundation.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn-style UI
- Supabase (connect later via `.env`)
- TanStack Query + React Router

## Phase 1 (this repo now)

- Landing page
- Auth (login / signup with OTP UI / forgot / reset)
- Find Lawyers + lawyer profile

## Getting started

```bash
cp .env.example .env
# Fill Supabase values when ready

npm install
npm run dev
```

## Connect Supabase later

1. Create/use your Supabase project  
2. Put URL + anon key in `.env`  
3. Apply migrations from the previous project (or recreate schema)  
4. Deploy Edge Functions (`verify-email-otp`, email sender)

## Old repo

`legal-aid-smart` / `legalhubly` on GitHub stays as reference. This is the clean path forward.
