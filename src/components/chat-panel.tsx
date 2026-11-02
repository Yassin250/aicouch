"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUp,
  BookMarked,
  CornerDownLeft,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Markdown } from "@/components/markdown";
import { cn, initials } from "@/lib/utils";

type Source = {
  documentId: string;
  documentTitle: string;
  label: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  sources?: Source[];
};

type CourseOption = {
  id: string;
  code: string;
  title: string;
};

const SUGGESTIONS = [
  "Explain database normalisation with a simple example",
  "What is the difference between a stack and a queue?",
  "Summarise the OSI model in terms I can remember",
  "Give me a revision checklist for SQL joins",
];

export function ChatPanel({
  sessionId,
  initialMessages,
  courses,
  defaultCourseId,
  userInitials,
  aiConfigured,
}: {
  sessionId?: string;
  initialMessages: Message[];
  courses: CourseOption[];
  defaultCourseId?: string;
  userInitials: string;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState(sessionId);
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);
    setWarning(null);

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((current) => [...current, optimistic]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession,
          courseId: courseId || null,
          message: text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The coach could not answer. Please try again.");
        setMessages((current) =>
          current.filter((message) => message.id !== optimistic.id),
        );
        setBusy(false);
        return;
      }

      if (data.warning) setWarning(data.warning);

      setMessages((current) => [
        ...current,
        {
          id: data.message.id,
          role: "assistant",
          content: data.message.content,
          sources: data.message.sources,
        },
      ]);

      if (!activeSession && data.sessionId) {
        setActiveSession(data.sessionId);
        window.history.replaceState(null, "", `/assistant/${data.sessionId}`);
      }

      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setMessages((current) =>
        current.filter((message) => message.id !== optimistic.id),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[520px] flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_1px_2px_rgba(5,31,32,0.04)]">
      {/* Toolbar ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <Sparkles size={13} className="text-brand" />
          Study coach
        </span>

        <span className="text-[11px] text-muted">·</span>

        <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
          Answering from
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="max-w-[230px] truncate rounded-md border border-line bg-surface-muted px-1.5 py-1 text-[11.5px] font-medium text-ink-soft outline-none focus:border-brand"
          >
            <option value="">All my courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </select>
        </label>

        <span
          className={cn(
            "chip ml-auto",
            aiConfigured
              ? "border-emerald-soft bg-emerald-soft text-emerald"
              : "border-amber-soft bg-amber-soft text-amber",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              aiConfigured ? "bg-emerald" : "bg-amber",
            )}
          />
          {aiConfigured ? "Gemini" : "Offline mode"}
        </span>
      </div>

      {/* Messages ------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2E6B57] to-brand-deep text-white shadow-[0_4px_14px_rgba(35,83,71,0.3)]">
              <Sparkles size={19} />
            </span>
            <h2 className="mt-3 text-[17px] font-semibold tracking-tight text-ink">
              What are you studying today?
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted">
              Ask about any topic in your courses. Answers are grounded in the
              study notes you have uploaded, and every claim is cited.
            </p>

            <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="group flex items-start gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-left text-[12.5px] leading-snug text-ink-soft transition-colors hover:border-brand-ring hover:bg-brand-soft/50"
                >
                  <Wand2
                    size={13}
                    className="mt-0.5 shrink-0 text-brand opacity-70 group-hover:opacity-100"
                  />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "animate-rise flex gap-2.5",
                    isUser && "flex-row-reverse",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10.5px] font-semibold",
                      isUser
                        ? "bg-surface-muted text-ink-soft"
                        : "bg-gradient-to-br from-[#2E6B57] to-brand-deep text-white",
                    )}
                  >
                    {isUser ? initials(userInitials) : <Sparkles size={13} />}
                  </span>

                  <div className={cn("min-w-0 max-w-[88%]", isUser && "text-right")}>
                    <div
                      className={cn(
                        "inline-block rounded-2xl px-3.5 py-2.5 text-left",
                        isUser
                          ? "rounded-tr-sm bg-ink text-[13.5px] leading-relaxed text-white"
                          : "w-full rounded-tl-sm border border-line bg-surface-muted",
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <Markdown content={message.content} />
                      )}
                    </div>

                    {message.sources?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.sources.map((source) => (
                          <Link
                            key={`${message.id}-${source.documentId}-${source.label}`}
                            href={`/materials/${source.documentId}`}
                            className="chip border-line bg-surface text-[10.5px] text-ink-soft transition-colors hover:border-brand-ring hover:text-brand-dark"
                          >
                            <BookMarked size={10} />
                            {source.label} {source.documentTitle}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {busy ? (
              <div className="animate-fade flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2E6B57] to-brand-deep text-white">
                  <Sparkles size={13} />
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line bg-surface-muted px-3.5 py-2.5">
                  <Loader2 size={13} className="animate-spin text-brand" />
                  <span className="text-[12.5px] text-muted">
                    Searching your notes and thinking…
                  </span>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer ------------------------------------------------------ */}
      <div className="border-t border-line bg-surface px-3.5 py-3 sm:px-5">
        {error ? (
          <div className="mb-2 flex items-start gap-1.5 text-[12px] text-rose">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

        {warning ? (
          <div className="mb-2 rounded-lg border border-amber-soft bg-amber-soft px-2.5 py-1.5 text-[11.5px] text-amber">
            {warning}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface px-2 py-1.5 transition-colors focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(35,83,71,0.12)]"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about a concept, a definition, or where you got stuck…"
            className="max-h-40 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-[#93a89c]"
          />

          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
            aria-label="Send question"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ArrowUp size={16} strokeWidth={2.4} />
            )}
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between px-0.5">
          <span className="flex items-center gap-1 text-[10.5px] text-muted">
            <CornerDownLeft size={10} />
            Enter to send · Shift + Enter for a new line
          </span>
          <span className="text-[10.5px] text-muted">
            AI answers can be wrong — check them against your notes.
          </span>
        </div>
      </div>
    </div>
  );
}
