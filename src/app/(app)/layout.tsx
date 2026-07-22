import { requireMember } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireMember();
  return (
    <AppShell
      member={{
        id: member.id,
        full_name: member.full_name,
        avatar_url: member.avatar_url,
        role: member.role,
      }}
    >
      {children}
    </AppShell>
  );
}
