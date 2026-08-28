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
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display italic text-gold-soft">
          MarryMe.sg
        </Link>
        <div className="flex gap-5 font-sans text-sm text-[var(--paper-dim)]">
          <Link href="/dashboard/matches" className="hover:text-white">
            Matches
          </Link>
          <Link href="/dashboard/relationship" className="hover:text-white">
            Relationship
          </Link>
          <Link href="/dashboard/messages" className="hover:text-white">
            Messages
          </Link>
          <Link href="/dashboard/counselling" className="hover:text-white">
            Counselling
          </Link>
          <Link href="/dashboard/perks" className="hover:text-white">
            Perks
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
