import { cn } from "@/lib/utils";

type BrandPanelProps = {
  /** Smaller banner for drawer layouts. */
  compact?: boolean;
  className?: string;
};

/**
 * Workshop branding: event banner, title, links, and author block.
 */
export function BrandPanel({ compact = false, className }: BrandPanelProps) {
  return (
    <div className={cn("flex flex-col overflow-hidden min-w-0", className)}>
      <div className="p-4 flex flex-col gap-3 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <img
              src="https://res.cloudinary.com/startup-grind/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_1080,q_100,w_1080/v1/gcs/platform-data-goog/events/blob_oCUArSg"
              alt="Build with AI 2026"
              className={cn(
                "object-contain shrink-0 rounded-md",
                compact ? "size-10" : "size-12"
              )}
            />
            <h1 className="text-xs font-bold leading-snug min-w-0">
              Construye un Agente de IA que vende productos con Google ADK y
              Gemini Enterprise Agent Platform
            </h1>
          </div>
          <p className="text-xs leading-relaxed">
            A sales agent made with Google ADK and Gemini Enterprise Platform
          </p>
          <a
            href="https://github.com/leonardoburbanov/gemini-enterprise-agent-platform-workshop"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline flex items-center gap-1.5 min-w-0"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
              alt=""
              className="size-3.5 shrink-0"
            />
            <span className="truncate">
              github.com/leonardoburbanov/gemini-enterprise-agent-platform-workshop
            </span>
          </a>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="https://adk.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-2.5 hover:bg-muted transition-colors"
            >
              <img
                src="https://miro.medium.com/v2/1*A4-k_sI5kmrphjS4tJ_rpA.png"
                alt="Google ADK"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-medium text-muted-foreground">
                Google ADK
              </span>
            </a>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-2.5 hover:bg-muted transition-colors"
            >
              <img
                src="https://images.icon-icons.com/2642/PNG/512/google_cloud_logo_icon_159333.png"
                alt="Google Cloud"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-medium text-muted-foreground">
                Google Cloud
              </span>
            </a>
          </div>
        </div>

        <div className="border-t pt-3 flex flex-col gap-3">
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-semibold tracking-tight text-foreground">
              Leonardo Burbano
            </p>
            <p className="text-[11px] mt-0.5 leading-snug text-muted-foreground">
              Senior AI Engineer &amp; Tech Lead · Mercately [Techstars]
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <a
                href="https://github.com/leonardoburbanov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
                  alt=""
                  className="size-3 shrink-0 opacity-80"
                />
                <span className="truncate">GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/leoburbano"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/LinkedIn_icon.svg/1280px-LinkedIn_icon.svg.png"
                  alt=""
                  className="size-3 shrink-0"
                />
                <span className="truncate">LinkedIn</span>
              </a>
              <a
                href="https://www.instagram.com/leo.burbano.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSi8Gv6C1gj3gf4MFx2FUsXZcB4HXl9W-UrP8OFGcrQw&s"
                  alt=""
                  className="size-3 shrink-0 rounded-[2px] object-cover"
                />
                <span className="truncate">@leo.burbano.ai</span>
              </a>
              <a
                href="https://www.mercately.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 hover:bg-muted/60 transition-colors"
                aria-label="Mercately"
              >
                <img
                  src="https://citec.com.ec/wp-content/uploads/2025/06/LogotipoPrincipal_Mercately-1.png"
                  alt="Mercately"
                  className="h-3 w-auto object-contain"
                />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap opacity-55">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thoughtworks_logo.png/960px-Thoughtworks_logo.png?_=20210630172049"
              alt="Thoughtworks"
              className="h-3 w-auto object-contain"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/f/fe/Latam-logo_-v_%28Indigo%29.svg"
              alt="LATAM Airlines"
              className="h-4 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
