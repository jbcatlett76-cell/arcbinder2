# ArcBinder

ArcBinder is a full-stack author workspace for planning books, importing outlines, organizing chapters/scenes/beats, generating prose with the author's preferred AI provider, maintaining a story bible, reviewing manuscript progress, and exporting the finished work.

This repository is the clean rebuild requested for ArcBinder. It is not a modification of the earlier site.

## What works in this build

- Public ArcBinder landing page
- Protected author dashboard
- Google OAuth and passwordless email login through Supabase
- Local demo mode when Supabase is not configured
- Cloud project persistence with Supabase Row Level Security
- New project creation and archive filtering
- ArcBinder JSON project backup import and export
- DOCX, Markdown, text, and printable PDF exports
- DOCX, text, and Markdown outline imports
- Deterministic outline detection
- Optional AI outline structuring
- Editable chapter, scene, and beat hierarchy
- Manuscript editor with automatic saving
- Scene summaries, POV, location, status, notes, and word targets
- Story-bible records and AI extraction from the outline
- AI prose generation from scene beats
- Review-before-insert AI workflow
- OpenAI, Anthropic, Gemini, xAI, OpenRouter, and custom OpenAI-compatible endpoints
- Project word counts, chapter balance, structural warnings, and phrase repetition review
- Responsive desktop, tablet, and mobile layouts
- Cloudflare Pages Function that protects AI requests from direct browser-to-provider calls

## Current boundary

This is the first production-capable ArcBinder milestone, not the final implementation of every feature in the complete product specification. The core workflow is implemented:

**project → outline import → chapters → scenes → beats → AI prose → manuscript review → export**

The next development milestones are rich-text formatting, revision snapshots, timeline and card-board views, collaboration, deeper continuity analysis, series bibles, subscriptions, and the complete PageBinder layout studio.

## Local development

Requirements:

- Node.js 22 or newer
- npm 10 or newer

Install and run the browser application:

```bash
npm install
npm run dev
```

Without Supabase environment variables, ArcBinder automatically starts in local demo mode. Projects are saved in that browser.

The AI proxy is a Cloudflare Pages Function. To test both the built application and the function locally:

```bash
npm run dev:pages
```

Wrangler will display the local Pages URL. Open that address instead of the normal Vite address when testing AI generation.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase-schema.sql`.
4. Open **Authentication → URL Configuration**.
5. Set the production Site URL to your ArcBinder domain.
6. Add these redirect URLs:
   - `http://localhost:5173/auth/callback`
   - Your production domain followed by `/auth/callback`
7. Enable the Google provider under **Authentication → Providers** if Google login is desired.
8. Copy `.env.example` to `.env.local` and enter your values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The browser receives only the public Supabase anonymous key. Row Level Security ensures users can access only their own project rows.

## Google OAuth setup

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Web Application credential.
4. Add the Supabase callback URL shown in the Supabase Google provider settings as an authorized redirect URI.
5. Paste the Google Client ID and Client Secret into Supabase.

ArcBinder sends users to `/auth/callback`, then redirects authenticated users into `/app`.

## Cloudflare Pages deployment

### Through the Cloudflare dashboard

Use these settings:

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: `22`

Add these environment variables to both Preview and Production:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
AI_PROXY_ALLOWED_ORIGIN
```

Set `AI_PROXY_ALLOWED_ORIGIN` to the exact public ArcBinder origin, such as `https://arcbinder.app`. It limits which website may call the AI proxy.

The `functions/api/ai.ts` file is automatically deployed as `/api/ai` by Cloudflare Pages.

### If Cloudflare fails during `npm clean-install`

That message is an npm installer failure and occurs before ArcBinder's build command runs. This repository includes a public-registry lockfile, `.npmrc`, and a fallback Cloudflare build script.

First, clear the Pages build cache and redeploy with the normal settings above. If the same npm error returns:

1. Open **Workers & Pages → ArcBinder → Settings → Environment variables**.
2. Add `SKIP_DEPENDENCY_INSTALL` with the value `true` for Production and Preview.
3. Open **Build & deployments → Build configurations**.
4. Change the build command to `bash build-cloudflare.sh`.
5. Keep the output directory as `dist`.
6. Save, clear the build cache, and redeploy.

Cloudflare officially supports `SKIP_DEPENDENCY_INSTALL` for replacing its automatic dependency-install step with a custom command.

### Through Wrangler

Authenticate Wrangler, then run:

```bash
npm run deploy
```

## AI connection security

The user enters their provider API key inside ArcBinder. In this milestone:

- The key is stored only in `sessionStorage`.
- Closing the browser session removes it.
- The key is not placed in project backups.
- The key is sent to the Cloudflare Pages Function only when a generation request is made.
- The function forwards the request to the selected provider and returns the generated text.
- ArcBinder never silently inserts generated text. The author reviews, edits, accepts, appends, or rejects it first.

A later commercial milestone can add encrypted server-side provider-key storage using a dedicated secrets vault.

## Supported AI providers

- OpenAI
- Anthropic
- Google Gemini
- xAI
- OpenRouter
- Custom OpenAI-compatible HTTPS endpoints

Model names remain editable because provider model catalogs change frequently.

## Verification commands

```bash
npm test
npm run lint
npm run build
```

The current source passes all three commands.

## Important files

- `src/pages/WorkspacePage.tsx` — connected Plan, Write, Story Bible, Review, and Publish workspaces
- `src/lib/outlineParser.ts` — deterministic outline-to-chapter/scene/beat conversion
- `src/lib/ai.ts` — project-aware AI request construction
- `functions/api/ai.ts` — Cloudflare AI provider proxy
- `src/context/AppContext.tsx` — local and Supabase project persistence
- `supabase-schema.sql` — production database table and Row Level Security policies
- `.env.example` — required browser environment variables
- `public/_redirects` — single-page application route handling

## PageBinder

The Publish section already exports real files and contains the PageBinder integration point. The full layout studio remains a separate next-stage implementation, including trim sizes, gutters, mirrored margins, front matter, headers, page numbers, EPUB creation, and print-ready PDF validation.
