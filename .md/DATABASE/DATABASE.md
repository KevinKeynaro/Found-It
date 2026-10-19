# Found It! — Database Schema & Architecture

This document describes the database design, tables, constraints, indexes, migration workflow, and mandatory query rules for the **Found It!** application.

---

## 1. Architecture & Storage Engine

- **RDBMS:** MySQL 8.0.16+ (strict support for enforced `CHECK` constraints).
- **Engine:** InnoDB across all tables for transaction support and foreign key constraints.
- **Character Set & Collation:** `utf8mb4` with `utf8mb4_unicode_ci` (full multilingual and emoji support).
- **Foreign Keys & Referential Integrity:** Foreign keys intentionally do **not** specify `ON DELETE` or `ON UPDATE` actions. In MySQL 8, referential actions are prohibited on columns referenced in `CHECK` constraints. The default behavior (`RESTRICT`) is explicitly required: users are deactivated rather than hard-deleted.
- **Timezone & Date Storage:**
  - All `TIMESTAMP` columns store timestamps in UTC. The `mysql2` connection pool must be configured with `timezone: 'Z'`.
  - `date_found` is stored as a plain `DATE` (calendar day without time or timezone).

---

## 2. Table Specifications

### 2.1 `schema_migrations`

Tracks applied migrations for forward-only database evolution.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `version` | VARCHAR(50) | NO | *None* | Primary key; the 3-digit migration sequence (e.g., `'001'`). |
| `name` | VARCHAR(150) | NO | *None* | Name of the migration file (e.g., `'001_create_users.sql'`). |
| `checksum` | CHAR(64) | NO | *None* | Hex-encoded SHA-256 hash of the migration file content at execution time. |
| `executed_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP` | UTC timestamp when migration was applied. |

---

### 2.2 `users`

Stores all user accounts (administrators, teachers, and students).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | AUTO_INCREMENT | Primary key; unique user identifier. |
| `name` | VARCHAR(100) | NO | *None* | Full display name of the user. |
| `email` | VARCHAR(150) | NO | *None* | Unique institutional email address (case-insensitive via collation). |
| `password` | VARCHAR(255) | YES | NULL | Bcrypt password hash. Nullable only for future SSO; required for all v1 accounts. |
| `role` | ENUM('admin', 'teacher', 'student') | NO | *None* | User access level and authorization role. |
| `class_name` | VARCHAR(50) | YES | NULL | Class/cohort designation for students (NULL for teachers/admins). |
| `must_change_password` | TINYINT(1) | NO | 1 | Boolean flag; enforces password change on initial login. |
| `is_active` | TINYINT(1) | NO | 1 | Account status flag. Deactivated accounts (0) are barred from logging in or making requests. |
| `token_version` | INT UNSIGNED | NO | 0 | Token version counter; incremented on admin password reset or deactivation to revoke active JWTs. |
| `created_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP` | Account creation timestamp in UTC. |
| `updated_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last profile update timestamp in UTC. |

#### Keys and Indexes
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_users_email (email)`: Enforces uniqueness across all user emails.
- `KEY idx_users_role_active (role, is_active)`: Optimizes authentication lookups and active-user queries by role.

---

### 2.3 `items`

Stores all found item listings, life-cycle transitions, ownership, and soft-deletion tracking.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | AUTO_INCREMENT | Primary key; unique item identifier. |
| `title` | VARCHAR(150) | NO | *None* | Brief descriptive title of the found item. |
| `description` | TEXT | YES | NULL | Detailed notes about item appearance, brand, distinctive marks, etc. |
| `location_found` | VARCHAR(150) | NO | *None* | Campus location where the item was found. |
| `date_found` | DATE | NO | *None* | Calendar date when the item was recovered. |
| `image_url` | VARCHAR(500) | NO | *None* | HTTPS URL to the item photo hosted on Cloudinary. |
| `image_public_id` | VARCHAR(255) | NO | *None* | Cloudinary public ID for asset replacement or permanent purging. |
| `status` | ENUM('found', 'returned') | NO | `'found'` | Active status of the item. Overdue is dynamically computed, not stored. |
| `posted_by` | INT UNSIGNED | NO | *None* | Foreign key referencing `users(id)` of the user who originally posted the item. |
| `returned_at` | TIMESTAMP | YES | NULL | UTC timestamp when item was marked returned to owner. |
| `returned_by` | INT UNSIGNED | YES | NULL | Foreign key referencing `users(id)` of teacher/admin who marked it returned. |
| `returned_to` | VARCHAR(100) | YES | NULL | Name of the person who retrieved the item (optional recipient name). |
| `deleted_at` | TIMESTAMP | YES | NULL | UTC timestamp when the item was soft-deleted. |
| `deleted_by` | INT UNSIGNED | YES | NULL | Foreign key referencing `users(id)` who executed the soft delete. |
| `created_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP` | UTC creation timestamp. |
| `updated_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | UTC last modification timestamp. |

#### Foreign Keys
- `CONSTRAINT fk_items_posted_by FOREIGN KEY (posted_by) REFERENCES users (id)`
- `CONSTRAINT fk_items_returned_by FOREIGN KEY (returned_by) REFERENCES users (id)`
- `CONSTRAINT fk_items_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id)`

*Note:* Accounts in `users` are never hard-deleted. They are marked `is_active = 0`. Consequently, `RESTRICT` default integrity prevents dangling item associations without risk of cascade conflicts.

#### Indexes
- `PRIMARY KEY (id)`
- `KEY idx_items_list (deleted_at, status, date_found)`: Composite index covering active listing filters. Fast exclusion of soft-deleted items (`deleted_at IS NULL`), filtering by `status`, and sorting by `date_found`.
- `KEY idx_items_posted_by (posted_by)`: Fast lookup of items posted by a specific teacher (e.g., for the 24-hour self-deletion rule).

#### CHECK Constraints
1. **`chk_items_returned`**:
   ```sql
   CONSTRAINT chk_items_returned CHECK (
     (status = 'found' AND returned_at IS NULL AND returned_by IS NULL AND returned_to IS NULL)
     OR (status = 'returned' AND returned_at IS NOT NULL AND returned_by IS NOT NULL)
   )
   ```
   - **Why it exists:** Enforces strict data consistency across status transitions:
     - When `status = 'returned'`, both `returned_at` and `returned_by` **must** be populated. `returned_to` is optional.
     - When `status = 'found'`, all return fields (`returned_at`, `returned_by`, `returned_to`) **must** be `NULL`.
     - When an item is "reopened" (transitioned from `returned` back to `found`), the application clears all return fields to `NULL`, maintaining compliance with this constraint.

2. **`chk_items_deleted`**:
   ```sql
   CONSTRAINT chk_items_deleted CHECK (
     (deleted_at IS NULL AND deleted_by IS NULL)
     OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
   )
   ```
   - **Why it exists:** Enforces auditability for soft deletes. An item cannot have a deletion timestamp without recording the actor (`deleted_by`), nor can a deleting user be recorded without a timestamp (`deleted_at`).

---

## 3. Migration Workflow

Migrations follow a strict **forward-only** design pattern:

1. **Commands:**
   - Apply pending migrations:
     ```bash
     npm run migrate
     ```
   - Inspect migration status without modifying the database:
     ```bash
     npm run migrate:status
     ```
2. **Rules:**
   - **Never edit an applied migration file.** The runner verifies the SHA-256 checksum of every applied migration against `schema_migrations`. If any previously executed file is modified, the runner aborts execution immediately.
   - **Forward-only additions:** To introduce schema modifications, create a new numbered file matching `/^\d{3}_.+\.sql$/` (e.g., `backend/db/migrations/003_add_feature_x.sql`).
   - **Non-atomic DDL awareness:** MySQL DDL statements cause an implicit commit. If a statement in a migration fails, prior statements in that file remain committed. Fix the issue cleanly in development or write a forward migration.

---

## 4. Mandatory Query Rules for Developers

All backend queries, services, and repositories must adhere to these mandatory rules:

1. **Soft Delete Filter:**
   - Every `items` query across all public and management views **must** include:
     ```sql
     WHERE deleted_at IS NULL
     ```
   - Soft-deleted items must never appear in student or teacher search, list, or details endpoints. Soft-deleted records are retained solely for audit purposes.

2. **Student List & Overdue Items:**
   - The student browse/search list displays only unclaimed items that are not overdue:
     ```sql
     WHERE deleted_at IS NULL
       AND status = 'found'
       AND date_found > DATE_SUB(CURRENT_DATE(), INTERVAL :overdueDays DAY)
     ```
   - `overdue`: An item is overdue when `date_found + OVERDUE_DAYS <= today` evaluated in the application timezone (`APP_TIMEZONE`, default `'Asia/Jakarta'`). `OVERDUE_DAYS` defaults to 30 from `.env`.
   - Overdue items are hidden from students and visible only to teachers and administrators through a dedicated "Overdue" view/filter.

3. **Archive Eligibility & Reopen Window:**
   - Returned items move to the archive view.
   - Retention/archive deletion eligibility is derived from `returned_at + RETURNED_RETENTION_DAYS <= NOW()` (default 5 days from `.env`).
   - Teachers may **reopen** an item (`returned` -> `found`) only within `RETURNED_RETENTION_DAYS` after `returned_at`. Administrators may reopen an item at any time.

4. **Teacher Self-Delete Window:**
   - A teacher may soft-delete an item only when:
     1. `posted_by = current_user.id`,
     2. `status = 'found'`, and
     3. `created_at >= NOW() - INTERVAL 24 HOUR`.
   - Once marked `returned`, an item cannot be self-deleted under this rule.

5. **Parameterized Search (No FULLTEXT):**
   - Search on `title` and `description` uses parameterized `LIKE`:
     ```sql
     WHERE deleted_at IS NULL
       AND (title LIKE :term OR description LIKE :term)
     ```
   - User input **must** have `%`, `_`, and `\` escaped before binding:
     ```javascript
     const escapedTerm = `%${input.replace(/[\\%_]/g, '\\$&')}%`;
     ```
   - By design, there is **no FULLTEXT index** to maintain strict MySQL engine portability and predictable prefix/substring matching.

6. **Timezone Handling:**
   - Timestamps (`created_at`, `updated_at`, `returned_at`, `deleted_at`) are stored in UTC.
   - The `mysql2` pool must be configured with `timezone: 'Z'`.
   - `date_found` is a plain calendar `DATE`. Date math comparing `date_found` against today must resolve today's date in the application timezone (`APP_TIMEZONE`, default `Asia/Jakarta`).

7. **Token Versioning & Account Deactivation:**
   - `users.token_version` must be incremented whenever an administrator resets a user's password or deactivates an account.
   - JWT tokens include the user's `token_version`. Authentication middleware must verify on every request that the token's version matches `users.token_version` and that `is_active = 1`.

8. **Password Hashing:**
   - `users.password` is `NULL` only for accounts provisioned for future external SSO.
   - All v1 accounts created through initial setup, CSV import, or admin creation must have a valid bcrypt password hash (minimum 8-character plaintext password constraint).
