import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SessionItem = { id: string; title: string };

type SessionSidebarProps = {
  sessions: SessionItem[];
  currentId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  className?: string;
};

/**
 * Session list with New Chat and delete actions.
 */
export function SessionSidebar({
  sessions,
  currentId,
  onSelect,
  onNewChat,
  onDelete,
  className,
}: SessionSidebarProps) {
  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <div className="p-2 border-b shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 min-h-10 md:min-h-7"
          onClick={onNewChat}
        >
          <PlusIcon className="size-3.5" />
          New Chat
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {sessions.map((s) => (
          <div key={s.id} className="group relative flex items-center">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "w-full text-left px-2 py-2.5 md:py-1.5 rounded-md text-sm truncate transition-colors pr-9 min-h-11 md:min-h-0",
                s.id === currentId
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {s.title}
            </button>
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              className="absolute right-1 hidden max-md:flex group-hover:flex group-focus-within:flex items-center justify-center size-8 md:size-5 rounded text-muted-foreground hover:text-destructive"
              aria-label="Delete session"
            >
              <Trash2Icon className="size-3.5 md:size-3" />
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
