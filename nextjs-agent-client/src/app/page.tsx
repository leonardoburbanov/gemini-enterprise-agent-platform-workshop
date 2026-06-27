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
import { SendIcon, SquareIcon, WrenchIcon, CheckIcon, LoaderIcon, PlusIcon, Trash2Icon, PaperclipIcon, FileIcon, XIcon } from "lucide-react";
import Markdown from "react-markdown";
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentActions, AttachmentAction,
} from "@/components/ui/attachment";

type Session = { id: string; title: string; messages: UIMessage[] };

function ChatMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      components={{
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="rounded-lg max-w-[200px] mt-2 block" />
        ),
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
      }}
    >
      {text}
    </Markdown>
  );
}

const USER_ID = "default-user";

function newId() { return crypto.randomUUID(); }

async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`/api/sessions?user_id=${USER_ID}`);
  return res.ok ? res.json() : [];
}

async function createSession(session: Session) {
  await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: session.id, user_id: USER_ID, title: session.title, messages: session.messages }),
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
    body: { session_id: sessionId },
  });
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isActive = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (messages.length > 0) onMessagesChange(messages);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    if ((!input.trim() && files.length === 0) || isActive) return;
    const fileList = files.length > 0
      ? (() => { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); return dt.files; })()
      : undefined;
    sendMessage({ text: input, files: fileList });
    setInput("");
    setFiles([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <MessageScrollerProvider>
      <div className="flex flex-1 flex-col min-h-0">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="px-4 py-6">
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
                              <BubbleContent><ChatMarkdown text={part.text} /></BubbleContent>
                            </Bubble>
                          );
                        }

                        if (isDynamicToolUIPart(part)) {
                          const done = part.state === "output-available" || part.state === "output-error";
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
                                <span className="font-mono text-xs">{part.toolName}</span>
                                {part.state === "input-available" && part.input != null && (
                                  <span className="ml-2 text-xs opacity-50 font-mono">
                                    {JSON.stringify(part.input).slice(0, 60)}
                                  </span>
                                )}
                                {part.state === "output-available" && part.output != null && (
                                  <span className="ml-2 text-xs opacity-50">
                                    {typeof part.output === "string"
                                      ? part.output.slice(0, 80)
                                      : JSON.stringify(part.output).slice(0, 80)}
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
                            <span className="animate-bounce [animation-delay:0ms]">·</span>
                            <span className="animate-bounce [animation-delay:150ms]">·</span>
                            <span className="animate-bounce [animation-delay:300ms]">·</span>
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

        <div className="border-t shrink-0">
          {files.length > 0 && (
            <div className="px-4 pt-3">
              <AttachmentGroup>
                {files.map((file, i) => (
                  <Attachment key={i} size="sm" orientation="horizontal">
                    <AttachmentMedia variant={file.type.startsWith("image/") ? "image" : "icon"}>
                      {file.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} />
                      ) : (
                        <FileIcon />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{file.name}</AttachmentTitle>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction onClick={() => removeFile(i)} aria-label="Remove">
                        <XIcon />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ))}
              </AttachmentGroup>
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="px-4 py-3 flex gap-2 items-end"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <PaperclipIcon className="size-4" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-40 overflow-y-auto"
            />
            {isActive ? (
              <Button type="button" size="icon" variant="ghost" onClick={stop} aria-label="Stop">
                <SquareIcon className="size-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim() && files.length === 0} aria-label="Send">
                <SendIcon className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </MessageScrollerProvider>
  );
}

const DEFAULT_SESSION: Session = { id: "default", title: "New Chat", messages: [] };

export default function ChatPage() {
  // ponytail: stable default on SSR; backend data loads after mount
  const [sessions, setSessions] = useState<Session[]>([DEFAULT_SESSION]);
  const [currentId, setCurrentId] = useState<string>(DEFAULT_SESSION.id);

  useEffect(() => {
    fetchSessions().then((loaded) => {
      if (loaded.length > 0) {
        setSessions(loaded);
        setCurrentId(loaded[0].id);
      } else {
        const first: Session = { id: newId(), title: "New Chat", messages: [] };
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
  }

  function handleMessagesChange(sessionId: string, msgs: UIMessage[]) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const firstUserText =
          msgs.find((m) => m.role === "user")
            ?.parts?.find(isTextUIPart)
            ?.text ?? s.title;
        const title = s.title === "New Chat" ? firstUserText.slice(0, 40) : s.title;
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
      const session: Session = { id: newId(), title: "New Chat", messages: [] };
      await createSession(session);
      setSessions([session]);
      setCurrentId(session.id);
      return;
    }
    setSessions(next);
    if (currentId === id) setCurrentId(next[0].id);
  }

  const current = sessions.find((s) => s.id === currentId) ?? sessions[0];

  return (
    <div className="flex h-dvh bg-background">

      {/* Left column — banner + event info */}
      <div className="w-64 shrink-0 flex flex-col border-r overflow-hidden min-w-0">
        <img
          src="https://res.cloudinary.com/startup-grind/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_1080,q_100,w_1080/v1/gcs/platform-data-goog/events/blob_oCUArSg"
          alt="Event banner"
          className="w-full aspect-square object-contain shrink-0 block"
        />
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <h1 className="text-sm font-bold leading-snug">Construye un Vendedor con IA usando Gemini Enterprise Agent Platform</h1>
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
              <span className="truncate">github.com/leonardoburbanov/gemini-enterprise-agent-platform-workshop</span>
            </a>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-2.5">
                <img
                  src="https://miro.medium.com/v2/1*A4-k_sI5kmrphjS4tJ_rpA.png"
                  alt="Google ADK"
                  className="h-7 w-auto object-contain"
                />
                <span className="text-[10px] font-medium text-muted-foreground">Google ADK</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-2.5">
                <img
                  src="https://images.icon-icons.com/2642/PNG/512/google_cloud_logo_icon_159333.png"
                  alt="Google Cloud"
                  className="h-7 w-auto object-contain"
                />
                <span className="text-[10px] font-medium text-muted-foreground">Google Cloud</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 flex flex-col gap-2 text-muted-foreground/70">
            <div>
              <p className="text-xs font-medium">Leonardo Burbano</p>
              <p className="text-[11px] mt-0.5 leading-snug">
                Senior AI Engineer &amp; Tech Lead | @Mercately [Techstars]
              </p>
              <a
                href="https://www.linkedin.com/in/leoburbano"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] hover:text-muted-foreground mt-1 flex items-center gap-1 min-w-0"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/LinkedIn_icon.svg/1280px-LinkedIn_icon.svg.png"
                  alt=""
                  className="size-3 shrink-0 opacity-70"
                />
                <span className="truncate">linkedin.com/in/leoburbano</span>
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap opacity-60">
              <img src="https://citec.com.ec/wp-content/uploads/2025/06/LogotipoPrincipal_Mercately-1.png" alt="Mercately" className="h-4 w-auto object-contain" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thoughtworks_logo.png/960px-Thoughtworks_logo.png?_=20210630172049" alt="Thoughtworks" className="h-3 w-auto object-contain" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fe/Latam-logo_-v_%28Indigo%29.svg" alt="LATAM Airlines" className="h-4 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Right column — sessions sidebar + chat */}
      <div className="flex flex-1 min-w-0">

        {/* Sessions sidebar */}
        <aside className="w-52 shrink-0 flex flex-col border-r">
          <div className="p-2 border-b">
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={newChat}>
              <PlusIcon className="size-3.5" />
              New Chat
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
            {sessions.map((s) => (
              <div key={s.id} className="group relative flex items-center">
                <button
                  onClick={() => setCurrentId(s.id)}
                  className={[
                    "w-full text-left px-2 py-1.5 rounded-md text-sm truncate transition-colors pr-7",
                    s.id === currentId
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  ].join(" ")}
                >
                  {s.title}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="absolute right-1 hidden group-hover:flex items-center justify-center size-5 rounded text-muted-foreground hover:text-destructive"
                  aria-label="Delete session"
                >
                  <Trash2Icon className="size-3" />
                </button>
              </div>
            ))}
          </nav>
        </aside>

        {/* Chat area */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="border-b px-4 py-3 text-sm font-semibold shrink-0">
            Sales Agent · Tecno
          </header>
          {current ? (
            <ChatPanel
              key={current.id}
              sessionId={current.id}
              savedMessages={current.messages}
              onMessagesChange={(msgs) => handleMessagesChange(current.id, msgs)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No chats yet — click New Chat to start.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
