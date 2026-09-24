import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ArchiveFilterSchema = z.object({
  entityType: z.enum(["all", "client", "request", "trip"]).optional().default("all"),
  search: z.string().optional().default(""),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});

const ArchiveEntitySchema = z.object({
  entityType: z.enum(["client", "request", "trip"]),
  subType: z
    .enum([
      "customer_profile",
      "booking",
      "custom_package_request",
      "flight_request",
      "contact_message",
      "package",
    ])
    .optional(),
  id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const RestoreEntitySchema = z.object({
  entityType: z.enum(["client", "request", "trip"]),
  subType: z
    .enum([
      "customer_profile",
      "booking",
      "custom_package_request",
      "flight_request",
      "contact_message",
      "package",
    ])
    .optional(),
  id: z.string().min(1),
});

const DeleteEntitySchema = z.object({
  entityType: z.enum(["client", "request", "trip"]),
  subType: z.enum([
    "customer_profile",
    "booking",
    "custom_package_request",
    "flight_request",
    "contact_message",
    "package",
  ]),
  id: z.string().min(1),
});

/**
 * Loads real database summary counts for archived clients, requests, and trips.
 */
export const getArchiveCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "archive.view");

    const { getArchiveSummaryCounts } = await import("./archive.server");
    return await getArchiveSummaryCounts();
  });

/**
 * Lists archived records matching filters.
 */
export const listArchivedRecordsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ArchiveFilterSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "archive.view");

    const { listArchivedRecords } = await import("./archive.server");
    return await listArchivedRecords(data);
  });

/**
 * Checks dependencies before permanent deletion.
 */
export const checkDependenciesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => DeleteEntitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "archive.delete");

    const { checkEntityDependencies } = await import("./archive.server");
    return await checkEntityDependencies(data);
  });

/**
 * Archives an active record (client, request, or trip).
 */
export const archiveRecordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ArchiveEntitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireAdmin, requireAnyPermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requireAnyPermission(context.userId, [
      "archive.view",
      "customers.edit",
      "bookings.edit",
      "trips.edit",
    ]);

    const { archiveEntity } = await import("./archive.server");
    const actorEmail = (context.claims?.email as string) ?? null;
    const actorName = (context.claims?.full_name as string) ?? (context.claims?.name as string) ?? undefined;

    return await archiveEntity({
      ...data,
      actorId: context.userId,
      actorEmail,
      actorName,
    });
  });

/**
 * Restores an archived record.
 */
export const restoreRecordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => RestoreEntitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "archive.restore");

    const { restoreEntity } = await import("./archive.server");
    const actorEmail = (context.claims?.email as string) ?? null;
    const actorName = (context.claims?.full_name as string) ?? (context.claims?.name as string) ?? undefined;

    return await restoreEntity({
      ...data,
      actorId: context.userId,
      actorEmail,
      actorName,
    });
  });

/**
 * Permanently deletes an archived record. Fails if dependencies exist.
 */
export const permanentDeleteRecordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => DeleteEntitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "archive.delete");

    const { permanentlyDeleteEntity } = await import("./archive.server");
    const actorEmail = (context.claims?.email as string) ?? null;
    const actorName = (context.claims?.full_name as string) ?? (context.claims?.name as string) ?? undefined;

    return await permanentlyDeleteEntity({
      ...data,
      actorId: context.userId,
      actorEmail,
      actorName,
    });
  });
