import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { X } from "lucide-react";

export function ImageLightbox({
  src,
  alt = "",
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute end-4 top-4 rounded-full bg-on-dark/10 p-2 text-on-dark transition hover:bg-on-dark/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
