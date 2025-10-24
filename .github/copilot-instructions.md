## Quick orientation — what this repo is

- Full‑stack budgeting demo: React + Vite frontend (`frontend/`) and Node.js (Express) backend (`backend/`).
- Frontend dev server: http://localhost:5173 (Vite). Backend API: http://localhost:3000 (Express).

## Architecture & critical flow (read before changing code)

- Authentication: short‑lived access tokens (15m) + refresh tokens (1d).
  - Access token: kept only in memory on the frontend (see `frontend/context/AuthContext.tsx`).
  - Refresh token: httpOnly cookie and stored in the DB (`user.refresh_token`). Backend endpoints rely on it.
  - When the backend refreshes an access token it responds with JSON: `{ accessToken: "<token>", message: "retry request" }` — client must update in‑memory token and retry the call.

- CORS and cookies: backend enables CORS for `http://localhost:5173` and uses `credentials: true` — Axios requests must use `withCredentials: true` (see `frontend/src/api_requests/*`).

- API boundaries:
  - Unprotected: `/users` routes (login/register/session/logout).
  - Protected: middleware `backend/middleware/authenticateToken.js` is applied and then `/items` and `/categorys` routes.

## Repo conventions & gotchas (do not change without updating both sides)

- Route name quirk: the categories route is spelled `/categorys` in server and client — keep consistent if renaming.
- Some server endpoints expect payload in the request `body` even for GET (e.g., `GET /categorys/category` reads `req.body`); client uses `axios.request({ method: 'GET', data })` for this case.
- SQL schema name is used literally in some DB modules (the code expects `bank_app`). If you rename the schema, update `backend/db/*.js` and any raw SQL strings.
- Access token lifecycle: frontend stores only in memory and updates via `AuthContext.updateAccessTokenMem`. When you modify the refresh flow, update client logic in `frontend/src/api_requests/*` and `AuthContext` accordingly.

## Files to inspect for context and examples

- Authentication and token refresh: `backend/middleware/authenticateToken.js`, `backend/controllers/token.js`, `backend/routes/users.js`, `backend/db/userDB.js`.
- DB helpers: `backend/db/itemDB.js`, `backend/db/categoryDB.js`, `backend/db/userDB.js` — many queries assume `bank_app` schema shape from `bank_app.sql`.
- Client request patterns: `frontend/src/api_requests/users.tsx`, `frontend/src/api_requests/items.tsx`, `frontend/src/api_requests/category.tsx` (all use an axios instance with `withCredentials: true`).
- Frontend auth orchestration: `frontend/context/AuthContext.tsx` — this is the single source of truth for user + in‑memory access token.

## Helpful examples (copy/paste-safe)

- Axios instance (used across `src/api_requests`):

```js
const api = axios.create({ baseURL: 'http://localhost:3000', withCredentials: true });
```

- Client should set Authorization header when an access token exists:

```js
const headers = auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {};
await api.get('/items/item', { headers, params });
// If response.data.accessToken exists update AuthContext then retry the original call.
```

## Developer workflows & commands

- Backend (Node 18+, uses ES modules):
  - cd backend
  - copy `backend.env.example` → `.env` and fill MySQL & JWT secrets
  - npm install
  - npm run dev (uses `nodemon`) or npm start

- Frontend (Vite + TypeScript):
  - cd frontend
  - npm install
  - npm run dev (Vite dev server)

- DB: import `bank_app.sql` into your MySQL server (the code assumes schema/tables exist).

## When editing APIs or schema — checklist

1. Update backend route(s) in `backend/routes/*`.
2. Update any DB helper in `backend/db/*` (check for hard‑coded schema names).
3. Update client calls in `frontend/src/api_requests/*` (headers, withCredentials, expected response shape).
4. If auth behavior changes (token format/expiry), update `authenticateToken.js` and `AuthContext.tsx` in tandem.

## Quick debugging tips

- If session refresh fails: check cookies sent by the browser (httpOnly cookie `refreshToken`) and console logs from `authenticateToken.js` (it logs token and refresh attempts).
- If category requests return empty: remember `GET /categorys/category` is called with `data` not `params`.
- If SQL errors mention `bank_app`: confirm you created/imported `bank_app.sql` into your MySQL instance and `.env` database name matches.

## If something is missing

- Ask for the intended change and include: the route/file to change, new request/response shapes, and whether DB schema must change. Provide a small API contract example for the change.

---
Small, targeted guidance so an AI coding assistant can make safe, repository‑specific edits quickly. If you'd like, I can (a) add a short section with examples for common PRs (auth fixes, add item/category route), or (b) open a PR draft that updates client/server when renaming `categorys` → `categories`.
