import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Compass, ShieldCheck, HeartHandshake, PhoneCall } from "lucide-react";

export function UmrahCtaBanner() {
  return (
    <section
      aria-label="رحلات العمرة مع وكالة جنة الصحراء"
      className="relative my-12 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-amber-500/[0.05] p-6 md:p-10 shadow-sm"
    >
      {/* Decorative subtle background circle */}
      <div
        className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 max-w-2xl space-y-5 text-start">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-raised px-3 py-1 text-caption font-semibold text-primary">
          <Compass className="h-3.5 w-3.5" aria-hidden />
          <span>رحلات العمرة 1446 - 1447 هـ</span>
        </div>

        <h3 className="text-[clamp(1.4rem,1.2rem+1vw,2rem)] font-extrabold text-foreground leading-snug">
          تستعد لأداء مناسك العمرة؟
        </h3>

        <p className="text-body text-muted-foreground leading-relaxed">
          ترافقكم{" "}
          <strong className="font-semibold text-foreground">«وكالة جنة الصحراء للأسفار»</strong> في
          جميع مراحل رحلتكم المباركة؛ من تأشيرات السفر والإقامة المريحة بجوار الحرمين الشريفين، إلى
          التأطير الديني والمرافقة الميدانية المتواصلة لتتفرغوا تماماً للعبادة والسكينة.
        </p>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-small text-foreground/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>وكالة أسفار مرخصة ومعتمدة</span>
          </div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
            <span>مرافقة وإرشاد ديني في كافة المناسك</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <Link
            to="/umrah"
            className="inline-flex items-center gap-2 rounded-button bg-primary px-6 py-3 text-body font-bold text-primary-foreground shadow-sm transition-all duration-base ease-standard hover:bg-primary/90 hover:shadow hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>اكتشف رحلات وباقات العمرة</span>
            <ArrowLeft className="h-4 w-4 rtl:rotate-0 rotate-180" aria-hidden />
          </Link>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface px-5 py-3 text-body font-semibold text-foreground transition-all duration-base ease-standard hover:border-primary/40 hover:text-primary"
          >
            <PhoneCall className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>تواصل مع مستشار العمرة</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
