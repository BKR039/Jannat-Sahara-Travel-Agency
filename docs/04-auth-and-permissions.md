# 04 — Authentication & Permissions

## Model

- **Only staff authenticate.** There is no customer account, no public sign-up flow
  in the UI, and no profile table. Visitors interact anonymously.
- Auth provider is Supabase Auth via the generated browser client
  (`@/integrations/supabase/client`).

## Screens

| Route | Purpose |
| --- | --- |
| `src/routes/auth.tsx` | Staff sign-in (localized). Redirects into `/admin` on success. |
| `src/routes/reset-password.tsx` | Password reset completion screen. |

## Client-side session

`src/hooks/useAuth.ts`:

- `useAuth()` — subscribes with `supabase.auth.onAuthStateChange`, then calls
  `getSession()`; returns `{ session, user, loading, isAuthenticated }`.
- `useUserRoles(userId)` — TanStack Query reading `user_roles` for that user
  (allowed by the `user_roles_self_read` RLS policy), `staleTime` 60 s.
- `hasAdminRole(roles)` → true for `super_admin` or `admin`.
- `isSuperAdmin(roles)` → true for `super_admin` only.
- `AppRole = "super_admin" | "admin" | "staff"`. `staff` is recognised by the type
  but **is not granted admin access** by `hasAdminRole`. `KNOWN LIMITATION`: RLS
  policies check `has_role(auth.uid(),'admin')`, so a `staff`-only user can neither
  enter the dashboard nor read operational tables.

## The admin gate

`src/routes/admin.tsx` (layout route, `ssr: false`):

1. `useAuth()` — while `loading`, render a spinner.
2. If not authenticated → `navigate({ to: "/auth", replace: true })`.
3. Load roles; while loading, spinner.
4. If `!hasAdminRole(roles)` → render an "access denied" card with sign-out and
   back-to-site actions.
5. Otherwise provide `AdminContext` (`{ user, roles, isSuperAdmin }` from
   `src/components/admin/context.ts`) and render `AdminShell` + `<Outlet />`.

`head()` sets `robots: noindex, nofollow` for the whole admin subtree.

This is a **client-side gate**. It is not the security boundary — the real boundary is:

- **RLS** for everything the admin UI reads/writes with the browser client.
- **`requireSupabaseAuth` + `assertAdmin`** for server functions.

## Server-side authorization

- `src/lib/admin/command.functions.ts` and `src/lib/admin/admin.functions.ts` use
  `.middleware([requireSupabaseAuth])`, then `assertAdmin(context.userId)`
  (`src/lib/admin/dashboard.server.ts`) before touching `supabaseAdmin`.
- `src/start.ts` registers `attachSupabaseAuth` as `functionMiddleware`, which
  attaches the caller's bearer token so the middleware can verify it.
- `supabaseAdmin` (service role, bypasses RLS) is always imported **inside** the
  handler after the role check.

Because protected server functions throw `401` without a session, they must never be
called from a public route loader — the admin screens call them from components /
`useQuery`.

## Admin user management

`src/lib/admin/admin.functions.ts` (all authenticated):

- `listAdmins` — reads `user_roles` and enriches each row via
  `supabaseAdmin.auth.admin.getUserById`.
- `inviteAdmin` — `auth.admin.inviteUserByEmail`, then inserts the `user_roles` row
  and writes an `audit_logs` entry.
- `removeUserRole` — deletes the role row and writes an `audit_logs` entry.
- `getPassportSignedUrl` — mints a short-lived signed URL for a booking passport.
- `getDashboardStats` — aggregate counts for the dashboard.

UI: `src/routes/admin.admins.tsx` and the Team section under Settings.

## Password gate / other auth

None. There is no shared-password site gate, no OAuth social provider configured in
code (`UNKNOWN — VERIFY IN CODE` whether a provider is enabled in the Cloud
project), and no per-end-user connector flow. The `/.lovable/oauth/consent` route
and `/.well-known/oauth-protected-resource` exist solely for the MCP server
(see `10-operations.md`).
