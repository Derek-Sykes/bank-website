# 💸 Bank Website

A full‑stack personal finance dashboard (frontend: React/Vite; backend: Node/Express + MySQL). Users can sign up, log in, manage categories and accounts (“items”), and transfer funds between accounts.

> **Repo layout**
>
> - `frontend/` – React + Vite app (defaults to `http://localhost:5173`)
> - `backend/` – Express API (hard‑coded to run on port **3000**)

---

## 🛠 Tech Stack (from `backend/package.json`)
- **Node.js (ES modules)** + **Express**
- **mysql2** for database access
- **dotenv** for env configuration
- **bcrypt** for password hashing
- **jsonwebtoken** for JWTs
- **cookie-parser**
- **cors**

---

## 🚦 Run It

### 1) Backend
```bash
cd backend
npm install
npm run dev   # or: npm start
```
- The API listens on **http://localhost:3000** (port is hard‑coded in `backend/index.js`).
- CORS is configured to allow the frontend origin `http://localhost:5173` and to send credentials (cookies/headers).

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
- Vite dev server defaults to **http://localhost:5173**.

---

## 🔐 Auth Model (as implemented)
- **Access Token**: short‑lived (~15 minutes) – signed using `ACCESS_TOKEN` secret.
- **Refresh Token**: longer‑lived (~1 day) – signed using `REFRESH_TOKEN` secret and **stored in the DB** (see `controllers/token.js` and `middleware/authenticateToken.js`).

The backend mounts routes like this (from `backend/index.js`):

- `app.use("/users", userRoutes)` – **unprotected** (login/register/etc.).
- `app.use(authenticateToken)` – middleware; routes **below** this require a valid access token (or a valid refresh flow).
- `app.use("/items", itemRoutes)` – protected.
- `app.use("/categorys", categoryRoutes)` – protected (**note the spelling `categorys`**).

The frontend Axios instances point to `http://localhost:3000` with `withCredentials: true`.

---

## ⚙️ Environment Variables (required by backend)
Create a `.env` file in **`backend/`** with the following keys:

```
# MySQL connection
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password

# IMPORTANT: Because some queries fully-qualify the schema (e.g., UPDATE bank_app.item),
# the database MUST be named 'bank_app' unless you modify those queries.
MYSQL_DATABASE=bank_app

# JWT secrets
ACCESS_TOKEN=your_access_token_secret
REFRESH_TOKEN=your_refresh_token_secret
```

> The code uses `dotenv` to load these. The backend’s port is **fixed to 3000** in code (not read from env).

---

## 🗄️ Database Requirements (MySQL)

The backend uses **MySQL** via `mysql2`. Pool creation reads `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. **One query references the schema `bank_app` explicitly** (`UPDATE bank_app.item ...` in `db/itemDB.js`), so—**to run unmodified—you must name your DB `bank_app`**.

Below is a DDL that matches the routes and queries found in `db/*.js` and the frontend usage (items, categories, users, and transfers). You can run this script in MySQL Workbench or the CLI:

```sql
-- Create schema
CREATE DATABASE IF NOT EXISTS bank_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bank_app;

-- Users table (table name is `user` in code)
-- Note: `user` is a reserved keyword; we use backticks.
CREATE TABLE IF NOT EXISTS `user` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  f_name VARCHAR(100) NULL,
  l_name VARCHAR(100) NULL,
  refresh_token VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categories owned by a user
CREATE TABLE IF NOT EXISTS category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_category_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Accounts / items
CREATE TABLE IF NOT EXISTS item (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NULL,
  name VARCHAR(120) NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  goal DECIMAL(12,2) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_item_category
    FOREIGN KEY (category_id) REFERENCES category(category_id)
    ON DELETE SET NULL,
  INDEX idx_item_user (user_id),
  INDEX idx_item_category (category_id)
) ENGINE=InnoDB;

-- Helpful indexes (based on typical lookups in db files)
CREATE INDEX IF NOT EXISTS idx_user_email ON `user`(email);
```

### Why these columns?
- `user` table: required for login (`email`/`password_hash`) and for storing `refresh_token` (see `controllers/token.js` / `db/userDB.js`).
- `category` table: used by routes under `/categorys` with CRUD operations (`postCategory`, `getCategorys`, `updateCategory`, `deleteCategory`).
- `item` table: used by routes under `/items` with CRUD and a **transfer** operation that updates two rows’ `balance` fields in a single SQL `UPDATE ... CASE` statement (`db/itemDB.js`).

> In `db/categoryDB.js` you’ll see `DELETE FROM category WHERE category_id = ? && user_id = ?` and similar `UPDATE` statements; in `db/itemDB.js` you’ll see the multi‑row `UPDATE bank_app.item SET balance = CASE ...` pattern for transfers. The frontend components (`AccountsPage.tsx`, `TransferFunds.tsx`) rely on `item_id`, `name`, `balance`, and (optionally) `goal`.

---

## 🔌 API Shape (as used by the frontend)

> Base URL: `http://localhost:3000`

### Users (`/users` – unprotected)
- `POST /users/register`  
  Body (as used by frontend): `{ email, password, f_name, l_name }`
- `POST /users/login`  
  Body: `{ user: { email, password } }`  
  Sets/returns tokens (access token + refresh handling).
- `POST /users/logout`  
  Clears server‑side refresh token association.
- `GET /users/session`  
  Returns current session status.

### Items (`/items` – protected by `authenticateToken`)
- `GET /items` – fetch accounts/items (optionally by filters used in your UI).
- `POST /items/item` – create an item.
- `PUT /items/item` – update an item.
- `DELETE /items/item` – delete an item.
- `PUT /items/transfer` – transfer funds.  
  Body: `{ item_id1, item_id2, amount }` (see `frontend/src/api_requests/items.tsx` & `TransferFunds.tsx`).

### Categories (`/categorys` – protected; spelling intentional)
- `GET /categorys/category` – list categories.
- `POST /categorys/category` – create category (`name`, optional `description`).
- `PUT /categorys/category` – update category by `category_id`.
- `DELETE /categorys/category` – delete category by `category_id`.  
  Axios client sends the payload via `data` in the DELETE request.

> Protected routes accept an **Authorization: Bearer \<accessToken\>** header. The backend middleware (`authenticateToken`) will also attempt a refresh flow if the access token is expired (using the DB‑stored refresh token).

---

## 🧪 Quick Seed (optional)
```sql
USE bank_app;

INSERT INTO `user` (email, password_hash, f_name, l_name)
VALUES ('demo@example.com', '$2b$10$examplehashedpassword...', 'Demo', 'User');

-- sample categories
INSERT INTO category (user_id, name, description) VALUES
  (1, 'Main', 'Primary spending'),
  (1, 'Savings', 'Set‑aside funds');

-- sample items/accounts
INSERT INTO item (user_id, category_id, name, balance, goal) VALUES
  (1, 1, 'Checking', 1200.00, NULL),
  (1, 2, 'Emergency Fund', 3500.00, 5000.00);
```

> Replace `password_hash` with a real bcrypt hash generated by your app. The backend uses `bcrypt` with 10 salt rounds.

---

## 🧩 Notes & Gotchas
- The database schema name `bank_app` is referenced explicitly in `db/itemDB.js` during transfers. If you prefer a different schema name, change the `UPDATE bank_app.item ...` query to `UPDATE item ...`.
- The `/categorys` path spelling is intentional to match the code. Don’t rename it unless you update both backend routes and frontend API calls.
- The backend uses **ESM** (`"type": "module"`). Use `import` syntax and run with a recent Node (v18+ recommended).

---

## 👤 Author
**Derek Sykes**
