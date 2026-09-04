// Signup feed — most recent profiles first, basic details at a
// glance, filterable by status. Click a row for the full profile
// (photos, bio, and everything captured at onboarding) and to
// approve/reject — see /admin/users/[id]. Auth+role gate lives in
// src/app/admin/layout.tsx.

import Link from "next/link";
import { query } from "@/lib/db";

const PAGE_SIZE = 30;
const STATUSES = ["pending", "approved", "suspended"] as const;

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
  searchParams: Promise<{ page?: string; status?: string; sort?: string }>;
}) {
  const { page: pageParam, status: statusParam, sort: sortParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const statusFilter = STATUSES.includes(statusParam as (typeof STATUSES)[number])
    ? statusParam
    : null;
  const sort = sortParam === "oldest" ? "oldest" : "newest";

  const whereClause = statusFilter ? "WHERE u.status = ?" : "";
  const orderClause = sort === "oldest" ? "ORDER BY u.created_at ASC" : "ORDER BY u.created_at DESC";
  const params = statusFilter ? [statusFilter, PAGE_SIZE, offset] : [PAGE_SIZE, offset];

  const rows = await query<SignupRow>(
    `SELECT
       u.id, u.full_name, u.email, u.phone, u.community, u.status, u.created_at,
       (SELECT m.tier FROM memberships m WHERE m.user_id = u.id ORDER BY m.started_at DESC LIMIT 1) AS membership_tier,
       (SELECT COUNT(*) FROM photos p WHERE p.user_id = u.id AND p.status = 'pending_review') AS pending_photo_count
     FROM users u
     ${whereClause}
     ${orderClause}
     LIMIT ? OFFSET ?`,
    params
  );

  function linkWith(overrides: Record<string, string | null>) {
    const next = new URLSearchParams();
    if (statusFilter) next.set("status", statusFilter);
    if (sort === "oldest") next.set("sort", "oldest");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-1">Signups</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-6">
        Click a profile for the full picture — photos, bio, and everything
        captured at onboarding — plus approve/reject.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4 font-sans text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--paper-dim)] text-xs uppercase tracking-wide">Status</span>
          <Link
            href={linkWith({ status: null, page: null })}
            className={`px-3 py-1 rounded-full ${!statusFilter ? "bg-gold text-ink" : "bg-paper text-[var(--text-on-paper)] opacity-70"}`}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={linkWith({ status: s, page: null })}
              className={`px-3 py-1 rounded-full capitalize ${statusFilter === s ? "bg-gold text-ink" : "bg-paper text-[var(--text-on-paper)] opacity-70"}`}
            >
              {s}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[var(--paper-dim)] text-xs uppercase tracking-wide">Sort</span>
          <Link
            href={linkWith({ sort: null, page: null })}
            className={`px-3 py-1 rounded-full ${sort === "newest" ? "bg-gold text-ink" : "bg-paper text-[var(--text-on-paper)] opacity-70"}`}
          >
            Newest first
          </Link>
          <Link
            href={linkWith({ sort: "oldest", page: null })}
            className={`px-3 py-1 rounded-full ${sort === "oldest" ? "bg-gold text-ink" : "bg-paper text-[var(--text-on-paper)] opacity-70"}`}
          >
            Oldest first
          </Link>
        </div>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="font-sans text-sm opacity-70 text-center py-12">
            No {statusFilter ?? ""} signups.
          </p>
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
                <tr key={u.id} className="font-sans text-sm border-b border-black/5 last:border-0 hover:bg-black/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="hover:underline">
                      {u.full_name ?? "Unnamed"}
                    </Link>
                  </td>
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
          <Link href={linkWith({ page: String(page - 1) })} className="text-gold-soft hover:underline">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {rows.length === PAGE_SIZE && (
          <Link href={linkWith({ page: String(page + 1) })} className="text-gold-soft hover:underline">
            Older →
          </Link>
        )}
      </div>
    </main>
  );
}
