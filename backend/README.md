# Found It: Backend

REST API for **Found It**, the school's lost and found website. Teachers post items found on campus, students browse them and submit claims, and an admin manages accounts and oversees everything.

## Features

- JWT authentication (login only, no self-registration)
- Role-based access control: `admin`, `teacher`, `student`
- Account management by admin
- CRUD for found items, with photo upload
- Claim system: students claim an item, the teacher who posted it approves or rejects
- Search and filter items
- Request validation and consistent error responses

## Roles and Permissions

| Action | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| Log in | ✅ | ✅ | ✅ |
| Create / edit / delete accounts | ✅ | ❌ | ❌ |
| Post a found item (with photo) | ✅ | ✅ | ❌ |
| Edit / delete own items | ✅ | ✅ | ❌ |
| Edit / delete any item | ✅ | ❌ | ❌ |
| Browse and search items | ✅ | ✅ | ✅ |
| Submit a claim | ❌ | ❌ | ✅ |
| Approve / reject claims on own items | ✅ (any) | ✅ | ❌ |
| Mark an item as returned | ✅ (any) | ✅ (own) | ❌ |

## Status Flow

**Item:** `FOUND` → `CLAIMED` → `RETURNED`

**Claim:** `PENDING` → `APPROVED` or `REJECTED`

- Approving a claim sets the item to `CLAIMED`.
- After the item is handed over, the teacher marks it `RETURNED`.
- Rejecting a claim leaves the item as `FOUND`.
- A student can have only one pending claim per item.

## Tech Stack

- Node.js and Express.js
- MySQL with `mysql2` (raw SQL queries and connection pool)
- JSON Web Token (`jsonwebtoken`) and `bcrypt`
- Zod for validation
- Multer and Cloudinary for image upload
- `dotenv`, `cors`
- Nodemon (development)

## Getting Started

### Prerequisites

- Node.js (current LTS)
- MySQL
- A Cloudinary account

### Installation

```bash
git clone <your-repo-url>
cd backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` in the backend root:

```bash
cp .env.example .env
```

Configure your local environment variables in `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=found_it

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=8h

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta
OVERDUE_DAYS=30
RETURNED_RETENTION_DAYS=5
```

### Database Setup

Run SQL migrations using `mysql2`:

```bash
npm run migrate
```

To view applied and pending migrations:

```bash
npm run migrate:status
```

### Run

```bash
npm run dev     # development with Nodemon
npm start       # production
```

The API runs at `http://localhost:5000`.

## Project Structure

```
backend/
├── db/
│   ├── migrations/      # SQL migrations
│   └── migrate.js       # migration runner
├── scripts/
│   ├── admin.js         # admin account CLI (create, reset)
│   └── seed-dev.js      # dev accounts seed script
├── src/
│   ├── config/          # database, auth, and Cloudinary setup
│   ├── controllers/     # request handlers
│   ├── middlewares/     # auth, csrf, validate, rateLimiters, error handlers
│   ├── routes/          # route definitions
│   ├── schemas/         # Zod schemas
│   ├── utils/           # helpers (AppError)
│   ├── app.js           # express app configuration
│   └── server.js        # server entry point
├── .env
├── .env.example
└── package.json
```

## Admin & Dev CLI Scripts

Manage administrative and test accounts directly via CLI:

```bash
# Create an admin account (password generated securely, printed ONCE)
npm run admin:create -- --name="Admin Name" --email="admin@found-it.test"

# Reset an admin/user password (invalidates all active sessions)
npm run admin:reset -- --email="admin@found-it.test"

# Seed development teacher and student accounts (disabled in production)
npm run seed:dev
```

*Note: Never pass passwords via command-line arguments.*

## Authentication & Security

### Cookie-Based Sessions
Authentication uses JSON Web Tokens (HS256) stored in an `HttpOnly` cookie (`found_it_token`):
- `httpOnly: true` (inaccessible to browser JavaScript)
- `secure: true` in production (HTTPS only)
- `sameSite: 'lax'`
- `path: '/'`
- Max-Age equal to `JWT_EXPIRES_IN` (default 8 hours)

The browser automatically attaches this cookie on subsequent requests. No manual `Authorization: Bearer` header is required.

### CSRF Protection
For all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):
- The `X-Requested-With: XMLHttpRequest` header is **mandatory**.
- If an `Origin` header is present, it must strictly match `CLIENT_URL`.
- Requests failing validation receive `403 CSRF_REJECTED`.

**Setting in Postman / Thunder Client:**
1. Open the **Headers** tab.
2. Add key: `X-Requested-With`, value: `XMLHttpRequest`.

### Rate Limiting
- **Account Login Limiter:** Maximum 5 failed attempts per 15-minute window for a specific `email + IP` combination. Successful logins do not count against this quota.
- **IP Login Limiter:** Maximum 100 requests per 15-minute window per IP to accommodate shared school networks.
- Exceeding limits returns `429 TOO_MANY_ATTEMPTS`.

### Password Change Enforcement
When `must_change_password` is `true`, users are barred with `403 PASSWORD_CHANGE_REQUIRED` from all protected resources except:
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

---

## API Endpoints

### Auth

#### 1. POST `/api/auth/login`
Authenticates a user and issues an `HttpOnly` session cookie.

- **Access:** Public
- **Headers:** `X-Requested-With: XMLHttpRequest`
- **Request Body:**
  ```json
  {
    "email": "teacher@found-it.test",
    "password": "DevPassword123!"
  }
  ```
- **Success Response (200 OK):**
  - Sets `found_it_token` cookie.
  - Body:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Dev Teacher",
        "email": "teacher@found-it.test",
        "role": "teacher",
        "class_name": null,
        "must_change_password": false
      }
    }
    ```
- **Error Codes:**
  - `400 VALIDATION_ERROR`: Missing/malformed email or empty/oversized password.
  - `401 INVALID_CREDENTIALS`: Incorrect email or password (timing attack protected).
  - `403 ACCOUNT_DISABLED`: User account is deactivated (`is_active = 0`).
  - `403 CSRF_REJECTED`: Missing `X-Requested-With` or mismatched `Origin`.
  - `429 TOO_MANY_ATTEMPTS`: Rate limit exceeded.

#### 2. POST `/api/auth/logout`
Terminates the session and clears the auth cookie.

- **Access:** Public / Logged in
- **Headers:** `X-Requested-With: XMLHttpRequest`
- **Success Response (204 No Content):** Empty body; clears `found_it_token` cookie.
- **Error Codes:**
  - `403 CSRF_REJECTED`: Missing `X-Requested-With`.

#### 3. GET `/api/auth/me`
Returns the currently authenticated user profile from the database.

- **Access:** Logged in (valid session cookie)
- **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Dev Teacher",
      "email": "teacher@found-it.test",
      "role": "teacher",
      "class_name": null,
      "must_change_password": false
    }
  }
  ```
- **Error Codes:**
  - `401 UNAUTHENTICATED`: Missing, expired, or invalid cookie, or revoked session.
  - `403 ACCOUNT_DISABLED`: User account is deactivated.

#### 4. POST `/api/auth/change-password`
Changes the user's password, clears `must_change_password`, increments `token_version` (revoking other active sessions), and issues a fresh session cookie.

- **Access:** Logged in (permitted during `must_change_password = true`)
- **Headers:** `X-Requested-With: XMLHttpRequest`
- **Request Body:**
  ```json
  {
    "current_password": "DevPassword123!",
    "new_password": "NewSecurePassword456!"
  }
  ```
- **Success Response (200 OK):**
  - Sets updated `found_it_token` cookie.
  - Body:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Dev Teacher",
        "email": "teacher@found-it.test",
        "role": "teacher",
        "class_name": null,
        "must_change_password": false
      }
    }
    ```
- **Error Codes:**
  - `400 VALIDATION_ERROR`: New password < 8 characters, > 72 bytes, or identical to current.
  - `401 UNAUTHENTICATED`: Missing or invalid session.
  - `401 INVALID_CREDENTIALS`: Current password does not match.
  - `403 ACCOUNT_DISABLED`: User account is deactivated.
  - `403 CSRF_REJECTED`: Missing `X-Requested-With` header.

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create a teacher or student account |
| GET | `/api/users/:id` | Admin | Get one user |
| PUT | `/api/users/:id` | Admin | Update a user |
| DELETE | `/api/users/:id` | Admin | Delete a user |

### Items

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/items` | Logged in | List items. Supports `?search=` and `?status=` |
| GET | `/api/items/:id` | Logged in | Get one item |
| POST | `/api/items` | Admin, Teacher | Create an item (`multipart/form-data` with `image`) |
| PUT | `/api/items/:id` | Admin, owner Teacher | Update an item |
| DELETE | `/api/items/:id` | Admin, owner Teacher | Delete an item |
| PATCH | `/api/items/:id/return` | Admin, owner Teacher | Mark an item as returned |

**Item fields:** `title`, `description`, `locationFound`, `dateFound`, `image`

### Claims

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/items/:id/claims` | Student | Submit a claim on an item |
| GET | `/api/claims/me` | Student | List my claims |
| GET | `/api/claims` | Admin, Teacher | List claims (teachers see claims on their own items) |
| PATCH | `/api/claims/:id/approve` | Admin, owner Teacher | Approve a claim |
| PATCH | `/api/claims/:id/reject` | Admin, owner Teacher | Reject a claim |

**Claim fields:** `message`

## Data Model

**User:** `id`, `name`, `email`, `password`, `role`, `createdAt`

**Item:** `id`, `title`, `description`, `locationFound`, `dateFound`, `imageUrl`, `status`, `postedById`, `createdAt`

**Claim:** `id`, `itemId`, `studentId`, `message`, `status`, `createdAt`

## Response Format

Success:

```json
{
  "success": true,
  "message": "Item created",
  "data": { }
}
```

Error:

```json
{
  "success": false,
  "message": "Forbidden: you cannot edit this item"
}
```

## Common Status Codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | Validation error |
| 401 | Missing or invalid token |
| 403 | Role or ownership not allowed |
| 404 | Not found |
| 409 | Conflict (for example, a duplicate pending claim) |
| 500 | Server error |

## Testing

Test the endpoints with Thunder Client or Postman. Log in first, then add the token to the `Authorization` header of the other requests.