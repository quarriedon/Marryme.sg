import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    fullName,
    dateOfBirth,
    gender,
    location,
    occupation,
    bio,
    photoUrl,
    yearsOutOfRelationship,
    faithMattersToThem,
    ownFaith,
    openToOtherFaith,
    preferredGender,
    preferredAgeMin,
    preferredAgeMax,
    preferredLocation,
  } = body;

  // Onboarding has no manual review queue yet — completing it
  // auto-approves the profile so it's immediately eligible for
  // matching. Add a real review step before launch (see README).
  await query(
    `UPDATE users SET
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
      preferred_gender = ?,
      preferred_age_min = ?,
      preferred_age_max = ?,
      preferred_location = ?,
      status = 'approved'
     WHERE id = ?`,
    [
      fullName ?? null,
      dateOfBirth ?? null,
      gender ?? null,
      location ?? null,
      occupation ?? null,
      bio ?? null,
      JSON.stringify(photoUrl ? [photoUrl] : []),
      yearsOutOfRelationship ?? null,
      Boolean(faithMattersToThem),
      faithMattersToThem ? (ownFaith ?? null) : null,
      faithMattersToThem ? Boolean(openToOtherFaith) : null,
      preferredGender ?? null,
      preferredAgeMin ?? null,
      preferredAgeMax ?? null,
      preferredLocation ?? null,
      session.user.id,
    ]
  );

  return NextResponse.json({ ok: true });
}
