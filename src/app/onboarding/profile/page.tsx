"use client";

// Profile completion step. Compulsory vs. optional fields follow the
// "UI & Feature Upgrade" brief exactly — see the (*) markers in the
// labels below. Faith-as-matching-preference (faithMatters/
// openToOtherFaith) is a separate question from Religion (ownFaith,
// now compulsory for everyone): one describes the user, the other
// describes what they're looking for in a match.

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/PhotoUploader";

const RELIGION_OPTIONS = [
  "Buddhism",
  "Christianity",
  "Islam",
  "Hinduism",
  "Taoism",
  "No religion",
  "Other",
];

const inputClass =
  "w-full font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] placeholder:text-black/40 disabled:opacity-60";
const labelClass = "font-sans text-xs uppercase tracking-wide opacity-60 block mb-1.5";
const requiredMark = <span className="text-[var(--maroon)]"> *</span>;
const optionalMark = <span className="opacity-50 normal-case"> (optional)</span>;

type ExistingProfile = {
  email: string | null;
  phone: string | null;
  hasPassword: boolean;
};

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  const [existing, setExisting] = useState<ExistingProfile>({
    email: null,
    phone: null,
    hasPassword: false,
  });

  // Identity fields not already collected at signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);

  // Core profile
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [religionSelect, setReligionSelect] = useState("");
  const [religionOther, setReligionOther] = useState("");
  const [community, setCommunity] = useState("");
  const [relationshipIntent, setRelationshipIntent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoStatuses, setPhotoStatuses] = useState<Record<string, string>>({});

  // Optional
  const [occupation, setOccupation] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [yearsOutOfRelationship, setYearsOutOfRelationship] = useState("");

  // Matching preferences (existing feature, kept)
  const [faithMatters, setFaithMatters] = useState<"yes" | "no" | "">("");
  const [openToOtherFaith, setOpenToOtherFaith] = useState<"yes" | "no" | "">("");
  const [preferredGender, setPreferredGender] = useState<"male" | "female" | "">("");
  const [preferredAgeMin, setPreferredAgeMin] = useState("");
  const [preferredAgeMax, setPreferredAgeMax] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");

  // Consent
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photoConsentAccepted, setPhotoConsentAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/profile")
      .then((res) => res.json())
      .then((data) => {
        setExisting({
          email: data.email ?? null,
          phone: data.phone ?? null,
          hasPassword: Boolean(data.hasPassword),
        });
        if (data.phone) setPhoneVerified(true);
        // Pre-fill in case someone refreshes mid-onboarding or is
        // revisiting after a validation error.
        if (data.full_name) setFullName(data.full_name);
        if (data.date_of_birth) setDob(data.date_of_birth.slice(0, 10));
        if (data.gender) setGender(data.gender);
        if (data.location) setLocation(data.location);
        if (data.occupation) setOccupation(data.occupation);
        if (data.bio) setBio(data.bio);
        if (Array.isArray(data.photos)) setPhotos(data.photos);
        if (data.photoStatuses) setPhotoStatuses(data.photoStatuses);
        if (data.years_out_of_relationship != null)
          setYearsOutOfRelationship(String(data.years_out_of_relationship));
        if (data.own_faith) {
          setReligionSelect(RELIGION_OPTIONS.includes(data.own_faith) ? data.own_faith : "Other");
          if (!RELIGION_OPTIONS.includes(data.own_faith)) setReligionOther(data.own_faith);
        }
        setFaithMatters(data.faith_matters_to_them ? "yes" : data.faith_matters_to_them === false ? "no" : "");
        if (data.open_to_other_faith != null)
          setOpenToOtherFaith(data.open_to_other_faith ? "yes" : "no");
        if (data.community) setCommunity(data.community);
        if (data.relationship_intent) setRelationshipIntent(data.relationship_intent);
        if (data.education_level) setEducationLevel(data.education_level);
        if (data.height_cm != null) setHeightCm(String(data.height_cm));
        if (data.smoking) setSmoking(data.smoking);
        if (data.drinking) setDrinking(data.drinking);
        if (data.preferred_gender) setPreferredGender(data.preferred_gender);
        if (data.preferred_age_min != null) setPreferredAgeMin(String(data.preferred_age_min));
        if (data.preferred_age_max != null) setPreferredAgeMax(String(data.preferred_age_max));
        if (data.preferred_location) setPreferredLocation(data.preferred_location);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleSendOtp() {
    setPhoneError(null);
    if (!phone.trim()) {
      setPhoneError("Enter a phone number first.");
      return;
    }
    setPhoneBusy(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setPhoneBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPhoneError(body?.error ?? "Could not send a code — please try again.");
      return;
    }
    setOtpSent(true);
  }

  async function handleVerifyOtp() {
    setPhoneError(null);
    setPhoneBusy(true);
    const res = await fetch("/api/onboarding/verify-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp }),
    });
    const body = await res.json();
    setPhoneBusy(false);
    if (!res.ok) {
      setPhoneError(body.error ?? "That code didn't work.");
      return;
    }
    setPhoneVerified(true);
  }

  function age(): number | null {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const hadBirthday =
      now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
    if (!hadBirthday) a -= 1;
    return a;
  }

  function validate(): string | null {
    if (!fullName.trim()) return "Full name is required.";
    if (!dob) return "Date of birth is required.";
    const a = age();
    if (a == null || a < 18) return "You must be at least 18 years old to use MarryMe.sg.";
    if (!gender) return "Gender is required.";
    if (!existing.email && !/^\S+@\S+\.\S+$/.test(email)) return "A valid email address is required.";
    if (!existing.hasPassword) {
      if (password.length < 8) return "Password must be at least 8 characters.";
      if (password !== confirmPassword) return "Passwords don't match.";
    }
    if (!phoneVerified) return "Please verify your phone number.";
    const religion = religionSelect === "Other" ? religionOther.trim() : religionSelect;
    if (!religion) return "Religion is required.";
    if (!community) return "Community is required.";
    if (!relationshipIntent) return "Relationship intent is required.";
    if (!faithMatters) return "Please answer whether faith matters to you in a partner.";
    if (photos.length < 1) return "Please upload at least 1 photo.";
    if (!termsAccepted) return "You must accept the Privacy Policy and Terms of Service.";
    if (!photoConsentAccepted) return "You must accept the photo content guidelines.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const religion = religionSelect === "Other" ? religionOther.trim() : religionSelect;

    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: existing.email ? undefined : email,
          password: existing.hasPassword ? undefined : password,
          fullName,
          dateOfBirth: dob,
          gender,
          location: location || null,
          occupation: occupation || null,
          bio: bio || null,
          photos,
          yearsOutOfRelationship: yearsOutOfRelationship ? Number(yearsOutOfRelationship) : null,
          faithMattersToThem: faithMatters === "yes",
          ownFaith: religion,
          openToOtherFaith: faithMatters === "yes" ? openToOtherFaith === "yes" : null,
          community,
          relationshipIntent,
          educationLevel: educationLevel || null,
          heightCm: heightCm ? Number(heightCm) : null,
          smoking: smoking || null,
          drinking: drinking || null,
          preferredGender: preferredGender || null,
          preferredAgeMin: preferredAgeMin ? Number(preferredAgeMin) : null,
          preferredAgeMax: preferredAgeMax ? Number(preferredAgeMax) : null,
          preferredLocation: preferredLocation || null,
          termsAccepted,
          photoConsentAccepted,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Please sign in again to save your profile.");
        return;
      }
      router.push("/dashboard/matches");
    } catch {
      setError("Something went wrong — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <p className="font-sans text-sm opacity-60">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-paper text-[var(--text-on-paper)] rounded-2xl px-7 py-8 space-y-6"
      >
        <div>
          <h1 className="font-display text-2xl mb-1">Tell us about you</h1>
          <p className="font-sans text-sm opacity-70">
            Fields marked <span className="text-[var(--maroon)]">*</span> are required.
          </p>
        </div>

        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Full name{requiredMark}</label>
            <input
              required
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Date of birth{requiredMark}</label>
            <input
              required
              type="date"
              className={inputClass}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Gender{requiredMark}</label>
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

          {!existing.email && (
            <div className="col-span-2">
              <label className={labelClass}>Email{requiredMark}</label>
              <input
                required
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {!existing.hasPassword && (
            <>
              <div>
                <label className={labelClass}>Password{requiredMark}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm password{requiredMark}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Phone verification */}
        <div className="border-t border-black/10 pt-5">
          <label className={labelClass}>Phone number{requiredMark}</label>
          {phoneVerified ? (
            <p className="font-sans text-sm text-[var(--jade)]">
              {existing.phone || phone} — verified
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="+65 8123 4567"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                />
                {!otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={phoneBusy}
                    className="shrink-0 bg-ink text-[var(--paper)] font-sans text-sm rounded-lg px-4 border border-[var(--gold)]/25 hover:border-[var(--gold)]/50 disabled:opacity-50"
                  >
                    Send code
                  </button>
                )}
              </div>
              {otpSent && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    className={inputClass}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={phoneBusy}
                    className="shrink-0 bg-ink text-[var(--paper)] font-sans text-sm rounded-lg px-4 border border-[var(--gold)]/25 hover:border-[var(--gold)]/50 disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
              )}
              {phoneError && <p className="font-sans text-xs text-[var(--maroon)]">{phoneError}</p>}
            </div>
          )}
        </div>

        {/* Religion & background */}
        <div className="border-t border-black/10 pt-5 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Religion{requiredMark}</label>
            <select
              required
              className={inputClass}
              value={religionSelect}
              onChange={(e) => setReligionSelect(e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {RELIGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {religionSelect === "Other" && (
              <input
                required
                placeholder="Please specify"
                className={`${inputClass} mt-2`}
                value={religionOther}
                onChange={(e) => setReligionOther(e.target.value)}
              />
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Community{requiredMark}</label>
            <select
              required
              className={inputClass}
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="chinese">Chinese</option>
              <option value="malay">Malay</option>
              <option value="indian">Indian</option>
              <option value="eurasian">Eurasian</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Relationship intent{requiredMark}</label>
            <select
              required
              className={inputClass}
              value={relationshipIntent}
              onChange={(e) => setRelationshipIntent(e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="marriage_minded">Marriage-minded</option>
              <option value="open_to_marriage">Open to marriage</option>
              <option value="not_sure">Not sure yet</option>
            </select>
          </div>
        </div>

        {/* Optional details */}
        <div className="border-t border-black/10 pt-5 grid grid-cols-2 gap-3">
          <p className="col-span-2 font-sans text-sm font-medium">More about you{optionalMark}</p>
          <div className="col-span-2">
            <label className={labelClass}>Location{optionalMark}</label>
            <input
              placeholder="e.g. Queenstown"
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Occupation{optionalMark}</label>
            <input className={inputClass} value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Education{optionalMark}</label>
            <select className={inputClass} value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="secondary">Secondary</option>
              <option value="diploma">Diploma</option>
              <option value="bachelors">Bachelor&rsquo;s</option>
              <option value="masters">Master&rsquo;s</option>
              <option value="phd">PhD</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Height (cm){optionalMark}</label>
            <input
              type="number"
              min={100}
              max={250}
              className={inputClass}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Smoking{optionalMark}</label>
            <select className={inputClass} value={smoking} onChange={(e) => setSmoking(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="non_smoker">Non-smoker</option>
              <option value="occasional">Occasional</option>
              <option value="regular">Regular</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Drinking{optionalMark}</label>
            <select className={inputClass} value={drinking} onChange={(e) => setDrinking(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="non_drinker">Non-drinker</option>
              <option value="social">Social</option>
              <option value="regular">Regular</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Short bio / about me{optionalMark}</label>
            <textarea rows={3} className={inputClass} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>
              Years out of a relationship, or waiting to have one{optionalMark}
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

        {/* Photos */}
        <div className="border-t border-black/10 pt-5">
          <label className={labelClass}>Photos{requiredMark}</label>
          <label className="flex items-start gap-2 mb-3 font-sans text-xs opacity-80">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={photoConsentAccepted}
              onChange={(e) => setPhotoConsentAccepted(e.target.checked)}
            />
            <span>
              By uploading, I confirm my photos are decent, show my face clearly
              visible, and contain no obscene, offensive, or misleading content.
              MarryMe.sg reserves the right to remove photos or suspend accounts
              that violate this.
            </span>
          </label>
          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            disabled={!photoConsentAccepted}
            disabledReason="Accept the photo content guidelines above first"
            statuses={photoStatuses}
          />
        </div>

        {/* Matching preference: faith */}
        <div className="border-t border-black/10 pt-5">
          <label className={labelClass}>
            Is religion/faith important to you when it comes to a partner?{requiredMark}
          </label>
          <div className="flex gap-2 mb-3">
            {(["yes", "no"] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setFaithMatters(v)}
                className={`flex-1 font-sans text-sm py-2 rounded-lg border ${
                  faithMatters === v ? "bg-ink text-[var(--paper)] border-ink" : "border-black/10"
                }`}
              >
                {v === "yes" ? "Yes" : "No"}
              </button>
            ))}
          </div>

          {faithMatters === "yes" && (
            <div>
              <label className={labelClass}>Open to marrying someone of another faith?</label>
              <div className="flex gap-2">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setOpenToOtherFaith(v)}
                    className={`flex-1 font-sans text-sm py-2 rounded-lg border ${
                      openToOtherFaith === v ? "bg-ink text-[var(--paper)] border-ink" : "border-black/10"
                    }`}
                  >
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Matching preferences */}
        <div className="border-t border-black/10 pt-5">
          <p className="font-sans text-sm font-medium mb-3">Who you&rsquo;re looking for{optionalMark}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Gender</label>
              <select
                className={inputClass}
                value={preferredGender}
                onChange={(e) => setPreferredGender(e.target.value as "male" | "female")}
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

        {/* Legal consent */}
        <div className="border-t border-black/10 pt-5">
          <label className="flex items-start gap-2 font-sans text-sm">
            <input
              required
              type="checkbox"
              className="mt-0.5"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <a href="/privacy" target="_blank" className="underline text-[var(--jade)]">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" target="_blank" className="underline text-[var(--jade)]">
                Terms of Service
              </a>
              {requiredMark}
            </span>
          </label>
        </div>

        {error && <p className="font-sans text-sm text-[var(--maroon)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-[var(--paper)] font-sans font-medium rounded-lg px-3 py-3 border border-[var(--gold)]/25 hover:bg-ink-soft hover:border-[var(--gold)]/50 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : "See my matches"}
        </button>
      </form>
    </main>
  );
}
