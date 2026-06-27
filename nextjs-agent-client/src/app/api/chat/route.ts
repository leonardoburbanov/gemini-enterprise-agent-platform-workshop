import { createUIMessageStreamResponse } from "ai";
import type { UIMessageChunk } from "ai";

type GeminiPart = {
  text?: string;
  // ponytail: ADK streams snake_case, not camelCase
  function_call?: { id?: string; name: string; args?: unknown };
  function_response?: { id?: string; name: string; response?: unknown };
};

type GeminiEvent = {
  content?: { parts?: GeminiPart[] };
  __error?: string;
};

type FilePart = { type: "file"; mediaType: string; url: string; name?: string };

export async function POST(req: Request) {
  const { messages, session_id } = await req.json();
  const lastMsg = messages?.at(-1);
  const prompt =
    lastMsg?.parts?.find((p: { type: string }) => p.type === "text")?.text ??
    lastMsg?.content ??
    "";

  // extract file attachments from the last message
  const fileParts: FilePart[] = (lastMsg?.parts ?? []).filter(
    (p: { type: string }) => p.type === "file"
  );
  const attachments = fileParts.map((p) => ({
    name: p.name ?? "file",
    mime_type: p.mediaType,
    // data URLs: "data:<mime>;base64,<data>" — extract the base64 part
    data: p.url.startsWith("data:") ? p.url.split(",")[1] : p.url,
  }));

  const upstream = await fetch("http://localhost:8000/query/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, user_id: "default-user", session_id: session_id ?? "default-session", attachments }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: 502 });
  }

  // ponytail: converts Gemini ndjson events → UIMessageChunk stream for DefaultChatTransport
  const stream = new ReadableStream<UIMessageChunk>({
    async start(ctrl) {
      const enq = (c: UIMessageChunk) => ctrl.enqueue(c);
      enq({ type: "start" });
      enq({ type: "start-step" });

      const reader = upstream.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let textId = 0;
      let textOpen = false;
      // map toolName → toolCallId so functionResponse can match its functionCall
      const toolCallIds = new Map<string, string>();
      let toolCounter = 0;

      const openText = () => {
        if (!textOpen) {
          textId++;
          enq({ type: "text-start", id: `t${textId}` });
          textOpen = true;
        }
      };
      const closeText = () => {
        if (textOpen) {
          enq({ type: "text-end", id: `t${textId}` });
          textOpen = false;
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: GeminiEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.__error) {
              closeText();
              enq({ type: "error", errorText: event.__error });
              continue;
            }

            const parts = event.content?.parts ?? [];
            for (const part of parts) {
              if (part.text) {
                openText();
                enq({ type: "text-delta", id: `t${textId}`, delta: part.text });
              } else if (part.function_call) {
                closeText();
                // prefer the ADK-provided id so functionResponse can match by id
                const id = part.function_call.id ?? `tool_${++toolCounter}`;
                toolCallIds.set(part.function_call.name, id);
                enq({
                  type: "tool-input-available",
                  toolCallId: id,
                  toolName: part.function_call.name,
                  input: part.function_call.args ?? {},
                  dynamic: true,
                });
              } else if (part.function_response) {
                const name = part.function_response.name;
                const id = part.function_response.id ?? toolCallIds.get(name) ?? `tool_${++toolCounter}`;
                enq({
                  type: "tool-output-available",
                  toolCallId: id,
                  output: part.function_response.response ?? {},
                  dynamic: true,
                });
              }
            }
          }
        }
      } finally {
        closeText();
        enq({ type: "finish-step" });
        enq({ type: "finish", finishReason: "stop" });
        ctrl.close();
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
