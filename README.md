# Gift Tracker

A phone-first web app (installable PWA) for Christmas shopping: gift ideas for friends and family, per-person and overall budgets, and delivery tracking. Order and shipping emails you forward are read automatically and filed against the right gift.

Built with Next.js 16 (App Router), Supabase (Postgres, auth, row level security), Tailwind CSS 4, Resend inbound email and the Claude API.

## Screens

- **Home**: spent vs overall budget, gifts by status, parcels arriving this week, late deliveries.
- **People**: everyone on your list with a budget bar (amber near the limit, red when over).
- **Person**: their notes, sizes and gifts with status and delivery progress.
- **Add / edit gift**: store, cost, status, tracking number (carrier is detected automatically), expected delivery and tracking link.
- **Inbox**: orders read from forwarded emails. Pick who each one is for and it becomes a gift; shipping updates are applied to existing gifts by tracking number or order number.
- **Settings**: your private forwarding address, Gmail and Outlook filter setup, budgets.

## Set up

1. **Database.** Run `supabase/migrations/20261113000000_init.sql` in your Supabase project (SQL editor, or `supabase db push`). Tables are prefixed `gift_` (plus `gifts`) so the app can share a project with other apps.
2. **Auth.** In Supabase › Authentication › URL Configuration, add `https://<your-app>/auth/callback` to the redirect URLs. Sign-in uses email one-time codes; to show the code in the email (best for the installed app), add `{{ .Token }}` to the Magic Link email template.
3. **Environment.** Copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same variables in Project Settings › Environment Variables.
4. **Email inbox (optional).** In Resend, enable receiving (a `*.resend.app` address works, or a custom domain), add a webhook for `email.received` pointing at `https://<your-app>/api/inbound`, and set `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `INBOUND_EMAIL_DOMAIN` and `ANTHROPIC_API_KEY`. Each user's address is `<their inbox token>@INBOUND_EMAIL_DOMAIN`, shown in Settings.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (carrier detection, budgets, dates)
npm run lint
npm run typecheck
```

## Notes

- Ideas don't count towards spending; a gift counts from **Purchased** onwards.
- A gift is **late** when it's Purchased or Shipped and its expected delivery date has passed (UK time).
- Carrier detection covers Royal Mail, Parcelforce, Evri, DPD, Yodel, UPS, DHL and Amazon Logistics (`src/lib/carriers.ts`).
- Forwarded emails are treated as untrusted. The webhook verifies Resend's signature, and the Claude prompt ignores instructions inside emails.
