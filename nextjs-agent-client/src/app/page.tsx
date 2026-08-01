"use client";

import { useChat } from "@ai-sdk/react";
import { isTextUIPart, isDynamicToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useState, useEffect, useRef } from "react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AuthorCredits } from "@/components/author-credits";
import { SideNav, type SideNavTab } from "@/components/side-nav";
import {
  SendIcon,
  SquareIcon,
  WrenchIcon,
  CheckIcon,
  LoaderIcon,
  MenuIcon,
} from "lucide-react";
import Markdown from "react-markdown";

type Session = { id: string; title: string; messages: UIMessage[] };

function ChatMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      components={{
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            className="rounded-lg max-w-full sm:max-w-50 mt-2 block"
          />
        ),
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 mb-1">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ),
      }}
    >
      {text}
    </Markdown>
  );
}

const USER_ID = "default-user";

function newId() {
  return crypto.randomUUID();
}

async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`/api/sessions?user_id=${USER_ID}`);
  return res.ok ? res.json() : [];
}

async function createSession(session: Session) {
  await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: session.id,
      user_id: USER_ID,
      title: session.title,
      messages: session.messages,
    }),
  });
}

async function deleteSession(id: string) {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

async function updateSession(session: Session) {
  await fetch(`/api/sessions/${session.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: session.title, messages: session.messages }),
  });
}

/** Resize textarea to fit content up to max-h-40. */
function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

// Isolated chat panel — remounts on key change to reset useChat state
function ChatPanel({
  sessionId,
  savedMessages,
  onMessagesChange,
}: {
  sessionId: string;
  savedMessages: UIMessage[];
  onMessagesChange: (msgs: UIMessage[]) => void;
}) {
  const { messages, sendMessage, stop, status, error } = useChat({
    messages: savedMessages,
  });
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isActive = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (messages.length > 0) onMessagesChange(messages);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    if (!input.trim() || isActive) return;
    sendMessage({ text: input }, { body: { session_id: sessionId } });
    setInput("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <MessageScrollerProvider>
      <div className="flex flex-1 flex-col min-h-0">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="px-3 sm:px-4 py-6">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Ask me anything about sales.
                </p>
              )}

              {messages.map((msg, i) => (
                <MessageScrollerItem
                  key={msg.id}
                  scrollAnchor={i === messages.length - 1}
                >
                  <Message align={msg.role === "user" ? "end" : "start"}>
                    <MessageContent>
                      {msg.parts.map((part, pi) => {
                        if (isTextUIPart(part) && part.text) {
                          return (
                            <Bubble
                              key={pi}
                              variant={msg.role === "user" ? "default" : "muted"}
                              align={msg.role === "user" ? "end" : "start"}
                            >
                              <BubbleContent>
                                <ChatMarkdown text={part.text} />
                              </BubbleContent>
                            </Bubble>
                          );
                        }

                        if (isDynamicToolUIPart(part)) {
                          const done =
                            part.state === "output-available" ||
                            part.state === "output-error";
                          return (
                            <Marker key={pi} variant="separator">
                              <MarkerIcon>
                                {done ? (
                                  <CheckIcon className="size-3.5 text-green-500" />
                                ) : (
                                  <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
                                )}
                              </MarkerIcon>
                              <MarkerContent>
                                <WrenchIcon className="inline size-3 mr-1 opacity-50" />
                                <span className="font-mono text-xs">
                                  {part.toolName}
                                </span>
                                {part.state === "input-available" &&
                                  part.input != null && (
                                    <span className="ml-2 text-xs opacity-50 font-mono">
                                      {JSON.stringify(part.input).slice(0, 60)}
                                    </span>
                                  )}
                                {part.state === "output-available" &&
                                  part.output != null && (
                                    <span className="ml-2 text-xs opacity-50">
                                      {typeof part.output === "string"
                                        ? part.output.slice(0, 80)
                                        : JSON.stringify(part.output).slice(
                                            0,
                                            80
                                          )}
                                    </span>
                                  )}
                              </MarkerContent>
                            </Marker>
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}

              {status === "submitted" && (
                <MessageScrollerItem>
                  <Message align="start">
                    <MessageContent>
                      <Bubble variant="muted" align="start">
                        <BubbleContent>
                          <span className="flex gap-1 text-muted-foreground">
                            <span className="animate-bounce [animation-delay:0ms]">
                              ·
                            </span>
                            <span className="animate-bounce [animation-delay:150ms]">
                              ·
                            </span>
                            <span className="animate-bounce [animation-delay:300ms]">
                              ·
                            </span>
                          </span>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}

              {error && (
                <MessageScrollerItem>
                  <p className="text-center text-xs text-destructive py-2">
                    {error.message}
                  </p>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>

          <MessageScrollerButton />
        </MessageScroller>

        <div className="border-t shrink-0 pb-[env(safe-area-inset-bottom)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="px-3 sm:px-4 py-3 flex gap-2 items-end"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-40 overflow-y-auto min-h-6"
            />
            {isActive ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={stop}
                aria-label="Stop"
              >
                <SquareIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send"
              >
                <SendIcon className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </MessageScrollerProvider>
  );
}

const DEFAULT_SESSION: Session = {
  id: "default",
  title: "New Chat",
  messages: [],
};

export default function ChatPage() {
  // ponytail: stable default on SSR; backend data loads after mount
  const [sessions, setSessions] = useState<Session[]>([DEFAULT_SESSION]);
  const [currentId, setCurrentId] = useState<string>(DEFAULT_SESSION.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sideTab, setSideTab] = useState<SideNavTab>("brand");

  useEffect(() => {
    fetchSessions().then((loaded) => {
      if (loaded.length > 0) {
        setSessions(loaded);
        setCurrentId(loaded[0].id);
      } else {
        const first: Session = {
          id: newId(),
          title: "New Chat",
          messages: [],
        };
        createSession(first);
        setSessions([first]);
        setCurrentId(first.id);
      }
    });
  }, []);

  async function newChat() {
    const session: Session = { id: newId(), title: "New Chat", messages: [] };
    await createSession(session);
    setSessions((prev) => [session, ...prev]);
    setCurrentId(session.id);
    setSheetOpen(false);
  }

  function selectSession(id: string) {
    setCurrentId(id);
    setSheetOpen(false);
  }

  function handleMessagesChange(sessionId: string, msgs: UIMessage[]) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const firstUserText =
          msgs.find((m) => m.role === "user")?.parts?.find(isTextUIPart)
            ?.text ?? s.title;
        const title =
          s.title === "New Chat" ? firstUserText.slice(0, 40) : s.title;
        const updated = { ...s, title, messages: msgs };
        updateSession(updated);
        return updated;
      })
    );
  }

  async function handleDelete(id: string) {
    await deleteSession(id);
    const next = sessions.filter((s) => s.id !== id);
    if (next.length === 0) {
      const session: Session = {
        id: newId(),
        title: "New Chat",
        messages: [],
      };
      await createSession(session);
      setSessions([session]);
      setCurrentId(session.id);
      return;
    }
    setSessions(next);
    if (currentId === id) setCurrentId(next[0].id);
  }

  const current = sessions.find((s) => s.id === currentId) ?? sessions[0];

  const sideNavProps = {
    tab: sideTab,
    onTabChange: setSideTab,
    sessions,
    currentId,
    onSelect: selectSession,
    onNewChat: newChat,
    onDelete: handleDelete,
  };

  function openMenu() {
    setSideTab("brand");
    setSheetOpen(true);
  }

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      {/* Desktop: brand always visible; chats behind tab */}
      <SideNav
        {...sideNavProps}
        className="hidden md:flex w-72 shrink-0 border-r"
      />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="border-b bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 flex items-center gap-2 pt-[max(0.5rem,env(safe-area-inset-top))] min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden shrink-0"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <MenuIcon className="size-4" />
          </Button>

          <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight truncate leading-none">
                Sales Agent · Tecno
              </p>
              <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5 truncate">
                AI sales assistant
              </p>
            </div>

            <AuthorCredits />
          </div>
        </header>

        {current ? (
          <ChatPanel
            key={current.id}
            sessionId={current.id}
            savedMessages={current.messages}
            onMessagesChange={(msgs) =>
              handleMessagesChange(current.id, msgs)
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No chats yet — click New Chat to start.
          </div>
        )}
      </div>

      {/* Mobile: same SideNav in a drawer, opens on Workshop */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,20rem)] p-0 gap-0"
          showCloseButton
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Workshop info and chat sessions
            </SheetDescription>
          </SheetHeader>
          <SideNav
            {...sideNavProps}
            compactBrand
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
