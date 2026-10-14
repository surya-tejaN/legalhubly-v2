# Legalhubly v2 — Full Site Audit

Deep research of client portal, lawyer portal, auth, booking, chat, and security.

**Status:** P0/P1 fixes implemented in code + migration `20261014150000_ownership_rls_and_booking.sql` (apply to Supabase).

---

## Fixed (this pass)

| # | Issue | Fix |
|---|--------|-----|
| 1–2 | Open RLS + unscoped queries | Ownership RLS migration; portal queries filter by `client_user_id` / `lawyer_id` |
| 3 | Bookings lack `client_user_id` | Column + BookConsultationDialog insert |
| 4 | Admin redirect loop | `useDashboardPath` → `/firm/dashboard` / `/admin/dashboard` |
| 5 | OTP generate spam | Block generate when email already verified |
| 6 | Account delete false success | Check invoke error before toast/signOut |
| 7 | `delete-account` CORS `*` | Shared `corsHeadersFor` + origin allowlist |
| 9–10 | Message CTA / start chat | `getOrCreateDirectConversation` + LawyerProfile → `?c=` |
| 12 | Lawyer listing editor | Settings → Public listing tab |
| 13 | OAuth ignores lawyer role | `apply_signup_role` RPC + localStorage intended role |
| 14 | Login profile race | Wait for profile before Navigate |
| 15 | Reset password any session | Only recovery link / `PASSWORD_RECOVERY` |
| 16 | Footer dead `#` links | `/about`, `/privacy`, `/terms`, `/contact` |
| 19 | Missing `Scale` import | Fixed in DashboardLayout |
| 20 | Fake header search | Navigates to `/client/find-lawyers?q=` |
| 23 | Revenue hard-coded `$0` | Sum paid payments for lawyer |

## Still open (P1/P2)

| # | Issue |
|---|--------|
| 8 | Synthetic booking slots (not real calendar) |
| 11 | Cancel/reschedule / meeting link |
| 17–18 | Firm/admin Coming Soon; client Profile vs Settings dup |
| 21–22 | IA duplication; unused Stripe/match edge fns |
| 24–38 | Support chat, polish, feature flags, etc. |

---

See [SECURITY.md](./SECURITY.md) for the full ownership model. Migrations through `20261014160000_*` should be applied on the Legalhubly Supabase project.
