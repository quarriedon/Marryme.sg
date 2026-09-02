import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { ageFromDob } from "@/lib/age";
import type { PhotoRow, UserRow } from "@/types/database";

/** Lets the profile form pre-fill known values (email/phone from signup, or a previous partial submission) and know which fields it still needs to collect. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [
    session.user.id,
  ]);
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { password_hash, ...safeUser } = user;

  // So the form can show a "pending review" badge on a photo that
  // was saved but held back by moderation — see
  // src/app/api/photos/upload/route.ts.
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

  return NextResponse.json({
    ...safeUser,
    hasPassword: Boolean(password_hash),
    photoStatuses,
  });
}

const COMMUNITIES = ["chinese", "malay", "indian", "eurasian", "other"];
const RELATIONSHIP_INTENTS = ["marriage_minded", "open_to_marriage", "not_sure"];
const EDUCATION_LEVELS = ["secondary", "diploma", "bachelors", "masters", "phd", "other"];
const SMOKING_OPTIONS = ["non_smoker", "occasional", "regular"];
const DRINKING_OPTIONS = ["non_drinker", "social", "regular"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const current = await queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [
    session.user.id,
  ]);
  if (!current) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const {
    fullName,
    dateOfBirth,
    gender,
    location,
    occupation,
    bio,
    photos,
    yearsOutOfRelationship,
    faithMattersToThem,
    ownFaith,
    openToOtherFaith,
    community,
    relationshipIntent,
    educationLevel,
    heightCm,
    smoking,
    drinking,
    preferredGender,
    preferredAgeMin,
    preferredAgeMax,
    preferredLocation,
    termsAccepted,
    photoConsentAccepted,
    email,
    password,
  } = body;

  // --- Compulsory field validation (defense in depth — the form
  // blocks submission client-side too, but this is the trust boundary). ---
  const errors: string[] = [];

  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    errors.push("Full name is required.");
  }
  if (typeof dateOfBirth !== "string" || Number.isNaN(new Date(dateOfBirth).getTime())) {
    errors.push("Date of birth is required.");
  } else if (ageFromDob(dateOfBirth) < 18) {
    errors.push("You must be at least 18 years old to use MarryMe.sg.");
  }
  if (gender !== "male" && gender !== "female") {
    errors.push("Gender is required.");
  }
  if (typeof ownFaith !== "string" || ownFaith.trim().length === 0) {
    errors.push("Religion is required.");
  }
  if (!COMMUNITIES.includes(community)) {
    errors.push("Community is required.");
  }
  if (!RELATIONSHIP_INTENTS.includes(relationshipIntent)) {
    errors.push("Relationship intent is required.");
  }
  if (typeof faithMattersToThem !== "boolean") {
    errors.push("Please answer whether faith matters to you in a partner.");
  }
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 3) {
    errors.push("Please upload between 1 and 3 photos.");
  } else if (!photos.every((p) => typeof p === "string" && p.startsWith("/api/photos/"))) {
    errors.push("One or more photos didn't upload correctly — please re-add them.");
  }
  if (termsAccepted !== true) {
    errors.push("You must accept the Privacy Policy and Terms of Service.");
  }
  if (photoConsentAccepted !== true) {
    errors.push("You must accept the photo content guidelines.");
  }
  if (!current.phone) {
    errors.push("Please verify a phone number before continuing.");
  }
  if (!current.email && (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))) {
    errors.push("A valid email address is required.");
  }
  if (!current.password_hash && (typeof password !== "string" || password.length < 8)) {
    errors.push("A password of at least 8 characters is required.");
  }
  if (
    educationLevel != null &&
    educationLevel !== "" &&
    !EDUCATION_LEVELS.includes(educationLevel)
  ) {
    errors.push("Invalid education level.");
  }
  if (smoking != null && smoking !== "" && !SMOKING_OPTIONS.includes(smoking)) {
    errors.push("Invalid smoking preference.");
  }
  if (drinking != null && drinking !== "" && !DRINKING_OPTIONS.includes(drinking)) {
    errors.push("Invalid drinking preference.");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  // --- Email/password only get set once, never silently overwritten
  // by a resubmission of this form. ---
  let emailToSet = current.email;
  if (!current.email) {
    const existingEmail = await queryOne<UserRow>(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, session.user.id]
    );
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    emailToSet = email;
  }

  let passwordHashToSet = current.password_hash;
  if (!current.password_hash) {
    passwordHashToSet = await bcrypt.hash(password, 10);
  }

  // Onboarding has no manual review queue yet — completing it
  // auto-approves the profile so it's immediately eligible for
  // matching. Add a real review step before launch (see README).
  await query(
    `UPDATE users SET
      email = ?,
      password_hash = ?,
      full_name = ?,
      date_of_birth = ?,
      gender = ?,
      location = ?,
      occupation = ?,
      bio = ?,
      photos = ?,
      years_out_of_relationship = ?,
      faith_matters_to_them = ?,
      own_faith = ?,
      open_to_other_faith = ?,
      community = ?,
      relationship_intent = ?,
      education_level = ?,
      height_cm = ?,
      smoking = ?,
      drinking = ?,
      preferred_gender = ?,
      preferred_age_min = ?,
      preferred_age_max = ?,
      preferred_location = ?,
      terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
      photo_consent_accepted_at = COALESCE(photo_consent_accepted_at, NOW()),
      status = 'approved'
     WHERE id = ?`,
    [
      emailToSet,
      passwordHashToSet,
      fullName.trim(),
      dateOfBirth,
      gender,
      location || null,
      occupation || null,
      bio || null,
      JSON.stringify(photos),
      yearsOutOfRelationship || null,
      Boolean(faithMattersToThem),
      ownFaith.trim(),
      faithMattersToThem ? Boolean(openToOtherFaith) : null,
      community,
      relationshipIntent,
      educationLevel || null,
      heightCm || null,
      smoking || null,
      drinking || null,
      preferredGender || null,
      preferredAgeMin || null,
      preferredAgeMax || null,
      preferredLocation || null,
      session.user.id,
    ]
  );

  // Founding-member free access: auto-grant it once, on first
  // profile completion, while launch access is enabled — see the
  // homepage banner ("Founding members get free access") and
  // /admin/memberships, where an admin can extend or convert it.
  // Off by default is wrong for a pre-launch app, so this defaults
  // ON; set FOUNDING_ACCESS_ENABLED=false once launch access ends.
  const foundingAccessEnabled = process.env.FOUNDING_ACCESS_ENABLED !== "false";
  if (foundingAccessEnabled) {
    const existingMembership = await queryOne<{ id: string }>(
      "SELECT id FROM memberships WHERE user_id = ? LIMIT 1",
      [session.user.id]
    );
    if (!existingMembership) {
      const days = Number(process.env.FOUNDING_ACCESS_DAYS) || 180;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await query(
        "INSERT INTO memberships (id, user_id, tier, started_at, expires_at) VALUES (UUID(), ?, 'founding', NOW(), ?)",
        [session.user.id, expiresAt]
      );
    }
  }

  return NextResponse.json({ ok: true });
}
