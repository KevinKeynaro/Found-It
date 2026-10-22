# Found It! — Frontend

Modern, mobile-first web frontend for **Found It!**, the school lost and found system. Teachers post items found on campus, students search and locate their belongings, and administrators manage school accounts.

Built with Next.js (App Router), React 19, and Tailwind CSS 4.

---

## Getting Started

### Prerequisites

- Node.js (LTS version 20+)
- Running Found It backend API (defaults to `http://localhost:5000`)

### Installation

```bash
cd frontend
npm install
```

### Environment Configuration

Copy the example environment file and configure variables:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Found It backend API | `http://localhost:5000` |
| `NEXT_PUBLIC_APP_TIMEZONE` | Application timezone for dates and overdue calculations | `Asia/Jakarta` |
| `NEXT_PUBLIC_SCHOOL_NAME` | Optional school name displayed in header and branding | *(empty)* |

> **Note:** `.env.local` is git-ignored and should never be committed to version control.

### Development and Build Scripts

```bash
# Run local development server with Turbopack (http://localhost:3000)
npm run dev

# Run unit tests
npm test

# Run ESLint code checks
npm run lint

# Build optimized production bundle
npm run build

# Start production server
npm start
```

---

## Project Structure

```
frontend/
├── public/                     # Static public assets
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── change-password/    # Password change page (mandatory on first login / self-service)
│   │   ├── items/              # Items list, creation, detail, and edit pages
│   │   │   ├── [id]/           # Item detail and edit pages
│   │   │   │   ├── edit/       # Edit item page (teachers/admins)
│   │   │   │   └── page.jsx    # Responsive item detail page with role-driven action buttons
│   │   │   ├── new/            # Post new found item page (teachers/admins)
│   │   │   └── page.jsx        # Searchable, paginated items list with role tabs
│   │   ├── login/              # Login page
│   │   ├── globals.css         # Tailwind 4 @theme design tokens and base styles
│   │   ├── layout.js           # Root layout mounting Geist fonts and AuthProvider
│   │   └── page.js             # Root redirect to /items
│   ├── components/
│   │   ├── items/              # Item components (ItemCard, ItemGrid, ItemCardSkeleton, SearchBar, StatusBadge, ClaimInfoBox, ItemActions, ItemForm, PhotoField, ReturnDialog)
│   │   ├── navigation/         # AppLayout, TopBar, BottomTabBar, AccountMenu
│   │   ├── ui/                 # Reusable base components (Badge, Button, Input, Textarea, Dialog, ConfirmDialog, Toast, Alert, Card, Skeleton, EmptyState, PageHeader, Pagination, Tabs, Logo)
│   │   └── NoAccess.jsx        # Reusable unauthorized access fallback screen
│   ├── config/
│   │   └── navigation.js       # Data-driven role-based navigation item configuration
│   ├── context/
│   │   ├── AuthContext.jsx     # Central client authentication provider and useAuth hook
│   │   └── ToastContext.jsx    # Global toast notification context and useToast hook
│   ├── lib/
│   │   ├── api.js              # Central API client with uniform error formatting
│   │   ├── format.js           # Intl date formatting and timezone helpers (daysSince, formatDate)
│   │   ├── itemValidation.js   # Pure form validation, photo checks, and update FormData builder
│   │   ├── itemsApi.js         # Dedicated items API client (listItems, getItem, createItem, updateItem, returnItem, reopenItem, deleteItem)
│   │   ├── listParams.js       # Pure URL search parameters parsing and serialization
│   │   └── messages.js         # Single source of truth for UI strings and error code mapping
│   └── proxy.js                # Next.js 16 Proxy running lightweight cookie-presence checks
├── test/                       # Node test runner unit tests
│   ├── format.test.js          # Unit tests for date formatting and day boundaries
│   ├── itemValidation.test.js  # Unit tests for item fields, photos, and update form data builder
│   └── listParams.test.js      # Unit tests for parameter sanitization and URL building
├── .env.example                # Example environment variable template
├── jsconfig.json               # Path aliases (@/* -> src/*)
├── next.config.mjs             # Next.js config (Cloudinary remotePatterns, Cache Components)
└── package.json
```

---

## Technical Architecture and Rules

The frontend follows the rules specified in `DESIGN.md` Section 3:

1. **Central API Client (`src/lib/api.js`)**:
   - All network requests pass through the central `api()` helper.
   - Credentials mode is always set to `credentials: "include"` so the browser automatically manages session cookies.
   - Attaches `X-Requested-With: XMLHttpRequest` to all mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) to satisfy backend CSRF checks.
   - Reads backend URL from `NEXT_PUBLIC_API_URL`.
   - Maps backend error codes to user-friendly English messages using `src/lib/messages.js`, converting responses into uniform `ApiError` instances.
   - Network errors gracefully map to `"Can't reach the server. Check your connection."`.

2. **Cookie-Based Authentication**:
   - Authentication tokens reside strictly in backend-issued `HttpOnly` cookies (`found_it_token`).
   - JavaScript code never reads, writes, or stores tokens in `localStorage` or `sessionStorage`.
   - Authentic identity is validated directly by the backend via `GET /api/auth/me`.
   - `proxy.js` performs only lightweight cookie-presence checks for early routing; the backend remains the ultimate validator.

3. **Automatic Error and Access Redirects**:
   - `401 UNAUTHENTICATED` redirects to `/login`.
   - `403 PASSWORD_CHANGE_REQUIRED` redirects to `/change-password`.
   - `403 ACCOUNT_DISABLED` redirects to `/login` with an account deactivated alert.
   - Users with `must_change_password: true` are locked to `/change-password` with only a sign-out escape hatch.

4. **Zero Cross-User Cache Contamination**:
   - Authenticated user state is never cached across users or sessions.
   - Server-side features operate under Next.js 16 Cache Components constraints, ensuring no session data is shared in server caches.

5. **Role-Driven UI**:
   - Navigation and action options adapt dynamically based on user role (`student`, `teacher`, `admin`).
   - The frontend forwards actions and displays returned errors rather than guessing business rules.
   - Direct access to unauthorized URLs displays the reusable `NoAccess` component.

6. **Accessibility and Responsiveness**:
   - Mobile-first layout with a sticky bottom navigation tab bar on handheld screens and a horizontal header on desktop (≥ 1024px).
   - Minimum 44×44px touch targets on all interactive controls.
   - Accessible form controls with explicit labels and `aria-describedby` error wiring.
   - Accessible dialog modals featuring focus trapping, Esc key closure, trigger focus restoration, and body scroll lock.

7. **Item Lifecycle Actions and Mutations**:
   - `createItem(formData)`: `POST /api/items` with multipart form data.
   - `updateItem(id, formData)`: `PATCH /api/items/:id` sending only changed fields and/or replacement photo via `buildUpdateFormData`.
   - `returnItem(id, { returned_to })`: `POST /api/items/:id/return` recording item return to claimant.
   - `reopenItem(id)`: `POST /api/items/:id/reopen` moving returned items back to active status.
   - `deleteItem(id)`: `DELETE /api/items/:id` with specific lifecycle reason error mappings (`DELETE_NOT_ALLOWED`, `RETENTION_WINDOW_EXPIRED`, `INVALID_STATE`).
   - Central `ToastProvider` gives consistent, auto-dismissing success notifications across client-side page transitions.
