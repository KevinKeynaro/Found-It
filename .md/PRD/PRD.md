# Found It! — Product Requirements Document

> Status: **Draft v0.2** — planning stage. This document is the source of truth for scope and decisions. If code or other docs disagree with it, update one of them deliberately.

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
- Items that remain unclaimed beyond the configured retention threshold are identified as overdue.

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
| View item list, search, and view details | Yes | Yes | Yes |
| View archived returned items | Yes | Yes | No |
| Create an item | Yes | Yes | No |
| Edit any item | Yes | Yes | No |
| Mark any item as returned | Yes | Yes | No |
| Delete an item at any time | Yes | No | No |
| Delete an overdue item | Yes | Yes | No |
| Delete a returned item after its retention period | Yes | Yes | No |
| Create, update, and deactivate users | Yes | No | No |
| Import and export users through CSV | Yes | No | No |
| Reset another user's password | Yes | No | No |

**Permission rules:**

- All teachers share responsibility for managing found items. Teachers may edit and mark items posted by other teachers as returned.
- A teacher may delete an item only when it is overdue or its returned-item retention period has expired.
- Admin can delete any item regardless of its status or age.
- Students have read-only access to found items and cannot access the returned-item archive.
- All permissions must be enforced by the backend, not merely hidden in the frontend.

## 4. User Flows

### 4.1 Item lifecycle

1. A student or staff member finds an item and hands it to a teacher.
2. A teacher logs in and posts the item with a title, description, location found, date found, and photo.
3. Students log in and browse or search the item list.
4. A student who recognizes their belongings visits a teacher in person and describes the item.
5. Any teacher or an admin marks the item as `returned`.
6. The system records who marked it as returned, the return timestamp, and optionally the recipient's name.
7. The item disappears from the default active list and moves to the returned-item archive.
8. The item remains in the archive for the configured retention period, which defaults to 5 days.
9. After the retention period expires, a teacher may delete the item. Admin may delete it at any time.

### 4.2 Overdue item lifecycle

1. An item is posted with its date found.
2. The system calculates whether the item has exceeded the configured overdue threshold.
3. By default, an item becomes overdue 30 days after its date found if it has not been returned.
4. Overdue status is calculated from the date found and the current date. It does not require a cron job or another scheduled background process.
5. Overdue items remain available for viewing until deleted. Teachers may delete them, and admins may delete them at any time.

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
- Login using email and password.
- JWT authentication with role-based access for admin, teacher, and student.
- Forced password change on first login.
- Users can change their own passwords.
- Deactivated accounts cannot log in.
- Admin can reset user passwords.
- A terminal script is provided to create an initial admin account or reset an admin password when normal administrative access is unavailable.

**Item management**
- Create, view, edit, and delete found items according to role permissions.
- One photo per item, stored through Cloudinary.
- Search by title and description.
- Pagination and filtering by item status.
- Item statuses: `found` and `returned`, with `overdue` calculated dynamically for unreturned items.
- Any teacher or admin can edit and mark any item as returned.
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
- Separate views for active items and returned-item archives.
- Role-appropriate navigation and actions.

### 5.2 Later (out of v1)

- SSO with school accounts, including Microsoft 365 through Microsoft Entra ID.
- Online item claim workflow with approval.
- Multiple photos per item.
- Categories and tags.
- Email or push notifications and automated reminders.
- Automatic deletion or scheduled processing of old items.
- Export of item reports.

## 6. Account Management Rules

- **No self-registration:** Accounts can only be created by admin, individually or through CSV import.
- **CSV columns:** `name, email, role, class`.
- **Allowed imported roles:** `teacher` and `student`. The `admin` role cannot be created through CSV import.
- **CSV parser:** Must tolerate UTF-8 BOM, comma or semicolon delimiters, and surrounding whitespace.
- **Validation:** Every row must be validated with Zod before the import is committed. Errors must identify the row number and reason.
- **Duplicates:** Rows whose email already exists are skipped and reported. Existing accounts are never silently overwritten.
- **Transactions:** Valid account creation must run in a single database transaction. If the transaction fails, no partial import should remain.
- **Initial passwords:** Randomly generated per account and hashed using bcrypt before storage. Plaintext initial passwords are included only in the one-time result CSV.
- **Password recovery:** Previously generated passwords cannot be recovered. Admin must reset the password instead.
- **Admin recovery:** Provide a terminal script that can create the initial admin account or reset an admin password without requiring a working admin session. Keep this script restricted to authorized server operators. At least two admin accounts are recommended to reduce the risk of losing administrative access.
- **Export security:** Exported user data must never include password hashes or plaintext passwords. CSV cells beginning with `=`, `+`, `-`, or `@` must be neutralized against formula injection.
- **Import limits:** Maximum file size and maximum number of rows must be defined in the API specification.

## 7. Item Status and Retention Rules

### 7.1 Status definitions

| Status | Definition |
|---|---|
| `found` | Item has been recorded and has not been returned or reached the overdue threshold. |
| `overdue` | Item has not been returned and its overdue threshold has been reached. This is a calculated state, not a separately stored database status. |
| `returned` | Item has been handed back to its owner and is retained in the returned-item archive. |

The overdue threshold defaults to **30 days from the date found**. An item is overdue when the current date is on or after `date_found + overdue_days`, provided it has not been returned.

### 7.2 Configurable retention

The following settings must be configurable rather than hard-coded:

| Setting | Default | Purpose |
|---|---:|---|
| `overdue_days` | 30 days | Number of days after the date found before an unreturned item becomes overdue. |
| `returned_retention_days` | 5 days | Minimum number of days a returned item remains in the archive before a teacher may delete it. |

These settings should be stored in application configuration or environment variables, with documented defaults.

### 7.3 Deletion rules

- Admin can delete any item at any time.
- Teachers can delete an overdue item.
- Teachers can delete a returned item only after its retention period has expired.
- Students cannot delete items.
- Deletion of an item must also trigger appropriate Cloudinary cleanup.
- There is no automatic deletion in v1. Eligible items remain in the system until an authorized user deletes them.

**Date handling:** Use consistent server-side date handling and the school's intended local timezone when determining overdue status and retention eligibility. The API specification must define date boundaries clearly.

## 8. Data Model (summary)

Full definitions live in the database schema document and migrations.

**users**

`id, name, email (unique), password (nullable for future SSO), role (admin|teacher|student), class (nullable), must_change_password (default true), is_active (default true), created_at, updated_at`

**items**

`id, title, description, location_found, date_found, image_url, image_public_id, status (found|returned), returned_at (nullable), returned_by (nullable FK users.id), returned_to (nullable), posted_by (FK users.id), created_at, updated_at`

### Data model rules

- `posted_by` records the user who originally posted the item. It must not change when another teacher edits the item.
- `returned_by` records the teacher or admin who marked the item as returned.
- `returned_to` stores the recipient's name and is optional.
- `returned_at` records when the item was marked as returned.
- `returned_by`, `returned_to`, and `returned_at` remain empty until the item is returned.
- `image_public_id` is stored so the Cloudinary image can be removed when an item is deleted or its photo is replaced.
- Search should support title and description, using suitable database indexes.
- Overdue status is derived from `date_found`, `overdue_days`, and the item's return status.
- Returned-item deletion eligibility is derived from `returned_at` and `returned_retention_days`.
- Database changes must be tracked as numbered SQL migration files. The live database must not be modified manually without corresponding migration changes.
- Passwords must be nullable only to support a future SSO implementation. For password-based accounts in v1, a valid bcrypt password hash is required.

## 9. Authentication and Future Microsoft 365 SSO

### v1 authentication

- Users authenticate with email and password.
- Passwords are hashed with bcrypt.
- JWTs are used for authenticated requests.
- Role and account-active checks are enforced by the backend.
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
| Auth | JWT (bearer token) + bcrypt |
| Validation | Zod |
| Upload | Multer → Cloudinary for photos; Multer memory storage for CSV |
| CSV | `csv-parse`, `csv-stringify` |
| Database | MySQL via `mysql2` (plain SQL, no ORM), managed with MySQL Workbench |
| Dev tooling | nodemon, dotenv, cors |

## 11. Non-Functional Requirements

- **Security:** Passwords are hashed with bcrypt. JWT secrets and credentials remain in `.env` and are never committed. Server-side role checks are mandatory. Uploads are restricted by file type and size.
- **Privacy:** Only authenticated school members can view item data. Students cannot view returned-item archives.
- **Reliability:** CSV import is transactional. Cloudinary cleanup is performed when an item or photo is deleted or replaced.
- **Usability:** The website must work on mobile devices, since students are expected to browse mostly from their phones.
- **Maintainability:** Use ESM consistently. Keep `.env.example` up to date and create numbered SQL migrations for schema changes.
- **Configuration:** Overdue and returned-item retention thresholds must be configurable and documented.
- **Access control:** Every protected API endpoint must verify authentication, account status, and required permissions.
- **Auditability:** The system must preserve the original poster and record the user who marks an item as returned.
- **Time consistency:** Date calculations must use consistent server-side rules and a documented timezone.
- **Deployment:** Hosting decisions must be finalized before Milestone 8.

## 12. Milestones

| # | Milestone |
|---|---|
| 0 | Documentation: PRD, database schema and migrations, API specification, DESIGN |
| 1 | Backend foundation: repository cleanup, ESM, database connection, `/api/health` |
| 2 | Authentication: login, JWT, role middleware, password change, admin recovery script |
| 3 | Items: CRUD, photo upload, search, filtering, overdue calculation, returned-item tracking |
| 4 | Admin: user management, CSV import/export, password reset |
| 5 | Frontend foundation: Next.js setup, login, layout |
| 6 | Frontend: item list, search, detail, active-item filters |
| 7 | Frontend: teacher dashboard, collaborative editing, deletion rules, mark returned, archive |
| 8 | Frontend: admin panel, final polish, hosting configuration, deployment |

## 13. Confirmed Decisions and Remaining Work

The following decisions have been established for v1:

1. **Login requirement:** The item list is available only to authenticated users.
2. **Multiple teachers:** Teachers can edit and mark any teacher's item as returned. Deletion is restricted by item status and retention rules.
3. **Microsoft 365:** SSO is deferred to a later phase. Accounts and roles are provisioned through admin management and CSV import.
4. **Password resets:** Admin resets user passwords. A terminal script provides recovery for the initial or inaccessible admin account. At least two admins are recommended.
5. **Overdue threshold:** Default of 30 days after the date found.
6. **Returned-item retention:** Default of 5 days before a teacher can delete a returned item.
7. **Hosting:** The deployment target remains undecided and must be selected before Milestone 8.

Before implementation, the database schema and API specification must define the exact date-boundary behavior, configuration mechanism, CSV import limits, and deletion response behavior. These are implementation details, not reasons to delay the agreed v1 scope.