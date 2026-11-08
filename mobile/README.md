# Legalhubly iOS / Android app

Same product as [www.legalhubly.com](https://www.legalhubly.com): Chicago lawyers, Match Coach, and your existing Supabase account.

## Stack (built for 100k+ users)

- **Expo SDK 58** + React Native 0.88 (New Architecture) — one codebase, iPhone + Android
- **Expo Router** — file-based screens
- **Supabase** — same project as the website (auth, lawyers, saved list, Match Coach)
- **TanStack Query** — cached, paginated directory (40 lawyers per page)
- **FlashList** — smooth scrolling as the directory grows
- **EAS Build** — TestFlight / Play Store without local Xcode headaches

NativeWind is intentionally not used yet: it is not stable on Expo 58. Brand colors match the website (navy + gold).

## Run on your phone

1. Copy env (same public keys as the website):

```bash
cp .env.example .env
# paste VITE_SUPABASE_URL → EXPO_PUBLIC_SUPABASE_URL
# paste VITE_SUPABASE_PUBLISHABLE_KEY → EXPO_PUBLIC_SUPABASE_ANON_KEY
```

2. Start Expo:

```bash
cd mobile
npm start
```

3. Scan the QR code with **Expo Go** (Android) or the Camera app (iPhone, Expo Go installed).

## What’s in v1

- Sign in / sign up with the same 6-digit email code as the website
- Forgot password (reset link opens the website)
- Chicago lawyer directory with practice-area chips + search + infinite scroll
- Lawyer profile, save/unsave, visit website, Message
- In-app inbox + chat thread (same conversations as the website)
- Match Coach (same `client-support` function as the site)
- Offline banner + pull-to-refresh

## Next (not in this drop)

- Push notifications (new message / new lead)
- Stripe booking when `clientBooking` is on
- TestFlight + Play Console via `eas build` (`npx eas-cli login` + Apple Developer $99)
