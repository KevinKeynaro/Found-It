# Found It! — Design Document

> Status: **Draft v0.2**. This document is the source of truth for the user interface (frontend).
> Related documents: `.md/PRD/PRD.md` (scope and product rules), `.md/DATABASE/DATABASE.md` (schema), `backend/README.md` (API contract). If they disagree, the API contract in `backend/README.md` and the rules in the PRD win.
>
> Changes from v0.1: the whole project is now English-only (UI, documentation, code) to reach a wider audience, and the design is school-agnostic.

## 1. Design Principles

- **Mobile-first.** Most students will open the site on a phone. Design starts at narrow screens and grows from there.
- **Quick to understand.** A student's main goal is to see whether their item is listed. Search and photos matter most.
- **Official and calm.** This is an official school site. Clean, high contrast, no decorative clutter.
- **The backend owns the business rules.** The frontend only displays and forwards (see section 3).
- **Every page designs three states:** loading (skeleton), empty, and error.
- **School-agnostic.** No country-specific or school-specific wording in the code or the UI. A school can show its own name through configuration.

## 2. Language Conventions

- **Everything is in English:** UI text, documentation, identifiers, and code comments (comments only where they add value).
- **All UI strings live in one place** (`src/lib/messages.js`), including the error-code messages in section 8. Components import strings from there. No i18n library in v1, but adding another language later must not require touching components.
- **Role labels:** `admin` → Admin, `teacher` → Teacher, `student` → Student.
- **Dates** use `Intl` with locale `en` and the application timezone, for example "Oct 20, 2026". Overdue items also show how long, for example "Overdue 5 days".
- **Timezone:** the frontend reads `NEXT_PUBLIC_APP_TIMEZONE`, which must equal the backend `APP_TIMEZONE`. It is used for the default and the maximum of the "date found" field and for computing "days overdue".
- **Optional school name:** `NEXT_PUBLIC_SCHOOL_NAME`. When set, it is shown under the logo in the header and on the login page.

## 3. Frontend Technical Rules

- **Stack:** Next.js (App Router), Tailwind CSS 4, JavaScript. This project uses newer Next.js features (`cacheComponents`, `partialPrefetching`, React Compiler). Before writing Next.js code, read `frontend/AGENTS.md` and the local docs in `node_modules/next/dist/docs/`, because this version's APIs may differ from what is commonly known.
- **One central API client** in `src/lib/api.js`. Every request goes through one function that
  - uses `credentials: "include"`,
  - adds the header `X-Requested-With: XMLHttpRequest` to every write request (POST, PUT, PATCH, DELETE), including multipart uploads,
  - reads the base URL from `NEXT_PUBLIC_API_URL` (development: `http://localhost:5000`),
  - converts error responses `{ error: { code, message, details } }` into one uniform error object.
- **Authentication:** the token lives in an `HttpOnly` cookie set by the backend. JavaScript must never read or store the token (no `localStorage` or `sessionStorage`). Login state is known by calling `GET /api/auth/me`. Any cookie check on the Next.js side is only for early redirects; real validation is always done by the backend.
- **Automatic redirects:** `401 UNAUTHENTICATED` → `/login`. `403 PASSWORD_CHANGE_REQUIRED` → `/change-password`. `403 ACCOUNT_DISABLED` → `/login` with a message.
- **Per-user data must never be cached across users.** Because `cacheComponents` is enabled, every page and component that depends on the cookie must render dynamically. Never cache authenticated API responses in a way that is shared between users.
- **Action buttons come from `permissions`.** Every item returned by the API carries `permissions: { can_edit, can_return, can_reopen, can_delete }`. The frontend shows a button only when its flag is `true` and never computes the rules itself (overdue threshold, archive window, 24-hour window, ownership). The backend still rejects unauthorized actions, and the frontend shows a message for the returned error code.
- **Images:** use `thumbnail_url` for cards and `image_url` for the detail page. Register `res.cloudinary.com` in the Next.js image configuration. Use fixed aspect ratios to avoid layout shift.
- **State in the URL:** search (`q`), tab (`view`), and page (`page`) live in the query string so the back button and shared links work.
- **Security:** no `dangerouslySetInnerHTML`; all user-supplied text is rendered as plain text. Destructive actions (delete, deactivate, reset password) always ask for confirmation.
- **Environment variables** (`frontend/.env.example`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_TIMEZONE`, `NEXT_PUBLIC_SCHOOL_NAME` (optional).
- **Same-site requirement:** in development, `localhost:3000` and `localhost:5000` count as one site, so the `SameSite=Lax` cookie works. In production the frontend and backend must share one site (see the PRD hosting constraint).

## 4. Roles and Navigation

| Element | Student | Teacher | Admin |
|---|:-:|:-:|:-:|
| **Items** menu | Yes | Yes | Yes |
| **Post item** button | No | Yes | Yes |
| **Users** menu | No | No | Yes |
| Account menu (name, role, Change password, Sign out) | Yes | Yes | Yes |

- **Phone:** a top bar with the logo and the account menu; main navigation is a bottom tab bar (Items, Post item for teachers and admins, Users for admins).
- **Desktop (≥ 1024 px):** a horizontal top bar with all menus; content has a maximum width.
- Navigation is data-driven per role. Pages that do not match the role are not shown. If opened by URL, show a "You don't have access to this page" screen.
- Entries for pages that are not built yet are hidden until their milestone is done.

## 5. Page Map

| Route | Who | Notes |
|---|---|---|
| `/login` | Public | The only page that does not require login |
| `/change-password` | Everyone | Required on first login; also reachable from the account menu |
| `/items` | Everyone | Item list (home after login) |
| `/items/[id]` | Everyone | Item detail |
| `/items/new` | Teacher, admin | Post an item |
| `/items/[id]/edit` | Teacher, admin | Edit an item |
| `/admin/users` | Admin | User list |
| `/admin/users/new` | Admin | Create one account |
| `/admin/users/[id]` | Admin | Edit, deactivate, reset password |
| `/admin/users/import` | Admin | Three-step CSV import |

### 5.1 `/login`
- Email and password fields, a **Sign in** button that shows a loading state and is disabled while the request runs.
- Errors appear above the form (messages in section 8). On success: if `must_change_password` is true go to `/change-password`, otherwise go to `/items`.
- No sign-up or "forgot password" link. Add the text: "Forgot your password? Contact your school administrator."

### 5.2 `/change-password`
- Fields: current password, new password, confirm new password (matching is checked on the client). The rules are shown under the field: at least 8 characters and different from the current password.
- On first login this page is mandatory: no navigation except **Sign out**. On success go to `/items`.

### 5.3 `/items` (list)
- **Search bar** at the top (300 ms debounce after typing, updates `q` in the URL).
- **Active / Overdue / Archive tabs** for teachers and admins only. Students see no tabs. Tabs show no counts (the API does not provide them).
- **Item card:** photo (4:3), title, location found, date found. Teachers and admins also see a status badge (section 7).
- **Card layout:** 2 columns on phones (compact cards), 3 columns from 768 px, 4 columns from 1024 px.
- **Pagination:** Previous / Next buttons with the text "Page 2 of 5". The page lives in the URL.
- **Empty states:** no search results → "No items match “…”. Try different keywords." No items at all → "No items have been posted yet." (students) or the same text with a "Post item" call to action (teachers and admins).
- **Loading:** skeleton cards, the same number as a full page.

### 5.4 `/items/[id]` (detail)
- Large photo, title, description, location found, date found, who posted it.
- **Info box (all roles):** "Think this is yours? Visit the teacher in charge of lost items and describe the item." (There is no online claim in v1.)
- **Teachers and admins** see an actions area driven by `permissions`:
  - **Edit** → `/items/[id]/edit`.
  - **Mark as returned** → a dialog with an optional "Handed over to" field (max 100 characters), then confirm.
  - **Reopen** (items in the archive) → a confirmation dialog.
  - **Delete** → a confirmation dialog styled as a warning.
- For returned items show: when it was returned, who marked it, and "handed over to" when present.
- An item that does not exist or may not be viewed → a "Item not found" screen (the backend returns 404 for both).

### 5.5 `/items/new` and `/items/[id]/edit`
- Fields: photo (required when creating, optional when editing), title, description, location found, date found.
- Default date found: today in the application timezone; it cannot be later than today.
- **Photo:** a file picker with `accept="image/jpeg,image/png,image/webp"` that opens the camera directly on phones; a preview before submitting; the client checks the type and the 5 MB maximum before uploading. When editing, show the current photo and a **Replace photo** button.
- The submit button shows a loading state and prevents double submits. Validation errors appear under their field.
- On success go to the item detail page.
- Editing is only for items with status `found`. For an archived item show the hint: "Reopen this item first to edit it."

### 5.6 `/admin/users`
- Search (name or email), role and active-status filters, pagination.
- Phone: a card list (name, email, role, class, status badge). Desktop: a table with a per-row action menu.
- Buttons: **Add user**, **Import CSV**, and **Export CSV** (choice of comma or semicolon separator, with a hint that Excel in some regional settings expects semicolons). Downloads use `fetch` and a `blob`, because authentication is by cookie.
- Admin accounts are shown read-only with the note "Managed on the server".

### 5.7 `/admin/users/new` and `/admin/users/[id]`
- Create: name, email, role (Teacher or Student), class (optional). After success show the **initial password once** in a dedicated box with a **Copy** button and the warning "This password is shown only once. Save it and give it to the user."
- Edit: name, email, class, role. Separate actions: **Deactivate / Activate** and **Reset password** (the result is shown once, as above). All destructive actions use a confirmation dialog.

### 5.8 `/admin/users/import` (three steps)
1. **Upload:** a template download button, a format explanation (columns `name, email, role, class`; role is only `teacher` or `student`; comma or semicolon separator; at most 500 rows and 1 MB), and a `.csv` file picker.
2. **Preview:** summary cards (Total, Valid, Invalid, Duplicates), a table of invalid rows (row number + reason), a table of duplicates (row number, email, reason), and the list of valid rows. The **Create N accounts** button is disabled when there are no valid rows. The same file is sent again on confirmation (kept in memory, not uploaded anywhere else).
3. **Result:** a summary (created, skipped), a table of the created accounts with their initial passwords, and a **Download credentials CSV** button (columns name, email, role, class, initial password; cells are neutralized against formula injection by prefixing `'` when they start with `=`, `+`, `-`, or `@`). A clear warning that passwords cannot be shown again, and a `beforeunload` warning while the credentials have not been downloaded.
- While the confirmation runs show "Creating accounts… this can take up to about 15 seconds" and disable the button.

## 6. Key Flows

- **First login:** Sign in → `/change-password` (required) → `/items`.
- **Posting an item:** `/items/new` → fill the form and photo → item detail.
- **Owner collects the item:** the teacher opens the detail → Mark as returned (optionally fill "Handed over to") → the item moves to the Archive tab.
- **Marked returned by mistake:** Archive tab → detail → Reopen (teacher within the archive window, admin any time).
- **Start of a school year:** Admin → Import CSV → Preview → Create accounts → download the credentials CSV → hand it out to users.

## 7. Statuses and Badges

| Display | Condition | Who sees it |
|---|---|---|
| No badge | Active item | Everyone |
| **Overdue** (yellow, with days) | `is_overdue` is true | Teachers, admins |
| **Returned** (blue-gray) | `status` is returned | Teachers, admins |

Students only ever receive active items from the API, so they never see a badge.

## 8. Error Messages

The frontend maps API error codes to English messages from `src/lib/messages.js`. Unknown codes show the generic message "Something went wrong. Please try again." (never show raw server text to users).

| Code | Message |
|---|---|
| `INVALID_CREDENTIALS` | Incorrect email or password. |
| `ACCOUNT_DISABLED` | Your account has been deactivated. Contact your school administrator. |
| `TOO_MANY_ATTEMPTS` | Too many attempts. Please try again in a few minutes. |
| `UNAUTHENTICATED` | (Redirect to login) Your session has ended. Please sign in again. |
| `PASSWORD_CHANGE_REQUIRED` | (Redirect to change password) You must change your password first. |
| `FORBIDDEN` | You don't have permission to do this. |
| `VALIDATION_ERROR` | Show the per-field messages from `details`. |
| `ITEM_NOT_FOUND` | Item not found. |
| `INVALID_STATE` | This item has changed. Reload the page. |
| `RETENTION_WINDOW_EXPIRED` | The archive window has passed. Only an admin can reopen this item. |
| `DELETE_NOT_ALLOWED` | This item can't be deleted yet. (Use the reason code from the API when available; the full list is in `backend/README.md`; use the generic message for unknown reasons.) |
| `FILE_TOO_LARGE` | The photo must be 5 MB or smaller. |
| `INVALID_FILE` | The file must be a JPEG, PNG, or WebP photo (or a CSV file on the import page). |
| `EMAIL_ALREADY_EXISTS` | This email is already registered. |
| `ADMIN_MANAGED_VIA_CLI` | Admin accounts are managed on the server and can't be changed here. |
| `IMPORT_CONFLICT` | An email conflicted during the import. No accounts were created. Please try again. |
| `CSRF_REJECTED` | The request was rejected. Reload the page and try again. |
| Network failure | Can't reach the server. Check your connection. |

## 9. Visual Direction

- **Light theme only.** Remove the default `prefers-color-scheme: dark` block from `globals.css`.
- **Neutral palette** (temporary; there is no official school color or logo yet). All colors are defined as tokens in one place (`@theme` in `globals.css`), so changing the brand color means changing tokens:
  - Primary: blue (`#1D4ED8` as the starting point), with a light tint for soft backgrounds.
  - Neutrals: a slate scale; white or very light slate page background, dark slate text.
  - Status: green for success, yellow for overdue, red for danger and delete, blue-gray for archive.
- **Typography:** Geist Sans (already installed). Base size 16 px; bold page titles; helper text 14 px.
- **Shape:** medium rounded corners, subtle shadows, generous spacing. Cards with the photo as the focus.
- **Temporary logo:** the text "Found It!" with the `PackageSearch` icon from lucide-react, plus the optional school name. A school's own logo and colors can be swapped in later through the tokens and one logo component.
- **Base components, built once and reused:** Button, Input, Select, Textarea, FileInput with preview, Card, Badge, confirmation Dialog, Alert, Skeleton, EmptyState, Pagination, Tabs, PasswordRevealBox (shown once + copy), ItemCard, PageHeader.

## 10. Accessibility and Responsiveness

- Text contrast meets WCAG AA; touch targets are at least 44×44 px.
- Every control is keyboard operable; focus is clearly visible; dialogs trap focus and close with Esc.
- Every field has a linked label; errors are tied to their field (`aria-describedby`); images get `alt` text from the item title.
- Breakpoints: `sm` 640, `md` 768, `lg` 1024. Wide tables scroll inside their own container, not the whole page.

## 11. Out of Scope for v1 (UI)

Dark mode, notifications, online claims, multiple photos per item, categories and tags, permanent delete and restore of items, Microsoft 365 SSO login, item report exports, additional UI languages.

## 12. Frontend Roadmap

| Milestone | Contents |
|---|---|
| 5 | Foundation: scaffold cleanup, design tokens, base components, API client, login and change-password pages, layout with role-based navigation, automatic redirects |
| 6 | Item list (search, tabs, pagination) and item detail |
| 7 | Post and edit items, mark as returned, reopen, delete |
| 8 | Admin panel (users, CSV import and export), polish, deployment preparation |