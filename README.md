# AfroVibez

AfroVibez listener app (Next.js) and AfroVibe Studio share the dedicated **Afrovibez** Supabase backend. This project is isolated from Elite Connectere's campaign database.

## Supabase production configuration

Set these Vercel environment variables on the listener app project for Production, Preview and Development:

- `NEXT_PUBLIC_SUPABASE_URL=https://mjidrcyjpldhsywpqzxt.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the new project's publishable/legacy anon key (never use a service-role key in browser code).

Studio uses the same Supabase project and its public anon key in `Afrovibez-studio/app.js`. Its private audio and artwork buckets are `studio-audio` and `studio-artwork`.

## Database

The isolated project has the Studio artist/release tables, listener follows/comments/reactions, notifications, stream analytics, RPCs, RLS, and private media buckets. Public API access is limited to approved catalogue fields and public artist profile/follower-count views. Never commit a Supabase service-role key.

Enable **Anonymous Sign-Ins** in Supabase Auth for the listener app's first-run anonymous listener session. Artists create accounts in Studio with email/password. Provision the first Studio administrator by setting `studio_profiles.role='admin'` for that user's Auth UUID through the trusted Supabase SQL editor after the account is created.

Studio release validation supports Single releases only until multi-track release support is implemented.
