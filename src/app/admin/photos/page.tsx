// Photo review queue — photos held back by automated moderation
// (see src/app/api/photos/upload/route.ts) wait here for a human
// decision before they can appear on a public profile.

import { query } from "@/lib/db";
import { PhotoReviewActions } from "@/components/admin/PhotoReviewActions";

type PendingPhotoRow = {
  id: string;
  user_id: string;
  moderation_reason: string | null;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

const REASON_LABELS: Record<string, string> = {
  explicit_content: "Flagged: explicit content",
  no_face_detected: "No face detected",
  provider_error: "Moderation provider error",
};

export default async function AdminPhotoReviewPage() {
  const rows = await query<PendingPhotoRow>(
    `SELECT p.id, p.user_id, p.moderation_reason, p.created_at,
            u.full_name, u.email, u.phone
     FROM photos p
     JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pending_review'
     ORDER BY p.created_at ASC`
  );

  return (
    <main className="px-6 py-10 max-w-4xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-1">Photo review</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Held back by automated moderation — approve to make visible on the
        member&rsquo;s profile, or reject to keep it hidden permanently and
        free up their photo slot.
      </p>

      {rows.length === 0 ? (
        <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-12 text-center">
          <p className="font-sans text-sm opacity-70">Nothing pending review.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="bg-paper text-[var(--text-on-paper)] rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated route */}
              <img src={`/api/photos/${p.id}`} alt="" className="w-full aspect-square object-cover" />
              <div className="p-4 space-y-2">
                <p className="font-sans text-sm font-medium">{p.full_name ?? "Unnamed"}</p>
                <p className="font-sans text-xs opacity-60">{p.email ?? p.phone ?? "—"}</p>
                <p className="font-sans text-xs text-[var(--maroon)]">
                  {REASON_LABELS[p.moderation_reason ?? ""] ?? p.moderation_reason ?? "Flagged"}
                </p>
                <PhotoReviewActions photoId={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
