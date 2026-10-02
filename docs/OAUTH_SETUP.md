# OAuth Setup — Content Operations v3

Updated: 2026-10-01

## App host
`https://mami-berlian-content-ops.vercel.app`

## Google OAuth
Purpose: login + server-side access to Register/Bridge (Sheets) and app-owned Drive files/folders.

Redirect URI:
`https://mami-berlian-content-ops.vercel.app/api/auth/callback/google`

Runtime scopes requested by the app:
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`

Security rule: keep `drive.file`; do not broaden to full Google Drive just to access an existing folder. Admin can run **Provision Safe Folders** after login if the existing folders are not writable by the OAuth app.

Google account/test user for staging:
`cvmamiberlian@gmail.com`

Enable Google APIs for the OAuth project:
- Google Sheets API
- Google Drive API

Required Vercel secrets/settings:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://mami-berlian-content-ops.vercel.app/api/auth/callback/google`

## Canva OAuth
Redirect URI:
`https://mami-berlian-content-ops.vercel.app/api/integrations/canva/callback`

Runtime scopes requested by the app:
- `asset:read`
- `asset:write`
- `design:content:read`
- `design:content:write`
- `design:meta:read`

OAuth flow: Authorization Code + PKCE S256. Refresh tokens are rotating and the application stores the latest refresh token encrypted in Neon.

Required Vercel secrets/settings:
- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- `CANVA_REDIRECT_URI=https://mami-berlian-content-ops.vercel.app/api/integrations/canva/callback`

## Shared secret requirements
- `ENCRYPTION_KEY`: base64-encoded 32-byte key (AES-256-GCM key used to encrypt OAuth access/refresh tokens at rest)
- `NEXTAUTH_SECRET`: high-entropy application secret

Never commit any OAuth client secret, database URI, `ENCRYPTION_KEY`, or `NEXTAUTH_SECRET`.
