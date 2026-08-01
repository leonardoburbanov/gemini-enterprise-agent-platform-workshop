"use client";

import type { ReactNode } from "react";
import { InfoIcon, MessageSquareIcon } from "lucide-react";
import { BrandPanel } from "@/components/brand-panel";
import {
  SessionSidebar,
  type SessionItem,
} from "@/components/session-sidebar";
import { cn } from "@/lib/utils";

export type SideNavTab = "brand" | "chats";

type SideNavProps = {
  tab: SideNavTab;
  onTabChange: (tab: SideNavTab) => void;
  sessions: SessionItem[];
  currentId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  /** Compact banner when used inside a drawer. */
  compactBrand?: boolean;
  className?: string;
};

/**
 * Combined left panel: brand info and chat history behind a tab switcher.
 */
export function SideNav({
  tab,
  onTabChange,
  sessions,
  currentId,
  onSelect,
  onNewChat,
  onDelete,
  compactBrand = false,
  className,
}: SideNavProps) {
  return (
    <div className={cn("flex flex-col min-h-0 min-w-0", className)}>
      <div className="shrink-0 border-b p-2">
        <div
          role="tablist"
          aria-label="Panel sections"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1"
        >
          <TabButton
            active={tab === "brand"}
            onClick={() => onTabChange("brand")}
            icon={<InfoIcon className="size-3.5" />}
            label="Workshop"
          />
          <TabButton
            active={tab === "chats"}
            onClick={() => onTabChange("chats")}
            icon={<MessageSquareIcon className="size-3.5" />}
            label="Chats"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "brand" ? (
          <BrandPanel compact={compactBrand} className="h-full" />
        ) : (
          <SessionSidebar
            sessions={sessions}
            currentId={currentId}
            onSelect={onSelect}
            onNewChat={onNewChat}
            onDelete={onDelete}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
