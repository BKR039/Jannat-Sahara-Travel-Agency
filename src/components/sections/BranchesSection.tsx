import { Suspense, lazy, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  Eye,
  Star,
  MessageCircle,
  Facebook,
  Instagram,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { branchesQuery, contactInfoQuery, type Branch } from "@/lib/queries";

const BranchesMap = lazy(() => import("./BranchesMap"));

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl bg-muted/40">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function ContactCard() {
  const { t } = useTranslation();
  const { data } = useQuery(contactInfoQuery());
  const items = data ?? [];

  const phones = items.filter((i) => i.key === "phone");
  const emails = items.filter((i) => i.key === "email");
  const whatsapp = items.find((i) => i.key === "whatsapp");
  const hours = items.find((i) => i.key === "hours" || i.key === "working_hours");
  const socials = items.filter((i) =>
    ["facebook", "instagram", "youtube", "twitter", "tiktok"].includes(i.key),
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-lg shadow-primary/5 backdrop-blur-xl md:p-7">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{t("branches.contactCard.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("branches.contactCard.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {phones.map((p) => (
          <a
            key={p.id}
            href={`tel:${p.value.replace(/\s+/g, "")}`}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5"
          >
            <Phone className="h-4 w-4 text-primary" />
            <span dir="ltr" className="font-medium">{p.value}</span>
          </a>
        ))}
        {emails.map((e) => (
          <a
            key={e.id}
            href={`mailto:${e.value}`}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5"
          >
            <Mail className="h-4 w-4 text-primary" />
            <span className="truncate">{e.value}</span>
          </a>
        ))}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.value.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
            <span dir="ltr" className="font-medium">{whatsapp.value}</span>
          </a>
        )}
        {hours && (
          <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2">
            <Clock className="mt-0.5 h-4 w-4 text-primary" />
            <span>{hours.value}</span>
          </div>
        )}
      </div>

      {socials.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("branches.contactCard.follow")}
          </p>
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.key] ?? Navigation;
              return (
                <a
                  key={s.id}
                  href={s.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label ?? s.key}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition hover:scale-110 hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCard({
  branch,
  active,
  onView,
}: {
  branch: Branch;
  active: boolean;
  onView: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-card/70 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        active
          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30"
          : "border-border/60 shadow-sm shadow-primary/5"
      }`}
    >
      {branch.is_main_branch && (
        <div className="absolute top-4 end-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
          <Star className="h-3 w-3 fill-primary" />
          {t("branches.mainBranch")}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-bold leading-tight">{branch.name}</h3>
          <p className="text-xs text-muted-foreground">{branch.city}</p>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{branch.address}</p>

      <div className="mb-4 space-y-1.5 text-xs">
        {branch.phone && (
          <a
            href={`tel:${branch.phone.replace(/\s+/g, "")}`}
            className="flex items-center gap-2 text-foreground/80 hover:text-primary"
          >
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span dir="ltr">{branch.phone}</span>
          </a>
        )}
        {branch.email && (
          <a
            href={`mailto:${branch.email}`}
            className="flex items-center gap-2 truncate text-foreground/80 hover:text-primary"
          >
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{branch.email}</span>
          </a>
        )}
        {branch.working_hours && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{branch.working_hours}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(branch.id)}
          className="flex-1"
        >
          <Eye className="me-1.5 h-3.5 w-3.5" />
          {t("branches.viewOnMap")}
        </Button>
        {branch.google_maps_url && (
          <Button
            size="sm"
            asChild
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <a href={branch.google_maps_url} target="_blank" rel="noopener noreferrer">
              <Navigation className="me-1.5 h-3.5 w-3.5" />
              {t("branches.directions")}
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

export function BranchesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(branchesQuery());
  const branches = data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isLoading && branches.length === 0) return null;

  const jsonLd = branches.map((b) => ({
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: b.name,
    address: { "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city, addressCountry: "TN" },
    telephone: b.phone ?? undefined,
    email: b.email ?? undefined,
    geo: { "@type": "GeoCoordinates", latitude: Number(b.latitude), longitude: Number(b.longitude) },
    openingHours: b.working_hours ?? undefined,
    url: b.google_maps_url ?? undefined,
  }));

  return (
    <section
      id="branches"
      aria-labelledby="branches-heading"
      className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-28"
    >
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 end-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 start-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow="✦"
          title={t("branches.title")}
          description={t("branches.subtitle")}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-1.5 shadow-xl shadow-primary/10 backdrop-blur">
              <Suspense fallback={<MapSkeleton />}>
                {mounted && branches.length > 0 ? (
                  <BranchesMap
                    branches={branches}
                    activeId={activeId}
                    onSelect={setActiveId}
                  />
                ) : (
                  <MapSkeleton />
                )}
              </Suspense>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <ContactCard />

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="h-5 w-5 text-primary" />
                {t("branches.ourBranches")}
                <span className="text-sm font-normal text-muted-foreground">
                  ({branches.length})
                </span>
              </h3>
              {isLoading ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : (
                branches.map((b) => (
                  <BranchCard
                    key={b.id}
                    branch={b}
                    active={b.id === activeId}
                    onView={setActiveId}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
