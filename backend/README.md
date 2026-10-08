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
- MySQL with Prisma ORM
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

Create a `.env` file in the backend root:

```env
PORT=5000
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/found_it"

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:3000
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed creates a default admin account. Change its password after the first login.

### Run

```bash
npm run dev     # development with Nodemon
npm start       # production
```

The API runs at `http://localhost:5000`.

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/          # database and Cloudinary setup
│   ├── controllers/     # request handlers
│   ├── middlewares/     # authenticate, authorize, validate, upload, error handler
│   ├── routes/          # route definitions
│   ├── schemas/         # Zod schemas
│   ├── utils/           # helpers
│   └── index.js
├── .env
└── package.json
```

## Authentication

Send the token in the `Authorization` header on every protected route:

```
Authorization: Bearer <token>
```

Request flow: **route → authenticate → authorize → validate → controller**

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Log in and receive a JWT |
| GET | `/api/auth/me` | Logged in | Get the current user |

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