import { icons, type LucideProps } from "lucide-react";
import { Sparkles } from "lucide-react";

type IconName = keyof typeof icons;

function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
}

type Props = Omit<LucideProps, "ref"> & { name?: string | null };

export function DynamicIcon({ name, ...props }: Props) {
  if (!name) return <Sparkles {...props} />;
  const key = toPascal(name) as IconName;
  const Icon = icons[key] ?? Sparkles;
  return <Icon {...props} />;
}
