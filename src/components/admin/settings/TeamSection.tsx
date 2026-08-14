import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSection } from "./parts";

export function TeamSection() {
  return (
    <SettingsSection
      title="Team"
      description="Who can sign in to the admin dashboard and what they are allowed to do."
    >
      <SettingsCard
        title="Team members"
        description="Invite colleagues, change roles or revoke access."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2.5 text-small text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Team access is managed on the Admins page.
          </p>
          <Button asChild size="sm">
            <Link to="/admin/admins">Manage team</Link>
          </Button>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
