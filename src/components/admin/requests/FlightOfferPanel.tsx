import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateRequest } from "@/lib/admin/command.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { UnifiedRequest } from "./RequestDetail";

/**
 * The quote an operator gives on a flight request.
 *
 * `flight_requests` has no numeric price column — unlike
 * `custom_package_requests`, which carries `offer_amount` / `offer_currency`
 * and gets a real number field. The one place a flight quote already lives is
 * `admin_reply`, the text the agency sends back, and the lifecycle already has
 * a `quoted` status for it. So the price is written here, in the offer itself,
 * rather than being packed into some unrelated column to look structured.
 *
 * Giving flight requests a numeric price properly means two nullable columns on
 * `flight_requests`, mirroring the custom-Umrah ones. That is a schema change
 * and is left as a proposal rather than made here.
 */
export function FlightOfferPanel({ row }: { row: UnifiedRequest }) {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const save = useServerFn(updateRequest);
  const [reply, setReply] = useState(String(row.detail["admin_reply"] ?? ""));

  const mutation = useMutation({
    mutationFn: (value: string) =>
      save({ data: { id: row.id, kind: "flight" as const, admin_reply: value } }),
    onSuccess: () => {
      toast.success(t("ops.requests.toastUpdated"));
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flight-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-request-activity", row.id] });
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      if (raw.includes("REQUEST_CLOSED")) toast.error(t("ops.requests.errorClosed"));
      else toast.error(t("ops.requests.toastUpdateFailed"));
    },
  });

  return (
    <section className="rounded-card border border-primary/25 bg-primary/[0.03] p-4">
      <h3 className="text-caption font-bold uppercase tracking-wider text-primary">
        {t("ops.requests.offerTitle")}
      </h3>
      <p className="mt-1 text-caption text-muted-foreground">{t("ops.requests.offerHint")}</p>
      <Textarea
        className="mt-2.5"
        rows={3}
        value={reply}
        aria-label={t("ops.requests.offerTitle")}
        placeholder={t("ops.flightRequests.replyPlaceholder")}
        onChange={(e) => setReply(e.target.value)}
      />
      <Button
        className="mt-2.5"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(reply)}
      >
        {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {t("ops.offers.save")}
      </Button>
    </section>
  );
}
