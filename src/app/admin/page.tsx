// Signup feed — most recent profiles first, basic details at a
// glance. Auth+role gate lives in src/app/admin/layout.tsx.

import Link from "next/link";
import { query } from "@/lib/db";

const PAGE_SIZE = 30;

type SignupRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  community: string | null;
  status: string;
  created_at: string;
  membership_tier: string | null;
  pending_photo_count: number;
};

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<SignupRow>(
    `SELECT
       u.id, u.full_name, u.email, u.phone, u.community, u.status, u.created_at,
       (SELECT m.tier FROM memberships m WHERE m.user_id = u.id ORDER BY m.started_at DESC LIMIT 1) AS membership_tier,
       (SELECT COUNT(*) FROM photos p WHERE p.user_id = u.id AND p.status = 'pending_review') AS pending_photo_count
     FROM users u
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [PAGE_SIZE, offset]
  );

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-1">Signups</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Most recent profiles first.
      </p>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="font-sans text-sm opacity-70 text-center py-12">No signups yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="font-sans text-xs uppercase tracking-wide opacity-50 border-b border-black/10">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Community</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Membership</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="font-sans text-sm border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 opacity-80">{u.email ?? u.phone ?? "—"}</td>
                  <td className="px-4 py-3 opacity-80 capitalize">{u.community ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.status === "approved"
                          ? "bg-[var(--jade)]/15 text-[var(--jade)]"
                          : u.status === "suspended"
                            ? "bg-[var(--maroon)]/15 text-[var(--maroon)]"
                            : "bg-black/10 opacity-70"
                      }`}
                    >
                      {u.status}
                    </span>
                    {u.pending_photo_count > 0 && (
                      <Link
                        href="/admin/photos"
                        className="ml-2 text-xs text-[var(--maroon)] underline"
                      >
                        {u.pending_photo_count} photo{u.pending_photo_count > 1 ? "s" : ""} pending
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 opacity-80 capitalize">
                    {u.membership_tier ?? "—"}
                  </td>
                  <td className="px-4 py-3 opacity-60">
                    {new Date(u.created_at).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between mt-4 font-sans text-sm">
        {page > 1 ? (
          <Link href={`/admin?page=${page - 1}`} className="text-gold-soft hover:underline">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {rows.length === PAGE_SIZE && (
          <Link href={`/admin?page=${page + 1}`} className="text-gold-soft hover:underline">
            Older →
          </Link>
        )}
      </div>
    </main>
  );
}
