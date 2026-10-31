import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { isAiConfigured } from "@/lib/ai/gemini";
import { ChatPanel } from "@/components/chat-panel";
import { relativeTime, truncate } from "@/lib/utils";

export const metadata = { title: "Conversation" };

type Source = {
  documentId: string;
  documentTitle: string;
  label: string;
};

function parseSources(raw: string | null): Source[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Source[]) : undefined;
  } catch {
    return undefined;
  }
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const session = await db.chatSession.findFirst({
    where: { id, studentId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      course: { select: { id: true, code: true, title: true } },
    },
  });

  if (!session) notFound();

  const courses = await getAccessibleCourses(user);
  const recent = await db.chatSession.findMany({
    where: { studentId: user.id, id: { not: session.id } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-4">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} />
            All conversations
          </Link>
          <h1 className="mt-1.5 truncate text-[20px] leading-tight font-semibold tracking-tight text-ink">
            {session.title}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {session.course ? `${session.course.code} · ` : ""}
            Started {relativeTime(session.createdAt)} · {session.messages.length}{" "}
            messages
          </p>
        </div>
        <Link href="/assistant" className="btn btn-ghost text-[13px]">
          <MessageSquarePlus size={14} />
          New conversation
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_236px]">
        <ChatPanel
          sessionId={session.id}
          initialMessages={session.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            sources: parseSources(message.sources),
          }))}
          courses={courses.map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
          }))}
          defaultCourseId={session.course?.id}
          userInitials={user.fullName}
          aiConfigured={isAiConfigured()}
        />

        <aside className="hidden lg:block">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-3.5 py-2.5">
              <h2 className="text-[12.5px] font-semibold text-ink">
                Other conversations
              </h2>
            </div>

            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/assistant/${item.id}`}
                      className="block px-3.5 py-2.5 transition-colors hover:bg-surface-muted"
                    >
                      <div className="line-clamp-2 text-[12px] leading-snug font-medium text-ink-soft">
                        {truncate(item.title, 58)}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {relativeTime(item.updatedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3.5 py-6 text-center text-[11.5px] leading-relaxed text-muted">
                No other conversations yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
