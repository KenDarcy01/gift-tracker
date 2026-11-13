# Gift Tracker

A phone-first web app (installable PWA) for Christmas shopping: gift ideas for friends and family, per-person and overall budgets, and delivery tracking. Order and shipping emails you forward are read automatically and filed against the right gift.

Built with Next.js 16 (App Router, static export), Supabase (Postgres, auth, row level security, Edge Functions), Tailwind CSS 4, Resend inbound email and the Claude API. It's hosted on GitHub Pages: the site is plain files, the browser talks to Supabase directly, and row level security keeps each person's data private.

## Screens

- **Home**: spent vs overall budget, gifts by status, parcels arriving this week, late deliveries.
- **People**: everyone on your list with a budget bar (amber near the limit, red when over).
- **Person**: their notes, sizes and gifts with status and delivery progress.
- **Add / edit gift**: store, cost, status, tracking number (carrier is detected automatically), expected delivery and tracking link.
- **Inbox**: orders read from forwarded emails. Pick who each one is for and it becomes a gift; shipping updates are applied to existing gifts by tracking number or order number.
- **Settings**: your private forwarding address, Gmail and Outlook filter setup, budgets.

## Set up

1. **Database.** Run the files in `supabase/migrations/` in order in your Supabase project (SQL editor, or `supabase db push`). Tables are prefixed `gift_` (plus `gifts`) so the app can share a project with other apps.
2. **Auth.** In Supabase › Authentication › URL Configuration, add `https://<user>.github.io/<repo>/auth/callback/` (and `http://localhost:3000/auth/callback/` for development) to the redirect URLs. Sign-in uses email one-time codes; to show the code in the email (best for the installed app), add `{{ .Token }}` to the Magic Link email template.
3. **GitHub Pages.** In the repo's Settings › Pages, set the source to **GitHub Actions**. In Settings › Secrets and variables › Actions › **Variables**, you can add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to point at a different project (the workflow defaults to the shared Family Quiz project), and `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN` once email is set up. These are public values; the publishable key is safe in the browser because of row level security. Every push to `main` runs `.github/workflows/deploy.yml`, which checks, builds and publishes the site.
4. **Email inbox (optional).** Emails are read by the `gift-inbound` Supabase Edge Function.
   - Deploy it: `supabase functions deploy gift-inbound --no-verify-jwt` (Resend signs each request, so Supabase's JWT check is off).
   - Set its secrets: `supabase secrets set RESEND_API_KEY=re_... RESEND_WEBHOOK_SECRET=whsec_... INBOUND_EMAIL_DOMAIN=<id>.resend.app ANTHROPIC_API_KEY=sk-ant-...`
   - In Resend, enable receiving (a `*.resend.app` address works, or a custom domain) and add a webhook for `email.received` pointing at `https://<project-ref>.supabase.co/functions/v1/gift-inbound`.
   - Each user's address is `<their inbox token>@<receiving domain>`, shown in Settings.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (carrier detection, budgets, dates)
npm run lint
npm run typecheck
npm run build      # static site in out/

# Edge Function (needs Deno, or use `npx deno`)
cd supabase/functions/gift-inbound && deno test && deno check index.ts
```

## Notes

- Ideas don't count towards spending; a gift counts from **Purchased** onwards.
- A gift is **late** when it's Purchased or Shipped and its expected delivery date has passed (UK time).
- Carrier detection covers Royal Mail, Parcelforce, Evri, DPD, Yodel, UPS, DHL and Amazon Logistics (`supabase/functions/_shared/carriers.ts`, shared by the app and the Edge Function).
- Forwarded emails are treated as untrusted. The Edge Function verifies Resend's signature, and the Claude prompt ignores instructions inside emails.
