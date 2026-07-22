import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin(); // server-side role gate — never trust the client
  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <span className="hex-marker" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Admin
        </span>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
