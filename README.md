# Bank Website

A full-stack budgeting dashboard built with React (Vite) on the frontend and Node.js/Express on the backend. Users register, manage goal-based "items" inside categories, and move balances between them. MySQL stores authentication data, categories, items, and transfer results.

---

## Product Concept: Mini-Accounts Budgeting
The app treats every purchase goal as its own "mini account" so you can earmark money without opening extra bank accounts. Your login creates:

- **Account:** the user profile accessed via email and password.
- **Categories:** high-level buckets such as Travel, Bills, Gear, or Emergencies.
- **Items (mini accounts):** individual goals inside categories (Spain trip, Rent, New Laptop). Each item tracks its desired cost plus the balance you have already set aside.
- **Spontaneous balance:** any money not assigned to an item remains available for ad-hoc spending.

### Current Workflow
- Register or log in; the backend creates a seeded "Main Account" item with 5000 units for starters.
- Create categories to mirror the areas of life you budget for.
- Add items to represent upcoming purchases or savings targets, with optional `cost` and `description` fields.
- Move money between items using the transfer API, keeping balances in sync without touching the database manually.
- Use the frontend pages to review totals by category and drill into the items that make up each bucket.

### Longer-Term Vision
- **Auto allocation:** when new money arrives, percentages or "fill first" rules top up priority items automatically.
- **Timing nudges:** add "no earlier than" or suggested purchase dates so the app surfaces when a goal is ready.
- **Priority ladders:** enforce a global or per-category order that redistributes funds when an item reaches its goal.
- **External accounts:** connect read-only bank data so the real checking balance drives what is available for envelopes.
- **Redistribution flows:** when categories or items are deleted, choose whether balances funnel to the main account or reallocate according to saved rules.
- **Income planning:** store job and wage details to project when goals will be met and surface what-if scenarios.

This vision keeps the README aligned with the project’s future direction while the repository delivers the working CRUD, authentication, and transfer backbone today.

---

## Project Structure
- `backend/` - Express API (`index.js`) with routes under `routes/`, database helpers in `db/`, token utilities in `controllers/token.js`, and auth middleware in `middleware/authenticateToken.js`.
- `frontend/` - React + Vite app. Screens live in `src/pages`, shared auth context in `context/AuthContext.tsx`, and Axios API clients in `src/api_requests/`.
- `bank_app.sql` - MySQL schema dump used by the project.
- `backend.env.example` - Template for backend environment variables.

## Implemented Features
- Email/password registration, login, logout, and session checks backed by bcrypt hashing and JWTs.
- Access tokens (15 minutes) issued in responses; refresh tokens (1 day) stored in MySQL and sent as httpOnly cookies.
- Protected category and item routes enforced by `authenticateToken`.
- Automatic creation of a "Main Account" item seeded with a 5000 balance for every new user.
- Transfers between items handled with a single SQL update to keep balances in sync.
- React app with persistent session restoration, protected routes, and Axios hooks for users, items, and categories.

## Planned Features
- Automatic allocation rules and percentage-based budgeting.
- External bank account integrations and investment tracking.
- Priority scheduling, "no earlier than" reminders, and wage projections.
- Redistribution flows when deleting categories or items.
- Better handling for deletions when balances remain.

## Tech Stack
- **Backend:** Node.js 18+, Express, MySQL (`mysql2`), bcrypt, jsonwebtoken, dotenv, cookie-parser, cors, nodemon.
- **Frontend:** React 18, TypeScript, Vite, React Router, Axios, ESLint, Prettier.

## Getting Started

### Prerequisites
- Node.js 18 or newer.
- MySQL 8 (with a user that can create/use a `bank_app` schema).

### Backend Setup
1. `cd backend`
2. Copy `backend.env.example` to `.env` and fill in MySQL credentials plus JWT secrets.
3. `npm install`
4. `npm run dev` (or `npm start`) - listens on `http://localhost:3000`.

CORS currently allows `http://localhost:5173` and sends credentials so cookies reach the browser.

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open http://localhost:5173 (Vite dev server).

### Database Setup
```bash
mysql -u <user> -p < bank_app.sql
```
`db/itemDB.js` references `UPDATE bank_app.item ...`, so keep the schema name as `bank_app` unless you update the code.

## Authentication Flow
- `generateAccessToken` signs user payloads with `ACCESS_TOKEN` and expires in 15 minutes.
- `generateRefreshToken` signs with `REFRESH_TOKEN`, expires in 1 day, stores the token in `user.refresh_token`, and returns it as an httpOnly cookie.
- All protected routes pass through `authenticateToken`. When the access token has expired but the refresh token is valid, the middleware responds with `{ accessToken: "<new token>", message: "retry request" }`. The frontend (`AuthContext` and Axios hooks) checks for `response.data.accessToken` and updates the in-memory token before retrying the call.
- Logout clears the stored refresh token in the database (`removeRefreshTokenDB`) and removes the cookie.

Key files: `backend/index.js`, `backend/routes/users.js`, `backend/routes/items.js`, `backend/routes/category.js`, `backend/middleware/authenticateToken.js`, `backend/controllers/token.js`, `backend/db/*.js`, `frontend/context/AuthContext.tsx`, `frontend/src/api_requests/*.tsx`.

## API Reference

### Users (`/users`)
- `POST /users/register`
  ```json
  { "user": { "email": "demo@example.com", "password": "secret", "f_name": "Demo", "l_name": "User" } }
  ```
- `POST /users/login`
  ```json
  { "user": { "email": "demo@example.com", "password": "secret" } }
  ```
- `POST /users/logout` - clears the refresh token in DB and cookie.
- `GET /users/session` - returns the decoded refresh token payload when a session is active.

### Items (`/items`)
Protected by `authenticateToken`. Include `Authorization: Bearer <accessToken>` and ensure the refresh-token cookie is sent (`withCredentials: true` in Axios).

- `GET /items/item` - optional query params:
  - `type`: one of `item_id`, `name`, `description`, `cost`, `balance`, `category_id`, `user_id`.
  - `value`: string or numeric, depending on `type`.
  Examples:
  - `GET /items/item` - returns all items for the authenticated user.
  - `GET /items/item?type=name&value=Checking`
- `POST /items/item`
  ```json
  { "name": "New Account", "description": "Optional", "cost": 500, "category_id": 2 }
  ```
  The backend sets `balance` to 0.
- `PUT /items/item`
  ```json
  { "item_id": 3, "name": "Updated", "cost": 450, "balance": 200, "category_id": 2 }
  ```
- `DELETE /items/item`
  ```json
  { "item_id": 3 }
  ```

### Transfers
- `PUT /items/transfer`
  ```json
  { "item_id1": 3, "item_id2": 4, "amount": 125.5 }
  ```
  Subtracts from `item_id1`, adds to `item_id2` in a single SQL call.

### Categories (`/categorys`)
Route names match the backend code (`/categorys/category`). Changing them requires updating both server and client.

- `GET /categorys/category` - expects the request body to optionally include `{ "category_id": 5 }`. The frontend sends this using Axios `data` even though it is a GET request.
- `POST /categorys/category`
  ```json
  { "name": "Travel", "description": "Trips and experiences" }
  ```
- `PUT /categorys/category`
  ```json
  { "category_id": 5, "name": "Travel", "description": "Updated" }
  ```
- `DELETE /categorys/category`
  ```json
  { "category_id": 5, "options": { "redistribute": "main" } }
  ```
  `options` is reserved for future redistribution logic.

## Database Schema
See `bank_app.sql` for the authoritative definition. Summary:
- `user` - `user_id`, `email` (unique), `password` (bcrypt hash), `f_name`, `l_name`, `refresh_token`.
- `category` - `category_id`, `name` (45 chars), `description` (200 chars), `user_id` (FK, cascade delete).
- `item` - `item_id`, `name` (45 chars), `description`, `cost` (double), `balance` (double, default 0), `category_id` (FK), `user_id` (FK).

During registration the backend creates a `Main Account` item with a starting balance of 5000 for the new `user_id`.

## Frontend Overview
- `context/AuthContext.tsx` manages the signed-in user, in-memory access token, and session refresh logic.
- `src/pages/` holds feature screens: `Home.tsx`, `CategoryPage.tsx`, `AccountsPage.tsx`, `AuthPage.tsx`, `About.tsx`.
- `src/api_requests/` centralizes Axios calls for users (`users.tsx`), items (`items.tsx`), and categories (`category.tsx`), including token refresh handling.
- `App.tsx` wires routing with React Router and renders pages based on auth state.

## Quick Seed
```sql
USE bank_app;

INSERT INTO user (email, password, f_name, l_name)
VALUES ('demo@example.com', '<bcrypt-hash>', 'Demo', 'User');

INSERT INTO category (name, description, user_id)
VALUES ('Main', 'Primary spending', 1),
       ('Savings', 'Emergency fund', 1);

INSERT INTO item (name, description, cost, balance, category_id, user_id)
VALUES ('Checking', 'Everyday spending', NULL, 1200, 1, 1),
       ('Emergency Fund', '6 months of expenses', 5000, 3500, 2, 1);
```
Generate the bcrypt hash through the app (registration) or a separate script to ensure it matches the expected 60-character format.

## Notes & Gotchas
- The `/categorys` spelling is intentional; update every reference if you change it.
- `GET /categorys/category` reads from `req.body`, so Axios calls must supply payload via the `data` property.
- Item transfers rely on the schema name `bank_app` in SQL (`db/itemDB.js`).
- The backend runs as an ES module project (`"type": "module"`); use Node 18+.
- CORS currently allows only `http://localhost:5173`.

## Author
Derek Sykes
