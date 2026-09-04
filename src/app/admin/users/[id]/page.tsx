// Full profile detail for vetting a signup — everything captured at
// onboarding, plus approve/reject. Linked from each row on /admin.
// Auth+role gate lives in src/app/admin/layout.tsx (this page is
// nested under it). Deliberately selects specific columns rather
// than `SELECT *` so password_hash never even leaves the database
// query, let alone reaches this page or the client.

import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { ageFromDob } from "@/lib/age";
import { UserReviewActions } from "@/components/admin/UserReviewActions";
import type { PhotoRow, PublicUser } from "@/types/database";

const COMMUNITY_LABELS: Record<string, string> = {
  chinese: "Chinese",
  malay: "Malay",
  indian: "Indian",
  eurasian: "Eurasian",
  other: "Other",
};

const INTENT_LABELS: Record<string, string> = {
  marriage_minded: "Marriage-minded",
  open_to_marriage: "Open to marriage",
  not_sure: "Not sure yet",
};

const EDUCATION_LABELS: Record<string, string> = {
  secondary: "Secondary",
  diploma: "Diploma",
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
  other: "Other",
};

const SMOKING_LABELS: Record<string, string> = {
  non_smoker: "Non-smoker",
  occasional: "Occasional",
  regular: "Regular",
};

const DRINKING_LABELS: Record<string, string> = {
  non_drinker: "Non-drinker",
  social: "Social",
  regular: "Regular",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-wide opacity-50">{label}</p>
      <p className="font-sans text-sm mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await queryOne<PublicUser>(
    `SELECT id, email, phone, full_name, date_of_birth, gender, photos, bio, location,
            occupation, role, status, own_faith, faith_matters_to_them, open_to_other_faith,
            community, relationship_intent, education_level, height_cm, smoking, drinking,
            terms_accepted_at, photo_consent_accepted_at, last_login_at,
            years_out_of_relationship, preferred_gender, preferred_age_min, preferred_age_max,
            preferred_location, created_at
     FROM users WHERE id = ?`,
    [id]
  );
  if (!user) notFound();

  const photoIds = (user.photos ?? []).map((url) => url.split("/").pop()!).filter(Boolean);
  let photoStatuses: Record<string, string> = {};
  if (photoIds.length > 0) {
    const placeholders = photoIds.map(() => "?").join(",");
    const rows = await query<Pick<PhotoRow, "id" | "status">>(
      `SELECT id, status FROM photos WHERE id IN (${placeholders})`,
      photoIds
    );
    photoStatuses = Object.fromEntries(rows.map((r) => [r.id, r.status]));
  }

  const membership = await queryOne<{ tier: string; expires_at: string }>(
    "SELECT tier, expires_at FROM memberships WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
    [id]
  );

  const personalityTest = await queryOne<{ completed_at: string }>(
    "SELECT completed_at FROM personality_responses WHERE user_id = ?",
    [id]
  );

  const age = user.date_of_birth ? ageFromDob(user.date_of_birth) : null;
  const photos = user.photos ?? [];

  return (
    <main className="px-6 py-10 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/admin" className="font-sans text-xs text-gold-soft hover:underline">
          ← Back to signups
        </Link>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl">
              {user.full_name ?? "Unnamed"}
              {age != null && <span className="font-sans text-base opacity-60"> · {age}</span>}
            </h1>
            <p className="font-sans text-sm opacity-70 mt-1">
              {user.email ?? "—"}
              {user.phone ? ` · ${user.phone}` : ""}
            </p>
            <p className="font-sans text-xs opacity-50 mt-1">
              Joined {formatDate(user.created_at)} · Last active {formatDate(user.last_login_at)}
              {membership && (
                <>
                  {" "}
                  · <span className="capitalize">{membership.tier}</span> member until{" "}
                  {formatDate(membership.expires_at)}
                </>
              )}
            </p>
          </div>
          <UserReviewActions userId={user.id} status={user.status} />
        </div>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-3">
          Photos ({photos.length}/3)
        </p>
        {photos.length === 0 ? (
          <p className="font-sans text-sm opacity-60">No photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url) => {
              const photoId = url.split("/").pop() ?? "";
              const status = photoStatuses[photoId];
              return (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated route, admin allowed to view non-approved photos */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {status && status !== "approved" && (
                    <span
                      className={`absolute top-1 right-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        status === "rejected" ? "bg-[var(--maroon)] text-white" : "bg-[var(--gold-soft)] text-ink"
                      }`}
                    >
                      {status === "rejected" ? "Rejected" : "Pending review"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-4">About</p>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Gender" value={user.gender === "male" ? "Male" : user.gender === "female" ? "Female" : null} />
          <Field label="Date of birth" value={formatDate(user.date_of_birth)} />
          <Field label="Location" value={user.location} />
          <Field label="Occupation" value={user.occupation} />
          <Field
            label="Education"
            value={user.education_level ? EDUCATION_LABELS[user.education_level] : null}
          />
          <Field label="Height" value={user.height_cm ? `${user.height_cm} cm` : null} />
          <Field label="Smoking" value={user.smoking ? SMOKING_LABELS[user.smoking] : null} />
          <Field label="Drinking" value={user.drinking ? DRINKING_LABELS[user.drinking] : null} />
          <Field
            label="Years out of a relationship"
            value={user.years_out_of_relationship}
          />
        </div>
        {user.bio && (
          <div className="mt-5">
            <p className="font-sans text-xs uppercase tracking-wide opacity-50">Bio</p>
            <p className="font-sans text-sm mt-1 whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-4">
          Community, faith &amp; intent
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Community" value={user.community ? COMMUNITY_LABELS[user.community] : null} />
          <Field label="Religion" value={user.own_faith} />
          <Field label="Faith matters to them" value={user.faith_matters_to_them ? "Yes" : "No"} />
          {Boolean(user.faith_matters_to_them) && (
            <Field
              label="Open to another faith"
              value={user.open_to_other_faith == null ? null : user.open_to_other_faith ? "Yes" : "No"}
            />
          )}
          <Field
            label="Relationship intent"
            value={user.relationship_intent ? INTENT_LABELS[user.relationship_intent] : null}
          />
        </div>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-4">
          Looking for
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field
            label="Preferred gender"
            value={
              user.preferred_gender === "male"
                ? "Male"
                : user.preferred_gender === "female"
                  ? "Female"
                  : "No preference"
            }
          />
          <Field
            label="Preferred age range"
            value={
              user.preferred_age_min || user.preferred_age_max
                ? `${user.preferred_age_min ?? "any"}–${user.preferred_age_max ?? "any"}`
                : null
            }
          />
          <Field label="Preferred location" value={user.preferred_location} />
        </div>
      </div>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-4">
          Account
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Role" value={<span className="capitalize">{user.role}</span>} />
          <Field label="Status" value={<span className="capitalize">{user.status}</span>} />
          <Field
            label="Personality test"
            value={personalityTest ? `Completed ${formatDate(personalityTest.completed_at)}` : "Not completed"}
          />
          <Field label="Terms accepted" value={formatDate(user.terms_accepted_at)} />
          <Field label="Photo consent accepted" value={formatDate(user.photo_consent_accepted_at)} />
        </div>
      </div>
    </main>
  );
}
