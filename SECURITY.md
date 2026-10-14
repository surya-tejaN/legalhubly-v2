# Legalhubly — Supabase security upgrade

**Project:** `ubljuduaxtdojaaggqpw` (Legalhubly-owned Supabase Pro)  
**App:** https://www.legalhubly.com · GitHub: `surya-tejaN/legalhubly-v2`

This document is the clear record of the ownership/RLS upgrade. No third-party app builder hosts auth or data for production.

---

## Before → After

| Area | Before (weak) | After (current) |
|------|----------------|-----------------|
| Core tables (`matters`, `consultations`, `payments`, `leads`, …) | `USING (true)` for any logged-in user | Row ownership: `client_user_id = auth.uid()` **or** `lawyer_id = my_lawyer_id()` **or** platform admin |
| Booking identity | Name only | `consultations.client_user_id` required on insert |
| Messages | Could read if you knew IDs | Participant-only via `conversation_participants` |
| Lawyer listings | Open update risk | Owners update only (`lawyers.user_id = auth.uid()`) |
| Intake cases | Anyone authenticated could read/update all | Owner-scoped via `intake_cases.user_id` |
| Reviews | Authenticated insert with no identity | `reviewer_user_id = auth.uid()` |
| OTP codes / email send log | Service-role managed | Still **service_role only** (edge functions) |
| Profiles | Own row + public lawyer view | Unchanged; role escalation blocked by trigger |
| Account delete edge fn | CORS `*` | Origin allowlist (`legalhubly.com`, localhost) |
| OTP edge fn | Success response crash + weak CORS | Fixed status/CORS; anon-key client invoke |

---

## Migrations (apply order)

1. `20261013220000_security_hardening.sql` — role allowlist on signup, privileged column trigger  
2. `20261014150000_ownership_rls_and_booking.sql` — ownership RLS + `apply_signup_role`  
3. `20261014160000_security_upgrade_intake_reviews.sql` — intake + reviews hardening  

Public catalog reads stay open by design: `lawyers`, `cities`, `practice_areas`, `subscription_plans`, review **SELECT**.

---

## Helpers (SECURITY DEFINER)

- `my_lawyer_id()` — lawyer row for `auth.uid()`  
- `is_platform_admin()` — `profiles.role = platform_admin`  
- `is_conversation_participant(conv_id)` — messaging gate  
- `apply_signup_role(requested)` — one-time client→lawyer after OAuth (≤1 hour)

---

## Edge functions JWT

| Function | `verify_jwt` | Notes |
|----------|--------------|--------|
| `verify-email-otp` | false | Signup OTP before session; uses service role server-side |
| `stripe-webhook` / `auth-email-hook` | false | Provider callbacks |
| Most others | true | Requires user JWT |

---

## Disconnect checklist (no builder cloud)

- [x] App env points only at `ubljuduaxtdojaaggqpw.supabase.co`  
- [x] Old project keys file removed locally (`.old-supabase-env.bak`)  
- [x] No builder SDK / telemetry packages in `package.json`  
- [x] Code + migrations live on GitHub  
- [x] Production domain: legalhubly.com on Vercel  

---

## Operator notes

```bash
# Push pending DB migrations
supabase db push --yes

# Redeploy hardened functions
supabase functions deploy verify-email-otp --no-verify-jwt
supabase functions deploy delete-account
```

Never commit `.env`, `.supabase-db-password`, or service-role keys.
