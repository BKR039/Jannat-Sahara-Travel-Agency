import { supabase } from "@/integrations/supabase/client";

/**
 * Remove the notifications that point at a record being deleted.
 *
 * `notifications.entity_id` is plain text with no foreign key, so nothing in
 * the database removes a notification when its subject disappears. Bookings
 * and contact messages both raise a notification on insert AND can be deleted
 * from Admin, which leaves a row saying "New booking" for a booking that no
 * longer exists — misleading, and it keeps inflating the unread badge.
 *
 * Cleaning up in the same mutation is the fix that needs no schema change. It
 * is best-effort on purpose: the record itself is already gone, so failing the
 * whole delete because a notification could not be tidied would be worse than
 * leaving one behind.
 *
 * Custom Umrah requests are not listed here because Admin has no way to delete
 * one — the only orphans they can produce come from manual database work.
 */
export async function deleteNotificationsFor(entity: string, entityId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("entity", entity)
    .eq("entity_id", entityId);
  if (error) console.error("[notifications] cleanup failed", error.message);
}
