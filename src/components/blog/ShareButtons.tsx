import { useTranslation } from "react-i18next";
import { Copy, Facebook, Share2, MessageCircle, Twitter } from "lucide-react";
import { toast } from "sonner";
import { articleUrl, shareLinks } from "@/lib/blog";

export function ShareButtons({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const { t } = useTranslation();
  const links = shareLinks(slug, title);

  const nativeShare = async () => {
    const url = articleUrl(slug);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    await copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl(slug));
      toast.success(t("blog.linkCopied"));
    } catch {
      toast.error(t("blog.copyFailed"));
    }
  };

  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-card text-muted-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary hover:text-primary";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-caption font-semibold text-muted-foreground">{t("blog.share")}</span>
      <button type="button" onClick={nativeShare} className={base} aria-label={t("blog.shareArticle")}>
        <Share2 className="h-4 w-4" />
      </button>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={base} aria-label={t("blog.shareWhatsapp")}>
        <MessageCircle className="h-4 w-4" />
      </a>
      <a href={links.facebook} target="_blank" rel="noopener noreferrer" className={base} aria-label={t("blog.shareFacebook")}>
        <Facebook className="h-4 w-4" />
      </a>
      <a href={links.x} target="_blank" rel="noopener noreferrer" className={base} aria-label={t("blog.shareX")}>
        <Twitter className="h-4 w-4" />
      </a>
      <button type="button" onClick={copy} className={base} aria-label={t("blog.copyLink")}>
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
