"use client";

// Phase 2 profile + preferences step. Faith questions only appear if
// the user says faith matters to them (Rule 2 of the matching
// engine depends on this being answered honestly) — if they say no,
// they never see faith-based questions again.

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ProfileOnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [yearsOutOfRelationship, setYearsOutOfRelationship] = useState("");

  const [faithMatters, setFaithMatters] = useState<"yes" | "no" | "">("");
  const [ownFaith, setOwnFaith] = useState("");
  const [openToOtherFaith, setOpenToOtherFaith] = useState<"yes" | "no" | "">("");

  const [preferredGender, setPreferredGender] = useState<"male" | "female" | "">("");
  const [preferredAgeMin, setPreferredAgeMin] = useState("");
  const [preferredAgeMax, setPreferredAgeMax] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        dateOfBirth: dob,
        gender: gender || null,
        location,
        occupation,
        bio,
        photoUrl,
        yearsOutOfRelationship: yearsOutOfRelationship
          ? Number(yearsOutOfRelationship)
          : null,
        faithMattersToThem: faithMatters === "yes",
        ownFaith: faithMatters === "yes" ? ownFaith || null : null,
        openToOtherFaith:
          faithMatters === "yes" ? openToOtherFaith === "yes" : null,
        preferredGender: preferredGender || null,
        preferredAgeMin: preferredAgeMin ? Number(preferredAgeMin) : null,
        preferredAgeMax: preferredAgeMax ? Number(preferredAgeMax) : null,
        preferredLocation: preferredLocation || null,
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Please sign in again to save your profile.");
      return;
    }
    router.push("/dashboard/matches");
  }

  const inputClass =
    "w-full font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] placeholder:text-black/40";
  const labelClass = "font-sans text-xs uppercase tracking-wide opacity-60 block mb-1.5";

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-paper text-[var(--text-on-paper)] rounded-2xl px-7 py-8 space-y-6"
      >
        <div>
          <h1 className="font-display text-2xl mb-1">Tell us about you</h1>
          <p className="font-sans text-sm opacity-70">
            This is what shapes your five curated matches — take your time.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Full name</label>
            <input
              required
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Date of birth</label>
            <input
              required
              type="date"
              className={inputClass}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select
              required
              className={inputClass}
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female")}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              placeholder="e.g. Queenstown"
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Occupation</label>
            <input
              className={inputClass}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Photo URL</label>
            <input
              placeholder="Link to a photo for now"
              className={inputClass}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Short bio</label>
            <textarea
              rows={3}
              className={inputClass}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>
              Years out of a relationship, or waiting to have one
            </label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={yearsOutOfRelationship}
              onChange={(e) => setYearsOutOfRelationship(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-black/10 pt-5">
          <label className={labelClass}>
            Is religion/faith important to you when it comes to a partner?
          </label>
          <div className="flex gap-2 mb-3">
            {(["yes", "no"] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setFaithMatters(v)}
                className={`flex-1 font-sans text-sm py-2 rounded-lg border ${
                  faithMatters === v
                    ? "bg-ink text-[var(--paper)] border-ink"
                    : "border-black/10"
                }`}
              >
                {v === "yes" ? "Yes" : "No"}
              </button>
            ))}
          </div>

          {faithMatters === "yes" && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Your own faith</label>
                <input
                  className={inputClass}
                  value={ownFaith}
                  onChange={(e) => setOwnFaith(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Open to marrying someone of another faith?
                </label>
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setOpenToOtherFaith(v)}
                      className={`flex-1 font-sans text-sm py-2 rounded-lg border ${
                        openToOtherFaith === v
                          ? "bg-ink text-[var(--paper)] border-ink"
                          : "border-black/10"
                      }`}
                    >
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/10 pt-5">
          <p className="font-sans text-sm font-medium mb-3">Who you&rsquo;re looking for</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Gender</label>
              <select
                className={inputClass}
                value={preferredGender}
                onChange={(e) =>
                  setPreferredGender(e.target.value as "male" | "female")
                }
              >
                <option value="">No preference</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                className={inputClass}
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Min age</label>
              <input
                type="number"
                min={18}
                className={inputClass}
                value={preferredAgeMin}
                onChange={(e) => setPreferredAgeMin(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Max age</label>
              <input
                type="number"
                min={18}
                className={inputClass}
                value={preferredAgeMax}
                onChange={(e) => setPreferredAgeMax(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="font-sans text-sm text-[var(--maroon)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !faithMatters}
          className="w-full bg-ink text-[var(--paper)] font-sans font-medium rounded-lg px-3 py-3 border border-[var(--gold)]/25 hover:bg-ink-soft hover:border-[var(--gold)]/50 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : "See my matches"}
        </button>
      </form>
    </main>
  );
}
