import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/gemini";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        programmeName: user.programme?.code ?? null,
        yearOfStudy: user.yearOfStudy,
      }}
      aiConfigured={isAiConfigured()}
    >
      {children}
    </AppShell>
  );
}
