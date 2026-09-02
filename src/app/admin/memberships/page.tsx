// Founding member / free-access tracking — who's on free launch
// access, when it started, and when it expires or should convert to
// paid. See "Founding members get free access" on the homepage and
// the auto-grant in src/app/api/onboarding/profile/route.ts.

import { query } from "@/lib/db";
import { EditExpiryButton, GrantMembershipForm } from "@/components/admin/MembershipActions";

type MembershipRow = {
  id: string;
  tier: string;
  started_at: string;
  expires_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export default async function AdminMembershipsPage() {
  const rows = await query<MembershipRow>(
    `SELECT m.id, m.tier, m.started_at, m.expires_at, u.full_name, u.email, u.phone
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     ORDER BY m.started_at DESC`
  );

  return (
    <main className="px-6 py-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="gilded-heading font-display text-3xl mb-1">Memberships</h1>
        <p className="font-sans text-sm text-[var(--paper-dim)]">
          Founding members get free access automatically on signup while
          launch access is enabled (see <code>FOUNDING_ACCESS_ENABLED</code> and{" "}
          <code>FOUNDING_ACCESS_DAYS</code> in your environment variables).
          Grant or adjust access manually below.
        </p>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5">
        <h3 className="font-sans text-sm font-medium mb-3">Grant access</h3>
        <GrantMembershipForm />
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="font-sans text-sm opacity-70 text-center py-12">No memberships yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="font-sans text-xs uppercase tracking-wide opacity-50 border-b border-black/10">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const expired = isExpired(m.expires_at);
                return (
                  <tr key={m.id} className="font-sans text-sm border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <div>{m.full_name ?? "Unnamed"}</div>
                      <div className="opacity-60 text-xs">{m.email ?? m.phone}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{m.tier}</td>
                    <td className="px-4 py-3 opacity-70">{formatDate(m.started_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={expired ? "text-[var(--maroon)]" : "opacity-70"}>
                          {formatDate(m.expires_at)}
                          {expired ? " (expired)" : ""}
                        </span>
                        <EditExpiryButton membershipId={m.id} currentExpiresAt={m.expires_at} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
