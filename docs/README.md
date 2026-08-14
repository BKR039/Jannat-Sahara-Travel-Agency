# Janat Sahara Travel — Developer Documentation

Documentation of the **actual implementation** in this repository. It is written so
that an agent or developer who just cloned the repo can navigate and extend it
without guessing.

Conventions used throughout:

- `NOT CONNECTED / PLACEHOLDER / FRONTEND ONLY` — UI exists, no backend wiring.
- `PARTIALLY IMPLEMENTED` — works for the main path only.
- `KNOWN LIMITATION` — implemented, but with a caveat worth knowing.
- `UNKNOWN — VERIFY IN CODE` — could not be verified from the repository.

## Index

| File | Contents |
| --- | --- |
| [01-project-overview.md](./01-project-overview.md) | Product, modules, admin ↔ DB ↔ public relationship, tech stack |
| [02-architecture.md](./02-architecture.md) | Frontend/backend/DB/storage architecture, server boundaries, diagrams |
| [03-database.md](./03-database.md) | Tables, enums, triggers, RLS, grants, storage buckets |
| [04-auth-and-permissions.md](./04-auth-and-permissions.md) | Sign-in, roles, admin gate, server-side authorization |
| [05-public-website.md](./05-public-website.md) | Public routes, sections, data sources, SEO |
| [06-admin-dashboard.md](./06-admin-dashboard.md) | Admin routes, Command Center, CRUD modules, settings, branches |
| [07-workflows.md](./07-workflows.md) | Booking, flight request, contact, newsletter, notifications, emails |
| [08-i18n.md](./08-i18n.md) | Language state, translation files, localized DB columns, RTL |
| [09-conventions-and-guardrails.md](./09-conventions-and-guardrails.md) | What must not change casually, where to add features |
| [10-operations.md](./10-operations.md) | Env vars, secrets, deployment/publishing, MCP, error handling |

## 60-second orientation

```
src/routes/            file-based routes (public + /admin + api/mcp)
src/components/        sections/, admin/, booking/, flights/, layout/, common/, ui/ (shadcn)
src/lib/queries.ts     all public read queries (TanStack Query options)
src/lib/*.functions.ts server functions (RPC) — public writes
src/lib/admin/         admin server functions + server-only data loaders
src/lib/i18n.ts        i18next instance (AR default, FR, EN)
src/locales/<lang>/    translation JSON (common + admin namespaces)
supabase/migrations/   the real schema history
```
