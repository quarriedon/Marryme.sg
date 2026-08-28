// Minimal admin stub for moderating new sign-ups.
// Restricted to users with role = 'admin' — see mysql/schema.sql.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard/matches");

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Admin</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Pending profile approvals will appear here.
      </p>
      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-12 text-center">
        <p className="font-sans text-sm opacity-70">Nothing pending review.</p>
      </div>
    </main>
  );
}
