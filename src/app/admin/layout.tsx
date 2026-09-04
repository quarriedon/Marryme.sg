import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Single auth+role gate for every /admin/* page — see mysql/schema.sql (users.role). */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard/matches");

  return (
    <div className="flex-1 flex flex-col">
      <nav className="border-b border-[var(--gold)]/15 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3">
        <Link href="/admin" className="font-display italic text-gold-soft">
          MarryMe.sg Admin
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm text-[var(--paper-dim)]">
          <Link href="/admin" className="transition-colors hover:text-gold-soft">
            Signups
          </Link>
          <Link href="/admin/photos" className="transition-colors hover:text-gold-soft">
            Photo review
          </Link>
          <Link href="/admin/matches" className="transition-colors hover:text-gold-soft">
            Matches
          </Link>
          <Link href="/admin/memberships" className="transition-colors hover:text-gold-soft">
            Memberships
          </Link>
          <Link href="/dashboard/matches" className="transition-colors hover:text-gold-soft">
            Back to app
          </Link>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
