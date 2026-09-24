# 04 — Authentication & Permissions

## Model

- **Only staff/operators authenticate.** There is no customer account or public sign-up flow in the UI. Visitors interact anonymously.
- Auth provider is Supabase Auth via the generated browser client (`@/integrations/supabase/client`).
- Multi-user admin architecture enforces:
  `ROLE` → `PERMISSIONS` → `DATABASE ACCESS (RLS)` → `SERVER AUTHORIZATION` → `UI ACCESS`
- All security boundaries are enforced server-side via Supabase RLS, verified middleware tokens (`requireSupabaseAuth`), and server-side authorization gates (`src/lib/admin/authorize.server.ts`).

## Roles & Permissions

Three primary roles are supported:

| Role | Scope | Default Permissions | Safeguards |
| :--- | :--- | :--- | :--- |
| `super_admin` | Full control over platform, CMS, bookings, settings, and team | All 39 system permissions (`*`) | Protected against self-demotion, self-deletion, and removal of the last Super Admin. |
| `admin` | Operational administrator | Operational bookings, trips, hotels, CMS, customers, branches, reports, settings view/edit, team view | Cannot promote/create Super Admins, cannot delete/deactivate Super Admins, cannot manage advanced security. |
| `staff` | Restricted operator / read-only | View dashboard, customers, bookings, trips, hotels, branches | No create, edit, delete, settings, team, or reports permissions by default unless granted via `user_permissions`. |

## Centralized Permission Architecture

- Defined in `src/lib/admin/permissions.ts`.
- Groups: Dashboard, Customers, Bookings, Trips, Hotels, Branches, Reports, CMS, Settings, Team, Security.
- Overrides: Persisted in `public.user_permissions (user_id, permission, granted, created_at, updated_at)`.
- Evaluation: `computeEffectivePermissions(roles, overrides)` merges role-based defaults with user-level overrides.

## Database Tables & RLS

### `public.user_roles`
- Columns: `id`, `user_id` (references `auth.users`), `role` (`app_role`), `created_at`.
- RLS Policies:
  - `user_roles_self_read`: SELECT allowed for self or admin.
  - `user_roles_super_admin_insert`: INSERT only by `is_super_admin(auth.uid())`.
  - `user_roles_super_admin_update`: UPDATE only by `is_super_admin(auth.uid())`.
  - `user_roles_super_admin_delete`: DELETE only by `is_super_admin(auth.uid())`.

### `public.user_permissions`
- Columns: `id`, `user_id` (references `auth.users`), `permission`, `granted`, `created_at`, `updated_at`.
- RLS Policies:
  - `user_permissions_read`: SELECT allowed for self or admin.
  - `user_permissions_super_admin_insert/update/delete`: Mutation only by `is_super_admin(auth.uid())`.

## Server-Side Authorization Gates

All server operations requiring elevated access import `src/lib/admin/authorize.server.ts`:
- `assertActiveUser(userId)`: Verifies caller account is active and rejects banned or disabled accounts (`app_metadata.disabled === true`).
- `requirePermission(userId, permission)`: Gating function verifying that caller's effective permissions include `permission`. Strictly enforced across all mutation and privileged read endpoints (`bookings.delete`, `bookings.edit`, `trips.create`, `hotels.*`, `dashboard.view`, `reports.view`, etc.).
- `requireAnyPermission(userId, permissions)`: Gating function for multi-capability operations.
- `requireAdmin(userId)`: Validates active portal access across `["super_admin", "admin", "staff"]`, ensuring operators pass into granular permission evaluation without arbitrary role deadlocks.
- `requireSuperAdmin(userId)`: Verifies role is `super_admin`.

## Storage & Redirect Security Controls

- **Passport Access & Storage (SEC-12)**: `getPassportSignedUrl` enforces `bookings.view` permission, strictly validates object paths against `^bookings\/[0-9a-f-]{36}\/passport\.(jpg|jpeg|png|webp|heic|pdf)$`, and verifies database presence in `bookings` or `booking_passengers` to prevent arbitrary storage enumeration.
- **Redirect Hardening (SEC-14 & SEC-15)**: Centralized in `src/lib/redirect.ts`. `safeNext` verifies same-origin paths, rejects backslashes (`\`), protocol-relative URLs (`//`), control characters, and pseudo-protocols (`javascript:`, `data:`, `vbscript:`). `assertSafeRedirect` enforces explicit HTTP/HTTPS protocols on OAuth consent redirects.
- **Customer Note Authorship (SEC-10)**: `deleteCustomerNote` enforces author matching (`author_id === context.userId`), granting override solely to `super_admin` or users with `customers.delete` permissions.

## Client-Side Context & Navigation Gates

- `src/hooks/useAuth.ts`:
  - `useUserPermissions(userId)`: Loads roles and custom overrides, providing instant evaluation (`hasPermission`, `hasAnyPermission`, `isSuperAdmin`, `isAdmin`, `isStaff`).
  - `hasAdminConsoleAccess(roles)`: Allows `super_admin`, `admin`, and `staff` into `/admin`.
- `src/components/admin/kit/PermissionGate.tsx`:
  - Declarative route and component gate. Unpermitted access renders a localized 403 / Access Denied screen instead of loading protected components or queries.
- `src/components/admin/AdminShell.tsx`:
  - Dynamically filters navigation links according to `hasPermission(item.requiredPermission)`.

## Team Management (`/admin/admins`)

- **KPI Cards**: Total members, Active, Invited, Disabled, Super Admins.
- **Search & Filters**: Search by name/email; filters by role and account status.
- **Member Table**: Displays identity, role, account status badge (`نشط`, `مدعو`, `معطل`), email confirmation, and last sign-in.
- **Member Manage Drawer**:
  - Identity (name, email).
  - Access (role selector, status switch).
  - Permission Matrix Inspector: Displays grouped permissions, distinguishing role-inherited from custom overrides, with live toggles for Super Admins.
  - Security: Email confirmation status, last sign-in, secure password reset email trigger (recovery links/tokens are dispatched via email and never exposed to the client or returned in API responses).
  - Activity: Created date and audit records.
  - Danger Zone: Safe deletion and deactivation with safeguards.
- **Invite Drawer**: Zero-knowledge secure email invitation flow via Supabase Auth admin invitation links (temporary passwords removed from production flow to ensure industry-standard secret hygiene).
