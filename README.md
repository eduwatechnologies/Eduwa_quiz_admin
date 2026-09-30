# Eduwa Admin

Admin dashboard for the Eduwa JAMB practice app: question bank, subjects, students, and ad campaigns. Talks to the `server` Express API.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
```

Build for production with `npm run build && npm start`, lint with `npm run lint`.

## Signing in

The dashboard requires an admin account. Every route redirects to `/signin` when there's no valid session, and `/signin` redirects to the overview once you're in.

1. Create the admin account in the API project:
   ```bash
   cd ../server
   # set ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD in .env
   npm run seed:admin
   ```
2. Start the API (`npm run dev` in `server`), then sign in at `http://localhost:3000/signin` with those credentials and the API base URL (`http://localhost:4000/api` by default).

The API must accept browser requests from this origin — check `CLIENT_ORIGIN` in the server's `.env`.

### How the session works

- `lib/admin-api.ts` stores the access/refresh tokens and API base URL in `localStorage`, so a refresh or client-side navigation keeps you signed in. A 401 triggers one silent refresh, then a hard sign-out if that fails.
- `AuthProvider` (`components/admin/AuthProvider.tsx`) exposes `status` (`loading` / `authenticated` / `anonymous`) plus `signIn` and `signOut`. On boot it validates the stored token against `GET /api/users/me` before trusting it.
- `RequireAuth` wraps every admin page. It renders a blank state while validating, sends anonymous visitors to `/signin`, and renders the page otherwise.
- Sign-out revokes the server session via `POST /api/auth/signout` and clears local storage. The API sends the refresh token in the body and requires the access token as a Bearer header.

## Routes

| Path | Section |
|---|---|
| `/` | Overview — usage metrics, question library, recent activity |
| `/questions` | Question bank with create, edit, delete, and JSON bulk import |
| `/subjects` | Subjects and their topics |
| `/users` | Student accounts — click a row to open the profile |
| `/users/[id]` | One student: stats, token balance, attempts, block/credit actions |
| `/campaigns` | Ad campaigns |
| `/analytics` | Engagement and token revenue |

## Layout

```
app/                     Routes; each admin page is wrapped in RequireAuth
components/admin/        AdminShell (nav), AuthProvider, RequireAuth,
                         SignInPanel, AdminUI (tables, modal, user detail),
                         AdminWorkspace (sections + mutations)
lib/admin-api.ts         Typed API client, session storage, token refresh
```
# Eduwa_quiz_admin
