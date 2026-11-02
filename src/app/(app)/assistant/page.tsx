import Link from "next/link";
import { MessageSquarePlus, Sparkles } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { isAiConfigured } from "@/lib/ai/gemini";
import { ChatPanel } from "@/components/chat-panel";
import { relativeTime, truncate } from "@/lib/utils";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const user = await requireStudent();
  const { course } = await searchParams;

  const courses = await getAccessibleCourses(user);
  const activeCourse = courses.find((item) => item.id === course);

  const recent = await db.chatSession.findMany({
    where: { studentId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-4">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">
            AI study assistant
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Ask anything from your course material — explanations, examples and
            exam-style walkthroughs.
          </p>
        </div>
        <Link href="/assistant" className="btn btn-ghost text-[13px]">
          <MessageSquarePlus size={14} />
          New conversation
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_236px]">
        <ChatPanel
          initialMessages={[]}
          courses={courses.map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
          }))}
          defaultCourseId={activeCourse?.id}
          userInitials={user.fullName}
          aiConfigured={isAiConfigured()}
        />

        <aside className="hidden lg:block">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-3.5 py-2.5">
              <h2 className="text-[12.5px] font-semibold text-ink">
                Recent conversations
              </h2>
            </div>

            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/assistant/${session.id}`}
                      className="block px-3.5 py-2.5 transition-colors hover:bg-surface-muted"
                    >
                      <div className="line-clamp-2 text-[12px] leading-snug font-medium text-ink-soft">
                        {truncate(session.title, 58)}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {relativeTime(session.updatedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3.5 py-6 text-center text-[11.5px] leading-relaxed text-muted">
                Your conversations will be listed here.
              </p>
            )}
          </div>

          <div className="mt-3 rounded-[14px] border border-line bg-surface p-3.5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Sparkles size={12} className="text-brand" />
              How answers work
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Your question is matched against your uploaded notes. The most
              relevant sections are given to the model as context, so every
              answer can be traced back to a source.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
