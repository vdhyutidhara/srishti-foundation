# Sristi Dashboard

Internal dashboard built with Next.js 16 and SQL Server-backed API routes.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Required Environment Variables

Set these variables in local `.env.local` and in your Vercel project settings:

- `DB_HOST`
- `DB_PORT` (default `1433`)
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_ENCRYPT` (`true` or `false`)

## Deploy to Vercel

1. Import this repository in Vercel.
2. In Vercel Project Settings -> Environment Variables, add all variables from `.env.example`.
3. Deploy (build command: `npm run build`, output: Next.js default).
4. After deployment, verify backend connectivity via `GET /api/health`.

## Pre-Deploy Verification

Run the same checks Vercel runs:

```bash
npm run build
```

If build passes and the environment variables are configured, the app is ready to deploy.
