import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Plane, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  searchAirports,
  formatAirport,
  airportCity,
  airportCountry,
  describeAirportValue,
  type Airport,
} from "@/lib/airports";
import { cn } from "@/lib/utils";

/**
 * Searchable airport picker with full keyboard navigation (↑ ↓ Enter Esc)
 * and RTL-friendly layout. Value is the human readable airport label.
 *
 * The catalogue is a curated 61-airport list, which is a convenience rather
 * than a constraint: `flight_requests.from_airport` / `to_airport` are free
 * text. A traveller asking to fly from somewhere the list does not carry used
 * to hit a dead-end "no results" and could not submit at all, because the
 * typed query was thrown away unless it matched a catalogue entry. Anything
 * typed can now be committed as-is and is marked as a custom entry, so an
 * operator can see the difference between a verified airport and a place the
 * customer named. No IATA code is invented for it.
 *
 * Presentation note: the closed state is a *selection*, not an input holding
 * text. A chosen airport reads as name / code / city-country, which is how a
 * traveller recognises an airport, and a custom entry reads as the words they
 * typed under a plain "custom" label. The editable input appears when the
 * field is opened for searching.
 */
export function AirportCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  invalid,
  direction,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** Which end of the trip this field is, so the custom-entry option can say
   *  "depart from" rather than calling every field a destination. */
  direction: "from" | "to";
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAirports(query, 60), [query]);
  const described = useMemo(() => describeAirportValue(value, lang), [value, lang]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function select(a: Airport) {
    onChange(formatAirport(a, lang));
    setQuery("");
    setOpen(false);
  }

  /** Commit whatever the traveller typed, with no invented airport code. */
  function selectCustom(raw: string) {
    const text = raw.trim();
    if (!text) return;
    onChange(text);
    setQuery("");
    setOpen(false);
  }

  const trimmedQuery = query.trim();
  /*
   * Offered only when the catalogue has nothing to suggest. Showing it
   * alongside real matches put "use TUN as the destination" above the actual
   * Tunis-Carthage entry, which buries the better answer.
   */
  const showCustomOption = trimmedQuery.length > 1 && results.length === 0;
  const activeId = results[active] ? `${id}-opt-${results[active].code}` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5" ref={wrapRef}>
      <label
        htmlFor={id}
        className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>

      <div className="relative">
        {/*
         * Two faces of one control. Closed, it displays the chosen airport the
         * way a traveller reads one; open, it is the search input. Both carry
         * the same id semantics so the label and the listbox stay wired up.
         */}
        {open ? (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              ref={inputRef}
              id={id}
              role="combobox"
              aria-expanded
              aria-controls={`${id}-listbox`}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              className={cn(
                "h-16 w-full rounded-input border bg-surface ps-12 pe-4 text-body text-foreground",
                "transition-[border-color,box-shadow] duration-fast ease-standard",
                "placeholder:text-muted-foreground/80 focus:outline-none",
                "border-primary ring-4 ring-primary/15",
              )}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  const pick = results[active];
                  if (pick) {
                    e.preventDefault();
                    select(pick);
                  } else if (showCustomOption) {
                    // Nothing matched — commit what was typed rather than
                    // trapping the traveller on a dead-end "no results".
                    e.preventDefault();
                    selectCustom(trimmedQuery);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                } else if (e.key === "Tab") {
                  setOpen(false);
                }
              }}
            />
          </div>
        ) : (
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={false}
            aria-controls={`${id}-listbox`}
            aria-haspopup="listbox"
            onClick={() => {
              setQuery("");
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setQuery("");
                setActive(0);
                setOpen(true);
              }
            }}
            className={cn(
              "flex h-16 w-full items-center gap-3 rounded-input border bg-surface px-4 text-start",
              "transition-[border-color,box-shadow] duration-fast ease-standard",
              "hover:border-primary/50",
              "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
              invalid ? "border-destructive" : "border-border",
            )}
          >
            {described.kind === "catalogue" ? (
              /* The IATA code is the airport's identity — it gets its own
                 block rather than being punctuation inside a sentence. */
              <span
                dir="ltr"
                className="inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-input bg-primary/10 text-small font-bold tracking-wide text-primary"
              >
                {described.code}
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-input",
                  described.kind === "custom"
                    ? "bg-surface-sunken text-primary"
                    : "text-muted-foreground",
                )}
              >
                {described.kind === "custom" ? (
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Plane className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
                )}
              </span>
            )}

            <span className="min-w-0 flex-1">
              {described.kind === "empty" && (
                <span className="block truncate text-body text-muted-foreground/80">
                  {placeholder}
                </span>
              )}
              {described.kind === "catalogue" && (
                <>
                  <span className="block truncate text-body font-semibold text-foreground">
                    {lang.startsWith("ar") ? described.name : described.city}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground" dir="auto">
                    {described.city} · {described.country}
                  </span>
                </>
              )}
              {described.kind === "custom" && (
                <>
                  <span
                    className="block truncate text-body font-semibold text-foreground"
                    dir="auto"
                  >
                    {described.text}
                  </span>
                  {/* Never presented as a verified airport. */}
                  <span className="block truncate text-caption text-muted-foreground">
                    {t("flightRequest.customBadge")}
                  </span>
                </>
              )}
            </span>

            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t("flightRequest.clearAria")}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange("");
                  }
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </button>
        )}

        {open && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            ref={listRef}
            className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-card border border-border-subtle bg-popover p-1.5 shadow-xl ds-reveal"
          >
            {results.length === 0 && !showCustomOption && (
              <li className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
                <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-small font-medium text-foreground">
                  {t("flightRequest.noResults")}
                </span>
                <span className="text-caption text-muted-foreground">
                  {t("flightRequest.noResultsHint")}
                </span>
              </li>
            )}

            {showCustomOption && (
              <li
                role="option"
                aria-selected
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCustom(trimmedQuery);
                }}
                className="flex cursor-pointer gap-3 rounded-input bg-accent px-3 py-3 text-small leading-snug"
              >
                <MapPin className="ds-icon-lead text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-small font-semibold text-foreground" dir="auto">
                    {t(`flightRequest.useCustom.${direction}`, { value: trimmedQuery })}
                  </span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {t(`flightRequest.customHint.${direction}`)}
                  </span>
                </span>
              </li>
            )}

            {results.map((a, i) => (
              <li
                key={a.code}
                id={`${id}-opt-${a.code}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(a);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-input px-3 py-2.5 transition-colors",
                  i === active ? "bg-accent" : "hover:bg-muted",
                )}
              >
                <span
                  dir="ltr"
                  className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-input bg-primary/10 text-caption font-bold text-primary"
                >
                  {a.code}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-small font-semibold text-foreground">
                    {airportCity(a, lang)} · {airportCountry(a, lang)}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground" dir="auto">
                    {lang.startsWith("ar") ? a.name : `${a.cityEn} · ${a.code}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
