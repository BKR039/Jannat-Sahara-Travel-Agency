import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { saveOffer, sendOffer } from "@/lib/admin/offer.functions";
import { offerHasContent, upsertHotelLine } from "@/lib/admin/offer-text";
import { hotelsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { shortDate } from "@/components/admin/kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * The offer for one custom Umrah request: proposed hotels and flights, the
 * price, the note that goes with it, and sending it to the traveller.
 *
 * This used to be the tail of a 540-line panel that also reprinted twenty-six
 * database fields above it, so the one part of the screen the operator has to
 * fill in was the part they had to scroll to find. The request itself is now
 * summarised by `RequestDetail`; what is left here is the offer, which is real
 * business machinery and is unchanged: the same `saveOffer` / `sendOffer`
 * server functions, the same hotel-catalogue validation, the same
 * review-before-send step, and `offer_sent_at` still written only when the mail
 * provider actually accepted the message.
 *
 * `offer_amount` / `offer_currency` are columns that already exist on
 * `custom_package_requests` — the price is a real field here, not a number
 * buried in a note.
 */

export type RequestRow = Record<string, string | number | boolean | null>;

const CURRENCIES = ["TND", "EUR", "USD", "SAR"] as const;

/** Sentinel for "the traveller did not provide this"; rendered as translated text. */
const NOT_SET = "\u0000not-set";

function text(row: RequestRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined || v === "") return NOT_SET;
  return String(v);
}

function num(row: RequestRow, key: string): number {
  const v = Number(row[key]);
  return Number.isFinite(v) ? v : 0;
}

export function CustomOfferPanel({ row }: { row: RequestRow }) {
  const id = String(row["id"] ?? "");
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin");
  const save = useServerFn(saveOffer);
  const send = useServerFn(sendOffer);

  const { data: makkahHotels } = useQuery(hotelsQuery("makkah"));
  const { data: madinahHotels } = useQuery(hotelsQuery("madinah"));

  const [proposedHotels, setProposedHotels] = useState(String(row["proposed_hotels"] ?? ""));
  const [proposedFlights, setProposedFlights] = useState(String(row["proposed_flights"] ?? ""));
  const [amount, setAmount] = useState(
    row["offer_amount"] == null ? "" : String(row["offer_amount"]),
  );
  const [currency, setCurrency] = useState(String(row["offer_currency"] ?? "TND"));
  const [notes, setNotes] = useState(String(row["offer_notes"] ?? ""));
  const [reviewing, setReviewing] = useState(false);

  const sentAt = row["offer_sent_at"] ? String(row["offer_sent_at"]) : null;
  const customerEmail = row["email"] ? String(row["email"]) : "";

  const travellers = useMemo(
    () =>
      [
        t("ops.requests.travellers.adults", { count: num(row, "adults") }),
        num(row, "children")
          ? t("ops.requests.travellers.children", { count: num(row, "children") })
          : "",
        num(row, "infants")
          ? t("ops.requests.travellers.infants", { count: num(row, "infants") })
          : "",
      ]
        .filter(Boolean)
        .join(" \u00b7 "),
    [row, t],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-open-requests"] });
    // Sending an offer clears this request from the dashboard's
    // "awaiting offer" insight, so the Command Center must refetch too.
    queryClient.invalidateQueries({ queryKey: ["admin-command-center"] });
    queryClient.invalidateQueries({ queryKey: ["admin-request-activity", id] });
  };

  const parsedAmount = amount.trim() === "" ? null : Number(amount);
  const amountValid = parsedAmount === null || (Number.isFinite(parsedAmount) && parsedAmount >= 0);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id,
          proposedHotels: proposedHotels || null,
          proposedFlights: proposedFlights || null,
          offerAmount: parsedAmount,
          offerCurrency: currency as (typeof CURRENCIES)[number],
          offerNotes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("ops.offers.toastSaved"));
      invalidate();
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      if (raw.includes("HOTEL_UNKNOWN")) toast.error(t("ops.offers.errorHotelUnknown"));
      else if (raw.includes("REQUEST_CLOSED")) toast.error(t("ops.offers.errorClosed"));
      else toast.error(t("ops.offers.toastSaveFailed"));
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => send({ data: { id } }),
    onSuccess: () => {
      toast.success(t("ops.offers.toastSent"));
      invalidate();
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      if (raw.includes("OFFER_SENT_NOT_RECORDED"))
        toast.error(t("ops.offers.errorSentNotRecorded"));
      else if (raw.includes("OFFER_ALREADY_SENT")) toast.error(t("ops.offers.errorAlreadySent"));
      else if (raw.includes("REQUEST_CLOSED")) toast.error(t("ops.offers.errorClosed"));
      else if (raw.includes("OFFER_NO_AMOUNT")) toast.error(t("ops.offers.errorNoAmount"));
      else if (raw.includes("HOTEL_UNKNOWN")) toast.error(t("ops.offers.errorHotelUnknown"));
      else if (raw.includes("NO_CUSTOMER_EMAIL")) toast.error(t("ops.offers.errorNoEmail"));
      else if (raw.includes("OFFER_EMPTY")) toast.error(t("ops.offers.errorEmpty"));
      else if (raw.includes("EMAIL_NOT_CONFIGURED"))
        toast.error(t("ops.offers.errorNotConfigured"));
      else toast.error(t("ops.offers.errorSendFailed"));
    },
  });

  const canSend = !!customerEmail && !sendMutation.isPending && !sentAt;

  /** The offer exactly as the form holds it, for the review step. */
  const draft = {
    proposedHotels: proposedHotels || null,
    proposedFlights: proposedFlights || null,
    offerAmount: parsedAmount,
    offerNotes: notes || null,
  };
  const readyToReview = amountValid && parsedAmount != null && offerHasContent(draft);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------ offer */}
      <div className="rounded-card border border-primary/25 bg-primary/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-caption font-bold uppercase tracking-wider text-primary">
            {t("ops.offers.title")}
          </h3>
          {sentAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
              <Check className="h-3.5 w-3.5" />{" "}
              {t("ops.offers.sentOn", { date: shortDate(sentAt) })}
            </span>
          ) : (
            <span className="rounded-full bg-surface-sunken px-3 py-1 text-caption text-muted-foreground">
              {t("ops.offers.notSent")}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="offer-hotels">{t("ops.offers.proposedHotels")}</Label>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={t("ops.offers.addMakkahHotel")}
                value=""
                onChange={(e) =>
                  e.target.value &&
                  setProposedHotels((v) => upsertHotelLine(v, "Makkah", e.target.value))
                }
                className="h-9 rounded-lg border border-border bg-background px-2 text-caption"
              >
                <option value="">{t("ops.offers.addMakkahHotel")}</option>
                {(makkahHotels ?? []).map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("ops.offers.addMadinahHotel")}
                value=""
                onChange={(e) =>
                  e.target.value &&
                  setProposedHotels((v) => upsertHotelLine(v, "Madinah", e.target.value))
                }
                className="h-9 rounded-lg border border-border bg-background px-2 text-caption"
              >
                <option value="">{t("ops.offers.addMadinahHotel")}</option>
                {(madinahHotels ?? []).map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              id="offer-hotels"
              rows={3}
              value={proposedHotels}
              onChange={(e) => setProposedHotels(e.target.value)}
              placeholder={t("ops.offers.hotelsPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-flights">{t("ops.offers.proposedFlights")}</Label>
            <Textarea
              id="offer-flights"
              rows={3}
              value={proposedFlights}
              onChange={(e) => setProposedFlights(e.target.value)}
              placeholder={t("ops.offers.flightsPlaceholder")}
            />
            <p className="text-caption text-muted-foreground">{t("ops.offers.flightsHint")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="offer-amount">{t("ops.offers.amount")}</Label>
              <Input
                id="offer-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("ops.offers.amountPlaceholder")}
              />
              {!amountValid && (
                <p className="text-caption text-destructive">{t("ops.offers.amountInvalid")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-currency">{t("ops.offers.currency")}</Label>
              <select
                id="offer-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-small"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-notes">{t("ops.offers.notes")}</Label>
            <Textarea
              id="offer-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("ops.offers.notesPlaceholder")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!amountValid || saveMutation.isPending}
            >
              {saveMutation.isPending ? t("ops.offers.saving") : t("ops.offers.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setReviewing(true)}
              disabled={!readyToReview || !canSend}
              title={customerEmail ? undefined : t("ops.offers.noEmailTitle")}
            >
              <Eye className="me-2 h-4 w-4" />
              {t("ops.offers.review")}
            </Button>
            <p className="text-caption text-muted-foreground">
              {sentAt
                ? t("ops.offers.alreadySentHint")
                : customerEmail
                  ? t("ops.offers.sendHint")
                  : t("ops.offers.noEmailHint")}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- review before send */}
      <AlertDialog open={reviewing} onOpenChange={(o) => !o && setReviewing(false)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ops.offers.previewTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ops.offers.previewDescription", { email: customerEmail })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="space-y-3 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
            <PreviewRow label={t("ops.requests.fields.name")} value={text(row, "customer_name")} />
            <PreviewRow
              label={t("ops.requests.sections.dates")}
              value={`${text(row, "departure_date")} → ${text(row, "return_date")}`}
            />
            <PreviewRow label={t("ops.requests.fields.party")} value={travellers} />
            <PreviewRow
              label={t("ops.offers.proposedHotels")}
              value={proposedHotels || NOT_SET}
              multiline
            />
            <PreviewRow
              label={t("ops.offers.proposedFlights")}
              value={proposedFlights || NOT_SET}
              multiline
            />
            <PreviewRow
              label={t("ops.offers.amount")}
              value={
                parsedAmount == null
                  ? NOT_SET
                  : `${parsedAmount.toLocaleString("en-US")} ${currency}`
              }
            />
            <PreviewRow label={t("ops.offers.notes")} value={notes || NOT_SET} multiline />
          </dl>

          <p className="text-caption text-muted-foreground">{t("ops.offers.previewWarning")}</p>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.offers.backToEdit")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendMutation.isPending}
              onClick={() => {
                setReviewing(false);
                sendMutation.mutate();
              }}
            >
              <Send className="me-2 h-4 w-4" />
              {sendMutation.isPending ? t("ops.offers.sending") : t("ops.offers.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** One line of the offer preview. Missing values read as "not specified". */
function PreviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const { t } = useTranslation("admin");
  const missing = value === NOT_SET;
  return (
    <div className="min-w-0">
      <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-small",
          missing && "italic text-muted-foreground/70",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {missing ? t("ops.requests.notSpecified") : value}
      </dd>
    </div>
  );
}
