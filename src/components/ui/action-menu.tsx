"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  variant?: "default" | "destructive";
  destructive?: boolean;
  separatorBefore?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  title?: string;
  label?: string;
  align?: "start" | "center" | "end";
  size?: "default" | "sm";
  className?: string;
  triggerClassName?: string;
  trigger?: React.ReactNode;
}

export function ActionMenu({
  items,
  title = "خيارات إضافية",
  label,
  align = "end",
  size = "sm",
  className,
  triggerClassName,
  trigger,
}: ActionMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="ghost"
            size={size === "sm" ? "icon-xs" : "icon-sm"}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              triggerClassName,
            )}
            title={title}
            aria-label={title}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn("w-48 p-1", className)}>
        {label && (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-caption font-semibold text-muted-foreground truncate">
              {label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-muted" />
          </>
        )}
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const isDestructive = item.destructive || item.variant === "destructive";

          return (
            <React.Fragment key={item.key || idx}>
              {item.separatorBefore && (
                <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-muted" />
              )}
              <DropdownMenuItem
                onClick={item.onClick}
                disabled={item.disabled}
                asChild={item.asChild}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-small font-medium outline-none transition-colors",
                  isDestructive
                    ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                    : "text-foreground hover:bg-accent focus:bg-accent",
                  item.disabled && "pointer-events-none opacity-50",
                )}
              >
                {item.asChild ? (
                  item.children
                ) : (
                  <>
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isDestructive ? "text-destructive" : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
