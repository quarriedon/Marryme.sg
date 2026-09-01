import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col">
      <nav className="border-b border-[var(--gold)]/15 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3">
        <Link href="/" className="font-display italic text-gold-soft">
          MarryMe.sg
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm text-[var(--paper-dim)]">
          <Link href="/dashboard/profile" className="transition-colors hover:text-gold-soft">
            My Profile
          </Link>
          <Link href="/dashboard/matches" className="transition-colors hover:text-gold-soft">
            Matches
          </Link>
          <Link href="/dashboard/relationship" className="transition-colors hover:text-gold-soft">
            Relationship
          </Link>
          <Link href="/dashboard/messages" className="transition-colors hover:text-gold-soft">
            Messages
          </Link>
          <Link href="/dashboard/counselling" className="transition-colors hover:text-gold-soft">
            Counselling
          </Link>
          <Link href="/dashboard/perks" className="transition-colors hover:text-gold-soft">
            Perks
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="transition-colors hover:text-gold-soft">Sign out</button>
          </form>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
