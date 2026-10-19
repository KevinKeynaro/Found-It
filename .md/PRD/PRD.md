# Found It! — Product Requirements Document

> Status: **Draft v0.3** — planning stage. This document is the source of truth for scope and decisions. If code or other docs disagree with it, update one of them deliberately.

## 1. Overview

**Found It!** is a lost-and-found website for a technology school. When an item is found on campus, it is handed to a teacher in charge of lost items, who posts it with a photo and details. Students log in, browse and search the list, and check whether something they lost is there.

**Problem:** Lost items are currently recovered through word of mouth or pile up in a drawer.

**Goal:** Make it faster and easier for students to get their belongings back.

**Context:** The target school already uses online-based systems, such as an LMS and school accounts. Accounts must be managed by the school through an administrator rather than public self-registration.

## 2. Goals and Non-Goals

### Goals (v1)

- Teachers can post found items with a photo and details in under a minute.
- Students can browse, search, and view found items.
- Admin can create and manage accounts individually or in bulk through CSV.
- Items that have been picked up are marked as returned and retained in an archive for a configurable period.
- Multiple teachers can collaborate on item management without being restricted to their own posts.
- Items that remain unclaimed beyond the configured overdue threshold are identified as overdue.

### Non-Goals (v1)

- Online claim or approval workflow. Students must visit a teacher in person and describe the item.
- Self-registration of any kind.
- SSO with Google Workspace or Microsoft 365. This is planned as a possible later phase.
- Email or push notifications, chat, and comments.
- Native mobile application. The website must be responsive.
- Student-submitted reports of lost items. Only found items are posted.
- Automatic deletion of overdue or archived items through scheduled jobs.
- Item report exports.

## 3. Users and Permissions

| Role | Description |
|---|---|
| **Admin** | Manages user accounts and oversees all items. |
| **Teacher** | Posts and manages found items collaboratively with other teachers. |
| **Student** | Browses and searches found items. Read-only. |

### Permission matrix

| Action | Admin | Teacher | Student |
|---|---|---|---|
| Log in and change own password | Yes | Yes | Yes |
| View active found items, search, and view details | Yes | Yes | Yes |
| View overdue items (Overdue view/filter) | Yes | Yes | No |
| View archived returned items | Yes | Yes | No |
| Create an item | Yes | Yes | No |
| Edit any item | Yes | Yes | No |
| Mark any item as returned | Yes | Yes | No |
| Reopen a returned item within retention period | Yes | Yes | No |
| Reopen a returned item at any time | Yes | No | No |
| Delete an item at any time | Yes | No | No |
| Delete own posted item within 24 hours of creation (while status is found) | Yes | Yes | No |
| Delete an overdue item | Yes | Yes | No |
| Delete a returned item after its retention period | Yes | Yes | No |
| Create, update, and deactivate users | Yes | No | No |
| Import and export users through CSV | Yes | No | No |
| Reset another user's password | Yes | No | No |

**Permission rules:**

- All teachers share responsibility for managing found items. Teachers may edit and mark items posted by other teachers as returned.
- A teacher may delete an item only when: (1) it is their own posted item within 24 hours after `created_at` and its status is `found` (never after it was returned), (2) it is overdue, or (3) its returned-item retention period has expired. All deletion is soft delete.
- Admin can delete any item regardless of its status or age.
- Teachers may reopen a returned item (`returned` -> `found`) only within `returned_retention_days` after `returned_at`. Admin may reopen a returned item at any time. Reopening clears `returned_by`, `returned_to`, and `returned_at`.
- Students have read-only access to active found items. Overdue items are not shown to students in the browse list or search; only teachers and admin can view overdue items and the returned-item archive.
- All permissions must be enforced by the backend, not merely hidden in the frontend.

## 4. User Flows

### 4.1 Item lifecycle

1. A student or staff member finds an item and hands it to a teacher.
2. A teacher logs in and posts the item with a title, description, location found, date found, and photo.
3. Within 24 hours after `created_at`, the original poster (`posted_by`) may delete their own item, provided its status is still `found` (soft delete).
4. Students log in and browse or search the active found item list.
5. A student who recognizes their belongings visits a teacher in person and describes the item.
6. Any teacher or an admin marks the item as `returned`.
7. The system records who marked it as returned (`returned_by`), the return timestamp (`returned_at`), and optionally the recipient's name (`returned_to`).
8. The item disappears from the default active list and moves to the returned-item archive.
9. The item remains in the archive for the configured retention period, which defaults to 5 days (`returned_retention_days`).
10. Within `returned_retention_days` after `returned_at`, any teacher may reopen the item (admin may reopen at any time). Reopening changes status from `returned` back to `found`, clears `returned_by`, `returned_to`, and `returned_at`, and returns the item to the active list.
11. After the retention period expires, a teacher may delete the item (soft delete). Admin may delete it at any time.

### 4.2 Overdue item lifecycle

1. An item is posted with its date found.
2. The system calculates whether the item has exceeded the configured overdue threshold.
3. By default, an item becomes overdue 30 days after its date found if it has not been returned.
4. Overdue status is calculated from the date found and the current date. It does not require a cron job or another scheduled background process.
5. Overdue items are not shown to students in the browse list or search. Only teachers and admin see them, through an "Overdue" view/filter with a visible overdue label. Teachers may delete overdue items, and admins may delete them at any time (soft delete).

### 4.3 Account lifecycle

1. Admin downloads the CSV template.
2. Admin fills it, usually using an LMS export, and uploads it.
3. The system validates the file and displays a preview containing valid rows, invalid rows with reasons, and duplicate accounts.
4. Admin confirms the import.
5. Valid accounts are created in a single database transaction with randomly generated initial passwords.
6. Admin downloads a one-time result CSV containing the account email and initial password, then distributes the credentials securely.
7. On first login, each user must change their initial password.
8. When a student or teacher leaves, admin deactivates the account. Accounts are not hard-deleted through normal account management.
9. If an account needs a password reset, admin resets it and provides the new temporary credentials securely.

## 5. Features

### 5.1 v1 (in scope)

**Authentication and authorization**
- Login using email and password (minimum password length: 8 characters).
- Rate limiting on the login endpoint (exact numbers defined later in the API specification).
- JWT authentication with an 8-hour token lifetime and role-based access for admin, teacher, and student.
- Auth token stored in an `HttpOnly` cookie with `Secure` and `SameSite` attributes (not in `localStorage`).
- CSRF protection on state-changing requests (`SameSite` plus CSRF token or custom-header check, including multipart CSV import).
- Backend rejects requests from deactivated accounts on every request, even with a still-valid token.
- Forced password change on first login.
- Users can change their own passwords.
- Deactivated accounts cannot log in.
- Admin can reset user passwords.
- A terminal script is provided to create an initial admin account or reset an admin password when normal administrative access is unavailable.

**Item management**
- Create, view, edit, and delete found items according to role permissions.
- All item deletion is soft delete (`deleted_at`, `deleted_by`), hiding records from all UI lists and search while retaining them for audit.
- The original poster (`posted_by`) can delete their own item within 24 hours after `created_at`, only while status is `found` (never after it was returned).
- One photo per item, stored through Cloudinary. Image is kept on soft delete.
- Search by title and description (always excluding soft-deleted items).
- Pagination and filtering by item status.
- Item statuses: `found` and `returned`, with `overdue` calculated dynamically for unreturned items.
- Overdue items are hidden from student browse lists and search; visible only to teachers and admin through an Overdue view/filter with a visible overdue label.
- Any teacher or admin can edit and mark any item as returned.
- Reopen action: status `returned` -> `found`. Teachers may reopen only within `returned_retention_days` after `returned_at`; admin may reopen at any time. Reopen clears `returned_by`, `returned_to`, and `returned_at`.
- Teachers can delete overdue items or returned items whose retention period has expired.
- Admin can delete items at any time.
- Returned items are archived for a configurable period, defaulting to 5 days.
- Return records include `returned_by`, `returned_to`, and `returned_at`.

**Administration**
- User list and account details.
- Create, update, and deactivate accounts.
- Reset user passwords.
- CSV import with validation, preview, duplicate detection, and confirmation.
- CSV export of user data without passwords.
- Initial admin account creation and recovery through a terminal script.

**Interface**
- Responsive UI for desktop, tablet, and mobile.
- Separate views for active items, overdue items (teachers and admin only, with visible overdue label), and returned-item archives.
- Role-appropriate navigation and actions.

### 5.2 Later (out of v1)

- SSO with school accounts, including Microsoft 365 through Microsoft Entra ID.
- Online item claim workflow with approval.
- Multiple photos per item.
- Categories and tags.
- Email or push notifications and automated reminders.
- Automatic deletion or scheduled processing of old items.
- Export of item reports.
- Permanent purge and restore feature for soft-deleted items (and Cloudinary cleanup upon permanent purge).

## 6. Account Management Rules

- **No self-registration:** Accounts can only be created by admin, individually or through CSV import.
- **CSV columns:** `name, email, role, class`.
- **Allowed imported roles:** `teacher` and `student`. The `admin` role cannot be created through CSV import.
- **CSV parser:** Must tolerate UTF-8 BOM, comma or semicolon delimiters, and surrounding whitespace.
- **Validation:** Every row must be validated with Zod before the import is committed. Passwords must meet the minimum length of 8 characters. Errors must identify the row number and reason.
- **Duplicates:** Rows whose email already exists are skipped and reported. Existing accounts are never silently overwritten.
- **Transactions:** Valid account creation must run in a single database transaction. If the transaction fails, no partial import should remain.
- **Initial passwords:** Randomly generated per account (minimum 8 characters) and hashed using bcrypt before storage. Plaintext initial passwords are included only in the one-time result CSV.
- **Password recovery:** Previously generated passwords cannot be recovered. Admin must reset the password instead.
- **Admin recovery:** Provide a terminal script that can create the initial admin account or reset an admin password without requiring a working admin session. Keep this script restricted to authorized server operators. At least two admin accounts are recommended to reduce the risk of losing administrative access.
- **Export security:** Exported user data must never include password hashes or plaintext passwords. CSV cells beginning with `=`, `+`, `-`, or `@` must be neutralized against formula injection.
- **Import limits:** Maximum file size and maximum number of rows must be defined in the API specification.

## 7. Item Status and Retention Rules

### 7.1 Status definitions

| Status | Definition |
|---|---|
| `found` | Item has been recorded and has not been returned or reached the overdue threshold. |
| `overdue` | Item has not been returned and its overdue threshold has been reached. This is a calculated state, not a separately stored database status. Visible only to teachers and admin. |
| `returned` | Item has been handed back to its owner and is retained in the returned-item archive. |

The overdue threshold defaults to **30 days from the date found**. An item is overdue when the current date is on or after `date_found + overdue_days`, provided it has not been returned. Overdue items are not shown to students in the browse list or search; they are visible only to teachers and admin through an "Overdue" view/filter with a visible overdue label.

### 7.2 Configurable retention

The following settings must be configurable rather than hard-coded:

| Setting | Default | Purpose |
|---|---:|---|
| `overdue_days` | 30 days | Number of days after the date found before an unreturned item becomes overdue. |
| `returned_retention_days` | 5 days | Minimum number of days a returned item remains in the archive before a teacher may delete it, and the window during which a teacher may reopen a returned item. |

These settings should be stored in application configuration or environment variables, with documented defaults.

### 7.3 Deletion rules

- "Delete" everywhere in the PRD means soft delete. Soft-deleted items set `deleted_at` and `deleted_by` and are hidden from every UI list and search, but the record is kept for audit, including `posted_by` and `returned_by`.
- The original poster (`posted_by`) may delete their own item within 24 hours after `created_at`, only while status is `found` (never after it was returned).
- Teachers can delete an overdue item.
- Teachers can delete a returned item only after its retention period (`returned_retention_days`) has expired.
- Admin can delete any item at any time regardless of status or age.
- Students cannot delete items.
- The Cloudinary image is kept on soft delete. Cloudinary cleanup happens only when a photo is replaced or when an item is permanently purged. Permanent purge and a restore feature are out of v1.
- There is no automatic deletion in v1. Eligible items remain in the system until an authorized user deletes them.

**Date handling:** Use consistent server-side date handling and the configured application timezone (default: `Asia/Jakarta`) when determining overdue status and retention eligibility. The API specification must define date boundaries clearly.

## 8. Data Model (summary)

Full definitions live in the database schema document and migrations.

**users**

`id, name, email (unique), password (nullable for future SSO), role (admin|teacher|student), class (nullable), must_change_password (default true), is_active (default true), created_at, updated_at`

**items**

`id, title, description, location_found, date_found, image_url, image_public_id, status (found|returned), returned_at (nullable), returned_by (nullable FK users.id), returned_to (nullable), posted_by (FK users.id), deleted_at (nullable), deleted_by (nullable FK users.id), created_at, updated_at`

### Data model rules

- `posted_by` records the user who originally posted the item. It must not change when another teacher edits the item.
- `returned_by` records the teacher or admin who marked the item as returned.
- `returned_to` stores the recipient's name and is optional.
- `returned_at` records when the item was marked as returned.
- `returned_by`, `returned_to`, and `returned_at` remain empty until the item is returned. Reopening an item (`returned` -> `found`) clears `returned_by`, `returned_to`, and `returned_at` back to null.
- `deleted_at` and `deleted_by` record soft deletion. Queries and the search index must always exclude rows where `deleted_at` is not null. Soft delete retains the record for audit, including `posted_by` and `returned_by`.
- `image_public_id` is stored so the Cloudinary image can be removed when a photo is replaced or when an item is permanently purged. The Cloudinary image is kept on soft delete.
- Search should support title and description, using suitable database indexes, and must always exclude soft-deleted items.
- Overdue status is derived from `date_found`, `overdue_days`, and the item's return status.
- Returned-item deletion eligibility and teacher reopen eligibility are derived from `returned_at` and `returned_retention_days`.
- Database changes must be tracked as numbered SQL migration files. The live database must not be modified manually without corresponding migration changes.
- Passwords must have a minimum length of 8 characters and are nullable only to support a future SSO implementation. For password-based accounts in v1, a valid bcrypt password hash is required.

## 9. Authentication and Future Microsoft 365 SSO

### v1 authentication

- Users authenticate with email and password. Passwords require a minimum length of 8 characters.
- Passwords are hashed with bcrypt.
- Rate limiting is enforced on the login endpoint (exact numbers defined later in the API specification).
- Authentication uses JWTs with an 8-hour lifetime.
- The auth token is stored in an `HttpOnly` cookie with `Secure` and `SameSite` attributes, not in `localStorage`.
- State-changing requests must be protected against CSRF (`SameSite` plus a CSRF token or custom-header check, including the multipart CSV import).
- Frontend and backend must be served from the same site (same registrable domain, or API proxied through Next.js) to support secure cookie authentication.
- Role and account-active checks are enforced by the backend on every request. The backend must reject requests from deactivated accounts on every request, even with a still-valid token.
- Initial passwords must be changed at first login.

### Future SSO

Microsoft 365 SSO is explicitly outside v1.

If the school uses Microsoft 365, a later phase may introduce a **Login with school account (Microsoft)** option using Microsoft Entra ID.

The school IT administrator must register the application and configure the required identity settings. SSO must match an authenticated school identity to an existing Found It account by email. CSV import remains responsible for account provisioning and role assignment; SSO does not automatically grant roles or create public accounts.

The v1 data model should remain compatible with this future implementation without requiring a redesign of the entire account system.

## 10. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS, JavaScript |
| Backend | Node.js + Express, ESM modules |
| Auth | JWT (HttpOnly cookie) + bcrypt |
| Validation | Zod |
| Upload | Multer → Cloudinary for photos; Multer memory storage for CSV |
| CSV | `csv-parse`, `csv-stringify` |
| Database | MySQL via `mysql2` (plain SQL, no ORM), managed with MySQL Workbench |
| Dev tooling | nodemon, dotenv, cors (CORS note: frontend and backend must be served from the same site or API proxied through Next.js) |

## 11. Non-Functional Requirements

- **Security:** Minimum password length of 8 characters. Passwords are hashed with bcrypt. Rate limiting on the login endpoint. JWT lifetime is 8 hours, stored in an HttpOnly cookie with Secure and SameSite attributes (no localStorage). State-changing requests protected against CSRF (SameSite plus CSRF token or custom-header check, including multipart CSV import). CORS requirements note: frontend and backend must be served from the same site (same registrable domain, or API proxied through Next.js). JWT secrets and credentials remain in `.env` and are never committed. Server-side role checks are mandatory. Uploads are restricted by file type and size.
- **Privacy:** Only authenticated school members can view item data. Overdue items are not shown to students in the browse list or search; only teachers and admin see them. Students cannot view returned-item archives.
- **Reliability:** CSV import is transactional. The Cloudinary image is kept on soft delete; Cloudinary cleanup happens only when a photo is replaced or when an item is permanently purged.
- **Usability:** The website must work on mobile devices, since students are expected to browse mostly from their phones.
- **Maintainability:** Use ESM consistently. Keep `.env.example` up to date and create numbered SQL migrations for schema changes.
- **Configuration:** Overdue and returned-item retention thresholds must be configurable and documented.
- **Access control:** Every protected API endpoint must verify authentication, account status, and required permissions. The backend must reject requests from deactivated accounts on every request, even with a still-valid token.
- **Auditability:** "Delete" everywhere means soft delete (`deleted_at`, `deleted_by`). The system must preserve the original poster (`posted_by`), user who marks an item as returned (`returned_by`), and deletion records for audit.
- **Time consistency:** Date calculations must use consistent server-side rules. The application timezone is configurable with a documented default of `Asia/Jakarta`.
- **Deployment:** Hosting decisions must be finalized before Milestone 8.

## 12. Milestones

| # | Milestone |
|---|---|
| 0 | Documentation: PRD, database schema and migrations, API specification, DESIGN |
| 1 | Backend foundation: repository cleanup, ESM, database connection, `/api/health` |
| 2 | Authentication: login, JWT (HttpOnly cookie, 8h lifetime), CSRF, rate limiting, role & active account middleware, password change, admin recovery script |
| 3 | Items: CRUD (soft delete, poster 24h self-delete), photo upload, search, filtering, overdue calculation & visibility, returned-item tracking & reopen |
| 4 | Admin: user management, CSV import/export, password reset |
| 5 | Frontend foundation: Next.js setup, login, layout |
| 6 | Frontend: item list, search, detail, active-item filters |
| 7 | Frontend: teacher dashboard, collaborative editing, deletion rules, mark returned, reopen, archive, overdue view |
| 8 | Frontend: admin panel, final polish, hosting configuration (same-site/proxy constraint), deployment |

## 13. Confirmed Decisions and Remaining Work

The following decisions have been established for v1:

1. **Login requirement:** The item list is available only to authenticated users.
2. **Multiple teachers:** Teachers can edit and mark any teacher's item as returned. Deletion is restricted by item status and retention rules: the original poster may soft-delete within 24 hours of creation while in `found` status, while other teacher deletion is limited to overdue items and returned items past retention. Teachers may reopen returned items within retention days.
3. **Microsoft 365:** SSO is deferred to a later phase. Accounts and roles are provisioned through admin management and CSV import.
4. **Password resets:** Admin resets user passwords. A terminal script provides recovery for the initial or inaccessible admin account. At least two admins are recommended.
5. **Overdue threshold and visibility:** Default of 30 days after the date found. Overdue items are hidden from students in browse and search; visible only to teachers and admin through an Overdue view/filter with a visible overdue label.
6. **Returned-item retention and reopen:** Default of 5 days before a teacher can delete a returned item, which also defines the window during which a teacher may reopen a returned item.
7. **Hosting:** The deployment target remains undecided and must be selected before Milestone 8. Constraint: frontend and backend must be served from the same site (same registrable domain, or API proxied through Next.js) to support HttpOnly cookie auth and CORS/CSRF requirements.
8. **Soft delete:** All deletions are soft deletes (`deleted_at`, `deleted_by`), excluded from all UI lists and search while kept for audit. Cloudinary images are kept on soft delete; permanent purge and restore are out of v1.
9. **Authentication security:** Passwords require a minimum of 8 characters. The login endpoint must enforce rate limiting. JWT lifetime is 8 hours, stored in an HttpOnly cookie with Secure and SameSite attributes (no localStorage). State-changing requests must be protected against CSRF. The backend must reject requests from deactivated accounts on every request.

Before implementation, the database schema and API specification must define the exact date-boundary behavior, configuration mechanism, CSV import limits, and deletion response behavior. These are implementation details, not reasons to delay the agreed v1 scope.

## Changes from v0.2

- **Teacher self-delete window:** Original poster (`posted_by`) may delete their own item within 24 hours after `created_at`, only while status is `found` (never after returned). This is a soft delete.
- **Reopen (undo returned):** Added reopen action (`returned` -> `found`), clearing `returned_by`, `returned_to`, and `returned_at`. Permitted for teachers within `returned_retention_days` after `returned_at` and admin at any time.
- **Overdue visibility:** Overdue items are hidden from students in browse and search; visible only to teachers and admin through an "Overdue" view/filter with an overdue label. Removed statement that overdue items remain available for viewing by everyone.
- **Authentication security:** Added minimum 8-character password length, login rate limiting, 8-hour JWT lifetime, HttpOnly/Secure/SameSite cookie storage (no localStorage), CSRF protection for state-changing requests, same-site/proxied API hosting constraint (under hosting decisions and CORS requirements note), and immediate rejection of deactivated accounts on every request.
- **Soft delete:** Added `deleted_at` and `deleted_by` to `items` data model. All deletions are soft deletes; queries and search index must exclude rows with non-null `deleted_at`. Images kept on soft delete. Added permanent purge and restore to out-of-v1 list. Updated Reliability, Auditability, and Cloudinary cleanup rules.
- **Wording fixes:** Replaced "configured retention threshold" with "configured overdue threshold" for overdue items in Goals. Specified configurable application timezone with documented default of `Asia/Jakarta` under time consistency.
