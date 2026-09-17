import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { Navigation, Phone } from "lucide-react";
import type { Branch } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";

const brandMarkerIcon = (highlighted: boolean) =>
  L.divIcon({
    className: "janat-marker",
    html: `<div class="janat-pin${highlighted ? " janat-pin-active" : ""}">
        ${highlighted ? '<span class="janat-pin-pulse"></span>' : ""}
        <svg viewBox="0 0 32 42" width="${highlighted ? 42 : 32}" height="${highlighted ? 54 : 42}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="g-${highlighted ? "a" : "n"}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--color-orange-500)"/>
              <stop offset="1" stop-color="var(--color-teal-700)"/>
            </linearGradient>
          </defs>
          <path d="M16 0C7.16 0 0 7.05 0 15.75 0 27.2 14.14 40.4 15.02 41.18a1.44 1.44 0 0 0 1.96 0C17.86 40.4 32 27.2 32 15.75 32 7.05 24.84 0 16 0z" fill="url(#g-${highlighted ? "a" : "n"})"/>
          <circle cx="16" cy="15.5" r="6" fill="white"/>
          <circle cx="16" cy="15.5" r="3" fill="var(--color-orange-500)"/>
        </svg>
      </div>`,
    iconSize: highlighted ? [42, 54] : [32, 42],
    iconAnchor: highlighted ? [21, 52] : [16, 40],
    popupAnchor: [0, -42],
  });

function FitToBranches({ branches, hasActive }: { branches: Branch[]; hasActive: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (hasActive || !branches.length) return;
    if (branches.length === 1) {
      map.setView([Number(branches[0].latitude), Number(branches[0].longitude)], 12);
      return;
    }
    const bounds = L.latLngBounds(
      branches.map((b) => [Number(b.latitude), Number(b.longitude)] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
  }, [branches, map, hasActive]);
  return null;
}

function FlyTo({ target }: { target: Branch | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([Number(target.latitude), Number(target.longitude)], 14, {
      duration: 1.35,
      easeLinearity: 0.22,
    });
  }, [target, map]);
  return null;
}

interface Props {
  branches: Branch[];
  /**
   * Selection is optional: the homepage drives the map from a branch list
   * beside it, while the branches page just shows every office at once. Both
   * were previously impossible to express — the map demanded a selection model
   * its second caller does not have.
   */
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

export default function BranchesMap({ branches, activeId = null, onSelect }: Props) {
  const { t } = useTranslation();
  const { L: loc, rtl } = useLocalized();
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const active = useMemo(
    () => branches.find((b) => b.id === activeId) ?? null,
    [branches, activeId],
  );

  useEffect(() => {
    if (activeId && markerRefs.current[activeId]) {
      const timer = setTimeout(() => markerRefs.current[activeId]?.openPopup(), 700);
      return () => clearTimeout(timer);
    }
  }, [activeId]);

  const center: [number, number] = branches.length
    ? [Number(branches[0].latitude), Number(branches[0].longitude)]
    : [34.0, 9.5];

  return (
    <MapContainer
      center={center}
      zoom={6}
      scrollWheelZoom={false}
      zoomControl={false}
      className="janat-map h-full w-full"
      style={{ minHeight: "100%", background: "transparent" }}
    >
      {/*
       * Carto's Voyager endpoint now requires an API key: it still answers
       * 200, but every tile it returns is a grey "API KEY REQUIRED" watermark,
       * so the map read as broken wherever it appeared — the homepage branch
       * section included. OpenStreetMap's own tile server needs no key and is
       * the source this map already credits in its attribution.
       *
       * If the agency wants the warmer Voyager styling back, that is a Carto
       * (or Mapbox) account plus a key in the URL — a billing decision rather
       * than a code one.
       */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <FitToBranches branches={branches} hasActive={!!activeId} />
      <FlyTo target={active} />
      {branches.map((b) => (
        <Marker
          key={b.id}
          position={[Number(b.latitude), Number(b.longitude)]}
          icon={brandMarkerIcon(b.id === activeId)}
          // Leaflet copies `title` onto the marker element, which is what gives
          // this role=button div an accessible name. Without it a screen reader
          // announces every pin as an unnamed button.
          title={loc(b, "name", "base")}
          alt={loc(b, "name", "base")}
          ref={(ref) => {
            markerRefs.current[b.id] = ref;
          }}
          eventHandlers={{
            click: () => onSelect?.(b.id),
          }}
        >
          {/*
           * Bounded so the popup can never be wider than a small phone's map
           * viewport. Leaflet's own default maxWidth is 300px, which a long
           * Arabic branch name would otherwise push against.
           */}
          <Popup minWidth={200} maxWidth={260} autoPanPadding={[16, 16]}>
            <div className="max-w-full space-y-2 p-1 text-start" dir={rtl ? "rtl" : "ltr"}>
              <div className="text-body font-bold text-primary [overflow-wrap:anywhere]">
                {loc(b, "name", "base")}
              </div>
              <div className="text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {loc(b, "address", "base")}
              </div>
              {b.phone && (
                <a
                  href={`tel:${b.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-1.5 text-caption font-medium"
                  dir="ltr"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {b.phone}
                </a>
              )}
              {b.google_maps_url && (
                <a
                  href={b.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-caption font-semibold text-primary-foreground no-underline"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {t("branches.directions")}
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
