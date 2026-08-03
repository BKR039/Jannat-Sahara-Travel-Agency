import { useEffect, useMemo, useRef, useState } from "react";
import { Plane, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  searchAirports,
  formatAirport,
  airportCity,
  airportCountry,
  type Airport,
} from "@/lib/airports";
import { cn } from "@/lib/utils";

/**
 * Searchable airport picker with full keyboard navigation (↑ ↓ Enter Esc)
 * and RTL-friendly layout. Value is the human readable airport label.
 */
export function AirportCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchAirports(query, 60), [query]);

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
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function select(a: Airport) {
    onChange(formatAirport(a, lang));
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
      <label htmlFor={id} className="text-small font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">
          <Plane className="h-5 w-5 rtl:-scale-x-100" />
        </span>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          className={cn(
            "h-14 w-full rounded-[var(--radius-card)] border bg-card ps-12 pe-10 text-body text-foreground shadow-sm transition-all duration-base ease-standard placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
            invalid ? "border-destructive" : "border-border-subtle",
          )}
          placeholder={placeholder}
          value={open ? query : value}
          onFocus={() => {
            setQuery("");
            setActive(0);
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open) {
              const pick = results[active];
              if (pick) {
                e.preventDefault();
                select(pick);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {value && !open && (
          <button
            type="button"
            aria-label={t("flightRequest.clearAria")}
            onClick={() => onChange("")}
            className="absolute inset-y-0 end-3 flex items-center text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && (
          <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
        )}

        {open && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            ref={listRef}
            className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-[var(--radius-card)] border border-border-subtle bg-popover p-1.5 shadow-xl ds-reveal"
          >
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-small text-muted-foreground">
                {t("flightRequest.noResults")}
              </li>
            )}
            {results.map((a, i) => (
              <li
                key={a.code}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(a);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  i === active ? "bg-accent" : "hover:bg-muted",
                )}
              >
                <span className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-caption font-bold text-primary">
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
