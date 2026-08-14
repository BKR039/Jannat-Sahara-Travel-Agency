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
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function BranchesMap({ branches, activeId, onSelect }: Props) {
  const { t } = useTranslation();
  const { L: loc, isFr } = useLocalized();
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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomright" />
      <FitToBranches branches={branches} hasActive={!!activeId} />
      <FlyTo target={active} />
      {branches.map((b) => (
        <Marker
          key={b.id}
          position={[Number(b.latitude), Number(b.longitude)]}
          icon={brandMarkerIcon(b.id === activeId)}
          ref={(ref) => {
            markerRefs.current[b.id] = ref;
          }}
          eventHandlers={{
            click: () => onSelect(b.id),
          }}
        >
          <Popup>
            <div
              className="min-w-[230px] space-y-2 p-1 text-start"
              dir={isFr ? "ltr" : "rtl"}
            >
              <div className="text-body font-bold text-primary">{loc(b, "name", "base")}</div>
              <div className="text-caption leading-relaxed text-muted-foreground">
                {loc(b, "address", "base")}
              </div>
              {b.phone && (
                <a
                  href={`tel:${b.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-1.5 text-caption font-medium"
                  dir="ltr"
                >
                  <Phone className="h-3 w-3" />
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
                  <Navigation className="h-3 w-3" />
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
