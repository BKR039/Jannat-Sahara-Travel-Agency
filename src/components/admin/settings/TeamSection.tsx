import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSection } from "./parts";
import { useTranslation } from "react-i18next";

export function TeamSection() {
  const { t } = useTranslation("admin");
  return (
    <SettingsSection
      title={t("content.settings.nav.team.label")}
      description={t("content.settings.team.description")}
    >
      <SettingsCard
        title={t("content.settings.team.membersTitle")}
        description={t("content.settings.team.membersDescription")}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2.5 text-small text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            {t("content.settings.team.managedElsewhere")}
          </p>
          <Button asChild size="sm">
            <Link to="/admin/admins">{t("content.settings.team.manageTeam")}</Link>
          </Button>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
