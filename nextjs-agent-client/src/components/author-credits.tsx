import type { ReactNode } from "react";

/**
 * Header author strip: name, socials, and Mercately.
 */
export function AuthorCredits() {
  return (
    <div className="flex items-center min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border bg-muted/40 pl-2.5 pr-1.5 py-1 min-w-0 shadow-[0_1px_0_oklch(0_0_0/0.04)]">
        <span className="text-[11px] sm:text-xs font-medium tracking-tight truncate max-w-[6.5rem] sm:max-w-[9rem]">
          Leonardo Burbano
        </span>

        <span
          className="hidden sm:block h-3.5 w-px bg-border shrink-0"
          aria-hidden
        />

        <div className="flex items-center gap-0.5 shrink-0">
          <SocialIcon
            href="https://github.com/leonardoburbanov"
            label="GitHub"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
              alt=""
              className="size-3.5 opacity-80"
            />
          </SocialIcon>
          <SocialIcon
            href="https://www.linkedin.com/in/leoburbano"
            label="LinkedIn"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/LinkedIn_icon.svg/1280px-LinkedIn_icon.svg.png"
              alt=""
              className="size-3.5"
            />
          </SocialIcon>
          <a
            href="https://www.instagram.com/leo.burbano.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-7 rounded-full px-1.5 sm:px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            aria-label="Instagram @leo.burbano.ai"
            title="Instagram"
          >
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSi8Gv6C1gj3gf4MFx2FUsXZcB4HXl9W-UrP8OFGcrQw&s"
              alt=""
              className="size-3.5 rounded-[3px] object-cover"
            />
            <span className="text-[10px] sm:text-[11px] font-medium tracking-tight truncate max-w-[6.5rem]">
              @leo.burbano.ai
            </span>
          </a>
        </div>

        <span className="h-3.5 w-px bg-border shrink-0" aria-hidden />

        <a
          href="https://www.mercately.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center h-7 rounded-full px-2 hover:bg-background/80 transition-colors"
          aria-label="Mercately"
          title="Mercately"
        >
          <img
            src="https://citec.com.ec/wp-content/uploads/2025/06/LogotipoPrincipal_Mercately-1.png"
            alt="Mercately"
            className="h-3.5 w-auto object-contain"
          />
        </a>
      </div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}
